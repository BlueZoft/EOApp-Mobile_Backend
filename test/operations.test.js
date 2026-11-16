const { test, before, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const mongoose = require('mongoose')
const Enquiry = require('../Backend/Models/enquiryModel')
const Institution = require('../Backend/Models/institutionModel')
const Branch = require('../Backend/Models/branchModel')
const app = require('../Backend/app')
const { runNotifications } = require('../Backend/Services/notificationWorker')
const { localNotificationTransport } = require('../Backend/Services/localNotificationTransport')
const { retentionPlan } = require('../Backend/Services/retentionPlan')
const { executeRetention } = require('../Backend/Services/retentionExecution')
const { approvalBytes, verifyApproval, withdrawWithApproval } = require('../Backend/Services/supportWithdrawal')
const dbName = `eoapp_operations_test_${process.pid}_${Date.now()}`
const mongoOrigin = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017'
const staffToken = crypto.randomBytes(32).toString('base64url')
const originalBindings = process.env.STAFF_TOKEN_BINDINGS
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
let server, base, directory
before(async () => {
  await mongoose.connect(mongoOrigin, { dbName, serverSelectionTimeoutMS: 5000 })
  await Promise.all([Enquiry.init(), Institution.init(), Branch.init()])
  await Institution.create({ publicId: 'demo-bank', name: 'SYNTHETIC Bank' })
  await Branch.create({ publicId: 'demo-branch', name: 'SYNTHETIC Branch', institutionId: 'demo-bank' })
  process.env.STAFF_TOKEN_BINDINGS = JSON.stringify([{ tokenHash: hash(staffToken), staffId: 'demo-worker', institutionId: 'demo-bank', role: 'caseworker' }])
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'eoapp-operations-'))
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})
beforeEach(async () => {
  await Enquiry.deleteMany({})
  await Institution.updateOne({ publicId: 'demo-bank' }, { active: true })
})
after(async () => {
  if (originalBindings === undefined) delete process.env.STAFF_TOKEN_BINDINGS; else process.env.STAFF_TOKEN_BINDINGS = originalBindings
  if (server) await new Promise(resolve => server.close(resolve))
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  if (directory) await fs.rm(directory, { recursive: true, force: true })
})
async function submit(shared = true) {
  const proof = crypto.randomBytes(32).toString('hex'), key = crypto.randomBytes(24).toString('base64url')
  const body = { name: 'SYNTHETIC Applicant', age: 30, NIC: '000000000V', sex: 'female', tel: '0000000000',
    addr: 'SYNTHETIC address', email: 'test@example.invalid', inquiry: 'SYNTHETIC details', branch: 'branch', askLoan: 'General', branchId: 'demo-branch',
    sharingConsent: shared, ...(shared ? { consentInstitutionId: 'demo-bank' } : {}), withdrawalTokenHash: hash(proof) }
  const response = await post(body, key)
  assert.equal(response.status, 201)
  return { proof, key, body, receipt: await response.json() }
}
function post(body, key) { return fetch(base + '/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) }) }
function withdraw(proof) { return fetch(base + '/api/enquiries/consent/withdraw', { method: 'POST', headers: { Authorization: `Bearer ${proof}` } }) }
function record(id) { return Enquiry.findById(id).select('+notification +supportWithdrawal +withdrawalTokenHash +idempotencyKey +requestHash').lean() }
async function ageClosed(id, days, now = new Date()) {
  await Enquiry.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { status: 'closed', statusChangedAt: new Date(now.getTime() - days * 86400000) } })
}

test('outbox is atomic with consented creation, absent for private submissions and unchanged by replay/disabled worker', async () => {
  const shared = await submit(), privateRow = await submit(false)
  assert.equal((await record(shared.receipt.enquiryId)).notification.state, 'pending')
  assert.equal((await record(privateRow.receipt.enquiryId)).notification, undefined)
  const before = await record(shared.receipt.enquiryId)
  assert.equal((await post(shared.body, shared.key)).status, 200)
  assert.equal((await runNotifications()).mode, 'disabled')
  assert.deepEqual(await record(shared.receipt.enquiryId), before)
})

