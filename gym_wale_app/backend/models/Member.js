const mongoose = require('mongoose');


const memberSchema = new mongoose.Schema({
  gym: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true
  },
  memberName: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  paymentMode: { type: String, enum: ['Cash', 'Card', 'UPI', 'Online', 'pending'], required: true },
  paymentAmount: { type: Number, required: true },
  planSelected: { type: String, enum: ['Basic', 'Standard', 'Premium'], required: true },
  monthlyPlan: { type: String, enum: ['1 Month', '3 Months', '6 Months', '12 Months'], required: true },
  activityPreference: { type: String, required: true },
  address: { type: String },
  joinDate: { type: Date, default: Date.now },
  profileImage: { type: String },
  membershipId: { type: String },
  membershipValidUntil: { type: String },
  paymentStatus: { 
    type: String, 
    enum: ['paid', 'pending', 'overdue'], 
    default: 'paid' 
  },
  pendingPaymentAmount: { type: Number, default: 0 },
  lastPaymentDate: { type: Date },
  nextPaymentDue: { type: Date },
  allowanceGrantedDate: { type: Date, default: null },
  allowanceExpiryDate: { type: Date, default: null },
  planStartDate: { type: Date, default: null },
  plannedValidityDate: { type: Date, default: null },
  // Freeze membership fields
  freezeHistory: [{
    freezeStartDate: { type: Date },
    freezeEndDate: { type: Date },
    freezeDays: { type: Number },
    reason: { type: String },
    requestedAt: { type: Date, default: Date.now }
  }],
  currentlyFrozen: { type: Boolean, default: false },
  freezeStartDate: { type: Date },
  freezeEndDate: { type: Date },
  totalFreezeCount: { type: Number, default: 0 },
  // ID Pass fields
  passId: { type: String, unique: true, sparse: true },
  passGeneratedDate: { type: Date },
  passQRCode: { type: String }, // Data URL of QR code
  passFilePath: { type: String }, // Path to PDF pass file
  // Expiry notification tracking
  expiryNotified7Days: { type: Boolean, default: false },
  expiryNotified3Days: { type: Boolean, default: false },
  expiryNotified1Day: { type: Boolean, default: false },
  // Additional fields
  amount: { type: Number },
  membershipPlan: { type: String },
  validity: { type: String },
  validUntil: { type: Date },
  benefits: [String]
});

module.exports = mongoose.model('Member', memberSchema);
