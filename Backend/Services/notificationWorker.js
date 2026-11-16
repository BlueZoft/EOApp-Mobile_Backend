const crypto = require('node:crypto')
const Enquiry = require('../Models/enquiryModel')
const Institution = require('../Models/institutionModel')
const MAX_ATTEMPTS = 5
const LEASE_MS = 30000

async function runNotifications({ transport, limit = 50, now = () => new Date() } = {}) {
  if (!transport) return { mode: 'disabled', delivered: 0, cancelled: 0, retried: 0, failed: 0 }
  if (typeof transport.deliver !== 'function' || !Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Invalid worker configuration')
  const counts = { mode: 'run', delivered: 0, cancelled: 0, retried: 0, failed: 0 }
  for (let i = 0; i < limit; i++) {
    const at = now()
    if (!(at instanceof Date) || Number.isNaN(at.getTime())) throw new Error('Invalid worker time')
    const token = crypto.randomBytes(24).toString('hex')
    const record = await Enquiry.findOneAndUpdate({ purgedAt: { $exists: false }, $or: [
      { 'notification.state': 'pending', 'notification.nextAttemptAt': { $lte: at } },
      { 'notification.state': 'processing', 'notification.leaseUntil': { $lte: at } }
    ] }, { $set: { 'notification.state': 'processing', 'notification.leaseToken': token, 'notification.leaseUntil': new Date(at.getTime() + LEASE_MS) },
      $inc: { 'notification.attempts': 1 } }, { new: true, timestamps: false }).sort({ _id: 1 }).select('_id institutionId +notification').lean()
    if (!record) break
    const owned = { _id: record._id, purgedAt: { $exists: false }, 'notification.state': 'processing', 'notification.leaseToken': token }
    const finish = fields => Enquiry.updateOne(owned, { $set: fields, $unset: { 'notification.leaseToken': '', 'notification.leaseUntil': '' } }, { timestamps: false })
    if (record.notification.attempts > MAX_ATTEMPTS) {
      await finish({ 'notification.state': 'failed', 'notification.lastCode': 'attempt_limit' }); counts.failed++; continue
    }
    const permitted = await Enquiry.exists({ ...owned, sharingConsent: true, consentInstitutionId: record.institutionId,
      institutionId: { $type: 'string', $eq: record.institutionId }, consentVersion: 'institution-contact-v1', consentedAt: { $type: 'date' },
      status: { $in: ['received', null] } })
    if (!permitted || !await Institution.exists({ publicId: record.institutionId, active: true })) {
      await finish({ 'notification.state': 'cancelled', 'notification.lastCode': 'access_unavailable' }); counts.cancelled++; continue
    }
    try {
      // The transport never receives applicant/contact data or receipt/staff secrets.
      // Every retry uses the same event ID, including after a worker crash/expired lease.
      const event = { eventId: `enquiry-received-v1-${record._id}`, type: 'enquiry.received',
        institutionId: record.institutionId, enquiryId: record._id.toString() }
      const delivered = await transport.deliver(event)
      if (!delivered || typeof delivered.deliveryId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(delivered.deliveryId)) throw new Error('Invalid transport acknowledgement')
      const result = await finish({ 'notification.state': 'delivered', 'notification.deliveredAt': now(),
        'notification.deliveryId': delivered.deliveryId, 'notification.lastCode': 'accepted' })
      if (result.modifiedCount) counts.delivered++
      else counts.cancelled++ // Withdrawal/purge/lease takeover wins over this late acknowledgement.
    } catch (_) {
      const failed = record.notification.attempts >= MAX_ATTEMPTS
      const result = await finish({ 'notification.state': failed ? 'failed' : 'pending', 'notification.lastCode': 'transport_error',
        'notification.nextAttemptAt': new Date(at.getTime() + Math.min(3600000, 5000 * 2 ** (record.notification.attempts - 1))) })
      if (result.modifiedCount) counts[failed ? 'failed' : 'retried']++
      else counts.cancelled++
    }
  }
  return counts
}
module.exports = { runNotifications, MAX_ATTEMPTS, LEASE_MS }
