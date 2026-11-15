const mongoose = require('mongoose')
const Institution = require('../Backend/Models/institutionModel')
const institutions = require('../data/institutions.json')

async function seedInstitutions() {
  await Institution.init()
  await Institution.bulkWrite(institutions.map(row => ({ updateOne: {
    filter: { publicId: row.publicId }, update: { $setOnInsert: row }, upsert: true
  } })))
}
if (require.main === module) {
  require('dotenv').config()
  ;(async () => {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required')
    await mongoose.connect(process.env.MONGO_URI)
    await seedInstitutions()
    console.log('Institution source metadata inserted; verification remains pending')
  })().catch(() => {
    console.error('Institution import failed; check MongoDB and unique indexes')
    process.exitCode = 1
  }).finally(() => mongoose.disconnect())
}
module.exports = { seedInstitutions }
