const router = require('express').Router()
router.post('/', require('../Controllers/enquiryController').createEnquiry)
// Personal enquiry records must not be exposed through a public GET endpoint.
module.exports = router
