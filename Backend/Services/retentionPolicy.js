const DEFAULT_RETENTION_DAYS = 180

function policy({ days = DEFAULT_RETENTION_DAYS, now = new Date() } = {}) {
  if (!Number.isInteger(days) || days < 1 || days > 3650 || !(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error('Retention days must be an integer from 1 to 3650 and the report date must be valid')
  }
  return { days, now, cutoff: new Date(now.getTime() - days * 86400000) }
}
const closedAt = { $cond: [{ $and: [{ $eq: ['$status', 'closed'] }, { $eq: [{ $type: '$statusChangedAt' }, 'date'] }] }, '$statusChangedAt', null] }
const withdrawnAt = { $cond: [{ $eq: [{ $type: '$consentWithdrawnAt' }, 'date'] }, '$consentWithdrawnAt', null] }
const anchor = { $max: [closedAt, withdrawnAt] }
const undatedClosed = { $and: [{ $eq: ['$status', 'closed'] }, { $ne: [{ $type: '$statusChangedAt' }, 'date'] }] }
const malformedWithdrawal = { $not: [{ $in: [{ $type: '$consentWithdrawnAt' }, ['date', 'missing', 'null']] }] }
const safeDates = { $and: [{ $not: [undatedClosed] }, { $not: [malformedWithdrawal] }] }
function eligibleFilter(cutoff) {
  return { purgedAt: { $exists: false }, retentionHold: { $ne: true },
    $expr: { $and: [safeDates, { $ne: [anchor, null] }, { $lte: [anchor, cutoff] }] } }
}
module.exports = { DEFAULT_RETENTION_DAYS, policy, anchor, undatedClosed, malformedWithdrawal, safeDates, eligibleFilter }
