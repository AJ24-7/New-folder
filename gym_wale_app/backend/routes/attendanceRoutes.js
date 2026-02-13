const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const Trainer = require('../models/trainerModel');
const gymadminAuth = require('../middleware/gymadminAuth');
const authMiddleware = require('../middleware/authMiddleware');

// Enhanced rush hour analysis endpoint for gym details page with professional bar chart data
router.get('/rush-analysis/:gymId', async (req, res) => {
    try {
        const { gymId } = req.params;
        const { days = 7 } = req.query; // Default to 7 days analysis
        
        console.log(`📊 Enhanced rush hour analysis for gym ${gymId} over ${days} days`);

        // Get attendance data for the specified period
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(days));
        
        // Normalize dates
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const attendanceRecords = await Attendance.find({
            gymId: gymId,
            date: { $gte: startDate, $lte: endDate },
            checkInTime: { $exists: true, $ne: null },
            status: 'present'
        }).select('checkInTime date');

        console.log(`� Found ${attendanceRecords.length} attendance records for analysis`);

        // Initialize hourly data (6 AM to 10 PM - typical gym hours)
        const hourlyData = {};
        for (let hour = 6; hour <= 22; hour++) {
            hourlyData[hour] = {
                totalVisits: 0,
                averageVisits: 0,
                percentage: 0,
                rushLevel: 'low',
                formattedHour: formatHour(hour),
                barHeight: 0
            };
        }

        // Process attendance data by hour
        attendanceRecords.forEach(record => {
            if (record.checkInTime) {
                let checkInHour;
                
                // Handle different time formats
                if (record.checkInTime.includes('pm') || record.checkInTime.includes('am')) {
                    const timeStr = record.checkInTime.toLowerCase();
                    const [time, period] = timeStr.split(' ');
                    const [hour] = time.split(':');
                    let hourNum = parseInt(hour);
                    
                    if (period === 'pm' && hourNum !== 12) {
                        hourNum += 12;
                    } else if (period === 'am' && hourNum === 12) {
                        hourNum = 0;
                    }
                    
                    checkInHour = hourNum;
                } else {
                    const timeParts = record.checkInTime.split(':');
                    checkInHour = parseInt(timeParts[0]);
                }
                
                // Only count hours within gym operating hours
                if (checkInHour >= 6 && checkInHour <= 22) {
                    hourlyData[checkInHour].totalVisits++;
                }
            }
        });

        // Calculate averages and percentages
        const totalDays = parseInt(days);
        let maxVisits = 0;
        let totalAllHours = 0;

        Object.keys(hourlyData).forEach(hour => {
            const visits = hourlyData[hour].totalVisits;
            hourlyData[hour].averageVisits = Math.round((visits / totalDays) * 10) / 10; // Round to 1 decimal
            totalAllHours += visits;
            
            if (visits > maxVisits) {
                maxVisits = visits;
            }
        });

        // Calculate percentages, rush levels, and bar heights
        Object.keys(hourlyData).forEach(hour => {
            const visits = hourlyData[hour].totalVisits;
            hourlyData[hour].percentage = maxVisits > 0 ? Math.round((visits / maxVisits) * 100) : 0;
            hourlyData[hour].barHeight = hourlyData[hour].percentage; // For CSS height
            
            // Determine rush level based on percentage of peak
            if (hourlyData[hour].percentage >= 70) {
                hourlyData[hour].rushLevel = 'high';
            } else if (hourlyData[hour].percentage >= 40) {
                hourlyData[hour].rushLevel = 'medium';
            } else {
                hourlyData[hour].rushLevel = 'low';
            }
        });

        // Find peak and least busy hours
        let peakHour = 6;
        let leastBusyHour = 6;
        
        Object.keys(hourlyData).forEach(hour => {
            if (hourlyData[hour].totalVisits > hourlyData[peakHour].totalVisits) {
                peakHour = parseInt(hour);
            }
            if (hourlyData[hour].totalVisits < hourlyData[leastBusyHour].totalVisits) {
                leastBusyHour = parseInt(hour);
            }
        });

        // Calculate period statistics
        const periodStats = {
            morning: {
                name: 'Morning',
                period: '6 AM - 12 PM',
                hours: [6, 7, 8, 9, 10, 11],
                totalVisits: 0,
                averageVisits: 0,
                rushLevel: 'low',
                icon: 'fa-sun'
            },
            afternoon: {
                name: 'Afternoon',
                period: '12 PM - 6 PM',
                hours: [12, 13, 14, 15, 16, 17],
                totalVisits: 0,
                averageVisits: 0,
                rushLevel: 'low',
                icon: 'fa-cloud-sun'
            },
            evening: {
                name: 'Evening',
                period: '6 PM - 11 PM',
                hours: [18, 19, 20, 21, 22],
                totalVisits: 0,
                averageVisits: 0,
                rushLevel: 'low',
                icon: 'fa-moon'
            }
        };

        Object.keys(periodStats).forEach(periodKey => {
            const period = periodStats[periodKey];
            period.hours.forEach(hour => {
                period.totalVisits += hourlyData[hour]?.totalVisits || 0;
            });
            period.averageVisits = Math.round((period.totalVisits / (period.hours.length * totalDays)) * 10) / 10;
            
            // Determine rush level for period based on average percentage
            const avgPercentage = period.hours.reduce((sum, hour) => 
                sum + (hourlyData[hour]?.percentage || 0), 0) / period.hours.length;
            
            if (avgPercentage >= 60) {
                period.rushLevel = 'high';
            } else if (avgPercentage >= 35) {
                period.rushLevel = 'medium';
            } else {
                period.rushLevel = 'low';
            }
        });

        // Calculate overall statistics
        const statistics = {
            totalRecords: attendanceRecords.length,
            analyzedDays: totalDays,
            averageDailyVisits: Math.round(totalAllHours / totalDays),
            peakHourVisits: hourlyData[peakHour].totalVisits,
            peakHour: peakHour,
            peakHourFormatted: formatHour(peakHour),
            leastBusyHour: leastBusyHour,
            leastBusyHourFormatted: formatHour(leastBusyHour),
            maxHourlyVisits: maxVisits,
            dateRange: {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0]
            }
        };

        // Helper function to format hour for display
        function formatHour(hour) {
            if (hour === 0) return '12:00 AM';
            if (hour < 12) return `${hour}:00 AM`;
            if (hour === 12) return '12:00 PM';
            return `${hour - 12}:00 PM`;
        }

        const result = {
            success: true,
            data: {
                hourlyData,
                periodStats,
                statistics,
                hasData: attendanceRecords.length > 0,
                lastUpdated: new Date().toISOString(),
                chartConfig: {
                    maxHeight: 100, // For bar chart scaling
                    colors: {
                        low: '#4CAF50',    // Green
                        medium: '#FF9800', // Orange  
                        high: '#F44336'    // Red
                    }
                }
            }
        };

        console.log(`✅ Enhanced rush hour analysis complete. Peak: ${formatHour(peakHour)} (${maxVisits} visits), Records: ${attendanceRecords.length}`);
        res.json(result);

    } catch (error) {
        console.error('❌ Error in enhanced rush hour analysis:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to analyze rush hours',
            message: error.message 
        });
    }
});
router.post('/create-sample-data/:gymId', async (req, res) => {
    try {
        const { gymId } = req.params;
        console.log(`🧪 Creating sample attendance data for gym ${gymId}`);

        // Get members for this gym (you may need to adjust this based on your member model)
        const Member = require('../models/Member');
        const members = await Member.find().limit(20); // Get some members for testing
        
        if (members.length === 0) {
            return res.status(400).json({ error: 'No members found to create sample data' });
        }

        const today = new Date();
        const sampleData = [];

        // Create attendance data for the past 7 days
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() - dayOffset);
            
            // Define rush hour patterns (more realistic attendance)
            const hourlyPatterns = {
                6: { base: 2, variance: 1 },   // Early morning - few people
                7: { base: 5, variance: 2 },   // Morning rush starts
                8: { base: 8, variance: 3 },   // Peak morning
                9: { base: 6, variance: 2 },   // Late morning
                10: { base: 4, variance: 2 },  // Mid morning
                11: { base: 3, variance: 1 },  // Pre-lunch lull
                12: { base: 4, variance: 2 },  // Lunch time
                13: { base: 3, variance: 1 },  // Post lunch
                14: { base: 2, variance: 1 },  // Afternoon lull
                15: { base: 3, variance: 1 },  // Mid afternoon
                16: { base: 4, variance: 2 },  // Late afternoon
                17: { base: 7, variance: 3 },  // Early evening rush
                18: { base: 12, variance: 4 }, // Peak evening
                19: { base: 10, variance: 3 }, // Evening
                20: { base: 7, variance: 2 },  // Late evening
                21: { base: 4, variance: 2 },  // Wind down
                22: { base: 2, variance: 1 }   // Late night
            };

            // Generate attendance for each hour
            Object.keys(hourlyPatterns).forEach(hour => {
                const pattern = hourlyPatterns[hour];
                const attendanceCount = Math.max(0, Math.round(
                    pattern.base + (Math.random() - 0.5) * pattern.variance * 2
                ));

                // Create attendance records for random members
                for (let i = 0; i < attendanceCount && i < members.length; i++) {
                    const randomMember = members[Math.floor(Math.random() * members.length)];
                    const checkInTime = `${hour.padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
                    const checkOutTime = `${(parseInt(hour) + 1 + Math.floor(Math.random() * 2)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;

                    sampleData.push({
                        gymId: gymId,
                        personId: randomMember._id,
                        personType: 'Member',
                        date: currentDate,
                        status: 'present',
                        checkInTime: checkInTime,
                        checkOutTime: checkOutTime
                    });
                }
            });
        }

        // Insert sample data
        await Attendance.insertMany(sampleData);
        
        console.log(`✅ Created ${sampleData.length} sample attendance records`);
        res.json({ 
            success: true, 
            message: `Created ${sampleData.length} sample attendance records`,
            recordsCreated: sampleData.length
        });

    } catch (error) {
        console.error('❌ Error creating sample data:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create sample data',
            message: error.message 
        });
    }
});

