require('dotenv').config()
const mongoose = require('mongoose')
mongoose.set('autoCreate', false)
mongoose.set('autoIndex', false)
const { executeRetention } = require('../Backend/Services/retentionExecution')
;(async () => {
  const args = process.argv.slice(2)
  const options = {}
  for (let i = 0; i < args.length; i += 2) {
    if (!['--days', '--confirm-database', '--limit'].includes(args[i]) || !args[i + 1] || options[args[i]]) throw new Error('Invalid options')
    options[args[i]] = args[i + 1]
  }
  if (!process.env.MONGO_URI || process.env.RETENTION_EXECUTION_ENABLED !== 'true' || !options['--confirm-database']) throw new Error('Explicit activation required')
  for (const flag of ['--days', '--limit']) if (options[flag] && !/^\d+$/.test(options[flag])) throw new Error('Invalid integer')
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 })
  if (mongoose.connection.name !== options['--confirm-database'] || ['admin', 'local', 'config', 'test'].includes(mongoose.connection.name)) throw new Error('Database confirmation mismatch')
  console.log(JSON.stringify(await executeRetention({ ...(options['--days'] ? { days: Number(options['--days']) } : {}),
    ...(options['--limit'] ? { limit: Number(options['--limit']) } : {}) }), null, 2))
})().catch(() => {
  console.error('Retention execution failed. Requires MONGO_URI, RETENTION_EXECUTION_ENABLED=true and --confirm-database NAME. Optional --days 1..3650 and --limit 1..1000. Check the privacy lifecycle runbook; no error details or personal data are logged.')
  process.exitCode = 1
}).finally(() => mongoose.disconnect())
