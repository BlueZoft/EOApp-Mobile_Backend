const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const mongoose = require('mongoose')
const { chromium } = require('playwright')
const app = require('../Backend/app')
const Enquiry = require('../Backend/Models/enquiryModel')
const Institution = require('../Backend/Models/institutionModel')
const tokens = Object.fromEntries(['writer', 'reader'].map(name => [name, crypto.randomBytes(32).toString('base64url')]))
const bindings = Object.entries(tokens).map(([role, token]) => ({
  tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
  institutionId: 'browser-alpha', staffId: 'alpha-' + role,
  role: role === 'reader' ? 'reader' : 'caseworker'
}))
const originalBindings = process.env.STAFF_TOKEN_BINDINGS
let browser, server, base, applicant
const person = { Name: 'Alpha applicant', Age: 30, NIC: '123456789V', Sex: 'female', Telephone: '0771234567',
  Address: 'Private street address', email: 'test@example.test', Inquiry: 'Business expansion',
  Branch: 'Test branch', askLoan: 'Test business scheme', institutionId: 'browser-alpha',
  sharingConsent: true, consentInstitutionId: 'browser-alpha', consentVersion: 'institution-contact-v1', consentedAt: new Date() }
before(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017', {
    dbName: `eoapp_browser_test_${process.pid}_${Date.now()}`, serverSelectionTimeoutMS: 5000
  })
  await Promise.all([Institution.init(), Enquiry.init()])
  await Institution.create([{ publicId: 'browser-alpha', name: 'Test Alpha Bank' }, { publicId: 'browser-beta', name: 'Test Beta Bank' }])
  await Enquiry.create(Array.from({ length: 21 }, (_, index) => ({ ...person, Name: `Test applicant ${index}` })))
  await Enquiry.create({ ...person, Name: '<img src=x onerror="window.__xss=true">' })
  applicant = await Enquiry.create(person)
  await Enquiry.create({ ...person, Name: 'Other bank applicant', institutionId: 'browser-beta', consentInstitutionId: 'browser-beta' })
  await Enquiry.create({ ...person, Name: 'Unconsented applicant', sharingConsent: false })
  process.env.STAFF_TOKEN_BINDINGS = JSON.stringify(bindings)
  server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) })
})
after(async () => {
  if (originalBindings === undefined) delete process.env.STAFF_TOKEN_BINDINGS
  else process.env.STAFF_TOKEN_BINDINGS = originalBindings
  if (browser) await browser.close()
  if (server) await new Promise(resolve => server.close(resolve))
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})
async function pageFor(role = 'writer', viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport, timezoneId: 'Asia/Colombo' })
  const page = await context.newPage()
  await page.goto(base + '/staff/')
  await page.getByLabel('Staff access token').fill(tokens[role])
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.locator('#rows button').first().waitFor()
  return { context, page }
}
async function noPersonalData(page) {
  const text = await page.locator('body').innerText()
  for (const value of ['Alpha applicant', '0771234567', 'test@example.test', 'Business expansion']) assert.ok(!text.includes(value))
  assert.equal(await page.locator('#rows').textContent(), '')
  assert.equal(await page.locator('#detail').textContent(), '')
  assert.equal(await page.inputValue('#token'), '')
}

test('caseworker signs in, pages/filters inbox, views escaped content and updates audited statuses', async () => {
  const { context, page } = await pageFor()
  try {
    assert.ok((await page.locator('#identity').innerText()).includes('Test Alpha Bank'))
    assert.equal(await page.inputValue('#token'), '')
    const text = await page.locator('body').innerText()
    assert.ok(!text.includes('Other bank applicant') && !text.includes('Unconsented applicant'))
    assert.ok(!text.includes('123456789V') && !text.includes('Private street address'))
    assert.equal(await page.locator('img').count(), 0)
    assert.equal(await page.evaluate(() => window.__xss), undefined)
    await page.getByRole('button', { name: 'Older enquiries' }).click()
    await page.waitForFunction(() => document.getElementById('older').disabled && document.querySelectorAll('#rows tr').length > 0)
    assert.equal(await page.locator('#rows tr').count(), 3)
    await page.getByRole('button', { name: 'Newest', exact: true }).click()
    await page.getByRole('button', { name: 'Open enquiry for Alpha applicant', exact: true }).click()
    await page.getByRole('button', { name: 'Mark contacted', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('#detail dd') && document.getElementById('notice').textContent.startsWith('Status updated'))
    assert.ok((await page.locator('#detail').innerText()).includes('alpha-writer'))
    await page.getByRole('button', { name: 'Close enquiry', exact: true }).click()
    await page.waitForFunction(() => document.querySelectorAll('#detail ol li').length === 2)
    await page.getByLabel('Status', { exact: true }).selectOption('closed')
    await page.getByRole('button', { name: 'Open enquiry for Alpha applicant', exact: true }).waitFor()
    assert.equal(await page.locator('#rows tr').count(), 1)
    assert.deepEqual(await page.evaluate(() => [Object.keys(localStorage), Object.keys(sessionStorage), document.cookie]), [[], [], ''])
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await noPersonalData(page)
  } finally { await context.close() }
})

test('readers have no status actions and inactivity clears the session', async () => {
  const { context, page } = await pageFor('reader')
  try {
    await page.clock.install()
    await page.getByRole('button', { name: 'Open enquiry for Alpha applicant', exact: true }).click()
    await page.getByText('Read-only access.', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Close enquiry', exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Mark contacted', exact: true }).count(), 0)
    // A key event resets the inactivity timer under the controllable browser clock.
    await page.keyboard.press('Tab')
    await page.clock.fastForward(16 * 60 * 1000)
    await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor()
    await noPersonalData(page)
  } finally { await context.close() }
})

