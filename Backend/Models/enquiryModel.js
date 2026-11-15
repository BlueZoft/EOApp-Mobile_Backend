const mongoose = require('mongoose')

// Preserve existing records and collection; an enquiry does not imply a login account.
const schema = new mongoose.Schema({
  Name: { type: String, required: true },
  Age: { type: Number, required: true, min: 18, max: 99 },
  NIC: { type: String, required: true },
  Sex: { type: String, required: true, enum: ['male', 'female'] },
  Telephone: { type: String, required: true },
  Address: { type: String, required: true },
  email: { type: String, lowercase: true },
  Inquiry: { type: String, maxlength: 250 },
  Branch: { type: String, required: true },
  askLoan: { type: String, required: true },
  productId: String,
  branchId: String,
  institutionId: String,
  status: { type: String, enum: ['received'], default: 'received' },
  idempotencyKey: { type: String, select: false },
  requestHash: { type: String, select: false }
}, { timestamps: true, collection: 'users' })
schema.index({ idempotencyKey: 1 }, { unique: true, sparse: true })
module.exports = mongoose.model('Enquiry', schema)
