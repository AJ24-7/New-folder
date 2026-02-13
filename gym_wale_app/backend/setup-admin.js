/**
 * Setup script for Gym-Wale Admin System
 * This script creates the default super admin account
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const Admin = require('./models/admin');

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gym-wale', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✓ MongoDB connected successfully');
    } catch (error) {
        console.error('✗ MongoDB connection failed:', error.message);
        console.log('\n💡 Tip: Make sure MongoDB is running or check your MONGO_URI environment variable');
        console.log('   You can also create the admin account through the API endpoint:');
        console.log('   POST /api/admin/create-default-admin');
        process.exit(1);
    }
};

// Create default super admin
const createDefaultAdmin = async () => {
    try {
        // Check if any admin already exists
        const existingAdmin = await Admin.findOne({});
        if (existingAdmin) {
            console.log('✓ Admin account already exists');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Role: ${existingAdmin.role}`);
            console.log(`   Status: ${existingAdmin.status}`);
            return existingAdmin;
        }

        // Create new super admin
        const defaultAdmin = new Admin({
            name: 'Super Administrator',
            email: 'admin@gym-wale.com',
            password: 'SecureAdmin@2024', // This will be hashed by pre-save middleware
            role: 'super_admin',
            permissions: [
                'manage_gyms',
                'manage_users', 
                'manage_subscriptions',
                'manage_payments',
                'manage_support',
                'manage_trainers',
                'view_analytics',
                'system_settings',
                'security_logs'
            ],
            twoFactorEnabled: true,
            status: 'active'
        });

        await defaultAdmin.save();
        
        console.log('✓ Default super admin created successfully!');
        console.log('\n📋 Admin Account Details:');
        console.log(`   Email: ${defaultAdmin.email}`);
        console.log(`   Password: SecureAdmin@2024`);
        console.log(`   Role: ${defaultAdmin.role}`);
        console.log(`   2FA Enabled: ${defaultAdmin.twoFactorEnabled}`);
        console.log('\n⚠️  IMPORTANT SECURITY NOTICE:');
        console.log('   1. Please change the default password after first login');
        console.log('   2. Enable 2FA for enhanced security');
        console.log('   3. Consider creating additional admin accounts with limited permissions');
        console.log('   4. Regularly review security logs and access patterns');
        
        return defaultAdmin;

    } catch (error) {
        console.error('✗ Error creating default admin:', error.message);
        throw error;
    }
};

// Create necessary directories
const createDirectories = async () => {
    const fs = require('fs').promises;
    const path = require('path');
    
    const directories = [
        path.join(__dirname, 'logs'),
        path.join(__dirname, 'uploads', 'admin-avatars')
    ];
    
    for (const dir of directories) {
        try {
            await fs.mkdir(dir, { recursive: true });
            console.log(`✓ Created directory: ${dir}`);
        } catch (error) {
            console.error(`✗ Error creating directory ${dir}:`, error.message);
        }
    }
};

// Verify email service configuration
const verifyEmailConfig = () => {
    console.log('\n📧 Email Service Configuration:');
    
    const requiredVars = [
        'SMTP_HOST',
        'SMTP_PORT', 
        'SMTP_USER',
        'SMTP_PASS',
        'FROM_EMAIL'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.log('⚠️  Missing email configuration variables:');
        missingVars.forEach(varName => {
            console.log(`   - ${varName}`);
        });
        console.log('\n   Email features (2FA, password reset) may not work properly.');
        console.log('   Please configure these in your .env file.');
    } else {
        console.log('✓ Email service configuration appears complete');
    }
};

// Verify JWT secrets
const verifyJWTConfig = () => {
    console.log('\n🔐 JWT Configuration:');
    
    if (!process.env.JWT_SECRET) {
        console.log('⚠️  JWT_SECRET not set in environment variables');
        console.log('   Using default secret (NOT RECOMMENDED for production)');
    } else {
        console.log('✓ JWT_SECRET configured');
    }
    
    if (!process.env.JWT_REFRESH_SECRET) {
        console.log('⚠️  JWT_REFRESH_SECRET not set in environment variables');
        console.log('   Using default secret (NOT RECOMMENDED for production)');
    } else {
        console.log('✓ JWT_REFRESH_SECRET configured');
    }
};

// Main setup function
const runSetup = async () => {
    console.log('🚀 Starting Gym-Wale Admin System Setup...\n');
    
    try {
        // Connect to database
        await connectDB();
        
        // Create necessary directories
        await createDirectories();
        
        // Create default admin
        await createDefaultAdmin();
        
        // Verify configurations
        verifyEmailConfig();
        verifyJWTConfig();
        
        console.log('\n✅ Setup completed successfully!');
        console.log('\n📝 Next Steps:');
        console.log('   1. Start the server: npm start');
        console.log('   2. Navigate to: http://localhost:3000/admin/secure-admin-login.html');
        console.log('   3. Login with the credentials above');
        console.log('   4. Change the default password');
        console.log('   5. Configure additional security settings');
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n✓ Database connection closed');
        process.exit(0);
    }
};

// Run setup if called directly
if (require.main === module) {
    runSetup();
}

module.exports = {
    createDefaultAdmin,
    createDirectories,
    verifyEmailConfig,
    verifyJWTConfig
};
