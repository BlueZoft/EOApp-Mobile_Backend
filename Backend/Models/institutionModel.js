const mongoose = require('mongoose')
module.exports = mongoose.model('Institution', new mongoose.Schema({
  publicId: { type: String, required: true, unique: true, immutable: true },
  name: { type: String, required: true },
  website: String,
  active: { type: Boolean, default: true }
}, { timestamps: true }))
