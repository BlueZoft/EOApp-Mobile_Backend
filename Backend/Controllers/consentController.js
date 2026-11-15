const crypto = require('node:crypto')
const asyncHandler = require('express-async-handler')
const Enquiry = require('../Models/enquiryModel')

const withdrawConsent = asyncHandler(async (req, res) => {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(req.get('Authorization') || '')
  if (!match) return res.status(401).json({ message: 'Private receipt proof required' })
  if (Array.isArray(req.body) || Object.keys(req.body || {}).length) return res.status(400).json({ message: 'Withdrawal does not accept enquiry data' })
  const withdrawalTokenHash = crypto.createHash('sha256').update(match[1]).digest('hex')
  const at = new Date()
  // One atomic operation disables all future staff access. Keep the first withdrawal date.
  let enquiry = await Enquiry.findOneAndUpdate({ withdrawalTokenHash, consentWithdrawnAt: null }, {
    $set: { sharingConsent: false, consentWithdrawnAt: at }
  }, { new: true }).select('_id consentWithdrawnAt').lean()
  if (!enquiry) enquiry = await Enquiry.findOne({ withdrawalTokenHash }).select('_id consentWithdrawnAt').lean()
  if (!enquiry) return res.status(404).json({ message: 'Withdrawal could not be confirmed; keep the private receipt and retry later' })
  res.json({ enquiryId: enquiry._id.toString(), status: 'withdrawn', withdrawnAt: enquiry.consentWithdrawnAt })
})
module.exports = { withdrawConsent }
