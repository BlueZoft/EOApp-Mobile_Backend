require('dotenv').config()
const fs = require('node:fs/promises')
const mongoose = require('mongoose')
mongoose.set('autoCreate', false)
mongoose.set('autoIndex', false)
const { withdrawWithApproval } = require('../Backend/Services/supportWithdrawal')
;(async () => {
  const args = process.argv.slice(2)
  if (args.length !== 2 || args[0] !== '--approval-file' || process.env.SUPPORT_WITHDRAWAL_ENABLED !== 'true' ||
      !process.env.MONGO_URI || !process.env.SUPPORT_REVIEWER_KEYS) throw new Error('Explicit support configuration required')
  const raw = await fs.readFile(args[1], 'utf8')
  if (raw.length > 16384 || process.env.SUPPORT_REVIEWER_KEYS.length > 65536) throw new Error('Approval/configuration too large')
  const document = JSON.parse(raw), trustedKeys = JSON.parse(process.env.SUPPORT_REVIEWER_KEYS)
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 })
  const result = await withdrawWithApproval({ document, trustedKeys })
  console.log(JSON.stringify(result))
  if (result.status !== 'withdrawn') process.exitCode = 1
})().catch(() => {
  console.error('Support withdrawal failed. Requires explicit activation, database configuration and a current approval signed by two independent trusted reviewers. No identity evidence or personal data is logged. See docs/SUPPORT_RECOVERY.md.')
  process.exitCode = 1
}).finally(() => mongoose.disconnect())
