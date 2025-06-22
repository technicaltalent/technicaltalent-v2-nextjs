#!/usr/bin/env node

/**
 * WordPress Data Analysis Script
 * Parses the production SQL dump to understand data structure and volumes
 */

const fs = require('fs');
const path = require('path');

const SQL_DUMP_PATH = '../../Reference Files/wp_6fbrt.sql';

console.log('🔍 Analyzing WordPress Production Database...\n');

function analyzeSQLDump() {
  const sqlContent = fs.readFileSync(path.join(__dirname, SQL_DUMP_PATH), 'utf8');
  
  console.log('📊 **Database Analysis Results**\n');
  
  // Analyze Users
  analyzeUsers(sqlContent);
  
  // Analyze Posts (Jobs)
  analyzePosts(sqlContent);
  
  // Analyze Terms (Skills)
  analyzeTerms(sqlContent);
  
  // Analyze Meta tables
  analyzeMeta(sqlContent);
}

function analyzeUsers(sqlContent) {
  console.log('👥 **USERS ANALYSIS**');
  
  // Extract user data
  const userInserts = sqlContent.match(/INSERT INTO `xVhkH_users`.*?;/gs);
  if (userInserts) {
    const userCount = countRecords(userInserts);
    console.log(`   Total Users: ${userCount}`);
    
    // Sample user data
    const sampleUser = extractSampleData(userInserts[0], [
      'ID', 'user_login', 'user_email', 'user_registered', 'display_name'
    ]);
    console.log('   Sample User:', sampleUser);
  }
  
  // Analyze user metadata
  const usermetaInserts = sqlContent.match(/INSERT INTO `xVhkH_usermeta`.*?;/gs);
  if (usermetaInserts) {
    const usermetaCount = countRecords(usermetaInserts);
    console.log(`   User Metadata Records: ${usermetaCount}`);
    
    // Extract common meta keys
    const metaKeys = extractMetaKeys(usermetaInserts, 'meta_key');
    console.log('   Common Meta Keys:', metaKeys.slice(0, 10));
  }
  
  console.log('');
}

function analyzePosts(sqlContent) {
  console.log('💼 **POSTS (JOBS) ANALYSIS**');
  
  const postInserts = sqlContent.match(/INSERT INTO `xVhkH_posts`.*?;/gs);
  if (postInserts) {
    const postCount = countRecords(postInserts);
    console.log(`   Total Posts: ${postCount}`);
    
    // Analyze post types
    const postTypes = extractPostTypes(postInserts);
    console.log('   Post Types:', postTypes);
    
    // Sample post data
    const samplePost = extractSampleData(postInserts[0], [
      'ID', 'post_title', 'post_type', 'post_status', 'post_author'
    ]);
    console.log('   Sample Post:', samplePost);
  }
  
  // Analyze post metadata
  const postmetaInserts = sqlContent.match(/INSERT INTO `xVhkH_postmeta`.*?;/gs);
  if (postmetaInserts) {
    const postmetaCount = countRecords(postmetaInserts);
    console.log(`   Post Metadata Records: ${postmetaCount}`);
    
    const metaKeys = extractMetaKeys(postmetaInserts, 'meta_key');
    console.log('   Common Meta Keys:', metaKeys.slice(0, 10));
  }
  
  console.log('');
}

function analyzeTerms(sqlContent) {
  console.log('🎯 **TERMS (SKILLS) ANALYSIS**');
  
  // Terms
  const termInserts = sqlContent.match(/INSERT INTO `xVhkH_terms`.*?;/gs);
  if (termInserts) {
    const termCount = countRecords(termInserts);
    console.log(`   Total Terms: ${termCount}`);
    
    const sampleTerm = extractSampleData(termInserts[0], [
      'term_id', 'name', 'slug'
    ]);
    console.log('   Sample Term:', sampleTerm);
  }
  
  // Term Taxonomy (hierarchy)
  const taxonomyInserts = sqlContent.match(/INSERT INTO `xVhkH_term_taxonomy`.*?;/gs);
  if (taxonomyInserts) {
    const taxonomyCount = countRecords(taxonomyInserts);
    console.log(`   Term Taxonomy Records: ${taxonomyCount}`);
    
    // Analyze taxonomies
    const taxonomies = extractTaxonomies(taxonomyInserts);
    console.log('   Taxonomies:', taxonomies);
  }
  
  // Term Relationships (user-skill assignments)
  const relationshipInserts = sqlContent.match(/INSERT INTO `xVhkH_term_relationships`.*?;/gs);
  if (relationshipInserts) {
    const relationshipCount = countRecords(relationshipInserts);
    console.log(`   Term Relationships: ${relationshipCount}`);
  }
  
  console.log('');
}

