const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const mongoose = require('mongoose')
const Enquiry = require('../Backend/Models/enquiryModel')
const Institution = require('../Backend/Models/institutionModel')
const Loan = require('../Backend/Models/loanModel')
const Branch = require('../Backend/Models/branchModel')
const app = require('../Backend/app')
const tokens = Object.fromEntries(['writer', 'reader', 'other'].map(key => [key, crypto.randomBytes(32).toString('base64url')]))
const bindings = [
  { tokenHash: digest(tokens.writer), staffId: 'alpha-worker', institutionId: 'staff-alpha', role: 'caseworker' },
  { tokenHash: digest(tokens.reader), staffId: 'alpha-reader', institutionId: 'staff-alpha', role: 'reader' },
  { tokenHash: digest(tokens.other), staffId: 'beta-worker', institutionId: 'staff-beta', role: 'caseworker' }
]
const originalBindings = process.env.STAFF_TOKEN_BINDINGS
const person = { Name: 'Test applicant', Age: 30, NIC: '123456789V', Sex: 'female', Telephone: '0771234567',
  Address: 'Private test address', email: 'test@example.test', Inquiry: 'Please contact me', Branch: 'Test branch', askLoan: 'Test facility' }
let server, base, alpha, beta, legacy
function digest(token) { return crypto.createHash('sha256').update(token).digest('hex') }
function request(path, token = tokens.writer, method = 'GET', body) {
  return fetch(base + '/api/staff' + path, { method, headers: {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
  }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
}
async function create(institutionId = 'staff-alpha') { return Enquiry.create({ ...person, institutionId,
  sharingConsent: true, consentInstitutionId: institutionId, consentedAt: new Date(), consentVersion: 'institution-contact-v1' }) }
function change(id, status, expectedStatus, token = tokens.writer) {
  return request(`/enquiries/${id}/status`, token, 'PATCH', { status, expectedStatus })
}
before(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017', {
    dbName: `eoapp_staff_test_${process.pid}_${Date.now()}`, serverSelectionTimeoutMS: 5000
  })
  await Promise.all([Enquiry.init(), Institution.init(), Branch.init(), Loan.init()])
  await Institution.create([{ publicId: 'staff-alpha', name: 'Test alpha' }, { publicId: 'staff-beta', name: 'Test beta' }])
  alpha = await create()
  await create()
  beta = await create('staff-beta')
  await create()
  // Truly unassigned records must never be swept into a staff inbox.
  await Enquiry.create(person)
  await Enquiry.create({ ...person, institutionId: 'staff-alpha' })
  legacy = await create()
  await Enquiry.collection.updateOne({ _id: legacy._id }, { $unset: { status: '' } })
  process.env.STAFF_TOKEN_BINDINGS = JSON.stringify(bindings)
  server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => {
  if (originalBindings === undefined) delete process.env.STAFF_TOKEN_BINDINGS
  else process.env.STAFF_TOKEN_BINDINGS = originalBindings
  if (server) await new Promise(resolve => server.close(resolve))
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})

test('staff access fails closed without valid configuration and authentication', async () => {
  const configured = process.env.STAFF_TOKEN_BINDINGS
  try {
    for (const invalid of [undefined, '{broken', '[]', JSON.stringify([{ ...bindings[0], role: 'admin' }]), JSON.stringify([bindings[0], bindings[0]])]) {
      if (invalid === undefined) delete process.env.STAFF_TOKEN_BINDINGS
      else process.env.STAFF_TOKEN_BINDINGS = invalid
      const response = await request('/enquiries')
      assert.equal(response.status, 503)
      assert.equal(response.headers.get('cache-control'), 'no-store')
    }
  } finally { process.env.STAFF_TOKEN_BINDINGS = configured }
  assert.equal((await request('/enquiries', null)).status, 401)
  assert.equal((await request('/enquiries', crypto.randomBytes(32).toString('base64url'))).status, 401)
  assert.equal((await request('/enquiries', 'short')).status, 401)
})