test('concurrent workers deliver one private local message without applicant data or credentials', async () => {
  const row = await submit(), spool = path.join(directory, 'concurrent')
  const transport = await localNotificationTransport(spool, dbName)
  const results = await Promise.all([runNotifications({ transport }), runNotifications({ transport })])
  assert.equal(results.reduce((sum, result) => sum + result.delivered, 0), 1)
  const files = await fs.readdir(spool); assert.equal(files.length, 1)
  const text = await fs.readFile(path.join(spool, files[0]), 'utf8')
  const message = JSON.parse(text)
  assert.equal(message.synthetic, true)
  assert.equal(message.enquiryId, row.receipt.enquiryId)
  for (const value of ['Applicant', '000000000V', 'test@example.invalid', row.proof, row.key, staffToken]) assert.equal(text.includes(value), false)
  assert.equal((await fs.stat(path.join(spool, files[0]))).mode & 0o777, 0o600)
  assert.equal((await record(row.receipt.enquiryId)).notification.state, 'delivered')
  const detail = await (await fetch(base + '/api/staff/enquiries/' + row.receipt.enquiryId, { headers: { Authorization: `Bearer ${staffToken}` } })).json()
  assert.equal(JSON.stringify(detail).includes('notification'), false)
  await assert.rejects(localNotificationTransport(spool, 'eoapp'))
  await assert.rejects(transport.deliver({ ...message, institutionId: 'rdb' }))
})

test('uncertain delivery retries keep one event/file and expired leases recover without duplicates', async () => {
  const row = await submit(), spool = path.join(directory, 'retry'), transport = await localNotificationTransport(spool, dbName)
  let clock = new Date(Date.now() + 1000)
  const first = await runNotifications({ now: () => clock, transport: { async deliver(event) {
    await transport.deliver(event); throw new Error('SMTP password and personal details must not be persisted')
  } } })
  assert.equal(first.retried, 1)
  let saved = await record(row.receipt.enquiryId)
  assert.equal(saved.notification.state, 'pending')
  assert.equal(saved.notification.lastCode, 'transport_error')
  assert.equal(saved.notification.nextAttemptAt.getTime(), clock.getTime() + 5000)
  // Simulate a second worker that crashed after claiming an expired lease.
  await Enquiry.updateOne({ _id: saved._id }, { $set: { 'notification.state': 'processing', 'notification.leaseToken': 'dead-worker', 'notification.leaseUntil': clock } })
  clock = new Date(clock.getTime() + 6000)
  assert.equal((await runNotifications({ transport, now: () => clock })).delivered, 1)
  assert.equal((await fs.readdir(spool)).length, 1)
  saved = await record(row.receipt.enquiryId)
  assert.equal(saved.notification.attempts, 2)
  assert.equal(saved.notification.leaseToken, undefined)
})

test('delivery failures stop at the attempt limit and retain only generic error codes', async () => {
  const row = await submit()
  let clock = new Date(Date.now() + 1000), calls = 0
  const transport = { async deliver() { calls++; throw new Error('secret credentials') } }
  for (let i = 0; i < 6; i++) {
    await runNotifications({ transport, now: () => clock })
    clock = new Date(clock.getTime() + 3600000)
  }
  assert.equal(calls, 5)
  const saved = await record(row.receipt.enquiryId)
  assert.equal(saved.notification.state, 'failed')
  assert.equal(JSON.stringify(saved.notification).includes('secret'), false)
})

test('withdrawal, closure and inactive providers cancel unsent notifications; late acceptance cannot restore state', async () => {
  const withdrawn = await submit(), closed = await submit()
  await withdraw(withdrawn.proof); await ageClosed(closed.receipt.enquiryId, 1)
  let calls = 0
  const transport = { async deliver() { calls++; return { deliveryId: 'local' } } }
  assert.equal((await runNotifications({ transport })).cancelled, 1)
  assert.equal(calls, 0)
  const inactive = await submit()
  await Institution.updateOne({ publicId: 'demo-bank' }, { active: false })
  assert.equal((await runNotifications({ transport })).cancelled, 1)
  assert.equal((await record(inactive.receipt.enquiryId)).notification.state, 'cancelled')
  await Institution.updateOne({ publicId: 'demo-bank' }, { active: true })
  const late = await submit()
  const result = await runNotifications({ transport: { async deliver() { await withdraw(late.proof); return { deliveryId: 'late' } } } })
  assert.equal(result.delivered, 0)
  assert.equal((await record(late.receipt.enquiryId)).notification.state, 'cancelled')
})

