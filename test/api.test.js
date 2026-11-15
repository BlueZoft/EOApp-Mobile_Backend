const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const mongoose = require('mongoose')
const Enquiry = require('../Backend/Models/enquiryModel')
const Loan = require('../Backend/Models/loanModel')
const app = require('../Backend/app')
let server, base
before(async () => {
  // Always use a fresh database; never clean a supplied application database.
  await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017', {
    dbName: `eoapp_test_${process.pid}_${Date.now()}`, serverSelectionTimeoutMS: 5000
  })
  await Enquiry.init()
  server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve))
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})
const valid = { name: 'Test applicant', age: '30', NIC: '123456789V', sex: 'female',
  tel: '0771234567', addr: 'Test address', email: '', inquiry: '', branch: 'Test branch', askLoan: 'Test scheme' }
function post(body, key) {
  return fetch(`${base}/api/userdata`, { method: 'POST', headers: {
    'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {})
  }, body: JSON.stringify(body) })
}
test('create, replay, conflict and concurrent retries preserve a single record', async () => {
  const key = 'test-enquiry-key-12345'
  const first = await post(valid, key)
  assert.equal(first.status, 201)
  const result = await first.json()
  assert.equal(result.status, 'received')
  assert.ok(result.enquiryId)
  assert.equal(Object.hasOwn(result, 'NIC'), false)
  const replay = await post(valid, key)
  assert.equal(replay.status, 200)
  assert.deepEqual(await replay.json(), result)
  assert.equal((await post({ ...valid, name: 'Different person' }, key)).status, 409)
  const simultaneous = await Promise.all([post(valid, 'concurrent-test-key-123'), post(valid, 'concurrent-test-key-123')])
  assert.deepEqual(simultaneous.map(r => r.status).sort(), [200, 201])
  assert.equal(await Enquiry.countDocuments({}), 2)
})
test('validation rejects invalid fields without writing records', async () => {
  const count = await Enquiry.countDocuments({})
  for (const change of [{ age: 'abc' }, { age: 17 }, { age: 100 }, { tel: 'abc' }, { NIC: 'abc' }, { sex: '' }, { branch: '' }, { inquiry: 'x'.repeat(251) }]) {
    const response = await post({ ...valid, ...change })
    assert.equal(response.status, 400)
    assert.ok((await response.json()).errors)
  }
  assert.equal((await post(valid, 'bad')).status, 400)
  assert.equal(await Enquiry.countDocuments({}), count)
})
test('public retrieval is unavailable and malformed requests fail', async () => {
  assert.equal((await fetch(`${base}/api/userdata`)).status, 404)
  const response = await fetch(`${base}/api/userdata`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })
  assert.equal(response.status, 400)
})
test('loan catalogue reads database records and filters categories', async () => {
  await Loan.create([{ lName: 'Business test', category: 'business' }, { lName: 'Farm test', category: 'agriculture' }])
  const response = await fetch(`${base}/api/loans?category=business`)
  assert.equal(response.status, 200)
  const { loans } = await response.json()
  assert.equal(loans.length, 1)
  assert.equal(loans[0].lName, 'Business test')
  assert.equal((await fetch(`${base}/api/loans?category=invalid`)).status, 400)
})
test('unexpected storage errors return 500 without exposing internal details', async () => {
  const original = Enquiry.create
  Enquiry.create = async () => { throw new Error('private database credentials') }
  try {
    const response = await post(valid)
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { message: 'An unexpected server error occurred' })
  } finally { Enquiry.create = original }
})

test('historical import is repeatable and does not overwrite curated records', async () => {
  const { seedCatalogue } = require('../scripts/seed-catalogue')
  const historical = require('../data/historical-catalogue.json')
  const Branch = require('../Backend/Models/branchModel')
  await seedCatalogue()
  const id = historical.products[0].publicId
  await Loan.updateOne({ publicId: id }, { $set: { iRate: 'Reviewed terms', verified: true } })
  await seedCatalogue()
  assert.equal(await Loan.countDocuments({ publicId: { $exists: true } }), 15)
  assert.equal(await Branch.countDocuments({}), 276)
  assert.equal((await Loan.findOne({ publicId: id })).iRate, 'Reviewed terms')
  const response = await fetch(`${base}/api/catalogue`)
  assert.equal(response.status, 200)
  const catalogue = await response.json()
  assert.equal(catalogue.schemaVersion, 1)
  assert.equal(catalogue.products.length, 15)
  assert.equal(catalogue.branches.length, 276)
  assert.deepEqual(catalogue.institutions, [])
  assert.equal(catalogue.products.some(row => row._id), false)
})

test('stable IDs resolve server-owned snapshots and reject unavailable/mismatched selections', async () => {
  const Branch = require('../Backend/Models/branchModel')
  await Loan.create({ publicId: 'product-test', lName: 'Authoritative scheme', category: 'business', institutionId: 'bank-a' })
  await Branch.create([
    { publicId: 'branch-test', name: 'Authoritative branch', institutionId: 'bank-a' },
    { publicId: 'branch-other', name: 'Other institution', institutionId: 'bank-b' }
  ])
  const data = { ...valid, productId: 'product-test', branchId: 'branch-test' }
  const response = await post(data, 'catalogue-id-test-123')
  assert.equal(response.status, 201)
  const { enquiryId } = await response.json()
  const record = await Enquiry.findById(enquiryId)
  assert.equal(record.askLoan, 'Authoritative scheme')
  assert.equal(record.Branch, 'Authoritative branch')
  assert.equal(record.institutionId, 'bank-a')
  assert.equal((await post({ ...data, branchId: 'branch-other' })).status, 400)
  assert.equal((await post({ ...data, productId: 'missing-product' })).status, 400)
  await Loan.updateOne({ publicId: 'product-test' }, { $set: { active: false } })
  assert.equal((await post(data)).status, 400)
  const replay = await post(data, 'catalogue-id-test-123')
  assert.equal(replay.status, 200)
  assert.equal((await replay.json()).enquiryId, enquiryId)
  const catalogue = await (await fetch(`${base}/api/catalogue`)).json()
  assert.equal(catalogue.products.some(p => p.publicId === 'product-test'), false)
})
