const mongoose = require('mongoose')
module.exports = mongoose.model('Institution', new mongoose.Schema({
  publicId: { type: String, required: true, unique: true, immutable: true },
  name: { type: String, required: true },
  website: String,
  catalogueSourceUrl: String,
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  active: { type: Boolean, default: true }
}, { timestamps: true }))
