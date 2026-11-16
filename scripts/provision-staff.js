const path = require('node:path')
const { createCredentials, writeCredentials } = require('./lib/staff-credentials')

async function provision(args) {
  const options = {}
  for (const arg of args) {
    const match = /^--(institution|staff|role|output)=(.+)$/.exec(arg)
    if (!match || options[match[1]]) throw new Error('Invalid or duplicate option')
    options[match[1]] = match[2]
  }
  if (!options.output || !path.isAbsolute(options.output)) throw new Error('An absolute, new --output directory is required')
  const credentials = createCredentials([{ institutionId: options.institution, staffId: options.staff, role: options.role }])
  await writeCredentials(options.output, credentials)
  console.log('Credential files created in the requested private directory. No account was activated. See docs/STAFF_ACCESS.md.')
}

if (require.main === module) provision(process.argv.slice(2)).catch(() => {
  console.error('Provisioning failed. Use --institution=ID --staff=ID --role=reader|caseworker --output=/absolute/new-directory. Existing files are never overwritten.')
  process.exitCode = 1
})
module.exports = { provision }
