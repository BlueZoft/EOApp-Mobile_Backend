const asyncHandler = require('express-async-handler')
const Loan = require('../Models/loanModel')
const Branch = require('../Models/branchModel')
const Institution = require('../Models/institutionModel')
const getCatalogue = asyncHandler(async (req, res) => {
  const [products, branches, institutions] = await Promise.all([
    Loan.find({ active: true, publicId: { $type: 'string' } }).select('-_id -__v').sort({ publicId: 1 }).lean(),
    Branch.find({ active: true }).select('-_id -__v').sort({ name: 1 }).lean(),
    Institution.find({ active: true }).select('-_id -__v').sort({ name: 1 }).lean()
  ])
  res.json({ schemaVersion: 1, products, branches, institutions })
})
module.exports = { getCatalogue }
