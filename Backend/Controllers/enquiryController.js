const asyncHandler = require('express-async-handler')
const Loan = require('../Models/loanModel')
const Institution = require('../Models/institutionModel')
const Branch = require('../Models/branchModel')
const Enquiry = require('../Models/enquiryModel')
const { validateEnquiry, fingerprint } = require('../Validation/enquiry')

const createEnquiry = asyncHandler(async (req, res) => {
  const { data, errors } = validateEnquiry(req.body || {})
  if (Object.keys(errors).length) return res.status(400).json({ message: 'Invalid enquiry', errors })
  const key = req.get('Idempotency-Key')
  if (key && !/^[a-zA-Z0-9_-]{16,128}$/.test(key)) return res.status(400).json({ message: 'Invalid Idempotency-Key' })
  const hash = fingerprint(data)
  let enquiry
  let created = false
  if (key) {
    enquiry = await Enquiry.findOne({ idempotencyKey: key }).select('+requestHash')
  }
  if (!enquiry) {
    const product = data.productId ? await Loan.findOne({ publicId: data.productId, active: true }).lean() : null
    const branch = data.branchId ? await Branch.findOne({ publicId: data.branchId, active: true }).lean() : null
    if ((data.productId && !product) || (data.branchId && !branch)) {
      return res.status(400).json({ message: 'Selected catalogue entry is unavailable; refresh the catalogue' })
    }
    if (product && branch && product.institutionId && branch.institutionId && product.institutionId !== branch.institutionId) {
      return res.status(400).json({ message: 'Branch does not belong to the product institution' })
    }
    const institutionId = product ? product.institutionId : branch ? branch.institutionId : undefined
    if (data.sharingConsent === true && (!institutionId || data.consentInstitutionId !== institutionId ||
        !await Institution.exists({ publicId: institutionId, active: true }))) {
      return res.status(400).json({ message: 'Sharing consent must match the selected active institution' })
    }
    try {
      enquiry = await Enquiry.create({
        Name: data.name, Age: data.age, NIC: data.NIC, Sex: data.sex,
        Telephone: data.tel, Address: data.addr, email: data.email,
        Inquiry: data.inquiry, Branch: branch ? branch.name : data.branch,
        askLoan: product ? product.lName : data.askLoan,
        productId: data.productId, branchId: data.branchId,
        institutionId,
        sharingConsent: data.sharingConsent === true,
        ...(data.sharingConsent === true ? {
          consentInstitutionId: institutionId, consentVersion: 'institution-contact-v1', consentedAt: new Date()
        } : {}),
        ...(key ? { idempotencyKey: key, requestHash: hash } : {})
      })
      created = true
    } catch (error) {
      if (!key || error.code !== 11000) throw error
      enquiry = await Enquiry.findOne({ idempotencyKey: key }).select('+requestHash')
      if (!enquiry) throw error
    }
  }
  if (key && enquiry.requestHash !== hash) return res.status(409).json({ message: 'Idempotency key already used for different enquiry data' })
  // This is the immutable submission receipt, not the current staff workflow status.
  return res.status(created ? 201 : 200).json({ enquiryId: enquiry.id, status: 'received' })
})
module.exports = { createEnquiry }
