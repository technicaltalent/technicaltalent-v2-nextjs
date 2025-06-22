const fs = require('fs');

const WORDPRESS_SQL_FILE = '../Reference Files/wp_6fbrt.sql';

// Simple WordPress SQL INSERT parsing function for debugging
function parseWordPressUsers(sqlContent) {
  console.log('🔍 Searching for user INSERT statements...');
  
  // Look for INSERT INTO xVhkH_users
  const userInsertRegex = /INSERT INTO `xVhkH_users`.*?VALUES.*?;/gs;
  const matches = sqlContent.match(userInsertRegex);
  
  console.log(`📊 Found ${matches ? matches.length : 0} user INSERT statements`);
  
  if (matches && matches.length > 0) {
    console.log('📝 First INSERT statement preview:');
    console.log(matches[0].substring(0, 200) + '...');
  }
  
  return [];
}

function parseWordPressTerms(sqlContent) {
  console.log('🔍 Searching for terms INSERT statements...');
  
  // Look for INSERT INTO xVhkH_terms
  const termsInsertRegex = /INSERT INTO `xVhkH_terms`.*?VALUES.*?;/gs;
  const matches = sqlContent.match(termsInsertRegex);
  
  console.log(`📊 Found ${matches ? matches.length : 0} terms INSERT statements`);
  
  if (matches && matches.length > 0) {
    console.log('📝 First INSERT statement preview:');
    console.log(matches[0].substring(0, 200) + '...');
  }
  
  return [];
}

// Main debug function
async function debugWordPressParsing() {
  try {
    console.log('🔧 **DEBUGGING WORDPRESS SQL PARSING**\n');
    
    console.log('📁 **READING WORDPRESS SQL DUMP**');
    const sqlContent = fs.readFileSync(WORDPRESS_SQL_FILE, 'utf8');
    
    console.log(`📄 File size: ${sqlContent.length} characters`);
    console.log(`📊 First 500 characters:`);
    console.log(sqlContent.substring(0, 500));
    console.log('\n---\n');
    
    // Test users parsing
    parseWordPressUsers(sqlContent);
    console.log('\n---\n');
    
    // Test terms parsing  
    parseWordPressTerms(sqlContent);
    console.log('\n---\n');
    
    // Check for DiGiCo specifically
    console.log('🔍 Searching for "DiGiCo" in the file...');
    const digiocoMatches = sqlContent.match(/DiGiCo/g);
    console.log(`📊 Found ${digiocoMatches ? digiocoMatches.length : 0} DiGiCo mentions`);
    
    if (digiocoMatches) {
      const digiocoContext = sqlContent.substring(
        sqlContent.indexOf('DiGiCo') - 100,
        sqlContent.indexOf('DiGiCo') + 200
      );
      console.log('📝 DiGiCo context:');
      console.log(digiocoContext);
    }
    
  } catch (error) {
    console.error('❌ **PARSING DEBUG FAILED:**', error.message);
  }
}

// Run debug
debugWordPressParsing(); 