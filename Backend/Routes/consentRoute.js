const router = require('express').Router()
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); res.vary('Authorization'); next() })
router.post('/', (req, res, next) => {
  if (typeof req.body?.withdrawalTokenHash !== 'string') return res.status(400).json({ message: 'A private receipt proof hash is required' })
  next()
}, require('../Controllers/enquiryController').createEnquiry)
router.post('/consent/withdraw', require('../Controllers/consentController').withdrawConsent)
module.exports = router
