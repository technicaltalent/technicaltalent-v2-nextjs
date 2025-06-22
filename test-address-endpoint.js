const fetch = require('node-fetch');

async function testAddressEndpoint() {
  console.log('🧪 Testing Address Endpoint...\n');

  // First, let's get a JWT token by testing login
  const loginPayload = {
    email: 'test-auth@example.com',
    password: 'TestPassword123!'
  };

  try {
    console.log('1️⃣ Getting JWT token...');
    const loginResponse = await fetch('http://localhost:3000/wp-json/jwt-auth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginPayload)
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    if (!loginData.user_token?.token) {
      console.log('❌ Failed to get JWT token');
      return;
    }

    const token = loginData.user_token.token;
    console.log(`✅ Got JWT token: ${token.substring(0, 20)}...`);

    // Now test the address endpoint
    console.log('\n2️⃣ Testing address endpoint...');
    const addressPayload = {
      address: {
        formatted_address: "Sydney NSW, Australia",
        city: "Sydney", 
        state: "NSW",
        postcode: "2000",
        country: "Australia",
        latitude: -33.8688197,
        longitude: 151.2092955
      },
      pay_rate: "150",
      pay_model: "day",
      spoken_lang: [1, 2], // English, Spanish IDs from our language data
      short_bio: "Test biography for registration completion"
    };

    console.log('Sending address payload:', JSON.stringify(addressPayload, null, 2));

    const addressResponse = await fetch('http://localhost:3000/wp-json/talent/v2/users/address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(addressPayload)
    });

    const addressData = await addressResponse.json();
    console.log('\n📋 Address Response:');
    console.log('Status:', addressResponse.status);
    console.log('Data:', JSON.stringify(addressData, null, 2));

    if (addressResponse.ok) {
      console.log('\n✅ Address endpoint successful!');
      
      // Wait a moment then check if data was saved
      console.log('\n3️⃣ Checking if data was saved to database...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Re-run our database check
      const { execSync } = require('child_process');
      execSync('node check-user-data.js', { stdio: 'inherit' });
      
    } else {
      console.log('\n❌ Address endpoint failed!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAddressEndpoint(); 