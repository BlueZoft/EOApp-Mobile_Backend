const Enquiry = require('../Models/enquiryModel')
const { DEFAULT_RETENTION_DAYS, policy, anchor, undatedClosed, malformedWithdrawal, safeDates } = require('./retentionPolicy')
async function retentionPlan({ days = DEFAULT_RETENTION_DAYS, now = new Date() } = {}) {
  const { cutoff } = policy({ days, now })
  const [summary] = await Enquiry.aggregate([
    { $match: { purgedAt: { $exists: false } } },
    { $project: { anchor, held: { $eq: ['$retentionHold', true] }, undatedClosed, malformedWithdrawal, safeDates } },
    { $group: { _id: null,
      eligibleCount: { $sum: { $cond: [{ $and: ['$safeDates', { $ne: ['$held', true] }, { $ne: ['$anchor', null] }, { $lte: ['$anchor', cutoff] }] }, 1, 0] } },
      heldCount: { $sum: { $cond: ['$held', 1, 0] } },
      undatedClosedCount: { $sum: { $cond: ['$undatedClosed', 1, 0] } },
      malformedWithdrawalCount: { $sum: { $cond: ['$malformedWithdrawal', 1, 0] } }
    } }
  ])
  return { mode: 'dry-run', policyDays: days, asOf: now.toISOString(), cutoff: cutoff.toISOString(),
    eligibleCount: summary?.eligibleCount || 0, undatedClosedCount: summary?.undatedClosedCount || 0,
    malformedWithdrawalCount: summary?.malformedWithdrawalCount || 0, heldCount: summary?.heldCount || 0 }
}
module.exports = { retentionPlan, DEFAULT_RETENTION_DAYS }
