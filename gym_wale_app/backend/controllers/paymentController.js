const Payment = require('../models/Payment');
const Member = require('../models/Member');
const mongoose = require('mongoose');
const crypto = require('crypto');

// Cash payment validation model (can be moved to separate file)
const CashValidation = mongoose.model('CashValidation', new mongoose.Schema({
  validationCode: { type: String, required: true, unique: true },
  memberId: { type: String, required: true },
  gymId: { type: String, required: true },
  amount: { type: Number, required: true },
  planName: { type: String, required: true },
  duration: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'expired'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  approvedBy: { type: String }, // Admin ID who approved
  approvedAt: { type: Date },
  // Member registration data for QR code processing
  memberData: {
    memberName: String,
    memberEmail: String,
    memberPhone: String,
    planSelected: String,
    monthlyPlan: String,
    paymentAmount: Number,
    paymentMode: String,
    paymentStatus: String,
    activityPreference: String,
    address: String,
    age: Number,
    gender: String,
    joinDate: Date,
    membershipId: String
  }
}));

// Generate cash payment validation code
const createCashPaymentRequest = async (req, res) => {
  try {
    const { memberId, amount, planName, duration, username, email, phone, gymId, memberData } = req.body;
    
    if (!memberId || !amount || !planName || !duration || !username || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields for member registration' 
      });
    }

    // Generate unique validation code (6 digits)
    const validationCode = 'CASH' + Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration to 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    // Use provided gymId or default
    const finalGymId = gymId || 'default-gym';
    
    // Create comprehensive QR data for gym admin
    const qrData = {
      type: 'gym_cash_payment_registration',
      validationCode,
      amount,
      memberName: username,
      memberEmail: email,
      memberPhone: phone || '',
      planName,
      duration,
      gymId: finalGymId,
      timestamp: new Date().toISOString(),
      // Member registration data
      memberData: memberData || {
        memberName: username,
        memberEmail: email,
        memberPhone: phone || '',
        planSelected: planName,
        monthlyPlan: duration === 1 ? '1 Month' : duration === 3 ? '3 Months' : duration === 6 ? '6 Months' : duration === 12 ? '12 Months' : `${duration} Month(s)`,
        paymentAmount: amount,
        paymentMode: 'cash',
        paymentStatus: 'pending',
        activityPreference: 'General Fitness',
        address: '',
        age: 25,
        gender: 'not-specified',
        joinDate: new Date().toISOString(),
        membershipId: validationCode
      }
    };
    
    // Generate QR code URL with comprehensive data
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrData))}`;
    
    // Create validation record
    const validation = new CashValidation({
      validationCode,
      memberId,
      gymId: finalGymId,
      amount,
      planName,
      duration,
      expiresAt,
      memberData: qrData.memberData // Store member data for registration
    });
    
    await validation.save();
    
    console.log('🔗 Cash payment validation created with member data:', {
      validationCode,
      qrData: qrData.memberData
    });
    
    res.json({
      success: true,
      validationCode,
      expiresAt,
      qrCodeUrl,
      message: 'Cash payment validation code generated with member registration data'
    });
    
  } catch (error) {
    console.error('Error creating cash payment request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate validation code with member data' 
    });
  }
};

// Check cash validation status
const checkCashValidation = async (req, res) => {
  try {
    const { validationCode } = req.params;
    
    const validation = await CashValidation.findOne({ validationCode });
    
    if (!validation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Validation code not found' 
      });
    }
    
    // Check if expired
    if (new Date() > validation.expiresAt && validation.status === 'pending') {
      validation.status = 'expired';
      await validation.save();
    }
    
    res.json({
      success: true,
      status: validation.status,
      paymentId: validation.status === 'approved' ? validation._id : null
    });
    
  } catch (error) {
    console.error('Error checking cash validation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check validation status' 
    });
  }
};

// Get pending cash validations for gym admin
const getPendingCashValidations = async (req, res) => {
  try {
    // In production, use actual gym ID from authenticated admin
    const gymId = req.admin?.gymId || 'default-gym';
    
    const validations = await CashValidation.find({
      gymId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      validations
    });
    
  } catch (error) {
    console.error('Error getting pending validations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get pending validations' 
    });
  }
};

// Approve cash payment validation
const approveCashValidation = async (req, res) => {
  try {
    const { validationCode } = req.params;
    const adminId = req.admin?.id || req.admin?._id || 'admin';
    const gymId = req.admin?.gymId || req.admin?.id || 'default-gym';
    
    const validation = await CashValidation.findOne({ 
      validationCode,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });
    
    if (!validation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Validation code not found or expired' 
      });
    }
    
    // Update validation status
    validation.status = 'approved';
    validation.approvedBy = adminId;
    validation.approvedAt = new Date();
    await validation.save();
    
    // Create member record if memberData exists
    let member = null;
    if (validation.memberData) {
      try {
        const memberData = {
          ...validation.memberData,
          gym: gymId,
          paymentStatus: 'paid', // Mark as paid since cash was received
          joinDate: new Date(),
          validUntil: new Date(Date.now() + (validation.duration * 30 * 24 * 60 * 60 * 1000)), // Add months
          createdBy: adminId
        };
        
        // Check if member already exists
        const existingMember = await Member.findOne({ 
          email: validation.memberData.memberEmail 
        });
        
        if (!existingMember) {
          member = new Member(memberData);
          await member.save();
          console.log('✅ New member created via cash validation:', member.membershipId);
        } else {
          console.log('ℹ️ Member already exists, updating payment status');
          member = existingMember;
          member.paymentStatus = 'paid';
          member.validUntil = memberData.validUntil;
          await member.save();
        }
      } catch (memberError) {
        console.error('Error creating member:', memberError);
        // Continue with payment approval even if member creation fails
      }
    }
    
    // Create payment record
    const payment = new Payment({
      memberId: member ? member._id : validation.memberId,
      amount: validation.amount,
      type: 'received',
      method: 'cash',
      status: 'completed',
      planName: validation.planName,
      duration: validation.duration,
      validationCode: validation.validationCode,
      createdAt: new Date(),
      gymId: gymId,
      memberName: validation.memberData?.memberName || 'Cash Payment'
    });
    
    await payment.save();
    
    // Send welcome email if member was created
    if (member && validation.memberData) {
      try {
        const sendEmail = require('../utils/sendEmail');
        const Gym = require('../models/gym');
        
        const gym = await Gym.findById(gymId);
        const gymName = gym?.gymName || gym?.name || 'Our Gym';
        
        const welcomeEmail = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1976d2, #1565c0); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0;">🎉 Welcome to ${gymName}!</h1>
              <p style="margin: 10px 0 0 0;">Your cash payment has been confirmed</p>
            </div>
            <div style="padding: 30px; background: white;">
              <p>Dear ${validation.memberData.memberName},</p>
              <p>Great news! Your cash payment has been processed and your membership is now active.</p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Membership Details:</h3>
                <p><strong>Membership ID:</strong> ${member.membershipId}</p>
                <p><strong>Plan:</strong> ${validation.planName}</p>
                <p><strong>Duration:</strong> ${validation.memberData.monthlyPlan}</p>
                <p><strong>Valid Until:</strong> ${member.validUntil?.toLocaleDateString()}</p>
                <p><strong>Amount Paid:</strong> ₹${validation.amount}</p>
              </div>
              <p>You can now visit the gym and start your fitness journey!</p>
            </div>
          </div>
        `;
        
        await sendEmail({
          to: validation.memberData.memberEmail,
          subject: `Welcome to ${gymName} - Cash Payment Confirmed`,
          html: welcomeEmail
        });
        
        console.log('📧 Welcome email sent to:', validation.memberData.memberEmail);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the approval if email fails
      }
    }
    
    res.json({
      success: true,
      message: 'Cash payment approved and member registered successfully',
      paymentId: payment._id,
      memberId: member?._id,
      membershipId: member?.membershipId
    });
    
  } catch (error) {
    console.error('Error approving cash validation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to approve cash payment and register member' 
    });
  }
};

