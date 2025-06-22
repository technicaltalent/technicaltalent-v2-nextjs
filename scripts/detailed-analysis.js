#!/usr/bin/env node

/**
 * Detailed WordPress Data Analysis
 * Extract specific data patterns for migration planning
 */

const fs = require('fs');
const path = require('path');

const SQL_DUMP_PATH = '../../Reference Files/wp_6fbrt.sql';

console.log('🔍 **DETAILED PRODUCTION DATA ANALYSIS**\n');

function detailedAnalysis() {
  const sqlContent = fs.readFileSync(path.join(__dirname, SQL_DUMP_PATH), 'utf8');
  
  // Extract actual data samples
  console.log('📊 **PRODUCTION DATABASE INSIGHTS**\n');
  
  analyzeRealUsers(sqlContent);
  analyzeRealPosts(sqlContent);
  analyzeRealSkills(sqlContent);
  analyzeMigrationReadiness(sqlContent);
}

function analyzeRealUsers(sqlContent) {
  console.log('👥 **USER DATA DEEP DIVE**');
  
  // Extract user table structure
  const userTableMatch = sqlContent.match(/CREATE TABLE `xVhkH_users` \((.*?)\) ENGINE/s);
  if (userTableMatch) {
    console.log('   User Table Schema:');
    const fields = userTableMatch[1].split(',').map(f => f.trim().split(' ')[0].replace(/`/g, ''));
    console.log('   Fields:', fields.slice(0, 10));
  }
  
  // Extract actual user data
  const userDataMatch = sqlContent.match(/INSERT INTO `xVhkH_users`[^;]+VALUES\s*\(([^)]+)\)/);
  if (userDataMatch) {
    const userData = userDataMatch[1].split(',').map(v => v.trim().replace(/'/g, ''));
    console.log('   Sample User Data:', {
      id: userData[0],
      login: userData[1],
      email: userData[4],
      registered: userData[6],
      name: userData[9]
    });
  }
  
  // Extract user meta keys
  const userMetaKeys = extractMetaKeysDetailed(sqlContent, 'xVhkH_usermeta');
  console.log('   User Meta Keys:', userMetaKeys.slice(0, 15));
  console.log('   Total User Meta Keys:', userMetaKeys.length);
  
  console.log('');
}

function analyzeRealPosts(sqlContent) {
  console.log('💼 **JOBS DATA DEEP DIVE**');
  
  // Extract post table structure
  const postTableMatch = sqlContent.match(/CREATE TABLE `xVhkH_posts` \((.*?)\) ENGINE/s);
  if (postTableMatch) {
    console.log('   Post Table Schema:');
    const fields = postTableMatch[1].split(',').map(f => f.trim().split(' ')[0].replace(/`/g, ''));
    console.log('   Fields:', fields.slice(0, 10));
  }
  
  // Extract actual post data
  const postDataMatch = sqlContent.match(/INSERT INTO `xVhkH_posts`[^;]+VALUES\s*\(([^)]+)\)/);
  if (postDataMatch) {
    const postData = postDataMatch[1].split(',').map(v => v.trim().replace(/'/g, ''));
    console.log('   Sample Post Data:', {
      id: postData[0],
      author: postData[1],
      title: postData[4],
      type: postData[16],
      status: postData[7]
    });
  }
  
  // Extract post meta keys for jobs
  const postMetaKeys = extractMetaKeysDetailed(sqlContent, 'xVhkH_postmeta');
  console.log('   Post Meta Keys:', postMetaKeys.slice(0, 15));
  console.log('   Total Post Meta Keys:', postMetaKeys.length);
  
  console.log('');
}

function analyzeRealSkills(sqlContent) {
  console.log('🎯 **SKILLS DATA DEEP DIVE**');
  
  // Extract terms (skills)
  const termsMatch = sqlContent.match(/INSERT INTO `xVhkH_terms`[^;]+VALUES\s*\(([^)]+)\)/);
  if (termsMatch) {
    const termData = termsMatch[1].split(',').map(v => v.trim().replace(/'/g, ''));
    console.log('   Sample Term:', {
      id: termData[0],
      name: termData[1],
      slug: termData[2]
    });
  }
  
  // Extract taxonomy structure
  const taxonomyMatch = sqlContent.match(/INSERT INTO `xVhkH_term_taxonomy`[^;]+VALUES\s*\(([^)]+)\)/);
  if (taxonomyMatch) {
    const taxData = taxonomyMatch[1].split(',').map(v => v.trim().replace(/'/g, ''));
    console.log('   Sample Taxonomy:', {
      id: taxData[0],
      term_id: taxData[1],
      taxonomy: taxData[2],
      parent: taxData[3],
      count: taxData[4]
    });
  }
  
  // Count skills by taxonomy
  const taxonomies = countTaxonomies(sqlContent);
  console.log('   Taxonomy Counts:', taxonomies);
  
  console.log('');
}

function analyzeMigrationReadiness(sqlContent) {
  console.log('📋 **MIGRATION READINESS ASSESSMENT**');
  
  // Count data volumes
  const counts = {
    users: countTableRecords(sqlContent, 'xVhkH_users'),
    posts: countTableRecords(sqlContent, 'xVhkH_posts'),
    terms: countTableRecords(sqlContent, 'xVhkH_terms'),
    user_skills: countTableRecords(sqlContent, 'xVhkH_term_relationships'),
    user_meta: countTableRecords(sqlContent, 'xVhkH_usermeta'),
    post_meta: countTableRecords(sqlContent, 'xVhkH_postmeta')
  };
  
  console.log('   Data Volumes:');
  Object.entries(counts).forEach(([table, count]) => {
    console.log(`     ${table}: ${count} records`);
  });
  
  // Estimate migration complexity
  console.log('\n   Migration Complexity Assessment:');
  console.log(`     👥 Users: ${counts.users} (${counts.users < 1000 ? 'Simple' : 'Medium'})`);
  console.log(`     💼 Jobs: ${counts.posts} (${counts.posts < 500 ? 'Simple' : 'Medium'})`);
  console.log(`     🎯 Skills: ${counts.terms} (${counts.terms < 100 ? 'Simple' : 'Medium'})`);
  console.log(`     🔗 Relationships: ${counts.user_skills} (${counts.user_skills < 10000 ? 'Medium' : 'Complex'})`);
  
  // Migration time estimate
  const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const estimatedMinutes = Math.ceil(totalRecords / 1000) * 2; // Rough estimate
  console.log(`\n   📅 Estimated Migration Time: ${estimatedMinutes} minutes`);
  console.log(`   📦 Total Records to Migrate: ${totalRecords}`);
  
  console.log('');
}

// Helper functions
function extractMetaKeysDetailed(sqlContent, tableName) {
  const insertPattern = new RegExp(`INSERT INTO \`${tableName}\`[^;]+VALUES\\s*\\(([^)]+)\\)`, 'g');
  const keys = new Set();
  
  let match;
  while ((match = insertPattern.exec(sqlContent)) !== null) {
    const values = match[1].split(',');
    if (values.length >= 3) {
      const metaKey = values[2].trim().replace(/'/g, '');
      if (metaKey.length > 0 && metaKey.length < 100 && !metaKey.includes('(')) {
        keys.add(metaKey);
      }
    }
  }
  
  return Array.from(keys).sort();
}

function countTableRecords(sqlContent, tableName) {
  const insertPattern = new RegExp(`INSERT INTO \`${tableName}\`[^;]+VALUES\\s*(.+)`, 'g');
  let totalCount = 0;
  
  let match;
  while ((match = insertPattern.exec(sqlContent)) !== null) {
    const valueGroups = match[1].match(/\([^)]+\)/g);
    if (valueGroups) {
      totalCount += valueGroups.length;
    }
  }
  
  return totalCount;
}

function countTaxonomies(sqlContent) {
  const taxonomyPattern = /INSERT INTO `xVhkH_term_taxonomy`[^;]+VALUES\s*(.+)/g;
  const taxonomies = {};
  
  let match;
  while ((match = taxonomyPattern.exec(sqlContent)) !== null) {
    const valueGroups = match[1].match(/\([^)]+\)/g);
    if (valueGroups) {
      valueGroups.forEach(group => {
        const values = group.replace(/[()]/g, '').split(',');
        if (values.length >= 3) {
          const taxonomy = values[2].trim().replace(/'/g, '');
          taxonomies[taxonomy] = (taxonomies[taxonomy] || 0) + 1;
        }
      });
    }
  }
  
  return taxonomies;
}

// Export for use in migration scripts
module.exports = {
  detailedAnalysis,
  extractMetaKeysDetailed,
  countTableRecords,
  SQL_DUMP_PATH
};

// Run if called directly
if (require.main === module) {
  try {
    detailedAnalysis();
    console.log('✅ **Detailed Analysis Complete!**\n');
    console.log('🚀 **Ready for Phase 4.2: Migration Scripts Development**');
    console.log('   Next: Create user, skills, and jobs migration scripts');
  } catch (error) {
    console.error('❌ Error analyzing database:', error.message);
  }
} 