test('inbox pagination stays institution-scoped and excludes private identity data', async () => {
  const seen = new Set()
  let cursor
  do {
    const response = await request('/enquiries?limit=1' + (cursor ? `&before=${cursor}` : ''))
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    const body = await response.json()
    assert.equal(body.enquiries.length, 1)
    const record = body.enquiries[0]
    assert.equal(seen.has(record.id), false)
    seen.add(record.id)
    for (const field of ['NIC', 'Age', 'Sex', 'Address', 'idempotencyKey', 'requestHash', 'statusHistory']) {
      assert.equal(Object.hasOwn(record, field), false)
    }
    assert.equal(record.telephone, person.Telephone)
    assert.equal(record.status, 'received')
    cursor = body.nextCursor
    assert.ok(seen.size <= 5)
  } while (cursor)
  assert.equal(seen.size, 4)
  assert.equal(seen.has(beta.id), false)
  assert.equal(seen.has(legacy.id), true)
  assert.equal((await request(`/enquiries/${beta.id}`)).status, 404)
  const detail = await (await request(`/enquiries/${alpha.id}`)).json()
  assert.deepEqual(detail.enquiry.statusHistory, [])
  assert.equal(Object.hasOwn(detail.enquiry, 'Address'), false)
})

test('filters reject injection and readers cannot update any status', async () => {
  for (const query of ['limit=0', 'limit=101', 'limit=1.5', 'before=invalid', 'status[$ne]=closed', 'institutionId=staff-beta', 'status=unknown']) {
    assert.equal((await request('/enquiries?' + query)).status, 400)
  }
  assert.equal((await request('/enquiries/not-an-id')).status, 400)
  assert.equal((await request('/enquiries', tokens.reader)).status, 200)
  assert.equal((await change(alpha.id, 'closed', 'received', tokens.reader)).status, 403)
  assert.equal((await change(beta.id, 'closed', 'received')).status, 404)
})

test('status changes are audited, retry-safe, terminal and guarded by expected status', async () => {
  const record = await create()
  const first = await change(record.id, 'contacted', 'received')
  assert.equal(first.status, 200)
  const initial = (await first.json()).enquiry
  assert.equal(initial.status, 'contacted')
  assert.equal(initial.statusHistory.length, 1)
  assert.equal(initial.statusHistory[0].actorId, 'alpha-worker')
  assert.equal(initial.statusHistory[0].fromStatus, 'received')
  assert.equal(initial.statusHistory[0].toStatus, 'contacted')
  const replay = await change(record.id, 'contacted', 'received')
  assert.equal(replay.status, 200)
  assert.deepEqual((await replay.json()).enquiry, initial)
  assert.equal((await change(record.id, 'closed', 'received')).status, 409)
  assert.equal((await request(`/enquiries/${record.id}/status`, tokens.writer, 'PATCH', {
    status: 'closed', expectedStatus: 'contacted', institutionId: 'staff-beta'
  })).status, 400)
  assert.equal((await change(record.id, 'closed', 'contacted')).status, 200)
  assert.equal((await change(record.id, 'received', 'closed')).status, 409)
  const final = (await (await request(`/enquiries/${record.id}`)).json()).enquiry
  assert.equal(final.statusHistory.length, 2)
  assert.equal(final.status, 'closed')
  assert.equal((await change(legacy.id, 'contacted', 'received')).status, 200)
  const filtered = await (await request('/enquiries?status=contacted')).json()
  assert.ok(filtered.enquiries.some(row => row.id === legacy.id))
})

test('concurrent duplicate and conflicting changes append only one audit entry', async () => {
  const identical = await create()
  const same = await Promise.all([change(identical.id, 'contacted', 'received'), change(identical.id, 'contacted', 'received')])
  assert.deepEqual(same.map(response => response.status), [200, 200])
  assert.equal((await Enquiry.findById(identical.id).select('+statusHistory')).statusHistory.length, 1)
  const conflicting = await create()
  const opposed = await Promise.all([change(conflicting.id, 'contacted', 'received'), change(conflicting.id, 'closed', 'received')])
  assert.deepEqual(opposed.map(response => response.status).sort(), [200, 409])
  assert.equal((await Enquiry.findById(conflicting.id).select('+statusHistory')).statusHistory.length, 1)
})

