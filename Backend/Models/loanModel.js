const mongoose = require('mongoose')

const loanSchema = mongoose.Schema({


    publicId: {type: String, unique: true, sparse: true, immutable: true},
    institutionId: {type: String},
    active: {type: Boolean, default: true},
    verified: {type: Boolean, default: false},
    verifiedAt: {type: Date},
    sourceUrl: {type: String},
    category: {type: String, enum: ['business', 'agriculture', 'coconut', 'other'], index: true},
    lName: {type: String},
    sDes: {type: String},
    forWho: {type: String},
    iRate: {type: String},
    maxLimit: {type: String},
    maxRepay: {type: String},
    eligibles: {type: String},
      }, 
)

module.exports = mongoose.model('loan', loanSchema) 