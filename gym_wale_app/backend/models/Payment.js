const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  gymId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gym',
    required: true
  },
  type: {
    type: String,
    enum: ['received', 'paid', 'due', 'pending'],
    required: true
  },
  category: {
    type: String,
    enum: ['membership', 'personal_training', 'rent', 'utilities', 'staff_salary', 'equipment_purchase', 'equipment_maintenance', 'supplies', 'marketing', 'insurance', 'taxes', 'vendor_payment', 'license_fees', 'miscellaneous'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  memberName: {
    type: String,
    default: null
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque'],
    default: 'cash'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  dueDate: {
    type: Date,
    default: null
  },
  paidDate: {
    type: Date,
    default: Date.now
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDetails: {
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly'
    },
    nextDueDate: {
      type: Date,
      default: null
    }
  },
  transactionId: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
paymentSchema.index({ gymId: 1, type: 1, createdAt: -1 });
paymentSchema.index({ gymId: 1, category: 1, createdAt: -1 });
paymentSchema.index({ gymId: 1, dueDate: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
