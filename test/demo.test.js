const { test } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const mongoose = require('mongoose')
const { readFixture } = require('../scripts/lib/demo-fixture')
const { startDemo } = require('../scripts/start-demo')
const { createCredentials, writeCredentials } = require('../scripts/lib/staff-credentials')

test('credential issuance creates private, exclusive files without activating access or printing tokens', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'eoapp-credentials-'))
  const directory = path.join(root, 'issued')
  try {
    const original = process.env.STAFF_TOKEN_BINDINGS
    const command = spawnSync(process.execPath, ['scripts/provision-staff.js', '--institution=demo-enterprise',
      '--staff=demo-operator', '--role=caseworker', `--output=${directory}`], { encoding: 'utf8' })
    assert.equal(command.status, 0, command.stderr)
    const [credential] = JSON.parse(await fs.readFile(path.join(directory, 'credentials.json')))
    const [binding] = JSON.parse(await fs.readFile(path.join(directory, 'bindings.json')))
    assert.match(credential.token, /^[A-Za-z0-9_-]{43}$/)
    assert.equal(binding.token, undefined)
    assert.equal(binding.tokenHash, crypto.createHash('sha256').update(credential.token).digest('hex'))
    assert.equal(command.stdout.includes(credential.token), false)
    assert.equal(command.stderr.includes(credential.token), false)
    assert.equal(process.env.STAFF_TOKEN_BINDINGS, original)
    assert.equal((await fs.stat(directory)).mode & 0o777, 0o700)
    for (const file of ['credentials.json', 'bindings.json']) assert.equal((await fs.stat(path.join(directory, file))).mode & 0o777, 0o600)
    const before = await fs.readFile(path.join(directory, 'credentials.json'), 'utf8')
    await assert.rejects(writeCredentials(directory, createCredentials([{ institutionId: 'demo-enterprise', staffId: 'new-person', role: 'reader' }])))
    assert.equal(await fs.readFile(path.join(directory, 'credentials.json'), 'utf8'), before)
    for (const args of [[], ['--role=admin'], ['--output=relative'], ['--staff=first', '--staff=second'], ['--unknown=value']]) {
      const result = spawnSync(process.execPath, ['scripts/provision-staff.js', ...args], { encoding: 'utf8' })
      assert.equal(result.status, 1)
    }
    assert.throws(() => createCredentials([{ institutionId: 'bank', staffId: 'duplicate', role: 'reader' }, { institutionId: 'bank', staffId: 'duplicate', role: 'reader' }]))
  } finally { await fs.rm(root, { recursive: true, force: true }) }
})

test('replacement fixtures preserve synthetic labels, provider links and unverified status', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'eoapp-fixture-'))
  try {
    const fixture = JSON.parse(await fs.readFile(path.join(__dirname, '../data/synthetic-demo.json')))
    const file = path.join(root, 'fixture.json')
    for (const mutate of [data => { data.synthetic = false }, data => { data.institutions[0].name = 'A real bank' },
      data => { data.products[0].verified = true }, data => { data.products[0].institutionId = 'rdb' },
      data => { data.enquiries[0].branchId = 'demo-growers-branch' }, data => { data.branches[0].publicId = data.products[0].publicId }]) {
      const invalid = structuredClone(fixture); mutate(invalid)
      await fs.writeFile(file, JSON.stringify(invalid))
      await assert.rejects(readFixture(file))
    }
    fixture.products[0].sDes = 'Replaceable synthetic terms'
    await fs.writeFile(file, JSON.stringify(fixture))
    const replacement = await readFixture(file)
    assert.equal(replacement.products[0].sDes, 'Replaceable synthetic terms')
    assert.equal(replacement.products.every(row => row.verified === false), true)
  } finally { await fs.rm(root, { recursive: true, force: true }) }
})

test('demo refuses application database paths, remote origins, credentials and invalid ports', async () => {
  for (const mongoUri of ['mongodb://127.0.0.1:27018/eoapp', 'mongodb://real-bank.invalid', 'mongodb+srv://localhost',
    'mongodb://user:password@localhost', 'mongodb://localhost/?replicaSet=prod', 'mongodb://localhost,remote.invalid']) {
    await assert.rejects(startDemo({ mongoUri }))
  }
  await assert.rejects(startDemo({ port: NaN }))
  await assert.rejects(startDemo({ port: -1 }))
})

