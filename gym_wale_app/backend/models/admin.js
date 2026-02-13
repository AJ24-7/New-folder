const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: true,
    minlength: 8
  },
  phone: {
    type: String,
    trim: true,
    sparse: true // Allows multiple null values
  },
  profilePicture: {
    type: String, // URL to the uploaded image
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  role: { 
    type: String, 
    default: 'super_admin',
    enum: ['super_admin', 'admin', 'moderator']
  },
  
  // Security Features
  twoFactorEnabled: {
    type: Boolean,
    default: true
  },
  twoFactorSecret: {
    type: String
  },
  lastLogin: {
    type: Date
  },
  lastLoginIP: {
    type: String
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  
  // Device Tracking
  trustedDevices: [{
    fingerprint: String,
    name: String,
    lastUsed: Date,
    addedAt: { type: Date, default: Date.now }
  }],
  
  // Session Management
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date,
    deviceFingerprint: String
  }],
  
  // Security Settings
  sessionTimeout: {
    type: Number,
    default: 1800000 // 30 minutes
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  
  // Status and Permissions
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  permissions: [{
    type: String,
    enum: [
      'manage_gyms',
      'manage_users', 
      'manage_subscriptions',
      'manage_payments',
      'manage_support',
      'manage_trainers',
      'view_analytics',
      'system_settings',
      'security_logs'
    ]
  }],
  
  // Settings and Preferences
  settings: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: true },
    autoLogoutTime: { type: Number, default: 60 }, // minutes
    theme: { type: String, default: 'light', enum: ['light', 'dark'] },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' }
  },
  
  preferences: {
    dashboardLayout: { type: String, default: 'default' },
    notificationSound: { type: Boolean, default: true },
    showTutorials: { type: Boolean, default: true }
  },
  
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false }
  },
  
  // Audit Trail
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
});

// Virtual for checking if account is locked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
adminSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update timestamps
adminSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to increment login attempts
adminSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock and it has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If we've reached max attempts and it's not locked yet, lock the account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 300000 }; // 5 minutes
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Instance method to add trusted device
adminSchema.methods.addTrustedDevice = function(fingerprint, name) {
  // Remove existing device with same fingerprint
  this.trustedDevices = this.trustedDevices.filter(
    device => device.fingerprint !== fingerprint
  );
  
  // Add new device
  this.trustedDevices.push({
    fingerprint,
    name: name || 'Unknown Device',
    lastUsed: new Date()
  });
  
  // Keep only last 10 devices
  if (this.trustedDevices.length > 10) {
    this.trustedDevices = this.trustedDevices.slice(-10);
  }
  
  return this.save();
};

// Instance method to check if device is trusted
adminSchema.methods.isTrustedDevice = function(fingerprint) {
  return this.trustedDevices.some(device => device.fingerprint === fingerprint);
};

// Instance method to add refresh token
adminSchema.methods.addRefreshToken = function(token, deviceFingerprint, expiresAt) {
  // Remove old tokens for same device
  this.refreshTokens = this.refreshTokens.filter(
    rt => rt.deviceFingerprint !== deviceFingerprint && rt.expiresAt > new Date()
  );
  
  this.refreshTokens.push({
    token,
    deviceFingerprint,
    expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });
  
  return this.save();
};

// Instance method to remove refresh token
adminSchema.methods.removeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  return this.save();
};

// Static method to find by email and not locked
adminSchema.statics.findByEmailNotLocked = function(email) {
  return this.findOne({
    email,
    status: 'active',
    $or: [
      { lockUntil: { $exists: false } },
      { lockUntil: { $lt: Date.now() } }
    ]
  });
};

// Indexes for performance
adminSchema.index({ email: 1 });
adminSchema.index({ status: 1 });
adminSchema.index({ 'refreshTokens.token': 1 });
adminSchema.index({ 'trustedDevices.fingerprint': 1 });

module.exports = mongoose.model('Admin', adminSchema);
