const express = require('express')
const path = require('node:path')
const { errorHandler } = require('./Middleware/errorMiddleware')
const app = express()
app.disable('x-powered-by')
app.use('/staff', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY'
  })
  next()
}, express.static(path.join(__dirname, '../public/staff'), { etag: false, cacheControl: false }))
app.use(express.json({ limit: '16kb' }))
app.get('/api/catalogue', require('./Controllers/catalogueController').getCatalogue)
app.use('/api/loans', require('./Routes/loanRoute'))
app.use('/api/staff', require('./Routes/staffRoute'))
app.use('/api/enquiries', require('./Routes/consentRoute'))
app.use('/api/userdata', require('./Routes/userRoute'))
app.use((req, res) => res.status(404).json({ message: 'Route not found' }))
app.use(errorHandler)
module.exports = app
