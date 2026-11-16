const fs = require('node:fs/promises')
const path = require('node:path')

async function readFixture(file = path.join(__dirname, '../../data/synthetic-demo.json')) {
  const data = JSON.parse(await fs.readFile(file, 'utf8'))
  const fail = () => { throw new Error('Invalid synthetic fixture; see docs/SYNTHETIC_DEVELOPMENT.md') }
  if (data.schemaVersion !== 1 || data.synthetic !== true) fail()
  const groups = ['institutions', 'branches', 'products', 'enquiries']
  const ids = new Set()
  for (const group of groups) {
    if (!Array.isArray(data[group]) || !data[group].length || data[group].length > 100) fail()
    for (const row of data[group]) {
      const id = group === 'enquiries' ? row?.id : row?.publicId
      if (typeof id !== 'string' || !/^demo-[a-z0-9_-]{1,80}$/.test(id) || ids.has(id)) fail()
      ids.add(id)
      const label = group === 'products' ? row.lName : row.name
      if (typeof label !== 'string' || !label.startsWith('SYNTHETIC ') || label.length > 60) fail()
      if (row.verified === true || row.verifiedAt || row.website || row.sourceUrl || row.catalogueSourceUrl) fail()
    }
  }
  const institutions = data.institutions.map(({ publicId, name }) => ({ publicId, name, active: true, verified: false }))
  const institutionIds = new Set(institutions.map(row => row.publicId))
  const branches = data.branches.map(({ publicId, name, institutionId }) => {
    if (!institutionIds.has(institutionId)) fail()
    return { publicId, name, institutionId, active: true, verified: false }
  })
  const fields = ['publicId', 'institutionId', 'category', 'lName', 'sDes', 'forWho', 'iRate', 'maxLimit', 'maxRepay', 'eligibles']
  const products = data.products.map(row => {
    if (!institutionIds.has(row.institutionId) || !['business', 'agriculture', 'coconut', 'other'].includes(row.category) ||
        fields.some(key => typeof row[key] !== 'string' || !row[key].trim() || row[key].length > 500)) fail()
    return { ...Object.fromEntries(fields.map(key => [key, row[key]])), active: true, verified: false }
  })
  const enquiries = data.enquiries.map(({ id, name, productId, branchId, sharingConsent, withdraw, closedDaysAgo = 0 }) => {
    const product = products.find(row => row.publicId === productId)
    const branch = branches.find(row => row.publicId === branchId)
    if (!product || !branch || product.institutionId !== branch.institutionId || typeof sharingConsent !== 'boolean' ||
        typeof withdraw !== 'boolean' || (withdraw && !sharingConsent) || !Number.isInteger(closedDaysAgo) ||
        closedDaysAgo < 0 || closedDaysAgo > 3650 || (closedDaysAgo && (!sharingConsent || withdraw))) fail()
    return { id, name, productId, branchId, sharingConsent, withdraw, closedDaysAgo }
  })
  return { institutions, branches, products, enquiries }
}

module.exports = { readFixture }
