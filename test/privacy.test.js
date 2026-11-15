const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')
const mongoose = require('mongoose')
const Enquiry = require('../Backend/Models/enquiryModel')
const Institution = require('../Backend/Models/institutionModel')
const Loan = require('../Backend/Models/loanModel')
const Branch = require('../Backend/Models/branchModel')
const { retentionPlan } = require('../Backend/Services/retentionPlan')
const app = require('../Backend/app')
const staffToken = crypto.randomBytes(32).toString('base64url')
const hash = token => crypto.createHash('sha256').update(token).digest('hex')
const originalBindings = process.env.STAFF_TOKEN_BINDINGS
const data = { name: 'Privacy test', age: '30', NIC: '123456789V', sex: 'female', tel: '0771234567', addr: 'Private address',
  branch: 'Test branch', askLoan: 'Test scheme', productId: 'privacy-product', branchId: 'privacy-branch', sharingConsent: true, consentInstitutionId: 'privacy-bank' }
let server, base
before(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017', { dbName: `eoapp_privacy_test_${process.pid}_${Date.now()}`, serverSelectionTimeoutMS: 5000 })
  await Promise.all([Enquiry.init(), Institution.init(), Loan.init(), Branch.init()])
  await Institution.create({ publicId: 'privacy-bank', name: 'Test bank' })
  await Loan.create({ publicId: 'privacy-product', lName: 'Test scheme', category: 'business', institutionId: 'privacy-bank' })
  await Branch.create({ publicId: 'privacy-branch', name: 'Test branch', institutionId: 'privacy-bank' })
  process.env.STAFF_TOKEN_BINDINGS = JSON.stringify([{ tokenHash: hash(staffToken), staffId: 'privacy-worker', institutionId: 'privacy-bank', role: 'caseworker' }])
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  if (originalBindings === undefined) delete process.env.STAFF_TOKEN_BINDINGS; else process.env.STAFF_TOKEN_BINDINGS = originalBindings
  if (server) await new Promise(resolve => server.close(resolve))
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})
function submit(body, key) { return fetch(base + '/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) }) }
function withdraw(token, body) { return fetch(base + '/api/enquiries/consent/withdraw', { method: 'POST', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }) }
function staff(path, method = 'GET', body) { return fetch(base + '/api/staff' + path, { method, headers: { Authorization: `Bearer ${staffToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }) }

test('proof-enabled submission requires valid hidden proof unique to one enquiry', async () => {
  assert.equal((await submit(data, 'privacy-missing-proof-key')).status, 400)
  assert.equal((await submit({ ...data, withdrawalTokenHash: 'invalid' }, 'privacy-bad-proof-key')).status, 400)
  const token = crypto.randomBytes(32).toString('hex')
  const response = await submit({ ...data, withdrawalTokenHash: hash(token) }, 'privacy-proof-key-one')
  assert.equal(response.status, 201)
  const receipt = await response.json()
  assert.deepEqual(Object.keys(receipt).sort(), ['enquiryId', 'status'])
  const record = await Enquiry.findById(receipt.enquiryId)
  assert.equal(record.withdrawalTokenHash, undefined)
  assert.equal((await submit({ ...data, withdrawalTokenHash: hash(token) }, 'privacy-proof-key-two')).status, 409)
  assert.equal((await withdraw(receipt.enquiryId)).status, 401)
  assert.equal((await withdraw(crypto.randomBytes(32).toString('hex'))).status, 404)
  assert.equal((await withdraw(staffToken)).status, 401)
  assert.equal((await withdraw(token, { reason: 'unneeded personal data' })).status, 400)
  assert.equal((await withdraw(token, [])).status, 400)
})

test('withdrawal can recover a lost receipt, is retry-safe and blocks staff and replay re-sharing', async () => {
  const token = crypto.randomBytes(32).toString('hex')
  const body = { ...data, withdrawalTokenHash: hash(token) }
  // Do not use the creation receipt to authorize withdrawal.
  assert.equal((await submit(body, 'privacy-lost-receipt-key')).status, 201)
  const responses = await Promise.all([withdraw(token), withdraw(token)])
  assert.deepEqual(responses.map(r => r.status), [200, 200])
  const first = await responses[0].json(); const second = await responses[1].json()
  assert.deepEqual(first, second)
  assert.equal(first.status, 'withdrawn')
  assert.equal(responses[0].headers.get('cache-control'), 'no-store')
  assert.deepEqual(Object.keys(first).sort(), ['enquiryId', 'status', 'withdrawnAt'])
  assert.equal((await staff(`/enquiries/${first.enquiryId}`)).status, 404)
  assert.equal((await staff(`/enquiries/${first.enquiryId}/status`, 'PATCH', { status: 'contacted', expectedStatus: 'received' })).status, 404)
  const replay = await submit(body, 'privacy-lost-receipt-key')
  assert.equal(replay.status, 200)
  assert.deepEqual(await replay.json(), { enquiryId: first.enquiryId, status: 'received' })
  const record = await Enquiry.findById(first.enquiryId)
  assert.equal(record.sharingConsent, false)
  assert.equal(record.consentWithdrawnAt.toISOString(), first.withdrawnAt)
})

test('withdrawal and a concurrent caseworker update end with no future staff access', async () => {
  const token = crypto.randomBytes(32).toString('hex')
  const receipt = await (await submit({ ...data, withdrawalTokenHash: hash(token) }, 'privacy-race-key')).json()
  const results = await Promise.all([withdraw(token), staff(`/enquiries/${receipt.enquiryId}/status`, 'PATCH', { status: 'closed', expectedStatus: 'received' })])
  assert.equal(results[0].status, 200)
  assert.ok([200, 404, 409].includes(results[1].status))
  assert.equal((await Enquiry.findById(receipt.enquiryId)).sharingConsent, false)
  assert.equal((await staff(`/enquiries/${receipt.enquiryId}`)).status, 404)
})

test('retention default is 180 days, uses latest terminal date and reports counts without writes', async () => {
  const now = new Date('2030-01-01T00:00:00.000Z')
  const ago = days => new Date(now.getTime() - days * 86400000)
  const person = { Name: 'Retention test', Age: 30, NIC: '123456789V', Sex: 'female', Telephone: '0771234567', Address: 'Private address', Branch: 'Test branch', askLoan: 'Test scheme' }
  await Enquiry.create([
    { ...person, status: 'closed', statusChangedAt: ago(200) },
    { ...person, consentWithdrawnAt: ago(210) },
    { ...person, status: 'closed', statusChangedAt: ago(2), consentWithdrawnAt: ago(300) },
    { ...person, status: 'closed' },
    { ...person, createdAt: ago(300) },
    { ...person, status: 'closed', statusChangedAt: ago(180) }
  ])
  // Report on fixtures only, separate from the withdrawal tests' current-date records.
  const fixtureIds = (await Enquiry.find({ Name: 'Retention test' }).select('_id')).map(row => row._id)
  const allBefore = await Enquiry.find().select('+withdrawalTokenHash +requestHash').lean()
  const report = await retentionPlan({ now })
  const expectedOther = allBefore.filter(row => !fixtureIds.some(id => id.equals(row._id)) && row.consentWithdrawnAt && row.consentWithdrawnAt <= ago(180)).length
  assert.equal(report.mode, 'dry-run')
  assert.equal(report.policyDays, 180)
  assert.equal(report.eligibleCount, 3 + expectedOther)
  assert.equal(report.undatedClosedCount, 1)
  assert.equal(JSON.stringify(report).includes('Private address'), false)
  assert.deepEqual(await Enquiry.find().select('+withdrawalTokenHash +requestHash').lean(), allBefore)
  await assert.rejects(retentionPlan({ days: 0 }))
  await assert.rejects(retentionPlan({ days: 1.5 }))
  const invalid = spawnSync(process.execPath, ['scripts/retention-report.js', '--apply'], { cwd: require('node:path').join(__dirname, '..'), encoding: 'utf8' })
  assert.equal(invalid.status, 1)
  assert.ok(invalid.stderr.includes('never deletes data'))
})