test('retention uses latest terminal date, preserves holds/open/undated records and strips unknown personal fields', async () => {
  const now = new Date(), due = await submit(), boundary = await submit(), recent = await submit(), held = await submit(), open = await submit(), undated = await submit()
  await ageClosed(due.receipt.enquiryId, 200, now); await ageClosed(boundary.receipt.enquiryId, 180, now)
  await ageClosed(recent.receipt.enquiryId, 300, now); await withdraw(recent.proof)
  await ageClosed(held.receipt.enquiryId, 200, now)
  await Enquiry.updateOne({ _id: held.receipt.enquiryId }, { retentionHold: true })
  await Enquiry.updateOne({ _id: undated.receipt.enquiryId }, { status: 'closed' })
  await Enquiry.collection.updateOne({ _id: new mongoose.Types.ObjectId(due.receipt.enquiryId) }, { $set: { legacyPersonalData: 'SYNTHETIC secret' } })
  const before = await record(open.receipt.enquiryId)
  const plan = await retentionPlan({ now })
  assert.equal(plan.eligibleCount, 2); assert.equal(plan.heldCount, 1); assert.equal(plan.undatedClosedCount, 1)
  assert.equal((await executeRetention({ now, limit: 1 })).scrubbedCount, 1)
  assert.equal((await executeRetention({ now })).scrubbedCount, 1)
  assert.equal((await executeRetention({ now })).scrubbedCount, 0)
  assert.equal((await retentionPlan({ now })).eligibleCount, 0)
  const tombstone = await Enquiry.collection.findOne({ _id: new mongoose.Types.ObjectId(due.receipt.enquiryId) })
  assert.deepEqual(Object.keys(tombstone).sort(), ['_id', 'consentWithdrawnAt', 'idempotencyKey', 'purgedAt', 'requestHash', 'retentionPolicyDays', 'sharingConsent', 'status', 'withdrawalTokenHash'].sort())
  assert.equal(tombstone.sharingConsent, false)
  assert.equal(JSON.stringify(tombstone).includes('SYNTHETIC'), false)
  assert.deepEqual(await record(open.receipt.enquiryId), before)
  assert.equal((await record(held.receipt.enquiryId)).Name, 'SYNTHETIC Applicant')
  assert.equal((await record(recent.receipt.enquiryId)).purgedAt, undefined)
  await assert.rejects(executeRetention({ days: 0 }))
  await assert.rejects(executeRetention({ limit: 1001 }))
})

test('purged enquiries reject keyed replay/re-sharing but still acknowledge device-proof withdrawal', async () => {
  const row = await submit(); await ageClosed(row.receipt.enquiryId, 200)
  assert.equal((await executeRetention()).scrubbedCount, 1)
  assert.equal((await post(row.body, row.key)).status, 410)
  assert.equal((await post({ ...row.body, name: 'SYNTHETIC Changed' }, row.key)).status, 409)
  assert.equal((await post(row.body, crypto.randomBytes(24).toString('hex'))).status, 409)
  const before = await Enquiry.collection.findOne({ _id: new mongoose.Types.ObjectId(row.receipt.enquiryId) })
  const response = await withdraw(row.proof)
  assert.equal(response.status, 200)
  assert.equal((await response.json()).status, 'withdrawn')
  assert.deepEqual(await Enquiry.collection.findOne({ _id: before._id }), before)
  assert.equal((await fetch(base + '/api/staff/enquiries/' + row.receipt.enquiryId, { headers: { Authorization: `Bearer ${staffToken}` } })).status, 404)
  let calls = 0
  await runNotifications({ transport: { async deliver() { calls++ } } })
  assert.equal(calls, 0)
})

test('ambiguous terminal dates stay for review even when another terminal date is old', async () => {
  const undated = await submit(), malformed = await submit(), old = new Date(Date.now() - 200 * 86400000)
  await Enquiry.collection.updateOne({ _id: new mongoose.Types.ObjectId(undated.receipt.enquiryId) }, { $set: { status: 'closed', consentWithdrawnAt: old } })
  await ageClosed(malformed.receipt.enquiryId, 200)
  await Enquiry.collection.updateOne({ _id: new mongoose.Types.ObjectId(malformed.receipt.enquiryId) }, { $set: { consentWithdrawnAt: 'invalid-date' } })
  const plan = await retentionPlan()
  assert.equal(plan.eligibleCount, 0)
  assert.equal(plan.undatedClosedCount, 1)
  assert.equal(plan.malformedWithdrawalCount, 1)
  assert.equal((await executeRetention()).scrubbedCount, 0)
})

