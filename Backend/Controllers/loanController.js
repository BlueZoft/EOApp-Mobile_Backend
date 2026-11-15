const asyncHandler = require('express-async-handler')
const Loan = require('../Models/loanModel')
const getLoans = asyncHandler(async (req, res) => {
  const category = req.query.category
  if (category !== undefined && !['business', 'agriculture', 'coconut', 'other'].includes(category)) {
    return res.status(400).json({ message: 'Invalid category' })
  }
  const loans = await Loan.find({ active: { $ne: false }, ...(category ? { category } : {}) }).lean()
  res.json({ loans })
})
module.exports = { getLoans }
