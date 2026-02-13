require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createGymAccount() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database:', mongoose.connection.name);
        
        const Gym = require('./models/gym');
        
        // Check if email already exists
        const existing = await Gym.findOne({ email: 'ajaydagar028@gmail.com' });
        if (existing) {
            console.log('⚠️  Gym account already exists with email: ajaydagar028@gmail.com');
            console.log('   Gym Name:', existing.gymName);
            return;
        }
        
        // Create new gym account
        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        
        const newGym = new Gym({
            gymName: 'Ajay Gym',
            email: 'ajaydagar028@gmail.com',
            password: hashedPassword,
            contactPerson: 'Ajay Dagar',
            phone: '9876543210',
            location: {
                address: '123 Main Street',
                city: 'Delhi',
                state: 'Delhi',
                pincode: '110001'
            },
            isApproved: true,
            isActive: true,
            description: 'Premium fitness center',
            openingTime: '06:00',
            closingTime: '22:00'
        });
        
        await newGym.save();
        
        console.log('✅ Gym account created successfully!');
        console.log('');
        console.log('📧 Email: ajaydagar028@gmail.com');
        console.log('🔑 Password: Admin@123');
        console.log('🏋️  Gym Name: Ajay Gym');
        console.log('');
        console.log('💡 You can now login with these credentials');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

createGymAccount();
