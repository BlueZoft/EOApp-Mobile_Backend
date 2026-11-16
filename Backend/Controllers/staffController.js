const asyncHandler = require('express-async-handler')
const Enquiry = require('../Models/enquiryModel')
const statuses = ['received', 'contacted', 'closed']
const transitions = { received: ['contacted', 'closed'], contacted: ['closed'], closed: [] }
// Whitelist contact/workflow information; NIC, age, sex, address and retry hashes stay private.
const fields = 'Name Telephone email Inquiry Branch askLoan productId branchId status createdAt updatedAt statusChangedAt consentedAt consentVersion'
const statusOf = enquiry => enquiry.status || 'received'
const statusFilter = status => status === 'received' ? { $in: ['received', null] } : status
const institutionScope = req => ({ institutionId: req.staff.institutionId, sharingConsent: true, consentInstitutionId: req.staff.institutionId, consentVersion: 'institution-contact-v1', consentedAt: { $type: 'date' }, purgedAt: { $exists: false } })
const validId = id => /^[a-fA-F0-9]{24}$/.test(id)
function view(enquiry, includeHistory = false) {
  return {
    id: enquiry._id.toString(), name: enquiry.Name, telephone: enquiry.Telephone,
    email: enquiry.email, inquiry: enquiry.Inquiry, branch: enquiry.Branch, product: enquiry.askLoan,
    productId: enquiry.productId, branchId: enquiry.branchId, status: statusOf(enquiry),
    consentedAt: enquiry.consentedAt, consentVersion: enquiry.consentVersion,
    createdAt: enquiry.createdAt, updatedAt: enquiry.updatedAt, statusChangedAt: enquiry.statusChangedAt,
    ...(includeHistory ? { statusHistory: (enquiry.statusHistory || []).map(entry => ({
      fromStatus: entry.fromStatus, toStatus: entry.toStatus, actorId: entry.actorId, at: entry.at
    })) } : {})
  }
}
const listEnquiries = asyncHandler(async (req, res) => {
  const { status, before, limit = '20' } = req.query
  if (Object.keys(req.query).some(key => !['status', 'before', 'limit'].includes(key)) ||
      (status !== undefined && !statuses.includes(status)) ||
      (before !== undefined && (typeof before !== 'string' || !validId(before))) ||
      typeof limit !== 'string' || !/^\d{1,3}$/.test(limit) || Number(limit) < 1 || Number(limit) > 100) {
    return res.status(400).json({ message: 'Invalid enquiry filters' })
  }
  const query = institutionScope(req)
  if (status !== undefined) query.status = statusFilter(status)
  if (before !== undefined) query._id = { $lt: before }
  const rows = await Enquiry.find(query).select(fields).sort({ _id: -1 }).limit(Number(limit) + 1).lean()
  const more = rows.length > Number(limit)
  const page = rows.slice(0, Number(limit))
  res.json({ enquiries: page.map(row => view(row)), nextCursor: more ? page[page.length - 1]._id.toString() : null })
})
const getEnquiry = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid enquiry ID' })
  const enquiry = await Enquiry.findOne({ _id: req.params.id, ...institutionScope(req) })
    .select(fields + ' +statusHistory').lean()
  if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' })
  res.json({ enquiry: view(enquiry, true) })
})
const updateStatus = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid enquiry ID' })
  const { status, expectedStatus } = req.body || {}
  if (!statuses.includes(status) || !statuses.includes(expectedStatus) ||
      Object.keys(req.body || {}).some(key => !['status', 'expectedStatus'].includes(key))) {
    return res.status(400).json({ message: 'A valid status and expectedStatus are required' })
  }
  const scope = { _id: req.params.id, ...institutionScope(req) }
  const current = await Enquiry.findOne(scope).select(fields + ' +statusHistory').lean()
  if (!current) return res.status(404).json({ message: 'Enquiry not found' })
  const fromStatus = statusOf(current)
  if (fromStatus === status) return res.json({ enquiry: view(current, true) })
  if (fromStatus !== expectedStatus || !transitions[fromStatus]?.includes(status)) {
    return res.status(409).json({ message: 'Enquiry status changed or transition is not allowed' })
  }
  const at = new Date()
  const updated = await Enquiry.findOneAndUpdate({ ...scope, status: statusFilter(expectedStatus) }, {
    $set: { status, statusChangedAt: at },
    $push: { statusHistory: { fromStatus, toStatus: status, actorId: req.staff.staffId, at } }
  }, { new: true, runValidators: true }).select(fields + ' +statusHistory').lean()
  if (updated) return res.json({ enquiry: view(updated, true) })
  // A concurrent identical update is an idempotent success; a conflicting update is not.
  const latest = await Enquiry.findOne(scope).select(fields + ' +statusHistory').lean()
  if (latest && statusOf(latest) === status) return res.json({ enquiry: view(latest, true) })
  res.status(409).json({ message: 'Enquiry status changed; refresh before updating' })
})
module.exports = { listEnquiries, getEnquiry, updateStatus }
