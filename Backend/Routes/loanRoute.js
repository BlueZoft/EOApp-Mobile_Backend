const express = require('express')
const router = express.Router()
const{getLoans} = require('../Controllers/Controller')


router.get('/', getLoans)


module.exports = router