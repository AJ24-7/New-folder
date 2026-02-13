require('dotenv').config();
const mongoose = require('mongoose');

async function checkDatabase() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database:', mongoose.connection.name);
        
        // Check if Gym model exists
        const Gym = require('./models/gym');
        
        // List all gyms
        console.log('\n📋 Listing all gyms in database:');
        const gyms = await Gym.find({}, 'email gymName contactPerson').limit(10);
        
        if (gyms.length === 0) {
            console.log('❌ No gyms found in database!');
            console.log('\n💡 Creating a test gym account...');
            
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('Test@123', 10);
            
            const testGym = new Gym({
                gymName: 'Test Gym',
                email: 'admin@testgym.com',
                password: hashedPassword,
                contactPerson: 'Test Admin',
                phone: '1234567890',
                location: {
                    address: '123 Test Street',
                    city: 'Test City',
                    state: 'Test State',
                    pincode: '123456'
                },
                isApproved: true,
                isActive: true
            });
            
            await testGym.save();
            console.log('✅ Test gym created!');
            console.log('   Email: admin@testgym.com');
            console.log('   Password: Test@123');
        } else {
            console.log(`\n✅ Found ${gyms.length} gym(s):`);
            gyms.forEach((gym, index) => {
                console.log(`   ${index + 1}. ${gym.gymName || 'No Name'} - ${gym.email}`);
            });
            
            console.log('\n💡 You can use any of these emails to login');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

checkDatabase();
