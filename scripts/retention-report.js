require('dotenv').config()
const mongoose = require('mongoose')
mongoose.set('autoCreate', false)
mongoose.set('autoIndex', false)
const { retentionPlan } = require('../Backend/Services/retentionPlan')
;(async () => {
  const args = process.argv.slice(2)
  if (args.length && (args.length !== 2 || args[0] !== '--days' || !/^\d+$/.test(args[1]))) {
    throw new Error('Usage: npm run retention:report -- [--days 180]')
  }
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required')
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false })
  const report = await retentionPlan(args.length ? { days: Number(args[1]) } : undefined)
  console.log(JSON.stringify(report, null, 2))
})().catch(() => {
  console.error('Retention report failed; check MONGO_URI and use an integer --days from 1 to 3650. This command never deletes data.')
  process.exitCode = 1
}).finally(() => mongoose.disconnect())
