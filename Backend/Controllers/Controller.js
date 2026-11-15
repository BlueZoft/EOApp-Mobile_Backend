// Compatibility exports; controllers are now separated by responsibility.
module.exports = {
  getLoans: require('./loanController').getLoans,
  setData: require('./enquiryController').createEnquiry
}
