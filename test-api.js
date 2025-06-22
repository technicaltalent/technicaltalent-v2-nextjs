// Simple API Test Script for User Registration
// Run with: node test-api.js

const testUserRegistration = async () => {
  console.log('🧪 Testing User Registration API...\n')
  
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    first_name: 'John',
    last_name: 'Doe',
    role: 'talent',
    phone: '+1234567890'
  }

  try {
    const response = await fetch('http://localhost:3000/api/talent/v2/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    })

    const data = await response.json()
    
    console.log('📊 Response Status:', response.status)
    console.log('📋 Response Data:')
    console.log(JSON.stringify(data, null, 2))
    
    if (data.code === 200) {
      console.log('\n✅ SUCCESS: User registration working!')
      console.log('✅ WordPress-compatible response format maintained')
      
      // Test duplicate registration
      console.log('\n🧪 Testing duplicate email...')
      const duplicateResponse = await fetch('http://localhost:3000/api/talent/v2/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser)
      })
      
      const duplicateData = await duplicateResponse.json()
      console.log('📊 Duplicate Response Status:', duplicateResponse.status)
      console.log('📋 Duplicate Response Data:')
      console.log(JSON.stringify(duplicateData, null, 2))
      
      if (duplicateData.code === 400) {
        console.log('\n✅ SUCCESS: Duplicate email validation working!')
      }
      
    } else {
      console.log('\n❌ FAILED: Registration failed')
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message)
    console.log('\n💡 Make sure the application is running on http://localhost:3000')
  }
}

// Test invalid data
const testValidation = async () => {
  console.log('\n🧪 Testing Input Validation...\n')
  
  const invalidUser = {
    email: 'invalid-email',
    password: '123', // Too short
    first_name: '',
    last_name: 'Doe',
    role: 'invalid-role'
  }

  try {
    const response = await fetch('http://localhost:3000/api/talent/v2/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidUser)
    })

    const data = await response.json()
    
    console.log('📊 Validation Response Status:', response.status)
    console.log('📋 Validation Response Data:')
    console.log(JSON.stringify(data, null, 2))
    
    if (data.code === 400 && data.errors) {
      console.log('\n✅ SUCCESS: Input validation working!')
      console.log('✅ Error format matches WordPress structure')
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message)
  }
}

// Run tests
const runTests = async () => {
  console.log('🚀 Technical Talent Platform v2 - API Testing\n')
  console.log('==================================================')
  
  await testUserRegistration()
  await testValidation()
  
  console.log('\n==================================================')
  console.log('🎉 Testing Complete!')
  console.log('\n💡 Next: Visit http://localhost:3000 to see the status dashboard')
}

runTests() 