const Enquiry = require('../Models/enquiryModel')
const DEFAULT_RETENTION_DAYS = 180
async function retentionPlan({ days = DEFAULT_RETENTION_DAYS, now = new Date() } = {}) {
  if (!Number.isInteger(days) || days < 1 || days > 3650 || !(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('Retention days must be an integer from 1 to 3650 and the report date must be valid')
  }
  const cutoff = new Date(now.getTime() - days * 86400000)
  const [summary] = await Enquiry.aggregate([
    { $project: {
      closedAt: { $cond: [{ $and: [{ $eq: ['$status', 'closed'] }, { $eq: [{ $type: '$statusChangedAt' }, 'date'] }] }, '$statusChangedAt', null] },
      withdrawnAt: { $cond: [{ $eq: [{ $type: '$consentWithdrawnAt' }, 'date'] }, '$consentWithdrawnAt', null] },
      closed: { $eq: ['$status', 'closed'] }
    } },
    { $project: { closed: 1, anchor: { $max: ['$closedAt', '$withdrawnAt'] } } },
    { $group: { _id: null,
      eligibleCount: { $sum: { $cond: [{ $and: [{ $ne: ['$anchor', null] }, { $lte: ['$anchor', cutoff] }] }, 1, 0] } },
      undatedClosedCount: { $sum: { $cond: [{ $and: ['$closed', { $eq: ['$anchor', null] }] }, 1, 0] } }
    } }
  ])
  return { mode: 'dry-run', policyDays: days, asOf: now.toISOString(), cutoff: cutoff.toISOString(),
    eligibleCount: summary?.eligibleCount || 0, undatedClosedCount: summary?.undatedClosedCount || 0 }
}
module.exports = { retentionPlan, DEFAULT_RETENTION_DAYS }
