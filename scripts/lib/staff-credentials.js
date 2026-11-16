const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

function createCredentials(identities) {
  const ids = new Set()
  if (!Array.isArray(identities) || !identities.length) throw new Error('Staff identities are required')
  return identities.map(identity => {
    if (!identity || !['institutionId', 'staffId'].every(key => typeof identity[key] === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(identity[key])) ||
        !['reader', 'caseworker'].includes(identity.role) || ids.has(identity.staffId)) {
      throw new Error('Use unique staff IDs, valid institution IDs and reader/caseworker roles')
    }
    ids.add(identity.staffId)
    const token = crypto.randomBytes(32).toString('base64url')
    const binding = { institutionId: identity.institutionId, staffId: identity.staffId, role: identity.role,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex') }
    return { ...binding, token }
  })
}

// The caller owns a newly created private directory. Never overwrite an existing credential.
async function writeCredentials(directory, credentials) {
  await fs.mkdir(directory, { mode: 0o700 })
  const bindings = credentials.map(({ token, ...binding }) => binding)
  try {
    await fs.writeFile(path.join(directory, 'bindings.json'), JSON.stringify(bindings, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
    await fs.writeFile(path.join(directory, 'credentials.json'), JSON.stringify(credentials, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  } catch (error) {
    await fs.rm(directory, { recursive: true, force: true })
    throw error
  }
}

module.exports = { createCredentials, writeCredentials }
