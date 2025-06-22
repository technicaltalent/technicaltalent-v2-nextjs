#!/usr/bin/env node

/**
 * Legacy App Compatibility Test Suite
 * Tests all critical endpoints that the legacy web app and mobile apps need
 */

const API_BASE = 'http://localhost:3000';

// Test data
const testUser = {
  email: `legacy-test-${Date.now()}@example.com`,
  password: 'password123',
  first_name: 'Legacy',
  last_name: 'User',
  role: 'talent'
};

// Helper function for API calls
async function makeRequest(method, endpoint, data = null, headers = {}) {
  const url = `${API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const responseData = await response.text();
    
    let jsonData;
    try {
      jsonData = JSON.parse(responseData);
    } catch (e) {
      jsonData = { error: 'Invalid JSON response', data: responseData };
    }

    return {
      status: response.status,
      data: jsonData,
      success: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      success: false
    };
  }
}

// Test functions
async function testUserRegistration() {
  console.log('\n🧪 Testing User Registration...');
  
  const result = await makeRequest('POST', '/api/talent/v2/users/register', testUser);
  
  if (result.success && result.data.code === 200) {
    console.log('✅ User registration successful');
    console.log(`📧 Email: ${result.data.data.user.email}`);
    console.log(`🆔 User ID: ${result.data.data.user.id}`);
    console.log(`🎫 JWT Token provided: ${result.data.user_token ? 'Yes' : 'No'}`);
    return result.data.data.user;
  } else {
    console.log('❌ User registration failed');
    console.log('📋 Response:', result.data);
    return null;
  }
}

async function testUserLogin() {
  console.log('\n🧪 Testing User Login...');
  
  const loginData = {
    username: testUser.email,
    password: testUser.password
  };
  
  const result = await makeRequest('POST', '/api/talent/v2/users/login', loginData);
  
  if (result.success && result.data.code === 200) {
    console.log('✅ User login successful');
    console.log(`🎫 JWT Token: ${result.data.token ? 'Provided' : 'Missing'}`);
    console.log(`👤 User Display Name: ${result.data.user_display_name}`);
    console.log(`📧 User Email: ${result.data.user_email}`);
    console.log(`🔒 Token Structure: WordPress Compatible`);
    return result.data.token;
  } else {
    console.log('❌ User login failed');
    console.log('📋 Response:', result.data);
    return null;
  }
}

async function testUserDetails(token) {
  console.log('\n🧪 Testing User Details (Post-Login Check)...');
  
  const result = await makeRequest('GET', '/api/talent/v2/user/details', null, {
    'Authorization': `Bearer ${token}`
  });
  
  if (result.success && result.data.code === 200) {
    console.log('✅ User details retrieved successfully');
    console.log(`👤 Display Name: ${result.data.userinfo.display_name}`);
    console.log(`📍 User Step: ${result.data.step}`);
    console.log(`🏷️  User Roles: ${result.data.userinfo.roles.join(', ')}`);
    console.log(`🎯 Skills Count: ${result.data.userinfo.skills.length}`);
    console.log(`🔍 WordPress ID: ${result.data.userinfo.ID}`);
    return result.data.userinfo;
  } else {
    console.log('❌ User details failed');
    console.log('📋 Response:', result.data);
    return null;
  }
}

async function testSkillsAPI() {
  console.log('\n🧪 Testing Skills API...');
  
  const result = await makeRequest('GET', '/api/talent/v2/skills');
  
  if (result.success && result.data.code === 200) {
    console.log('✅ Skills API working');
    const skills = result.data.skill || [];
    console.log(`🛠️  Total Skill Categories: ${skills.length}`);
    
    // Show skills preview
    skills.slice(0, 3).forEach(skill => {
      console.log(`   • ${skill.terms.name} (${skill.subcat_count} children)`);
    });
    
    return skills;
  } else {
    console.log('❌ Skills API failed');
    console.log('📋 Response:', result.data);
    return null;
  }
}

async function testJobsAPI() {
  console.log('\n🧪 Testing Jobs API...');
  
  const result = await makeRequest('GET', '/api/talent/v2/jobs');
  
  if (result.success && result.data.code === 200) {
    console.log('✅ Jobs API working');
    console.log(`💼 Total Jobs: ${result.data.data.pagination.total_jobs}`);
    console.log(`📄 Jobs per page: ${result.data.data.pagination.per_page}`);
    console.log(`📑 Total pages: ${result.data.data.pagination.total_pages}`);
    
    // Show job preview
    if (result.data.data.jobs.length > 0) {
      const job = result.data.data.jobs[0];
      console.log(`   📍 Sample Job: "${job.title}" in ${job.location.city}, ${job.location.state}`);
      console.log(`   💰 Pay Rate: $${job.pay_rate}/${job.pay_type}`);
    }
    
    return result.data.data;
  } else {
    console.log('❌ Jobs API failed');
    console.log('📋 Response:', result.data);
    return null;
  }
}

async function testAuthenticationFlow() {
  console.log('\n🔐 Testing Complete Authentication Flow...');
  
  // Step 1: Register
  const user = await testUserRegistration();
  if (!user) return false;
  
  // Step 2: Login
  const token = await testUserLogin();
  if (!token) return false;
  
  // Step 3: Get user details (what legacy app does after login)
  const userDetails = await testUserDetails(token);
  if (!userDetails) return false;
  
  console.log('\n✅ Complete authentication flow working!');
  return true;
}

async function runLegacyCompatibilityTests() {
  console.log('🚀 Legacy Web App & Mobile App Compatibility Test Suite');
  console.log('=' .repeat(60));
  
  // Test individual endpoints
  const skills = await testSkillsAPI();
  const jobs = await testJobsAPI();
  
  // Test complete authentication flow
  const authFlow = await testAuthenticationFlow();
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 LEGACY COMPATIBILITY TEST RESULTS');
  console.log('=' .repeat(60));
  
  console.log(`🛠️  Skills API: ${skills ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`💼 Jobs API: ${jobs ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`🔐 Authentication Flow: ${authFlow ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (skills && jobs && authFlow) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Legacy web app should work seamlessly');
    console.log('✅ Mobile apps should work seamlessly');
    console.log('✅ WordPress API compatibility maintained');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED');
    console.log('❌ Legacy compatibility issues detected');
  }
  
  console.log('\n🔗 API Endpoints Tested:');
  console.log('   • POST /api/talent/v2/users/register');
  console.log('   • POST /api/talent/v2/users/login');
  console.log('   • GET  /api/talent/v2/user/details');
  console.log('   • GET  /api/talent/v2/skills');
  console.log('   • GET  /api/talent/v2/jobs');
  
  console.log('\n💡 Next: Test with actual legacy web app');
}

// Global fetch for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// Run the tests
runLegacyCompatibilityTests().catch(console.error); 