test('public submission replay stays a received receipt after staff close the enquiry', async () => {
  await Loan.create({ publicId: 'staff-loan', institutionId: 'staff-alpha', lName: 'Test business loan', category: 'business' })
  await Branch.create({ publicId: 'staff-branch', institutionId: 'staff-alpha', name: 'Test branch' })
  const data = { name: 'Test applicant', age: '30', NIC: '123456789V', sex: 'female', tel: '0771234567',
    addr: 'Test address', email: '', inquiry: '', branch: 'Test branch', askLoan: 'Test business loan',
    productId: 'staff-loan', branchId: 'staff-branch', sharingConsent: true, consentInstitutionId: 'staff-alpha' }
  const submit = () => fetch(base + '/api/userdata', { method: 'POST', headers: {
    'Content-Type': 'application/json', 'Idempotency-Key': 'staff-status-receipt-test'
  }, body: JSON.stringify(data) })
  const first = await submit()
  assert.equal(first.status, 201)
  const receipt = await first.json()
  assert.equal((await change(receipt.enquiryId, 'closed', 'received')).status, 200)
  const replay = await submit()
  assert.equal(replay.status, 200)
  assert.deepEqual(await replay.json(), receipt)
  assert.equal((await fetch(base + '/api/userdata')).status, 404)
})

test('revoked keys and inactive institutions lose access on the next request', async () => {
  const configured = process.env.STAFF_TOKEN_BINDINGS
  try {
    process.env.STAFF_TOKEN_BINDINGS = JSON.stringify(bindings.filter(binding => binding.staffId !== 'alpha-worker'))
    assert.equal((await request('/enquiries')).status, 401)
  } finally { process.env.STAFF_TOKEN_BINDINGS = configured }
  await Institution.updateOne({ publicId: 'staff-beta' }, { $set: { active: false } })
  try {
    assert.equal((await request('/enquiries', tokens.other)).status, 403)
  } finally { await Institution.updateOne({ publicId: 'staff-beta' }, { $set: { active: true } }) }
})

test('sharing consent is explicit, institution-bound and required for staff visibility', async () => {
  const data = { name: 'Test applicant', age: '30', NIC: '123456789V', sex: 'female', tel: '0771234567',
    addr: 'Test address', branch: 'Test branch', askLoan: 'Test business loan', productId: 'staff-loan', branchId: 'staff-branch' }
  const submit = body => fetch(base + '/api/userdata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  for (const change of [
    { sharingConsent: 'true', consentInstitutionId: 'staff-alpha' },
    { sharingConsent: true },
    { sharingConsent: true, consentInstitutionId: 'staff-beta' },
    { sharingConsent: false, consentInstitutionId: 'staff-alpha' }
  ]) assert.equal((await submit({ ...data, ...change })).status, 400)
  const privateResponse = await submit(data)
  assert.equal(privateResponse.status, 201)
  const privateId = (await privateResponse.json()).enquiryId
  assert.equal((await request(`/enquiries/${privateId}`)).status, 404)
  assert.equal((await change(privateId, 'contacted', 'received')).status, 404)
  const shared = await submit({ ...data, sharingConsent: true, consentInstitutionId: 'staff-alpha',
    consentVersion: 'forged-version', consentedAt: '2000-01-01T00:00:00.000Z' })
  assert.equal(shared.status, 201)
  const sharedId = (await shared.json()).enquiryId
  const record = await Enquiry.findById(sharedId)
  assert.equal(record.consentVersion, 'institution-contact-v1')
  assert.ok(record.consentedAt.getTime() > Date.now() - 60000)
  assert.equal((await request(`/enquiries/${sharedId}`)).status, 200)
  assert.equal((await request(`/enquiries/${sharedId}`, tokens.other)).status, 404)
})

test('session endpoint returns only the authenticated staff identity', async () => {
  const response = await request('/session')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { staff: {
    staffId: 'alpha-worker', institutionId: 'staff-alpha', institutionName: 'Test alpha', role: 'caseworker'
  } })
  assert.equal((await request('/session', null)).status, 401)
})

test('staff interface shell is public but contains no records and uses restrictive browser headers', async () => {
  const response = await fetch(base + '/staff/')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('x-frame-options'), 'DENY')
  assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"))
  assert.ok(!response.headers.get('content-security-policy').includes('unsafe-inline'))
  const html = await response.text()
  assert.ok(html.includes('Staff enquiries'))
  assert.ok(!html.includes(person.Name))
  assert.equal((await fetch(base + '/staff/staff.js')).status, 200)
  assert.equal((await fetch(base + '/staff/.env')).status, 404)
})
