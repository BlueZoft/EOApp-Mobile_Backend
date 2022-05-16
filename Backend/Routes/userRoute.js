const express = require('express')
const router = express.Router()
const{setData, getData} = require('../Controllers/Controller')


router.post('/', setData)
router.get('/', getData)



module.exports = router