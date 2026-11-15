const crypto = require('crypto')

function validateEnquiry(body) {
  const fields = { name: 60, NIC: 12, sex: 6, tel: 10, addr: 120, email: 254, inquiry: 250, branch: 120, askLoan: 200 }
  const data = {}
  const errors = {}
  for (const [key, max] of Object.entries(fields)) {
    if (typeof body[key] !== 'string') {
      if (['email', 'inquiry'].includes(key) && body[key] == null) data[key] = ''
      else errors[key] = 'Must be a string'
    } else {
      data[key] = body[key].trim()
      if (data[key].length > max) errors[key] = `Maximum length is ${max}`
    }
  }
  for (const key of ['name', 'NIC', 'sex', 'tel', 'addr', 'branch', 'askLoan']) {
    if (!data[key]) errors[key] = 'Required'
  }
  for (const key of ['productId', 'branchId']) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body[key])) errors[key] = 'Invalid catalogue identifier'
      else data[key] = body[key]
    }
  }
  if (body.sharingConsent !== undefined) {
    if (typeof body.sharingConsent !== 'boolean') errors.sharingConsent = 'Must be a boolean'
    else data.sharingConsent = body.sharingConsent
  }
  if (body.sharingConsent === true) {
    if (typeof body.consentInstitutionId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.consentInstitutionId)) {
      errors.consentInstitutionId = 'An explicit institution is required for sharing consent'
    } else data.consentInstitutionId = body.consentInstitutionId
  } else if (body.consentInstitutionId !== undefined) {
    errors.consentInstitutionId = 'Sharing consent must be explicitly true'
  }
  if (body.withdrawalTokenHash !== undefined) {
    if (typeof body.withdrawalTokenHash !== 'string' || !/^[a-f0-9]{64}$/.test(body.withdrawalTokenHash)) {
      errors.withdrawalTokenHash = 'Invalid receipt proof hash'
    } else data.withdrawalTokenHash = body.withdrawalTokenHash
  }
  const age = typeof body.age === 'number' || (typeof body.age === 'string' && /^\d+$/.test(body.age.trim())) ? Number(body.age) : NaN
  if (!Number.isInteger(age) || age < 18 || age > 99) errors.age = 'Must be an integer from 18 to 99'
  if (data.name && data.name.length < 4) errors.name = 'Minimum length is 4'
  if (data.NIC && !/^(\d{9}[xXvV]|\d{12})$/.test(data.NIC)) errors.NIC = 'Invalid NIC'
  if (data.sex && !['male', 'female'].includes(data.sex)) errors.sex = 'Invalid selection'
  if (data.tel && !/^0\d{9}$/.test(data.tel)) errors.tel = 'Invalid telephone number'
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Invalid email'
  data.age = age
  if (data.email) data.email = data.email.toLowerCase()
  return { data, errors }
}

function fingerprint(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
}
module.exports = { validateEnquiry, fingerprint }
