const express = require('express')
const router = express.Router()
const{setData, putData} = require('../Controllers/Controller')


router.post('/', setData)


router.put('/:id', putData)


module.exports = router