const mongoose = require('mongoose')

const loanSchema = mongoose.Schema({


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