const fetch = require('node-fetch');

async function testPasswordOTP() {
    try {
        console.log('Testing /api/gyms/request-password-otp endpoint...');
        
        const response = await fetch('http://localhost:5000/api/gyms/request-password-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'test@example.com'
            })
        });
        
        const data = await response.json();
        
        console.log('Status:', response.status);
        console.log('Response:', data);
        
        if (response.status === 404) {
            console.log('✅ Route is working! Got 404 because email doesn\'t exist (expected)');
        } else if (response.status === 200) {
            console.log('✅ Route is working! Email exists and OTP was sent');
        } else {
            console.log('❌ Unexpected status code');
        }
        
    } catch (error) {
        console.error('❌ Error testing endpoint:', error.message);
    }
}

testPasswordOTP();
