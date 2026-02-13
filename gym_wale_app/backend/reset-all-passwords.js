require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database:', mongoose.connection.name);
        
        const Gym = require('./models/gym');
        
        // Update all gym passwords to a known password
        const newPassword = 'Admin@123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const gyms = await Gym.find({});
        
        for (const gym of gyms) {
            gym.password = hashedPassword;
            await gym.save();
            console.log(`✅ Updated password for: ${gym.email} (${gym.gymName})`);
        }
        
        console.log('\n🎉 All gym passwords have been reset!');
        console.log('📧 Use any of these emails with password: Admin@123');
        console.log('');
        gyms.forEach((gym, index) => {
            console.log(`   ${index + 1}. ${gym.email} - ${gym.gymName}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

resetPassword();
