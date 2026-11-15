const router = require('express').Router()
router.get('/', require('../Controllers/loanController').getLoans)
module.exports = router
