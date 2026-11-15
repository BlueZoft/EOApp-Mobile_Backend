const mongoose = require('mongoose')
module.exports = mongoose.model('Branch', new mongoose.Schema({
  publicId: { type: String, required: true, unique: true, immutable: true },
  name: { type: String, required: true },
  institutionId: { type: String },
  active: { type: Boolean, default: true },
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  sourceUrl: String
}, { timestamps: true }))