test('synthetic demo supports customer/staff workflow and only removes its own session data', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'eoapp-demo-'))
  const mongoUri = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017'
  // A separate sentinel database represents unrelated local application data.
  const sentinelName = `eoapp_demo_test_sentinel_${process.pid}_${Date.now()}`
  const sentinel = await mongoose.createConnection(mongoUri, { dbName: sentinelName }).asPromise()
  const previous = process.env.STAFF_TOKEN_BINDINGS
  const previousMongo = process.env.MONGO_URI
  let demo
  try {
    await sentinel.collection('sentinel').insertOne({ keep: true })
    process.env.MONGO_URI = 'mongodb://production.invalid/never-use-this'
    demo = await startDemo({ mongoUri, port: 0, outputRoot: root })
    const session = JSON.parse(await fs.readFile(path.join(demo.directory, 'session.json')))
    const credentials = JSON.parse(await fs.readFile(path.join(demo.directory, 'credentials.json')))
    const worker = credentials.find(row => row.institutionId === 'demo-enterprise' && row.role === 'caseworker')
    const reader = credentials.find(row => row.institutionId === 'demo-enterprise' && row.role === 'reader')
    const other = credentials.find(row => row.institutionId === 'demo-growers' && row.role === 'caseworker')
    const staff = (token, endpoint, body) => fetch(demo.base + '/api/staff' + endpoint, { method: body ? 'PATCH' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
    const catalogue = await (await fetch(demo.base + '/api/catalogue')).json()
    assert.equal(catalogue.products.length, 2)
    assert.equal(catalogue.branches.length, 2)
    assert.equal(catalogue.institutions.length, 2)
    assert.equal(catalogue.products.every(row => !row.verified && row.lName.startsWith('SYNTHETIC ')), true)
    assert.equal((await fetch(demo.base + '/staff/')).status, 200)
    assert.equal((await fetch(demo.base + '/api/userdata')).status, 404)
    const inbox = await (await staff(worker.token, '/enquiries?status=received')).json()
    const shared = session.receipts.find(row => row.fixtureId === 'demo-shared')
    assert.equal(inbox.enquiries.length, 1)
    assert.equal(inbox.enquiries[0].id, shared.enquiryId)
    assert.equal((await staff(other.token, `/enquiries/${shared.enquiryId}`)).status, 404)
    for (const id of ['demo-private', 'demo-withdrawn']) {
      assert.equal((await staff(worker.token, `/enquiries/${session.receipts.find(row => row.fixtureId === id).enquiryId}`)).status, 404)
    }
    const endpoint = `/enquiries/${shared.enquiryId}/status`
    const body = { expectedStatus: 'received', status: 'contacted' }
    assert.equal((await staff(reader.token, endpoint, body)).status, 403)
    assert.equal((await staff(worker.token, endpoint, body)).status, 200)
    const detail = await (await staff(worker.token, `/enquiries/${shared.enquiryId}`)).json()
    assert.equal(detail.enquiry.statusHistory[0].actorId, worker.staffId)
    assert.equal((await fetch(demo.base + '/api/enquiries/consent/withdraw', { method: 'POST', headers: { Authorization: `Bearer ${shared.withdrawalToken}` } })).status, 200)
    assert.equal((await staff(worker.token, `/enquiries/${shared.enquiryId}`)).status, 404)
    const report = await require('../Backend/Services/retentionPlan').retentionPlan()
    assert.equal(report.mode, 'dry-run')
    assert.equal(report.eligibleCount, 1)
    assert.equal(report.undatedClosedCount, 0)
    await Promise.all([demo.stop(), demo.stop()])
    assert.equal(process.env.STAFF_TOKEN_BINDINGS, previous)
    await assert.rejects(fs.stat(demo.directory), { code: 'ENOENT' })
    assert.equal((await sentinel.db.admin().listDatabases()).databases.some(row => row.name === demo.dbName), false)
    assert.equal(await sentinel.collection('sentinel').countDocuments({ keep: true }), 1)
    const occupied = require('node:net').createServer()
    await new Promise(resolve => occupied.listen(0, '127.0.0.1', resolve))
    try {
      const before = (await sentinel.db.admin().listDatabases()).databases.map(row => row.name).sort()
      await assert.rejects(startDemo({ mongoUri, port: occupied.address().port, outputRoot: root }), { code: 'EADDRINUSE' })
      assert.deepEqual((await sentinel.db.admin().listDatabases()).databases.map(row => row.name).sort(), before)
      assert.deepEqual(await fs.readdir(root), [])
      assert.equal(process.env.STAFF_TOKEN_BINDINGS, previous)
    } finally { await new Promise(resolve => occupied.close(resolve)) }
  } finally {
    if (demo) await demo.stop()
    await sentinel.dropDatabase()
    await sentinel.close()
    await fs.rm(root, { recursive: true, force: true })
    if (previousMongo === undefined) delete process.env.MONGO_URI
    else process.env.MONGO_URI = previousMongo
  }
})
