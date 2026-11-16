const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const mongoose = require('mongoose')
const { readFixture } = require('./lib/demo-fixture')
const { createCredentials, writeCredentials } = require('./lib/staff-credentials')

async function startDemo({ mongoUri = 'mongodb://127.0.0.1:27018', port = 5100, fixtureFile,
  outputRoot = path.join(__dirname, '../.demo') } = {}) {
  // Deliberately ignore MONGO_URI/.env, database paths, remote hosts and caller-selected database names.
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?\/?$/.test(mongoUri) ||
      !Number.isInteger(port) || port < 0 || port > 65535 || mongoose.connection.readyState !== 0) {
    throw new Error('The demo requires a local MongoDB origin, an unused connection and a valid port')
  }
  const fixture = await readFixture(fixtureFile)
  const runId = crypto.randomBytes(16).toString('hex')
  const dbName = `eoapp_demo_${runId}`
  const directory = path.join(outputRoot, runId)
  const credentials = createCredentials(fixture.institutions.flatMap(row => ['caseworker', 'reader'].map(role => ({
    institutionId: row.publicId, staffId: `${row.publicId}-${role}`, role
  }))))
  const previousBindings = process.env.STAFF_TOKEN_BINDINGS
  let server, ownsDatabase = false, ownsDirectory = false, stopping
  function stop() {
    if (!stopping) stopping = (async () => {
      try {
        if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
        // Only a fresh, randomly named database created by this run may be removed.
        if (ownsDatabase && mongoose.connection.name === dbName) await mongoose.connection.dropDatabase()
      } finally {
        await mongoose.connection.close()
        if (previousBindings === undefined) delete process.env.STAFF_TOKEN_BINDINGS
        else process.env.STAFF_TOKEN_BINDINGS = previousBindings
        if (ownsDirectory) await fs.rm(directory, { recursive: true, force: true })
      }
    })()
    return stopping
  }
  try {
    await mongoose.connect(mongoUri, { dbName, serverSelectionTimeoutMS: 5000, autoCreate: false, autoIndex: false })
    if ((await mongoose.connection.db.listCollections().toArray()).length) throw new Error('Demo database must be empty')
    ownsDatabase = true
    const Institution = require('../Backend/Models/institutionModel')
    const Loan = require('../Backend/Models/loanModel')
    const Branch = require('../Backend/Models/branchModel')
    const Enquiry = require('../Backend/Models/enquiryModel')
    for (const model of [Institution, Loan, Branch, Enquiry]) {
      await model.createCollection()
      await model.createIndexes()
    }
    await Institution.insertMany(fixture.institutions)
    await Loan.insertMany(fixture.products)
    await Branch.insertMany(fixture.branches)
    await fs.mkdir(outputRoot, { recursive: true, mode: 0o700 })
    await writeCredentials(directory, credentials)
    ownsDirectory = true
    process.env.STAFF_TOKEN_BINDINGS = JSON.stringify(credentials.map(({ token, ...binding }) => binding))
    server = require('../Backend/app').listen(port, '127.0.0.1')
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject) })
    const base = `http://127.0.0.1:${server.address().port}`
    const receipts = []
    for (const row of fixture.enquiries) {
      const product = fixture.products.find(product => product.publicId === row.productId)
      const branch = fixture.branches.find(branch => branch.publicId === row.branchId)
      const proof = crypto.randomBytes(32).toString('hex')
      const key = crypto.randomBytes(24).toString('base64url')
      const response = await fetch(base + '/api/enquiries', { method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({
          name: row.name, age: 30, NIC: '000000000V', sex: 'female', tel: '0000000000',
          addr: 'SYNTHETIC address; not a real location', email: 'applicant@example.invalid', inquiry: 'SYNTHETIC enquiry; do not contact anyone.',
          productId: product.publicId, askLoan: product.lName, branchId: branch.publicId, branch: branch.name,
          sharingConsent: row.sharingConsent, ...(row.sharingConsent ? { consentInstitutionId: product.institutionId } : {}),
          withdrawalTokenHash: crypto.createHash('sha256').update(proof).digest('hex')
        }) })
      if (response.status !== 201) throw new Error('Synthetic enquiry creation failed')
      const receipt = await response.json()
      if (row.withdraw) {
        const withdrawal = await fetch(base + '/api/enquiries/consent/withdraw', { method: 'POST',
          signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${proof}` } })
        if (withdrawal.status !== 200) throw new Error('Synthetic withdrawal failed')
      }
      if (row.closedDaysAgo) {
        const worker = credentials.find(entry => entry.institutionId === product.institutionId && entry.role === 'caseworker')
        const closure = await fetch(base + `/api/staff/enquiries/${receipt.enquiryId}/status`, { method: 'PATCH',
          signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${worker.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedStatus: 'received', status: 'closed' }) })
        if (closure.status !== 200) throw new Error('Synthetic closure failed')
        // Artificial ageing is limited to newly generated demo records, never an application migration.
        const at = new Date(Date.now() - row.closedDaysAgo * 86400000)
        await Enquiry.collection.updateOne({ _id: new mongoose.Types.ObjectId(receipt.enquiryId) }, {
          $set: { statusChangedAt: at, 'statusHistory.0.at': at, createdAt: at, updatedAt: at, consentedAt: at }
        })
      }
      receipts.push({ fixtureId: row.id, ...receipt, withdrawalToken: proof, idempotencyKey: key })
    }
    await fs.writeFile(path.join(directory, 'session.json'), JSON.stringify({ synthetic: true, base, dbName, receipts }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
    await fs.writeFile(path.join(directory, 'support-request.json'), JSON.stringify({ payload: {
      schemaVersion: 1, action: 'withdraw-sharing', database: dbName, enquiryId: receipts[0].enquiryId,
      caseReference: 'DEMO-SUPPORT-001', verifiedAt: new Date().toISOString()
    }, approvals: [] }, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
    return { base, dbName, directory, stop }
  } catch (error) {
    await stop()
    throw error
  }
}

if (require.main === module) {
  startDemo({ mongoUri: process.env.DEMO_MONGO_ORIGIN || 'mongodb://127.0.0.1:27018',
    port: process.env.DEMO_PORT === undefined ? 5100 : Number(process.env.DEMO_PORT), fixtureFile: process.env.DEMO_FIXTURE }).then(demo => {
    console.log(`SYNTHETIC ONLY: demo listening on loopback port ${new URL(demo.base).port}. No external delivery is configured.`)
    console.log(`Private credentials/receipts: ${demo.directory}. See docs/SYNTHETIC_DEVELOPMENT.md; never commit or share these files.`)
    console.log('Ctrl-C removes only this session database and credentials. Existing application data is untouched.')
    const shutdown = () => demo.stop().catch(() => { console.error('Demo cleanup failed; inspect the session database locally.'); process.exitCode = 1 })
    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
  }).catch(() => {
    console.error('Demo startup failed; check local MongoDB, port availability and the synthetic fixture. No production configuration is used.')
    process.exitCode = 1
  })
}
module.exports = { startDemo }
