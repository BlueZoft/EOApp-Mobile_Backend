const crypto = require('node:crypto')
const mongoose = require('mongoose')
const Enquiry = require('../Models/enquiryModel')
const payloadKeys = ['schemaVersion', 'action', 'database', 'enquiryId', 'caseReference', 'verifiedAt']

function approvalBytes(payload) {
  if (!payload || Object.keys(payload).length !== payloadKeys.length || payloadKeys.some(key => !Object.hasOwn(payload, key)) ||
      payload.schemaVersion !== 1 || payload.action !== 'withdraw-sharing' ||
      typeof payload.database !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(payload.database) ||
      typeof payload.enquiryId !== 'string' || !/^[a-f0-9]{24}$/.test(payload.enquiryId) ||
      typeof payload.caseReference !== 'string' || !/^[A-Z][A-Z0-9_-]{7,79}$/.test(payload.caseReference) ||
      typeof payload.verifiedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(payload.verifiedAt) ||
      Number.isNaN(Date.parse(payload.verifiedAt)) || new Date(payload.verifiedAt).toISOString() !== payload.verifiedAt) throw new Error('Invalid support approval payload')
  return Buffer.from(JSON.stringify(Object.fromEntries(payloadKeys.map(key => [key, payload[key]]))))
}

function verifyApproval(document, trustedKeys, database, now = new Date()) {
  if (!document || Object.keys(document).some(key => !['payload', 'approvals'].includes(key))) throw new Error('Invalid approval document')
  const bytes = approvalBytes(document.payload)
  const age = now.getTime() - Date.parse(document.payload.verifiedAt)
  if (document.payload.database !== database || !Number.isFinite(age) || age < 0 || age > 86400000 ||
      !Array.isArray(document.approvals) || document.approvals.length !== 2 || !trustedKeys || typeof trustedKeys !== 'object') throw new Error('Current dual approval required')
  const reviewers = new Set()
  for (const approval of document.approvals) {
    if (!approval || typeof approval.reviewerId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(approval.reviewerId) ||
        reviewers.has(approval.reviewerId) || !Object.hasOwn(trustedKeys, approval.reviewerId) ||
        typeof approval.signature !== 'string' || !/^[A-Za-z0-9_-]{86}$/.test(approval.signature)) throw new Error('Distinct authorized reviewers required')
    const key = crypto.createPublicKey(trustedKeys[approval.reviewerId])
    if (key.asymmetricKeyType !== 'ed25519' || !crypto.verify(null, bytes, key, Buffer.from(approval.signature, 'base64url'))) throw new Error('Invalid reviewer signature')
    reviewers.add(approval.reviewerId)
  }
  // Distinct labels must also correspond to distinct signing keys.
  const fingerprints = [...reviewers].map(id => crypto.createPublicKey(trustedKeys[id]).export({ type: 'spki', format: 'der' }).toString('hex'))
  if (new Set(fingerprints).size !== 2) throw new Error('Independent signing keys required')
  return { caseHash: crypto.createHash('sha256').update(bytes).digest('hex'), reviewerIds: [...reviewers].sort() }
}

async function withdrawWithApproval({ document, trustedKeys, now = new Date() }) {
  const audit = verifyApproval(document, trustedKeys, mongoose.connection.name, now)
  const id = document.payload.enquiryId
  const updated = await Enquiry.findOneAndUpdate({ _id: id, purgedAt: { $exists: false }, consentWithdrawnAt: null }, {
    $set: { sharingConsent: false, consentWithdrawnAt: now, supportWithdrawal: { ...audit, at: now }, 'notification.state': 'cancelled' },
    $unset: { 'notification.leaseToken': '', 'notification.leaseUntil': '' }
  }, { new: true }).select('_id').lean()
  if (updated) return { status: 'withdrawn', changed: true }
  if (await Enquiry.exists({ _id: id, consentWithdrawnAt: { $type: 'date' } })) return { status: 'withdrawn', changed: false }
  return { status: 'unavailable', changed: false }
}
module.exports = { approvalBytes, verifyApproval, withdrawWithApproval }
