const fs = require('node:fs/promises')
const crypto = require('node:crypto')
const { approvalBytes } = require('../Backend/Services/supportWithdrawal')
;(async () => {
  const options = {}, args = process.argv.slice(2)
  for (let i = 0; i < args.length; i += 2) {
    if (!['--input', '--output', '--key-file', '--reviewer'].includes(args[i]) || !args[i + 1] || options[args[i]]) throw new Error('Invalid signing options')
    options[args[i]] = args[i + 1]
  }
  if (Object.keys(options).length !== 4 || !/^[a-zA-Z0-9_-]{1,100}$/.test(options['--reviewer'])) throw new Error('All signing options required')
  const raw = await fs.readFile(options['--input'], 'utf8')
  if (raw.length > 16384) throw new Error('Approval too large')
  const document = JSON.parse(raw), bytes = approvalBytes(document.payload)
  if (!Array.isArray(document.approvals) || document.approvals.length > 1 || document.approvals.some(row => row.reviewerId === options['--reviewer'])) throw new Error('Distinct reviewers required')
  const stat = await fs.stat(options['--key-file'])
  if (!stat.isFile() || (stat.mode & 0o077)) throw new Error('Private signing key must be owner-only')
  const key = crypto.createPrivateKey(await fs.readFile(options['--key-file']))
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('Ed25519 key required')
  document.approvals.push({ reviewerId: options['--reviewer'], signature: crypto.sign(null, bytes, key).toString('base64url') })
  await fs.writeFile(options['--output'], JSON.stringify(document, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log('Signed approval written to the new private output file. No withdrawal was performed.')
})().catch(() => {
  console.error('Signing failed. Use --input FILE --output NEW_FILE --key-file PRIVATE_PEM --reviewer ID. Keep keys private and verify the support case before signing.')
  process.exitCode = 1
})
