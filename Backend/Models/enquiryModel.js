const mongoose = require('mongoose')

// Preserve existing records and collection; an enquiry does not imply a login account.
const schema = new mongoose.Schema({
  Name: { type: String, required: true },
  Age: { type: Number, required: true, min: 18, max: 99 },
  NIC: { type: String, required: true },
  Sex: { type: String, required: true, enum: ['male', 'female'] },
  Telephone: { type: String, required: true },
  Address: { type: String, required: true },
  email: { type: String, lowercase: true },
  Inquiry: { type: String, maxlength: 250 },
  Branch: { type: String, required: true },
  askLoan: { type: String, required: true },
  productId: String,
  branchId: String,
  institutionId: String,
  status: { type: String, enum: ['received', 'contacted', 'closed'], default: 'received' },
  sharingConsent: { type: Boolean, default: false },
  consentInstitutionId: String,
  consentVersion: String,
  consentedAt: Date,
  withdrawalTokenHash: { type: String, select: false },
  consentWithdrawnAt: Date,
  statusChangedAt: Date,
  purgedAt: Date,
  retentionPolicyDays: Number,
  retentionHold: { type: Boolean, default: false },
  supportWithdrawal: { type: new mongoose.Schema({
    caseHash: String,
    reviewerIds: [String],
    at: Date
  }, { _id: false }), select: false },
  notification: { type: new mongoose.Schema({
    state: { type: String, enum: ['pending', 'processing', 'delivered', 'cancelled', 'failed'] },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: Date,
    leaseToken: String,
    leaseUntil: Date,
    deliveredAt: Date,
    deliveryId: String,
    lastCode: String
  }, { _id: false }), select: false },
  statusHistory: { type: [new mongoose.Schema({
    fromStatus: { type: String, enum: ['received', 'contacted', 'closed'], required: true },
    toStatus: { type: String, enum: ['received', 'contacted', 'closed'], required: true },
    actorId: { type: String, required: true },
    at: { type: Date, required: true }
  }, { _id: false })], default: [], select: false },
  idempotencyKey: { type: String, select: false },
  requestHash: { type: String, select: false }
}, { timestamps: true, collection: 'users' })
schema.index({ idempotencyKey: 1 }, { unique: true, sparse: true })
schema.index({ withdrawalTokenHash: 1 }, { unique: true, sparse: true })
schema.index({ consentWithdrawnAt: 1 })
schema.index({ 'notification.state': 1, 'notification.nextAttemptAt': 1, 'notification.leaseUntil': 1 })
schema.index({ institutionId: 1, _id: -1 })
schema.index({ institutionId: 1, status: 1, _id: -1 })
module.exports = mongoose.model('Enquiry', schema)
