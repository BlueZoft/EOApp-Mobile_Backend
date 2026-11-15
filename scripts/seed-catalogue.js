const mongoose = require('mongoose')
const Loan = require('../Backend/Models/loanModel')
const Branch = require('../Backend/Models/branchModel')
const historical = require('../data/historical-catalogue.json')

async function seedCatalogue() {
  // Insert-only: reruns cannot overwrite verified terms, deactivate changes or existing records.
  for (const [Model, rows] of [[Loan, historical.products], [Branch, historical.branches]]) {
    await Model.init()
    await Model.bulkWrite(rows.map(row => ({ updateOne: {
      filter: { publicId: row.publicId }, update: { $setOnInsert: row }, upsert: true
    } })))
  }
}
if (require.main === module) {
  require('dotenv').config()
  ;(async () => {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required')
    await mongoose.connect(process.env.MONGO_URI)
    await seedCatalogue()
    console.log('Historical catalogue inserted; all imported records remain unverified')
  })().catch(() => { console.error('Catalogue import failed; check MongoDB and unique indexes'); process.exitCode = 1 })
    .finally(() => mongoose.disconnect())
}
module.exports = { seedCatalogue }
