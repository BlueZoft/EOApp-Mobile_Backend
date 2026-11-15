const crypto = require('crypto')
const asyncHandler = require('express-async-handler')
const Institution = require('../Models/institutionModel')

function readBindings(raw) {
  if (!raw || raw.length > 65536) return null
  try {
    const bindings = JSON.parse(raw)
    if (!Array.isArray(bindings) || !bindings.length || bindings.length > 1000) return null
    const hashes = new Set()
    for (const entry of bindings) {
      if (!entry || typeof entry.tokenHash !== 'string' || !/^[a-fA-F0-9]{64}$/.test(entry.tokenHash) ||
          typeof entry.institutionId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(entry.institutionId) ||
          typeof entry.staffId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(entry.staffId) ||
          !['reader', 'caseworker'].includes(entry.role)) return null
      const hash = entry.tokenHash.toLowerCase()
      if (hashes.has(hash)) return null
      hashes.add(hash)
    }
    return bindings
  } catch (_) { return null }
}

const staffAuth = asyncHandler(async (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  res.vary('Authorization')
  // Missing/malformed configuration fails closed. Never log bindings or tokens.
  const bindings = readBindings(process.env.STAFF_TOKEN_BINDINGS)
  if (!bindings) return res.status(503).json({ message: 'Staff access is not configured' })
  const match = /^Bearer ([A-Za-z0-9_-]{43,128})$/i.exec(req.get('Authorization') || '')
  if (!match) return res.status(401).json({ message: 'Valid staff authentication required' })
  const hash = crypto.createHash('sha256').update(match[1]).digest()
  const binding = bindings.find(entry => crypto.timingSafeEqual(hash, Buffer.from(entry.tokenHash, 'hex')))
  if (!binding) return res.status(401).json({ message: 'Valid staff authentication required' })
  const institution = await Institution.findOne({ publicId: binding.institutionId, active: true }).select('name -_id').lean()
  if (!institution) return res.status(403).json({ message: 'Staff institution is unavailable' })
  req.staff = { staffId: binding.staffId, institutionId: binding.institutionId, institutionName: institution.name, role: binding.role }
  next()
})

function requireCaseworker(req, res, next) {
  if (req.staff.role !== 'caseworker') return res.status(403).json({ message: 'Caseworker access required' })
  next()
}
module.exports = { staffAuth, requireCaseworker }
