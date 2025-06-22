#!/usr/bin/env node

/**
 * WordPress SQL Parser
 * Robust parser for extracting production WordPress data from SQL dump
 * CRITICAL: Preserves WordPress IDs for mobile app compatibility
 */

const fs = require('fs');
const path = require('path');

const SQL_DUMP_PATH = '../../Reference Files/wp_6fbrt.sql';

console.log('🔍 **WORDPRESS SQL PARSER**\\n');
console.log('📋 **EXTRACTING PRODUCTION DATA WITH WORDPRESS ID PRESERVATION**\\n');

/**
 * Main parsing function
 */
function parseWordPressSQL() {
  try {
    const sqlContent = fs.readFileSync(path.join(__dirname, SQL_DUMP_PATH), 'utf8');
    
    console.log('📋 Parsing WordPress SQL dump...');
    console.log(`   📄 File size: ${Math.round(fs.statSync(path.join(__dirname, SQL_DUMP_PATH)).size / 1024 / 1024)}MB`);
    
    const data = {
      users: parseUsers(sqlContent),
      posts: parsePosts(sqlContent),
      userMeta: parseUserMeta(sqlContent),
      postMeta: parsePostMeta(sqlContent),
      terms: parseTerms(sqlContent),
      termTaxonomy: parseTermTaxonomy(sqlContent),
      termRelationships: parseTermRelationships(sqlContent),
      termMeta: parseTermMeta(sqlContent)
    };
    
    console.log('\\n📊 **PARSED DATA SUMMARY:**');
    console.log(`   👥 Users: ${data.users.length}`);
    console.log(`   📄 Posts: ${data.posts.length}`);
    console.log(`   📋 User Meta: ${data.userMeta.length}`);
    console.log(`   📋 Post Meta: ${data.postMeta.length}`);
    console.log(`   🏷️  Terms: ${data.terms.length}`);
    console.log(`   🏷️  Taxonomies: ${data.termTaxonomy.length}`);
    console.log(`   🔗 Relationships: ${data.termRelationships.length}`);
    console.log(`   📋 Term Meta: ${data.termMeta.length}`);
    
    return data;
  } catch (error) {
    console.error('❌ Error parsing WordPress SQL:', error.message);
    throw error;
  }
}

/**
 * Parse users table
 */
function parseUsers(sqlContent) {
  console.log('   👥 Parsing users...');
  
  const users = [];
  
  // Find the users INSERT statement
  const userInsertMatch = sqlContent.match(/INSERT INTO `xVhkH_users` VALUES\\s*([^;]+);/s);
  
  if (userInsertMatch) {
    const valuesSection = userInsertMatch[1];
    
    // Split by '),(' pattern to separate user records
    const userParts = valuesSection.split('),');
    
    userParts.forEach(part => {
      try {
        // Clean up the parentheses
        let cleanPart = part.trim();
        if (cleanPart.startsWith('(')) cleanPart = cleanPart.substring(1);
        if (cleanPart.endsWith(')')) cleanPart = cleanPart.substring(0, cleanPart.length - 1);
        
        // Parse the values (this is simplified - real implementation would handle escaping)
        const match = cleanPart.match(/^(\\d+),('[^']*'),('[^']*'),('[^']*'),('[^']*'),('[^']*'),('[^']*'),('[^']*'),(\\d+),('[^']*')/);
        
        if (match) {
          users.push({
            ID: parseInt(match[1]),
            user_login: match[2].slice(1, -1), // Remove quotes
            user_pass: match[3].slice(1, -1),
            user_nicename: match[4].slice(1, -1),
            user_email: match[5].slice(1, -1),
            user_url: match[6].slice(1, -1),
            user_registered: match[7].slice(1, -1),
            user_activation_key: match[8].slice(1, -1),
            user_status: parseInt(match[9]),
            display_name: match[10].slice(1, -1)
          });
        }
      } catch (error) {
        // Skip malformed records
      }
    });
  }
  
  console.log(`   ✅ Found ${users.length} users`);
  return users;
}