// Get attendance for a specific date
router.get('/:date', gymadminAuth, async (req, res) => {
    try {
        const { date } = req.params;
        const gymId = req.admin.id; // Use req.admin.id from current auth structure

        const attendance = await Attendance.find({
            gymId,
            date: new Date(date)
        }).populate('personId', 'memberName firstName lastName membershipId specialty');

        const attendanceMap = {};
        attendance.forEach(record => {
            if (record.personId && record.personId._id) {
                attendanceMap[record.personId._id] = {
                    status: record.status,
                    checkInTime: record.checkInTime,
                    checkOutTime: record.checkOutTime,
                    personType: record.personType
                };
            }
        });

        res.json(attendanceMap);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

// Mark attendance
router.post('/', gymadminAuth, async (req, res) => {
    try {
        const { personId, personType, date, status, checkInTime, checkOutTime } = req.body;
        const gymId = req.admin.id; // Use req.admin.id from current auth structure


        // Validate person exists
        let person;
        if (personType === 'Member') {
            person = await Member.findById(personId);
            console.log(`🔍 Member lookup result:`, person ? `Found ${person.memberName}` : 'Not found');
            
            // Check membership validity and allowance period
            if (person) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // Check if membership has expired
                let membershipValid = true;
                if (person.membershipValidUntil) {
                    const validUntil = new Date(person.membershipValidUntil);
                    validUntil.setHours(0, 0, 0, 0);
                    membershipValid = validUntil >= today;
                }
                
                // If membership expired, check if they have payment allowance
                if (!membershipValid) {
                    const hasPaymentAllowance = person.paymentStatus === 'pending' && 
                                              person.allowanceExpiryDate && 
                                              new Date(person.allowanceExpiryDate) >= today;
                    
                    if (!hasPaymentAllowance) {
                        return res.status(403).json({ 
                            error: 'Member access denied',
                            message: 'Membership has expired and no payment allowance is active. Please renew membership to continue gym access.',
                            membershipExpired: true,
                            validUntil: person.membershipValidUntil,
                            paymentStatus: person.paymentStatus
                        });
                    } else {
                        console.log(`⚠️ Member ${person.memberName} accessing gym under 7-day payment allowance`);
                    }
                }
            }
        } else if (personType === 'Trainer') {
            person = await Trainer.findById(personId);
            console.log(`🔍 Trainer lookup result:`, person ? `Found ${person.firstName} ${person.lastName}` : 'Not found');
        }

        if (!person) {
            return res.status(404).json({ error: 'Person not found' });
        }

        // Check if attendance already exists for this date
        let attendance = await Attendance.findOne({
            gymId,
            personId,
            date: new Date(date)
        });

        if (attendance) {
            // Update existing attendance
            attendance.status = status;
            attendance.checkInTime = checkInTime;
            attendance.checkOutTime = checkOutTime;
            attendance.updatedAt = new Date();
        } else {
            // Create new attendance record
            attendance = new Attendance({
                gymId,
                personId,
                personType,
                date: new Date(date),
                status,
                checkInTime,
                checkOutTime
            });
        }

        const savedAttendance = await attendance.save();
        console.log(`✅ Attendance saved successfully:`, {
            id: savedAttendance._id,
            gymId: savedAttendance.gymId,
            personId: savedAttendance.personId,
            date: savedAttendance.date,
            status: savedAttendance.status
        });
        
        res.json({ message: 'Attendance marked successfully', attendance: savedAttendance });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
});

// Get attendance summary for a date range
router.get('/summary/:startDate/:endDate', gymadminAuth, async (req, res) => {
    try {
        const { startDate, endDate } = req.params;
        const gymId = req.admin.id; // Use req.admin.id from current auth structure

        const attendance = await Attendance.find({
            gymId,
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).populate('personId', 'memberName firstName lastName membershipId specialty');

        const summary = {
            totalDays: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1,
            memberAttendance: {},
            trainerAttendance: {},
            dailyStats: {}
        };

        attendance.forEach(record => {
            const dateKey = record.date.toISOString().split('T')[0];
            
            if (!summary.dailyStats[dateKey]) {
                summary.dailyStats[dateKey] = {
                    members: { present: 0, absent: 0, total: 0 },
                    trainers: { present: 0, absent: 0, total: 0 }
                };
            }

            const personKey = record.personId._id.toString();
            const personData = {
                id: record.personId._id,
                name: record.personId.memberName || 
                      (record.personId.firstName + ' ' + record.personId.lastName),
                membershipId: record.personId.membershipId,
                specialty: record.personId.specialty
            };

            if (record.personType === 'member') {
                if (!summary.memberAttendance[personKey]) {
                    summary.memberAttendance[personKey] = {
                        ...personData,
                        attendance: []
                    };
                }
                summary.memberAttendance[personKey].attendance.push({
                    date: dateKey,
                    status: record.status,
                    checkInTime: record.checkInTime,
                    checkOutTime: record.checkOutTime
                });

                summary.dailyStats[dateKey].members.total++;
                if (record.status === 'present') {
                    summary.dailyStats[dateKey].members.present++;
                } else if (record.status === 'absent') {
                    summary.dailyStats[dateKey].members.absent++;
                }
            } else if (record.personType === 'trainer') {
                if (!summary.trainerAttendance[personKey]) {
                    summary.trainerAttendance[personKey] = {
                        ...personData,
                        attendance: []
                    };
                }
                summary.trainerAttendance[personKey].attendance.push({
                    date: dateKey,
                    status: record.status,
                    checkInTime: record.checkInTime,
                    checkOutTime: record.checkOutTime
                });

                summary.dailyStats[dateKey].trainers.total++;
                if (record.status === 'present') {
                    summary.dailyStats[dateKey].trainers.present++;
                } else if (record.status === 'absent') {
                    summary.dailyStats[dateKey].trainers.absent++;
                }
            }
        });

        res.json(summary);
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ error: 'Failed to fetch attendance summary' });
    }
});

// Get attendance statistics
router.get('/stats/:month/:year', gymadminAuth, async (req, res) => {
    try {
        const { month, year } = req.params;
        const gymId = req.admin.id; // Use req.admin.id from current auth structure

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const attendance = await Attendance.find({
            gymId,
            date: {
                $gte: startDate,
                $lte: endDate
            }
        });

        const stats = {
            totalRecords: attendance.length,
            memberStats: {
                present: 0,
                absent: 0,
                total: 0
            },
            trainerStats: {
                present: 0,
                absent: 0,
                total: 0
            },
            dailyTrends: {}
        };

        attendance.forEach(record => {
            const dateKey = record.date.toISOString().split('T')[0];
            
            if (!stats.dailyTrends[dateKey]) {
                stats.dailyTrends[dateKey] = {
                    members: { present: 0, absent: 0 },
                    trainers: { present: 0, absent: 0 }
                };
            }

            if (record.personType === 'member') {
                stats.memberStats.total++;
                if (record.status === 'present') {
                    stats.memberStats.present++;
                    stats.dailyTrends[dateKey].members.present++;
                } else if (record.status === 'absent') {
                    stats.memberStats.absent++;
                    stats.dailyTrends[dateKey].members.absent++;
                }
            } else if (record.personType === 'trainer') {
                stats.trainerStats.total++;
                if (record.status === 'present') {
                    stats.trainerStats.present++;
                    stats.dailyTrends[dateKey].trainers.present++;
                } else if (record.status === 'absent') {
                    stats.trainerStats.absent++;
                    stats.dailyTrends[dateKey].trainers.absent++;
                }
            }
        });

        res.json(stats);
    } catch (error) {
        console.error('Error fetching attendance statistics:', error);
        res.status(500).json({ error: 'Failed to fetch attendance statistics' });
    }
});

// Bulk mark attendance
router.post('/bulk', gymadminAuth, async (req, res) => {
    try {
        const { attendanceRecords } = req.body;
        const gymId = req.admin.id; // Use req.admin.id from current auth structure

        const promises = attendanceRecords.map(async (record) => {
            const { personId, personType, date, status, checkInTime, checkOutTime } = record;

            let attendance = await Attendance.findOne({
                gymId,
                personId,
                date: new Date(date)
            });

            if (attendance) {
                attendance.status = status;
                attendance.checkInTime = checkInTime;
                attendance.checkOutTime = checkOutTime;
                attendance.updatedAt = new Date();
            } else {
                attendance = new Attendance({
                    gymId,
                    personId,
                    personType,
                    date: new Date(date),
                    status,
                    checkInTime,
                    checkOutTime
                });
            }

            return attendance.save();
        });

        await Promise.all(promises);
        res.json({ message: 'Bulk attendance marked successfully' });
    } catch (error) {
        console.error('Error bulk marking attendance:', error);
        res.status(500).json({ error: 'Failed to bulk mark attendance' });
    }
});

// Get attendance history for a specific person
router.get('/history/:personId', gymadminAuth, async (req, res) => {
    try {
        const { personId } = req.params;
        const { startDate, endDate } = req.query;
        const gymId = req.admin.id;


        // Validate person exists and belongs to this gym
        let person;
        let personType;
        const member = await Member.findById(personId);
        const trainer = await Trainer.findById(personId);
        
        if (member) {
            person = member;
            personType = 'Member';
        } else if (trainer && trainer.gym.toString() === gymId.toString()) {
            person = trainer;
            personType = 'Trainer';
        } else {
            return res.status(404).json({ error: 'Person not found or not authorized' });
        }

        // For members, limit the date range to their membership period
        let effectiveStartDate = new Date(startDate);
        let effectiveEndDate = new Date(endDate);
        
        if (personType === 'Member') {
            const joinDate = new Date(person.joinDate);
            let membershipEndDate = new Date();
            
            // Parse membershipValidUntil if it exists
            if (person.membershipValidUntil) {
                membershipEndDate = new Date(person.membershipValidUntil);
            }
            
            // Ensure we don't go beyond membership period
            if (effectiveStartDate < joinDate) {
                effectiveStartDate = joinDate;
            }
            if (effectiveEndDate > membershipEndDate) {
                effectiveEndDate = membershipEndDate;
            }
            
            // If the requested range is outside membership period, return empty result
            if (effectiveStartDate > membershipEndDate || effectiveEndDate < joinDate) {
                return res.json({
                    history: [],
                    membershipInfo: {
                        joinDate: person.joinDate,
                        membershipValidUntil: person.membershipValidUntil,
                        isWithinMembershipPeriod: false
                    }
                });
            }
        }

        // Build query
        const query = {
            gymId,
            personId,
            date: {
                $gte: effectiveStartDate,
                $lte: effectiveEndDate
            }
        };


        const attendanceHistory = await Attendance.find(query)
            .sort({ date: 1 })
            .select('date status checkInTime checkOutTime');

        attendanceHistory.forEach(record => {
            console.log(`  - ${record.date.toISOString().split('T')[0]}: ${record.status}`);
        });

        // Format response
        const response = {
            history: attendanceHistory,
            membershipInfo: personType === 'Member' ? {
                joinDate: person.joinDate,
                membershipValidUntil: person.membershipValidUntil,
                isWithinMembershipPeriod: true,
                effectiveStartDate: effectiveStartDate,
                effectiveEndDate: effectiveEndDate
            } : null
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching attendance history:', error);
        res.status(500).json({ error: 'Failed to fetch attendance history' });
    }
});

// Get attendance history for logged-in member
router.get('/member/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get the user's email to find the member record
        const User = require('../models/User');
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Find the member record by email and populate gym details
        const member = await Member.findOne({ email: user.email }).populate('gym', 'gymName city state');
        if (!member) {
            return res.status(404).json({ error: 'Member profile not found for this email' });
        }

        // Get the member's gym information for filtering
        const gymId = member.gym._id;
        
        // Calculate date range based on membership period
        const membershipStartDate = new Date(member.joinDate);
        const membershipEndDate = member.membershipValidUntil ? new Date(member.membershipValidUntil) : new Date();
        const today = new Date();
        
        // Set effective date range within membership period
        let effectiveStartDate = membershipStartDate;
        let effectiveEndDate = new Date(Math.min(today.getTime(), membershipEndDate.getTime()));
        
        // If membership hasn't started yet, return empty
        if (membershipStartDate > today) {
            return res.json({
                success: true,
                attendance: [],
                stats: { currentStreak: 0, bestStreak: 0, totalPresent: 0, totalAbsent: 0, attendanceRate: 0 },
                memberInfo: {
                    name: member.memberName,
                    joinDate: member.joinDate,
                    membershipValidUntil: member.membershipValidUntil,
                    membershipStartDate: membershipStartDate,
                    membershipEndDate: membershipEndDate,
                    gym: { name: member.gym.gymName, city: member.gym.city, state: member.gym.state },
                    planSelected: member.planSelected,
                    monthlyPlan: member.monthlyPlan,
                    isActive: membershipEndDate > today,
                    hasStarted: membershipStartDate <= today
                }
            });
        }

        // Build query to get attendance history within membership period
        const query = {
            gymId,
            personId: member._id,
            personType: 'Member',
            date: {
                $gte: effectiveStartDate,
                $lte: effectiveEndDate
            }
        };

        console.log('🔍 Fetching attendance for member:', {
            userId,
            userEmail: user.email,
            memberId: member._id,
            memberName: member.memberName,
            gymId,
            membershipPeriod: { effectiveStartDate, effectiveEndDate },
            membershipInfo: {
                joinDate: member.joinDate,
                validUntil: member.membershipValidUntil,
                plan: member.planSelected,
                duration: member.monthlyPlan
            }
        });

        const attendanceHistory = await Attendance.find(query)
            .sort({ date: -1 })
            .select('date status checkInTime checkOutTime createdAt')
            .lean();

        console.log(`📊 Found ${attendanceHistory.length} attendance records within membership period`);

        // Format the response to match frontend expectations
        const formattedHistory = attendanceHistory.map(record => ({
            date: record.date,
            status: record.status,
            checkIn: record.checkInTime,
            checkOut: record.checkOutTime,
            duration: record.checkInTime && record.checkOutTime ? 
                calculateDuration(record.checkInTime, record.checkOutTime) : 0
        }));

        // Calculate streaks and stats based on membership period
        const stats = calculateMemberStats(formattedHistory, effectiveStartDate, effectiveEndDate);

        res.json({
            success: true,
            attendance: formattedHistory,
            stats: stats,
            memberInfo: {
                name: member.memberName,
                joinDate: member.joinDate,
                membershipValidUntil: member.membershipValidUntil,
                membershipStartDate: effectiveStartDate,
                membershipEndDate: membershipEndDate,
                gym: { name: member.gym.gymName, city: member.gym.city, state: member.gym.state },
                planSelected: member.planSelected,
                monthlyPlan: member.monthlyPlan,
                isActive: membershipEndDate > today,
                hasStarted: membershipStartDate <= today,
                totalMembershipDays: calculateWorkingDaysInPeriod(effectiveStartDate, effectiveEndDate)
            }
        });

    } catch (error) {
        console.error('Error fetching member attendance history:', error);
        res.status(500).json({ error: 'Failed to fetch attendance history' });
    }
});

// Helper function to calculate duration between check-in and check-out
function calculateDuration(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    
    try {
        const checkInTime = new Date(`1970-01-01T${checkIn}:00`);
        const checkOutTime = new Date(`1970-01-01T${checkOut}:00`);
        
        let diffMs = checkOutTime - checkInTime;
        
        // Handle case where checkout is next day
        if (diffMs < 0) {
            diffMs += 24 * 60 * 60 * 1000;
        }
        
        return Math.round(diffMs / (1000 * 60)); // Return minutes
    } catch (error) {
        return 60; // Default 1 hour if calculation fails
    }
}

// Helper function to calculate duration between check-in and check-out
function calculateDuration(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    
    try {
        const checkInTime = new Date(`1970-01-01T${checkIn}:00`);
        const checkOutTime = new Date(`1970-01-01T${checkOut}:00`);
        
        let diffMs = checkOutTime - checkInTime;
        
        // Handle case where checkout is next day
        if (diffMs < 0) {
            diffMs += 24 * 60 * 60 * 1000;
        }
        
        return Math.round(diffMs / (1000 * 60)); // Return minutes
    } catch (error) {
        return 60; // Default 1 hour if calculation fails
    }
}

// Helper function to calculate member statistics
function calculateMemberStats(attendanceHistory, membershipStartDate, membershipEndDate) {
    const now = new Date();
    
    // Sort by date ascending for streak calculation
    const sortedHistory = [...attendanceHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate streaks (excluding Sundays)
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    // Calculate current streak going backwards from today (within membership period)
    const today = new Date();
    let checkDate = new Date(Math.min(today.getTime(), membershipEndDate.getTime()));
    
    // Calculate current streak
    for (let i = 0; i < 60; i++) { // Check last 60 days max
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayOfWeek = checkDate.getDay();
        
        // Skip Sundays (day 0) and dates before membership started
        if (dayOfWeek === 0 || checkDate < membershipStartDate) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
        }
        
        const record = attendanceHistory.find(r => 
            new Date(r.date).toISOString().split('T')[0] === dateStr
        );
        
        if (record && record.status === 'present') {
            currentStreak++;
        } else {
            // For dates within membership period but no record, consider as absent
            break;
        }
        
        checkDate.setDate(checkDate.getDate() - 1);
    }
    
    // Calculate best streak
    tempStreak = 0;
    for (const record of sortedHistory) {
        const recordDate = new Date(record.date);
        const dayOfWeek = recordDate.getDay();
        
        // Skip Sundays
        if (dayOfWeek === 0) continue;
        
        if (record.status === 'present') {
            tempStreak++;
            bestStreak = Math.max(bestStreak, tempStreak);
        } else {
            tempStreak = 0;
        }
    }
    
    // Calculate overall stats within membership period
    const presentCount = attendanceHistory.filter(r => r.status === 'present').length;
    const absentCount = attendanceHistory.filter(r => r.status === 'absent').length;
    const totalWorkingDays = calculateWorkingDaysInPeriod(membershipStartDate, new Date(Math.min(today.getTime(), membershipEndDate.getTime())));
    const attendanceRate = totalWorkingDays > 0 ? Math.round((presentCount / totalWorkingDays) * 100) : 0;
    
    return {
        currentStreak,
        bestStreak,
        totalPresent: presentCount,
        totalAbsent: absentCount,
        totalWorkingDays,
        attendanceRate,
        membershipDaysActive: Math.max(0, Math.floor((Math.min(today.getTime(), membershipEndDate.getTime()) - membershipStartDate.getTime()) / (1000 * 60 * 60 * 24)))
    };
}

// Helper function to calculate working days (excluding Sundays) in a period
function calculateWorkingDaysInPeriod(startDate, endDate) {
    let workingDays = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
        // Skip Sundays (day 0)
        if (current.getDay() !== 0) {
            workingDays++;
        }
        current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
}

module.exports = router;
