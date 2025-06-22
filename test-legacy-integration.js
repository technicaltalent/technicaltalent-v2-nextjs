#!/usr/bin/env node

/**
 * Legacy App Integration Test
 * Tests v2 API compatibility with legacy frontend
 * Run this while legacy app (3001) is calling v2 APIs (3000)
 */

const BASE_URL = 'http://localhost:3000';

// Common endpoints that legacy app likely calls
const ENDPOINTS_TO_TEST = [
  // Authentication
  { path: '/wp-json/jwt-auth/v1/token', method: 'POST', data: { username: 'test-legacy@example.com', password: 'testpass123' } },
  
  // User Management  
  { path: '/wp-json/talent/v2/users/register', method: 'POST', data: { email: 'test-auth@example.com', password: 'testpass123', first_name: 'Test', last_name: 'User', role: 'talent' } },
  { path: '/wp-json/talent/v2/user/details', method: 'GET', needsAuth: true },
  { path: '/wp-json/talent/v2/user/getskills', method: 'GET', needsAuth: true },
  { path: '/wp-json/talent/v2/users/postSkills', method: 'POST', needsAuth: true },
  { path: '/wp-json/talent/v2/users/address', method: 'POST', needsAuth: true },
  { path: '/wp-json/talent/v2/users/role', method: 'GET', needsAuth: true },
  { path: '/wp-json/talent/v2/users/update-role', method: 'POST', needsAuth: true },
  
  // Skills
  { path: '/wp-json/talent/v2/skills', method: 'GET' },
  { path: '/wp-json/talent/v2/skills/15', method: 'GET' }, // Audio skills
  
  // Jobs
  { path: '/wp-json/talent/v2/invited/jobs', method: 'GET', needsAuth: true },
  { path: '/wp-json/talent/v2/assigned/jobs', method: 'GET', needsAuth: true },
  { path: '/wp-json/wp/v2/posts', method: 'GET' },
  
  // Profile Updates
  { path: '/wp-json/talent/v2/update/userdetails', method: 'POST', needsAuth: true },
  { path: '/wp-json/talent/v2/admin/profilemsg', method: 'GET', needsAuth: true },
  
  // Language
  { path: '/wp-json/talent/v2/user/getLang', method: 'GET' },
  
  // These endpoints are likely missing and need to be implemented:
  { path: '/wp-json/talent/v2/accept/invites', method: 'POST', missing: true },
  { path: '/wp-json/talent/v2/jobdetails/1', method: 'GET', missing: true },
  { path: '/wp-json/talent/v2/create/role', method: 'POST', missing: true },
  { path: '/wp-json/talent/v2/edit/jobdetails', method: 'PUT', missing: true },
  { path: '/wp-json/talent/v2/filter/talents', method: 'GET', missing: true },
  { path: '/wp-json/talent/v2/get/talentdetails', method: 'GET', missing: true },
  { path: '/wp-json/bdpwr/v1/reset-password', method: 'POST', missing: true },
  { path: '/wp-json/bdpwr/v1/set-password', method: 'POST', missing: true },
];

// Store token for authenticated requests
let authToken = null;

async function testEndpoint(endpoint) {
  try {
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    
    // Add authentication if needed
    if (endpoint.needsAuth && authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (endpoint.data) {
      options.body = JSON.stringify(endpoint.data);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint.path}`, options);
    
    const status = response.status;
    const isSuccess = status >= 200 && status < 300;
    
    let responseText = '';
    try {
      responseText = await response.text();
      
      // Try to extract token from login response
      if (endpoint.path.includes('jwt-auth/v1/token') && isSuccess) {
        const data = JSON.parse(responseText);
        if (data.token) {
          authToken = data.token;
          console.log('  🎫 Got auth token for subsequent requests');
        }
      }
    } catch (e) {
      responseText = 'Could not read response';
    }
    
    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      status,
      success: isSuccess,
      missing: endpoint.missing || false,
      needsAuth: endpoint.needsAuth || false,
      response: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
      cors: response.headers.get('access-control-allow-origin') !== null
    };
    
  } catch (error) {
    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      status: 'ERROR',
      success: false,
      missing: endpoint.missing || false,
      needsAuth: endpoint.needsAuth || false,
      error: error.message,
      cors: false
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Legacy App Integration with v2 APIs\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Testing ${ENDPOINTS_TO_TEST.length} endpoints...\n`);
  
  const results = [];
  
  for (const endpoint of ENDPOINTS_TO_TEST) {
    console.log(`Testing ${endpoint.method} ${endpoint.path}...`);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    const missingFlag = result.missing ? ' [MISSING]' : '';
    const corsFlag = result.cors ? ' [CORS OK]' : ' [NO CORS]';
    
    console.log(`  ${status} ${result.status}${missingFlag}${corsFlag}`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  }
  
  // Summary
  console.log('\n📊 SUMMARY\n');
  
  const implemented = results.filter(r => !r.missing);
  const missing = results.filter(r => r.missing);
  const working = results.filter(r => r.success && !r.missing);
  const broken = results.filter(r => !r.success && !r.missing);
  const corsIssues = results.filter(r => !r.cors);
  
  console.log(`📈 Implemented Endpoints: ${implemented.length}`);
  console.log(`  ✅ Working: ${working.length}`);
  console.log(`  ❌ Broken: ${broken.length}`);
  console.log(`\n📉 Missing Endpoints: ${missing.length}`);
  console.log(`\n🌐 CORS Issues: ${corsIssues.length}`);
  
  if (broken.length > 0) {
    console.log('\n❌ BROKEN ENDPOINTS:');
    broken.forEach(r => {
      console.log(`  - ${r.method} ${r.endpoint} (${r.status})`);
      if (r.error) {
        console.log(`    Error: ${r.error}`);
      }
    });
  }
  
  if (missing.length > 0) {
    console.log('\n📋 MISSING ENDPOINTS TO IMPLEMENT:');
    missing.forEach(r => {
      console.log(`  - ${r.method} ${r.endpoint}`);
    });
  }
  
  if (corsIssues.length > 0) {
    console.log('\n🌐 ENDPOINTS WITH CORS ISSUES:');
    corsIssues.forEach(r => {
      console.log(`  - ${r.method} ${r.endpoint}`);
    });
  }
  
  console.log('\n🎯 NEXT STEPS:');
  if (broken.length > 0) {
    console.log('1. Fix broken implemented endpoints');
  }
  if (corsIssues.length > 0) {
    console.log('2. Fix CORS configuration');
  }
  if (missing.length > 0) {
    console.log('3. Implement missing endpoints for full legacy compatibility');
  }
  
  console.log('\n🚀 Ready to test legacy app (port 3001) → v2 APIs (port 3000)');
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Test interrupted by user');
  process.exit(0);
});

// Run the tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
}); 