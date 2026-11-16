require('dotenv').config()
const mongoose = require('mongoose')
mongoose.set('autoCreate', false)
mongoose.set('autoIndex', false)
const { runNotifications } = require('../Backend/Services/notificationWorker')
const { localNotificationTransport } = require('../Backend/Services/localNotificationTransport')
;(async () => {
  const args = process.argv.slice(2), options = {}
  for (let i = 0; i < args.length; i += 2) {
    if (!['--transport', '--directory', '--limit'].includes(args[i]) || !args[i + 1] || options[args[i]]) throw new Error('Invalid options')
    options[args[i]] = args[i + 1]
  }
  if (!args.length) { console.log(JSON.stringify(await runNotifications())); return }
  if (options['--transport'] !== 'local' || !options['--directory'] || !process.env.MONGO_URI ||
      (options['--limit'] && !/^\d+$/.test(options['--limit']))) throw new Error('Explicit local configuration required')
  await mongoose.connect(process.env.MONGO_URI, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 5000 })
  const transport = await localNotificationTransport(options['--directory'], mongoose.connection.name)
  console.log(JSON.stringify(await runNotifications({ transport, ...(options['--limit'] ? { limit: Number(options['--limit']) } : {}) }), null, 2))
})().catch(() => {
  console.error('Notification worker failed. Use no options for disabled mode, or --transport local --directory /absolute/private-directory [--limit 1..1000] with a synthetic demo MONGO_URI. No SMTP/SMS provider is enabled.')
  process.exitCode = 1
}).finally(() => mongoose.disconnect())
