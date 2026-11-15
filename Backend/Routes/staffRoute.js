const router = require('express').Router()
const { staffAuth, requireCaseworker } = require('../Middleware/staffAuth')
const { listEnquiries, getEnquiry, updateStatus } = require('../Controllers/staffController')
router.use(staffAuth)
router.get('/session', (req, res) => res.json({ staff: req.staff }))
router.get('/enquiries', listEnquiries)
router.get('/enquiries/:id', getEnquiry)
router.patch('/enquiries/:id/status', requireCaseworker, updateStatus)
module.exports = router