test('late detail responses cannot restore personal data after sign-out', async () => {
  const { context, page } = await pageFor()
  let release, intercepted, finished
  const arrived = new Promise(resolve => { intercepted = resolve })
  const done = new Promise(resolve => { finished = resolve })
  try {
    await page.route(`**/api/staff/enquiries/${applicant.id}`, async route => {
      const response = await route.fetch()
      await new Promise(resolve => { release = resolve; intercepted() })
      try { await route.fulfill({ response }) } catch (_) { /* Original request is aborted by sign-out. */ }
      finished()
    })
    await page.getByRole('button', { name: 'Open enquiry for Alpha applicant', exact: true }).click()
    await arrived
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    release(); await done
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)))
    await noPersonalData(page)
  } finally { if (release) release(); await context.close() }
})

test('revoking access clears an already displayed enquiry', async () => {
  const { context, page } = await pageFor()
  try {
    await page.getByRole('button', { name: 'Open enquiry for Alpha applicant', exact: true }).click()
    await page.getByRole('heading', { name: 'Alpha applicant', exact: true }).waitFor()
    process.env.STAFF_TOKEN_BINDINGS = JSON.stringify(bindings.filter(binding => binding.role === 'reader'))
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await page.getByText('Access ended. Please sign in again.', { exact: true }).waitFor()
    await noPersonalData(page)
  } finally { process.env.STAFF_TOKEN_BINDINGS = JSON.stringify(bindings); await context.close() }
})

test('a concurrent update refreshes details before allowing another status action', async () => {
  const record = await Enquiry.create({ ...person, Name: 'Concurrent applicant' })
  const { context, page } = await pageFor()
  try {
    await page.getByRole('button', { name: 'Open enquiry for Concurrent applicant', exact: true }).click()
    await page.getByRole('button', { name: 'Mark contacted', exact: true }).waitFor()
    const response = await fetch(base + `/api/staff/enquiries/${record.id}/status`, { method: 'PATCH', headers: {
      Authorization: `Bearer ${tokens.writer}`, 'Content-Type': 'application/json'
    }, body: JSON.stringify({ status: 'contacted', expectedStatus: 'received' }) })
    assert.equal(response.status, 200)
    await page.getByRole('button', { name: 'Close enquiry', exact: true }).click()
    await page.getByText('This enquiry changed. Review its latest status before updating again.', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Mark contacted', exact: true }).count(), 0)
    await page.getByRole('button', { name: 'Close enquiry', exact: true }).click()
    await page.waitForFunction(() => document.querySelectorAll('#detail ol li').length === 2)
  } finally { await context.close() }
})

test('browser refuses to send a staff token over non-local plain HTTP', async () => {
  const fs = require('node:fs/promises')
  const path = require('node:path')
  const context = await browser.newContext()
  const page = await context.newPage()
  let apiRequests = 0
  try {
    // Reserved test hostname; every response is fulfilled locally, without network access.
    await page.route('http://staff.invalid/**', async route => {
      const pathname = new URL(route.request().url()).pathname
      if (pathname.startsWith('/api/')) { apiRequests++; return route.abort() }
      const name = pathname.endsWith('.js') ? 'staff.js' : pathname.endsWith('.css') ? 'staff.css' : 'index.html'
      const body = await fs.readFile(path.join(__dirname, '../public/staff', name))
      await route.fulfill({ body, contentType: name.endsWith('.js') ? 'application/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html' })
    })
    await page.goto('http://staff.invalid/staff/')
    await page.getByLabel('Staff access token').fill(tokens.writer)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByText('Use HTTPS to sign in. Plain HTTP is allowed only for local development.', { exact: true }).waitFor()
    assert.equal(apiRequests, 0)
    assert.equal(await page.inputValue('#token'), '')
  } finally { await context.close() }
})

test('staff inbox and details fit a narrow mobile viewport', async () => {
  const { context, page } = await pageFor('reader', { width: 390, height: 844 })
  try {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.getByRole('button', { name: 'Open enquiry for Alpha applicant', exact: true }).click()
    await page.getByText('Read-only access.', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  } finally { await context.close() }
})

test('returning after inactivity cannot renew a session when background timers were delayed', async () => {
  const { context, page } = await pageFor('reader')
  try {
    await page.clock.install()
    const future = await page.evaluate(() => Date.now() + 16 * 60 * 1000)
    await page.clock.setSystemTime(future)
    await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await page.getByText('Session ended after inactivity. Please sign in again.', { exact: true }).waitFor()
    await noPersonalData(page)
  } finally { await context.close() }
})

test('an enquiry that loses sharing consent is removed from the browser view', async () => {
  const record = await Enquiry.create({ ...person, Name: 'Withdrawal applicant' })
  const { context, page } = await pageFor()
  try {
    const open = page.getByRole('button', { name: 'Open enquiry for Withdrawal applicant', exact: true })
    await open.click()
    await page.getByRole('heading', { name: 'Withdrawal applicant', exact: true }).waitFor()
    // Operational revocation fixture; no public/customer withdrawal endpoint exists yet.
    await Enquiry.updateOne({ _id: record._id }, { $set: { sharingConsent: false } })
    await open.click()
    await page.getByText('This enquiry is no longer available. The inbox has been refreshed.', { exact: true }).waitFor()
    assert.equal(await page.getByText('Withdrawal applicant', { exact: true }).count(), 0)
    assert.ok(!(await page.locator('#detail').innerText()).includes('0771234567'))
  } finally { await context.close() }
})
