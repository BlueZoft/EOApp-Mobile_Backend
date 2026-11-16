const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

async function localNotificationTransport(directory, databaseName) {
  if (!path.isAbsolute(directory) || !/^eoapp_(demo_[a-f0-9]{32}|operations_test_[a-zA-Z0-9_]+)$/.test(databaseName)) {
    throw new Error('Local delivery requires an absolute private directory and a synthetic demo/test database')
  }
  await fs.mkdir(directory, { recursive: true, mode: 0o700 })
  const stat = await fs.lstat(directory)
  if (!stat.isDirectory() || (stat.mode & 0o077)) throw new Error('Local delivery directory must be owner-only')
  return { async deliver(event) {
    if (!event || !/^demo-[a-z0-9_-]{1,80}$/.test(event.institutionId) || !/^[a-f0-9]{24}$/.test(event.enquiryId) ||
        event.type !== 'enquiry.received' || event.eventId !== `enquiry-received-v1-${event.enquiryId}`) throw new Error('Synthetic event required')
    const deliveryId = crypto.createHash('sha256').update(event.eventId).digest('hex')
    // Explicit payload allowlist: no arbitrary adapter input becomes a local message.
    const body = JSON.stringify({ synthetic: true, eventId: event.eventId, type: event.type,
      institutionId: event.institutionId, enquiryId: event.enquiryId, message: 'A synthetic enquiry is available in the scoped staff inbox.' }, null, 2) + '\n'
    const target = path.join(directory, deliveryId + '.json')
    const temporary = path.join(directory, `.${deliveryId}-${crypto.randomBytes(12).toString('hex')}.tmp`)
    try {
      await fs.writeFile(temporary, body, { mode: 0o600, flag: 'wx' })
      try { await fs.link(temporary, target) } catch (error) {
        if (error.code !== 'EEXIST' || await fs.readFile(target, 'utf8') !== body) throw error
      }
    } finally { await fs.rm(temporary, { force: true }) }
    return { deliveryId }
  } }
}
module.exports = { localNotificationTransport }