function analyzeMeta(sqlContent) {
  console.log('🔧 **METADATA ANALYSIS**');
  
  // Comment meta (could be applications)
  const commentmetaInserts = sqlContent.match(/INSERT INTO `xVhkH_commentmeta`.*?;/gs);
  if (commentmetaInserts) {
    const commentmetaCount = countRecords(commentmetaInserts);
    console.log(`   Comment Metadata: ${commentmetaCount}`);
  }
  
  // Comments (could be job applications)
  const commentInserts = sqlContent.match(/INSERT INTO `xVhkH_comments`.*?;/gs);
  if (commentInserts) {
    const commentCount = countRecords(commentInserts);
    console.log(`   Comments: ${commentCount}`);
  }
  
  console.log('');
}

// Helper functions
function countRecords(insertStatements) {
  let total = 0;
  insertStatements.forEach(statement => {
    const values = statement.match(/\([^)]+\)/g);
    if (values) total += values.length;
  });
  return total;
}

function extractSampleData(insertStatement, fields) {
  const fieldPattern = new RegExp(`\\(\`(${fields.join('|')})\``);
  const match = insertStatement.match(/VALUES\s*\(([^)]+)\)/);
  if (match) {
    const values = match[1].split(',').map(v => v.trim().replace(/^'|'$/g, ''));
    const result = {};
    fields.forEach((field, index) => {
      if (values[index]) result[field] = values[index];
    });
    return result;
  }
  return {};
}

function extractMetaKeys(insertStatements, keyField = 'meta_key') {
  const keys = new Set();
  insertStatements.forEach(statement => {
    const matches = statement.match(/'([^']+)'/g);
    if (matches) {
      matches.forEach(match => {
        const key = match.replace(/'/g, '');
        if (key.length > 2 && key.length < 50) {
          keys.add(key);
        }
      });
    }
  });
  return Array.from(keys).sort();
}

function extractPostTypes(insertStatements) {
  const types = new Set();
  insertStatements.forEach(statement => {
    const matches = statement.match(/'([^']+)'/g);
    if (matches) {
      matches.forEach(match => {
        const type = match.replace(/'/g, '');
        if (['post', 'page', 'job', 'role', 'application'].some(t => type.includes(t))) {
          types.add(type);
        }
      });
    }
  });
  return Array.from(types);
}

function extractTaxonomies(insertStatements) {
  const taxonomies = new Set();
  insertStatements.forEach(statement => {
    const matches = statement.match(/'([^']+)'/g);
    if (matches) {
      matches.forEach(match => {
        const taxonomy = match.replace(/'/g, '');
        if (taxonomy.length > 2 && taxonomy.length < 30) {
          taxonomies.add(taxonomy);
        }
      });
    }
  });
  return Array.from(taxonomies);
}

// Export for use in other scripts
module.exports = {
  analyzeSQLDump,
  SQL_DUMP_PATH
};

// Run if called directly
if (require.main === module) {
  try {
    analyzeSQLDump();
    console.log('✅ Analysis complete!\n');
    console.log('📋 **Next Steps:**');
    console.log('   1. Review the data structure above');
    console.log('   2. Run migration scripts for each data type');
    console.log('   3. Validate relationships and data integrity');
    console.log('   4. Test API compatibility with migrated data\n');
  } catch (error) {
    console.error('❌ Error analyzing database:', error.message);
    console.log('\n💡 Make sure the SQL dump is in the correct location:');
    console.log(`   ${path.resolve(__dirname, SQL_DUMP_PATH)}`);
  }
} 