test('concurrent withdrawal and retention never re-share a record or scrub a newer withdrawal selected earlier', async () => {
  const row = await submit(); await ageClosed(row.receipt.enquiryId, 200)
  const original = Enquiry.collection.updateMany
  try {
    Enquiry.collection.updateMany = async function (...args) { await withdraw(row.proof); return original.apply(this, args) }
    assert.equal((await executeRetention()).scrubbedCount, 0)
  } finally { Enquiry.collection.updateMany = original }
  const saved = await record(row.receipt.enquiryId)
  assert.equal(saved.sharingConsent, false)
  assert.equal(saved.purgedAt, undefined)
})

test('retention CLI requires explicit activation and exact database confirmation; apply changes only synthetic fixtures', async () => {
  const row = await submit(); await ageClosed(row.receipt.enquiryId, 200)
  const uri = `${mongoOrigin.replace(/\/$/, '')}/${dbName}`
  const env = { ...process.env, MONGO_URI: uri, RETENTION_EXECUTION_ENABLED: 'true' }
  for (const [args, enabled] of [[['--confirm-database', dbName], 'false'], [['--confirm-database', 'wrong-database'], 'true'], [['--apply'], 'true']]) {
    const result = spawnSync(process.execPath, ['scripts/retention-apply.js', ...args], { env: { ...env, RETENTION_EXECUTION_ENABLED: enabled }, encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.equal((await record(row.receipt.enquiryId)).purgedAt, undefined)
  }
  const applied = spawnSync(process.execPath, ['scripts/retention-apply.js', '--confirm-database', dbName], { env, encoding: 'utf8' })
  assert.equal(applied.status, 0, applied.stderr)
  assert.equal(JSON.parse(applied.stdout).scrubbedCount, 1)
})

test('maintenance defaults do not create a database or initialize collections/indexes', async () => {
  const name = dbName + '_readonly'
  const env = { ...process.env, MONGO_URI: `${mongoOrigin.replace(/\/$/, '')}/${name}` }
  const report = spawnSync(process.execPath, ['scripts/retention-report.js'], { env, encoding: 'utf8' })
  assert.equal(report.status, 0, report.stderr)
  assert.equal(JSON.parse(report.stdout).mode, 'dry-run')
  const disabled = spawnSync(process.execPath, ['scripts/run-notifications.js'], { env, encoding: 'utf8' })
  assert.equal(disabled.status, 0)
  assert.equal(JSON.parse(disabled.stdout).mode, 'disabled')
  assert.equal((await mongoose.connection.db.admin().listDatabases()).databases.some(row => row.name === name), false)
})

function approval(id, now = new Date()) {
  const first = crypto.generateKeyPairSync('ed25519'), second = crypto.generateKeyPairSync('ed25519')
  const payload = { schemaVersion: 1, action: 'withdraw-sharing', database: dbName, enquiryId: id, caseReference: 'DEMO-CASE-001', verifiedAt: now.toISOString() }
  const trustedKeys = { 'reviewer-one': first.publicKey.export({ format: 'pem', type: 'spki' }), 'reviewer-two': second.publicKey.export({ format: 'pem', type: 'spki' }) }
  const document = { payload, approvals: [first, second].map((key, i) => ({ reviewerId: i ? 'reviewer-two' : 'reviewer-one', signature: crypto.sign(null, approvalBytes(payload), key.privateKey).toString('base64url') })) }
  return { document, trustedKeys, first, second }
}

test('support withdrawal needs two independent trusted signatures and rejects reference-only, expired and tampered requests', async () => {
  const row = await submit(), now = new Date(), signed = approval(row.receipt.enquiryId, now)
  for (const mutate of [doc => { doc.approvals.pop() }, doc => { doc.approvals[1] = doc.approvals[0] },
    doc => { doc.approvals[1].reviewerId = 'unknown' }, doc => { doc.payload.enquiryId = crypto.randomBytes(12).toString('hex') },
    doc => { doc.payload.caseReference = 'DEMO-OTHER-CASE' }, doc => { doc.payload.name = 'extra personal info' }]) {
    const document = structuredClone(signed.document); mutate(document)
    await assert.rejects(withdrawWithApproval({ document, trustedKeys: signed.trustedKeys, now }))
  }
  assert.throws(() => verifyApproval(signed.document, signed.trustedKeys, 'another-database', now))
  assert.throws(() => verifyApproval(signed.document, signed.trustedKeys, dbName, new Date(now.getTime() + 86400001)))
  assert.throws(() => verifyApproval(signed.document, signed.trustedKeys, dbName, new Date(now.getTime() - 1)))
  assert.throws(() => verifyApproval(signed.document, { ...signed.trustedKeys, 'reviewer-two': signed.trustedKeys['reviewer-one'] }, dbName, now))
  assert.equal((await record(row.receipt.enquiryId)).sharingConsent, true)
  assert.deepEqual(await withdrawWithApproval({ ...signed, now }), { status: 'withdrawn', changed: true })
  assert.deepEqual(await withdrawWithApproval({ ...signed, now }), { status: 'withdrawn', changed: false })
  const saved = await record(row.receipt.enquiryId)
  assert.equal(saved.sharingConsent, false)
  assert.equal(saved.notification.state, 'cancelled')
  assert.deepEqual(saved.supportWithdrawal.reviewerIds, ['reviewer-one', 'reviewer-two'])
  assert.equal(JSON.stringify(saved.supportWithdrawal).includes('DEMO-CASE-001'), false)
  assert.equal((await post(row.body, row.key)).status, 200)
  assert.equal((await record(row.receipt.enquiryId)).sharingConsent, false)
})

test('support path handles legacy/lost-proof records, concurrent approvals and minimal post-retention acknowledgements', async () => {
  const row = await submit()
  await Enquiry.updateOne({ _id: row.receipt.enquiryId }, { $unset: { withdrawalTokenHash: '' } })
  const signed = approval(row.receipt.enquiryId)
  const results = await Promise.all([withdrawWithApproval(signed), withdrawWithApproval(signed)])
  assert.equal(results.filter(row => row.changed).length, 1)
  await Enquiry.updateOne({ _id: row.receipt.enquiryId }, { consentWithdrawnAt: new Date(Date.now() - 200 * 86400000) })
  await executeRetention()
  assert.deepEqual(await withdrawWithApproval(signed), { status: 'withdrawn', changed: false })
  assert.equal((await record(row.receipt.enquiryId)).supportWithdrawal, undefined)
  const missing = approval(crypto.randomBytes(12).toString('hex'))
  assert.deepEqual(await withdrawWithApproval(missing), { status: 'unavailable', changed: false })
})

test('signing CLI uses private keys/new files and support CLI stays disabled without explicit configuration', async () => {
  const row = await submit(), signed = approval(row.receipt.enquiryId)
  const keyFile = path.join(directory, 'reviewer.pem'), input = path.join(directory, 'request.json'), output = path.join(directory, 'signed-one.json')
  await fs.writeFile(keyFile, signed.first.privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 })
  await fs.writeFile(input, JSON.stringify({ payload: signed.document.payload, approvals: [] }), { mode: 0o600 })
  const args = ['scripts/sign-support-approval.js', '--input', input, '--output', output, '--key-file', keyFile, '--reviewer', 'reviewer-one']
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const document = JSON.parse(await fs.readFile(output))
  assert.equal(document.approvals.length, 1)
  assert.equal(crypto.verify(null, approvalBytes(document.payload), signed.first.publicKey, Buffer.from(document.approvals[0].signature, 'base64url')), true)
  assert.equal((await fs.stat(output)).mode & 0o777, 0o600)
  assert.equal(spawnSync(process.execPath, args, { encoding: 'utf8' }).status, 1)
  const disabled = spawnSync(process.execPath, ['scripts/support-withdraw.js', '--approval-file', output], { env: { ...process.env, SUPPORT_WITHDRAWAL_ENABLED: 'false' }, encoding: 'utf8' })
  assert.equal(disabled.status, 1)
  assert.equal((await record(row.receipt.enquiryId)).sharingConsent, true)
  const secondKey = path.join(directory, 'reviewer-two.pem'), approved = path.join(directory, 'approved.json')
  await fs.writeFile(secondKey, signed.second.privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 })
  const second = spawnSync(process.execPath, ['scripts/sign-support-approval.js', '--input', output, '--output', approved,
    '--key-file', secondKey, '--reviewer', 'reviewer-two'], { encoding: 'utf8' })
  assert.equal(second.status, 0, second.stderr)
  const applied = spawnSync(process.execPath, ['scripts/support-withdraw.js', '--approval-file', approved], { encoding: 'utf8',
    env: { ...process.env, MONGO_URI: `${mongoOrigin.replace(/\/$/, '')}/${dbName}`, SUPPORT_WITHDRAWAL_ENABLED: 'true', SUPPORT_REVIEWER_KEYS: JSON.stringify(signed.trustedKeys) } })
  assert.equal(applied.status, 0, applied.stderr)
  assert.deepEqual(JSON.parse(applied.stdout), { status: 'withdrawn', changed: true })
  assert.equal((await record(row.receipt.enquiryId)).sharingConsent, false)
})