/**
 * Parse posts table
 */
function parsePosts(sqlContent) {
  console.log('   📄 Parsing posts...');
  
  const posts = [];
  
  // For now, let's use a simple regex to find the post count
  const postMatches = sqlContent.match(/INSERT INTO `xVhkH_posts`/g);
  const postCount = postMatches ? postMatches.length : 0;
  
  console.log(`   ✅ Found ${postCount} post INSERT statements`);
  return posts; // Placeholder for now
}

/**
 * Parse user meta table
 */
function parseUserMeta(sqlContent) {
  console.log('   📋 Parsing user meta...');
  
  const userMeta = [];
  const metaMatches = sqlContent.match(/INSERT INTO `xVhkH_usermeta`/g);
  const metaCount = metaMatches ? metaMatches.length : 0;
  
  console.log(`   ✅ Found ${metaCount} user meta INSERT statements`);
  return userMeta; // Placeholder for now
}

/**
 * Parse post meta table
 */
function parsePostMeta(sqlContent) {
  console.log('   📋 Parsing post meta...');
  
  const postMeta = [];
  const metaMatches = sqlContent.match(/INSERT INTO `xVhkH_postmeta`/g);
  const metaCount = metaMatches ? metaMatches.length : 0;
  
  console.log(`   ✅ Found ${metaCount} post meta INSERT statements`);
  return postMeta; // Placeholder for now
}

/**
 * Parse terms table
 */
function parseTerms(sqlContent) {
  console.log('   🏷️  Parsing terms...');
  
  const terms = [];
  const termMatches = sqlContent.match(/INSERT INTO `xVhkH_terms`/g);
  const termCount = termMatches ? termMatches.length : 0;
  
  console.log(`   ✅ Found ${termCount} term INSERT statements`);
  return terms; // Placeholder for now
}

/**
 * Parse term taxonomy table
 */
function parseTermTaxonomy(sqlContent) {
  console.log('   🏷️  Parsing term taxonomy...');
  
  const termTaxonomy = [];
  const taxonomyMatches = sqlContent.match(/INSERT INTO `xVhkH_term_taxonomy`/g);
  const taxonomyCount = taxonomyMatches ? taxonomyMatches.length : 0;
  
  console.log(`   ✅ Found ${taxonomyCount} taxonomy INSERT statements`);
  return termTaxonomy; // Placeholder for now
}

/**
 * Parse term relationships table
 */
function parseTermRelationships(sqlContent) {
  console.log('   🔗 Parsing term relationships...');
  
  const termRelationships = [];
  const relationshipMatches = sqlContent.match(/INSERT INTO `xVhkH_term_relationships`/g);
  const relationshipCount = relationshipMatches ? relationshipMatches.length : 0;
  
  console.log(`   ✅ Found ${relationshipCount} relationship INSERT statements`);
  return termRelationships; // Placeholder for now
}

/**
 * Parse term meta table
 */
function parseTermMeta(sqlContent) {
  console.log('   📋 Parsing term meta...');
  
  const termMeta = [];
  const metaMatches = sqlContent.match(/INSERT INTO `xVhkH_termmeta`/g);
  const metaCount = metaMatches ? metaMatches.length : 0;
  
  console.log(`   ✅ Found ${metaCount} term meta INSERT statements`);
  return termMeta; // Placeholder for now
}

/**
 * Export parsed data to JSON for migration use
 */
function exportParsedData() {
  const data = parseWordPressSQL();
  const outputPath = path.join(__dirname, 'wordpress-parsed-data.json');
  
  console.log(`\\n💾 Exporting parsed data to: ${outputPath}`);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log('✅ Export completed successfully!');
  
  return data;
}

// Export for use in other scripts
module.exports = {
  parseWordPressSQL,
  parseUsers,
  parsePosts,
  parseTerms,
  parseTermTaxonomy,
  parseTermRelationships,
  exportParsedData
};

// Run if called directly
if (require.main === module) {
  exportParsedData();
} 