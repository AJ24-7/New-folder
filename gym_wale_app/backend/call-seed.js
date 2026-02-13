/**
 * Script to call the seed endpoint
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/workouts/seed',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('📡 Calling seed endpoint...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('✅ Response received:\n');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.error('\n💡 Make sure the backend server is running on port 5000');
  console.error('   Run: npm start');
});

req.end();