// Get payment statistics
const getPaymentStats = async (req, res) => {
  try {
    const gymId = req.admin.id;
    const { period = 'month' } = req.query;
    
    console.log('Payment stats requested for gymId:', gymId, 'period:', period);
    
    let startDate, endDate;
    const now = new Date();
    
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
    } else {
      startDate = new Date(now.setDate(now.getDate() - 30));
      endDate = new Date();
    }

    // Get current stats - for received and paid, use period filter
    // For due and pending, get current outstanding amounts regardless of period
    
    // Handle gymId - if it's a valid ObjectId format, use it, otherwise use string comparison
    let gymIdQuery;
    if (mongoose.Types.ObjectId.isValid(gymId) && gymId.length === 24) {
      gymIdQuery = {
        $or: [
          { gymId: new mongoose.Types.ObjectId(gymId) },
          { gymId: gymId }
        ]
      };
    } else {
      gymIdQuery = { gymId: gymId };
    }
    
    const [periodStats, currentDuePending] = await Promise.all([
      // Period-based stats for completed payments (received/paid)
      Payment.aggregate([
        {
          $match: {
            ...gymIdQuery,
            type: { $in: ['received', 'paid'] },
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Current outstanding due/pending amounts (regardless of creation date)
      Payment.aggregate([
        {
          $match: {
            ...gymIdQuery,
            type: { $in: ['due', 'pending'] },
            status: 'pending' // Only count pending/due payments that haven't been completed
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    console.log('Period stats from DB:', periodStats);
    console.log('Current due/pending from DB:', currentDuePending);

    const received = periodStats.find(s => s._id === 'received')?.total || 0;
    const paid = periodStats.find(s => s._id === 'paid')?.total || 0;
    const due = currentDuePending.find(s => s._id === 'due')?.total || 0;
    const pending = currentDuePending.find(s => s._id === 'pending')?.total || 0;
    const profit = received - paid;

    // If no data found, return demo data for testing
    if (received === 0 && paid === 0 && due === 0 && pending === 0) {
      console.log('No payment data found, returning demo data');
      return res.json({
        success: true,
        data: {
          received: 45000,
          paid: 18000,
          due: 8000,
          pending: 5500,
          profit: 27000,
          receivedGrowth: 18.5,
          paidGrowth: -12.3,
          dueGrowth: 25.7,
          pendingGrowth: -15.8,
          profitGrowth: 42.3
        }
      });
    }

    // Get previous period for growth calculation
    let prevStartDate, prevEndDate;
    if (period === 'month') {
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 30);
      prevEndDate = new Date(startDate);
    }

    // Get previous period stats using the same logic
    const [prevPeriodStats, prevCurrentDuePending] = await Promise.all([
      // Previous period-based stats for completed payments (received/paid)
      Payment.aggregate([
        {
          $match: {
            $or: [
              { gymId: new mongoose.Types.ObjectId(gymId) },
              { gymId: gymId }
            ],
            type: { $in: ['received', 'paid'] },
            createdAt: { $gte: prevStartDate, $lte: prevEndDate }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ]),
      // Previous outstanding due/pending amounts (for growth comparison)
      Payment.aggregate([
        {
          $match: {
            $or: [
              { gymId: new mongoose.Types.ObjectId(gymId) },
              { gymId: gymId }
            ],
            type: { $in: ['due', 'pending'] },
            status: 'pending',
            createdAt: { $lte: prevEndDate }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const prevReceived = prevPeriodStats.find(s => s._id === 'received')?.total || 0;
    const prevPaid = prevPeriodStats.find(s => s._id === 'paid')?.total || 0;
    const prevDue = prevCurrentDuePending.find(s => s._id === 'due')?.total || 0;
    const prevPending = prevCurrentDuePending.find(s => s._id === 'pending')?.total || 0;
    const prevProfit = prevReceived - prevPaid;

    const receivedGrowth = prevReceived > 0 ? ((received - prevReceived) / prevReceived) * 100 : 0;
    const paidGrowth = prevPaid > 0 ? ((paid - prevPaid) / prevPaid) * 100 : 0;
    const dueGrowth = prevDue > 0 ? ((due - prevDue) / prevDue) * 100 : 0;
    const pendingGrowth = prevPending > 0 ? ((pending - prevPending) / prevPending) * 100 : 0;
    const profitGrowth = prevProfit > 0 ? ((profit - prevProfit) / prevProfit) * 100 : 0;

    res.json({
      success: true,
      data: {
        received,
        paid,
        due,
        pending,
        profit,
        receivedGrowth,
        paidGrowth,
        dueGrowth,
        pendingGrowth,
        profitGrowth
      }
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get payment chart data
const getPaymentChartData = async (req, res) => {
  try {
    const gymId = req.admin.id;
    const { month, year } = req.query;
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, parseInt(month) + 1, 0);
    
    const chartData = await Payment.aggregate([
      {
        $match: {
          $or: [
            { gymId: new mongoose.Types.ObjectId(gymId) },
            { gymId: gymId }
          ],
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$createdAt' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $group: {
          _id: '$_id.day',
          received: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'received'] }, '$total', 0]
            }
          },
          paid: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'paid'] }, '$total', 0]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate();
    const labels = [];
    const receivedData = [];
    const paidData = [];
    const profitData = [];

    for (let i = 1; i <= daysInMonth; i++) {
      labels.push(i);
      const dayData = chartData.find(d => d._id === i);
      const received = dayData?.received || 0;
      const paid = dayData?.paid || 0;
      receivedData.push(received);
      paidData.push(paid);
      profitData.push(received - paid);
    }

    res.json({
      success: true,
      data: {
        labels,
        datasets: [
          {
            label: 'Amount Received',
            data: receivedData,
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 2,
            fill: true
          },
          {
            label: 'Amount Paid',
            data: paidData,
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 2,
            fill: true
          },
          {
            label: 'Profit/Loss',
            data: profitData,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
            fill: true
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get recent payments
const getRecentPayments = async (req, res) => {
  try {
    const gymId = req.admin.id;
    const { limit = 10 } = req.query;

    // Use aggregation to properly sort by the most recent activity date
    const payments = await Payment.aggregate([
      {
        $match: {
          $or: [
            { gymId: new mongoose.Types.ObjectId(gymId) },
            { gymId: gymId }
          ],
          status: 'completed' // Only completed payments in Recent Payments
        }
      },
      {
        $addFields: {
          // Use paidDate if available, otherwise use createdAt
          // This ensures recently marked as paid items appear at the top
          activityDate: {
            $ifNull: ['$paidDate', '$createdAt']
          }
        }
      },
      {
        $sort: { activityDate: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'members',
          localField: 'memberId',
          foreignField: '_id',
          as: 'memberData'
        }
      },
      {
        $addFields: {
          memberName: {
            $ifNull: [
              { $arrayElemAt: ['$memberData.name', 0] },
              '$memberName'
            ]
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching recent payments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get recurring payments
const getRecurringPayments = async (req, res) => {
  try {
    const gymId = req.admin.id;
    const { status = 'all' } = req.query;

    let matchCondition = { 
      $or: [
        { gymId: new mongoose.Types.ObjectId(gymId) },
        { gymId: gymId }
      ]
    };
    
    // Only include payments that are actually recurring OR have future due dates
    // For recurring payments, only show them if they're due within 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    matchCondition.$and = [
      {
        $or: [
          { 
            // Recurring payments due within 7 days
            $and: [
              { isRecurring: true },
              { dueDate: { $lte: sevenDaysFromNow } }
            ]
          },
          { 
            // All non-recurring due/pending payments (regardless of due date)
            $and: [
              { isRecurring: { $ne: true } },
              { type: { $in: ['due', 'pending'] } } // Only include unpaid due and pending payments
            ]
          }
        ]
      }
    ];
    
    if (status === 'pending') {
      matchCondition.status = 'pending';
      // Also exclude any payments that have been marked as paid/completed
      matchCondition.type = { $in: ['due', 'pending'] }; // Only include unpaid types
    } else if (status === 'overdue') {
      matchCondition.dueDate = { $lt: new Date() };
      matchCondition.status = 'pending';
    } else if (status === 'completed') {
      matchCondition.status = 'completed';
    }

    const payments = await Payment.find(matchCondition)
      .populate('memberId', 'name email phone')
      .sort({ dueDate: 1 })
      .limit(50);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching recurring payments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add payment
const addPayment = async (req, res) => {
  try {
    const gymId = req.admin.id;
    const {
      type,
      category,
      amount,
      description,
      memberName,
      memberId,
      paymentMethod,
      isRecurring,
      recurringDetails,
      dueDate,
      notes
    } = req.body;

    // Set status based on payment type
    let status;
    if (type === 'received') {
      status = 'completed'; // Received payments are already completed
    } else if (type === 'paid') {
      status = 'completed'; // Paid payments are completed
    } else if (type === 'due' || type === 'pending') {
      status = 'pending'; // Due and pending payments are not yet completed
    } else {
      status = 'pending'; // Default to pending for safety
    }

    const payment = new Payment({
      gymId,
      type,
      category,
      amount,
      description,
      memberName,
      memberId: memberId && memberId.trim() !== '' ? memberId : undefined, // Only set if not empty
      paymentMethod,
      status, // Set the calculated status
      isRecurring,
      recurringDetails,
      dueDate,
      notes,
      createdBy: req.admin.id
    });

    await payment.save();

    // Update member payment status if this is a membership payment
    if (category === 'membership' && memberId) {
      try {
        const updateData = {};
        
        if (type === 'received') {
          updateData.paymentStatus = 'paid';
          updateData.lastPaymentDate = new Date();
          updateData.pendingPaymentAmount = 0;
        } else if (type === 'pending' || type === 'due') {
          updateData.paymentStatus = 'pending';
          updateData.pendingPaymentAmount = amount;
          if (dueDate) {
            updateData.nextPaymentDue = new Date(dueDate);
          }
        }
        
        if (Object.keys(updateData).length > 0) {
          const updatedMember = await Member.findOneAndUpdate(
            { _id: memberId, gym: gymId },
            updateData,
            { new: true }
          );
          
          // Add notification info to response if member payment is pending
          if (updatedMember && (type === 'pending' || type === 'due')) {
            payment.memberNotification = {
              memberName: updatedMember.memberName,
              memberId: updatedMember._id,
              pendingAmount: amount,
              dueDate: dueDate
            };
          }
        }
      } catch (memberUpdateError) {
        console.error('Error updating member payment status:', memberUpdateError);
        // Don't fail the payment creation if member update fails
      }
    }

    res.json({
      success: true,
      message: 'Payment added successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update payment
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const gymId = req.admin.id;
    const updates = req.body;

    const payment = await Payment.findOneAndUpdate(
      { _id: id, gymId },
      updates,
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark payment as paid
const markPaymentAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const gymId = req.admin.id;

    // Find the payment first to check its current type
    const currentPayment = await Payment.findOne({ _id: id, gymId });
    
    if (!currentPayment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Determine the new type based on current type
    let newType = currentPayment.type;
    if (currentPayment.type === 'pending') {
      newType = 'received'; // Convert pending to received (money coming IN from members)
    } else if (currentPayment.type === 'due') {
      newType = 'paid'; // Convert due to paid (money going OUT from gym)
    }

    const payment = await Payment.findOneAndUpdate(
      { _id: id, gymId },
      { 
        status: 'completed',
        type: newType, // Update type: pending→received, due→paid for proper stat tracking
        paidDate: new Date()
      },
      { new: true }
    );

    // If it's a recurring payment, create next payment
    if (payment.isRecurring && payment.recurringDetails.nextDueDate) {
      const nextPayment = new Payment({
        gymId,
        type: currentPayment.type, // Keep original type for next payment (pending/due)
        category: payment.category,
        amount: payment.amount,
        description: payment.description,
        paymentMethod: payment.paymentMethod,
        status: 'pending',
        dueDate: payment.recurringDetails.nextDueDate,
        isRecurring: true,
        recurringDetails: {
          frequency: payment.recurringDetails.frequency,
          nextDueDate: calculateNextDueDate(payment.recurringDetails.nextDueDate, payment.recurringDetails.frequency)
        },
        notes: payment.notes,
        createdBy: req.admin.id
      });

      await nextPayment.save();
    }

    res.json({
      success: true,
      message: 'Payment marked as paid and moved to received payments',
      data: payment
    });
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete payment
const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const gymId = req.admin.id;

    const payment = await Payment.findOneAndDelete({ _id: id, gymId });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper function to calculate next due date
const calculateNextDueDate = (currentDate, frequency) => {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  return nextDate;
};

// Get payment reminders (due within 7 days or overdue)
const getPaymentReminders = async (req, res) => {
  try {
    const gymId = req.admin.id;
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    const reminders = await Payment.find({
      $or: [
        { gymId: new mongoose.Types.ObjectId(gymId) },
        { gymId: gymId }
      ],
      type: 'paid',
      status: 'pending',
      dueDate: {
        $lte: oneWeekFromNow // Due within the next 7 days or already overdue
      }
    })
    .sort({ dueDate: 1 })
    .select('description amount dueDate category status notes');

    res.status(200).json({
      success: true,
      message: 'Payment reminders retrieved successfully',
      data: reminders,
      count: reminders.length
    });
  } catch (error) {
    console.error('Error fetching payment reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment reminders',
      error: error.message
    });
  }
};

module.exports = {
  getPaymentStats,
  getPaymentChartData,
  getRecentPayments,
  getRecurringPayments,
  getPaymentReminders,
  addPayment,
  updatePayment,
  markPaymentAsPaid,
  deletePayment
};

// ============ NEW PAYMENT INTEGRATION FUNCTIONS ============
// Payment Integration for QR Code Registrations
// Supports multiple payment gateways: Razorpay, Stripe, PayPal, UPI

// Create payment session/order for QR registrations
const createPaymentSession = async (req, res) => {
  try {
    const { memberId, planId, duration, paymentMethod, amount } = req.body;

    // Validate member
    const member = await Member.findById(memberId).populate('gym');
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Calculate payment amount
    const baseAmount = amount || 0;
    const tax = calculateTax(baseAmount);
    const totalAmount = baseAmount + tax;

    // Create payment record
    const paymentData = {
      gymId: member.gym._id,
      member: memberId,
      amount: totalAmount,
      baseAmount,
      tax,
      currency: 'INR',
      type: 'received',
      category: 'membership_fee',
      description: `Membership payment via QR registration`,
      paymentMethod: paymentMethod || 'razorpay',
      status: 'pending',
      metadata: {
        source: 'qr_registration',
        planId: planId,
        duration: duration,
        memberName: member.name,
        gymName: member.gym.gymName
      },
      dueDate: new Date(),
      notes: `QR code registration payment for ${member.name}`
    };

    const payment = new Payment(paymentData);
    await payment.save();

    // Create payment session based on selected gateway
    let paymentSession;
    switch (paymentMethod) {
      case 'razorpay':
        paymentSession = await createRazorpayOrder(payment, member);
        break;
      case 'stripe':
        paymentSession = await createStripeSession(payment, member);
        break;
      case 'paypal':
        paymentSession = await createPayPalOrder(payment, member);
        break;
      case 'upi':
        paymentSession = await createUPIPayment(payment, member);
        break;
      default:
        paymentSession = await createRazorpayOrder(payment, member); // Default to Razorpay
    }

    // Update payment with gateway details
    payment.gatewayOrderId = paymentSession.orderId;
    payment.gatewayResponse = paymentSession;
    await payment.save();

    res.json({
      success: true,
      payment: {
        id: payment._id,
        orderId: paymentSession.orderId,
        amount: totalAmount,
        currency: 'INR'
      },
      paymentSession
    });

  } catch (error) {
    console.error('Error creating payment session:', error);
    res.status(500).json({ 
      message: 'Failed to create payment session',
      error: error.message 
    });
  }
};

// Verify payment completion
const verifyPayment = async (req, res) => {
  try {
    const { paymentId, gatewayPaymentId, signature, status } = req.body;

    const payment = await Payment.findById(paymentId).populate('member');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Verify payment with respective gateway
    let verificationResult;
    switch (payment.paymentMethod) {
      case 'razorpay':
        verificationResult = await verifyRazorpayPayment(payment, gatewayPaymentId, signature);
        break;
      case 'stripe':
        verificationResult = await verifyStripePayment(payment, gatewayPaymentId);
        break;
      case 'paypal':
        verificationResult = await verifyPayPalPayment(payment, gatewayPaymentId);
        break;
      default:
        verificationResult = { success: false, message: 'Unknown payment method' };
    }

    if (verificationResult.success) {
      // Update payment status
      payment.status = 'paid';
      payment.type = 'received';
      payment.gatewayPaymentId = gatewayPaymentId;
      payment.paidAt = new Date();
      payment.verificationData = verificationResult.data;
      await payment.save();

      // Activate member's subscription
      await activateMembershipAfterPayment(payment);

      res.json({
        success: true,
        message: 'Payment verified successfully',
        payment: {
          id: payment._id,
          status: payment.status,
          amount: payment.amount
        }
      });
    } else {
      // Update payment as failed
      payment.status = 'failed';
      payment.notes = `Payment failed: ${verificationResult.message}`;
      await payment.save();

      res.status(400).json({
        success: false,
        message: verificationResult.message || 'Payment verification failed'
      });
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      message: 'Payment verification failed',
      error: error.message 
    });
  }
};

// Get payment status
const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId).populate('member', 'name email');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json({
      success: true,
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency || 'INR',
        member: payment.member,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt
      }
    });

  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ 
      message: 'Failed to fetch payment status',
      error: error.message 
    });
  }
};

// Handle payment webhooks from gateways
const handlePaymentWebhook = async (req, res) => {
  try {
    const { gateway, event, data } = req.body;

    switch (gateway) {
      case 'razorpay':
        await handleRazorpayWebhook(event, data);
        break;
      case 'stripe':
        await handleStripeWebhook(event, data);
        break;
      case 'paypal':
        await handlePayPalWebhook(event, data);
        break;
      default:
        console.log('Unknown webhook gateway:', gateway);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

// ============ PAYMENT GATEWAY INTEGRATIONS ============

// Razorpay Integration
async function createRazorpayOrder(payment, member) {
  // TODO: Implement Razorpay order creation
  // const Razorpay = require('razorpay');
  // const razorpay = new Razorpay({
  //   key_id: process.env.RAZORPAY_KEY_ID,
  //   key_secret: process.env.RAZORPAY_KEY_SECRET
  // });
  
  // const options = {
  //   amount: payment.amount * 100, // Amount in paise
  //   currency: payment.currency,
  //   receipt: payment._id.toString(),
  //   notes: {
  //     memberId: payment.member?.toString(),
  //     gymId: payment.gymId?.toString()
  //   }
  // };
  
  // const order = await razorpay.orders.create(options);
  
  // Mock response for now - replace with actual Razorpay implementation
  return {
    orderId: `order_${Date.now()}`,
    amount: payment.amount,
    currency: payment.currency || 'INR',
    key: process.env.RAZORPAY_KEY_ID || 'rzp_test_key',
    prefill: {
      name: member.name,
      email: member.email,
      contact: member.phone
    }
  };
}

async function verifyRazorpayPayment(payment, paymentId, signature) {
  // TODO: Implement Razorpay signature verification
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  //   .update(payment.gatewayOrderId + '|' + paymentId)
  //   .digest('hex');
  
  // return {
  //   success: expectedSignature === signature,
  //   data: { paymentId, signature }
  // };
  
  // Mock verification for now - replace with actual Razorpay implementation
  return {
    success: true,
    data: { paymentId, signature }
  };
}

// Stripe Integration
async function createStripeSession(payment, member) {
  // TODO: Implement Stripe checkout session
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  // const session = await stripe.checkout.sessions.create({
  //   payment_method_types: ['card'],
  //   line_items: [{
  //     price_data: {
  //       currency: (payment.currency || 'INR').toLowerCase(),
  //       product_data: {
  //         name: payment.description,
  //       },
  //       unit_amount: payment.amount * 100,
  //     },
  //     quantity: 1,
  //   }],
  //   mode: 'payment',
  //   success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
  //   cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
  //   metadata: {
  //     paymentId: payment._id.toString(),
  //     memberId: payment.member?.toString()
  //   }
  // });
  
  // Mock response for now - replace with actual Stripe implementation
  return {
    orderId: `stripe_${Date.now()}`,
    sessionId: `cs_${Date.now()}`,
    url: `/payment/stripe-checkout?session=${Date.now()}`
  };
}

async function verifyStripePayment(payment, sessionId) {
  // TODO: Implement Stripe session verification
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  // const session = await stripe.checkout.sessions.retrieve(sessionId);
  
  // return {
  //   success: session.payment_status === 'paid',
  //   data: session
  // };
  
  // Mock verification for now - replace with actual Stripe implementation
  return {
    success: true,
    data: { sessionId }
  };
}

// PayPal Integration
async function createPayPalOrder(payment, member) {
  // TODO: Implement PayPal order creation
  // Mock response for now - replace with actual PayPal implementation
  return {
    orderId: `paypal_${Date.now()}`,
    approvalUrl: `/payment/paypal-approval?order=${Date.now()}`
  };
}

async function verifyPayPalPayment(payment, orderId) {
  // TODO: Implement PayPal order verification
  // Mock verification for now - replace with actual PayPal implementation
  return {
    success: true,
    data: { orderId }
  };
}

// UPI Integration
async function createUPIPayment(payment, member) {
  // TODO: Implement UPI payment link generation
  // Mock response for now - replace with actual UPI implementation
  return {
    orderId: `upi_${Date.now()}`,
    upiLink: `upi://pay?pa=gym@upi&pn=${payment.metadata?.gymName || 'Gym'}&am=${payment.amount}&cu=INR&tr=${payment._id}`,
    qrCode: `/payment/upi-qr?order=${Date.now()}`
  };
}

// ============ HELPER FUNCTIONS ============

function calculateTax(amount) {
  // Calculate GST (18% in India)
  const taxRate = 0.18;
  return Math.round(amount * taxRate);
}

async function activateMembershipAfterPayment(payment) {
  try {
    const member = await Member.findById(payment.member);
    if (!member) return;

    // Calculate new membership dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    const duration = payment.metadata?.duration || 1;
    endDate.setMonth(endDate.getMonth() + duration);

    // Update member's subscription
    member.membershipStatus = 'active';
    member.paymentStatus = 'paid';
    member.membershipStartDate = startDate;
    member.membershipEndDate = endDate;
    member.lastPaymentDate = new Date();

    await member.save();

    console.log(`Membership activated for member ${member._id} until ${endDate}`);
  } catch (error) {
    console.error('Error activating membership:', error);
  }
}

async function handleRazorpayWebhook(event, data) {
  // TODO: Implement Razorpay webhook handling
  console.log('Razorpay webhook:', event, data);
}

async function handleStripeWebhook(event, data) {
  // TODO: Implement Stripe webhook handling
  console.log('Stripe webhook:', event, data);
}

async function handlePayPalWebhook(event, data) {
  // TODO: Implement PayPal webhook handling
  console.log('PayPal webhook:', event, data);
}

// Export the new payment integration functions
module.exports.createPaymentSession = createPaymentSession;
module.exports.verifyPayment = verifyPayment;
module.exports.getPaymentStatus = getPaymentStatus;
module.exports.handlePaymentWebhook = handlePaymentWebhook;

// Export cash payment functions
module.exports.createCashPaymentRequest = createCashPaymentRequest;
module.exports.checkCashValidation = checkCashValidation;
module.exports.getPendingCashValidations = getPendingCashValidations;
module.exports.approveCashValidation = approveCashValidation;
