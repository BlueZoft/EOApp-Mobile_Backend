require('dotenv').config()
const connectDB = require('./Config/db')
const Enquiry = require('./Models/enquiryModel')
const app = require('./app')
async function start() {
  await connectDB()
  // Retry safety requires the unique index before serving submissions.
  await Enquiry.init()
  app.listen(process.env.PORT || 5000, () => console.log('API ready'))
}
start().catch(() => {
  console.error('API startup failed: check MongoDB connectivity and enquiry indexes')
  process.exit(1)
})
