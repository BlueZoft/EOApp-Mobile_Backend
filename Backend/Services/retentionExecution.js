const Enquiry = require('../Models/enquiryModel')
const { policy, eligibleFilter } = require('./retentionPolicy')

async function executeRetention({ days, now, limit = 1000 } = {}) {
  const settings = policy({ days, now })
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Batch limit must be 1–1000')
  const filter = eligibleFilter(settings.cutoff)
  const rows = await Enquiry.collection.find(filter, { projection: { _id: 1 } }).sort({ _id: 1 }).limit(limit).toArray()
  // Recheck current policy/hold/terminal dates atomically with each replacement.
  // An allowlist removes unknown legacy fields as well as all current personal fields.
  const result = rows.length ? await Enquiry.collection.updateMany({ ...filter, _id: { $in: rows.map(row => row._id) } }, [
    { $project: { _id: 1, idempotencyKey: 1, requestHash: 1, withdrawalTokenHash: 1,
      consentWithdrawnAt: { $ifNull: ['$consentWithdrawnAt', settings.now] },
      sharingConsent: { $literal: false }, status: { $literal: 'closed' },
      purgedAt: { $literal: settings.now }, retentionPolicyDays: { $literal: settings.days } } }
  ]) : { modifiedCount: 0 }
  return { mode: 'apply', policyDays: settings.days, asOf: settings.now.toISOString(), cutoff: settings.cutoff.toISOString(),
    scrubbedCount: result.modifiedCount, eligibleRemaining: await Enquiry.collection.countDocuments(filter), batchLimit: limit }
}
module.exports = { executeRetention }
