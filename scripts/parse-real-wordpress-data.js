#!/usr/bin/env node

/**
 * Real WordPress Data Parser
 * Parses the actual production WordPress SQL dump for migration
 * CRITICAL: Preserves WordPress IDs for mobile app compatibility
 */

const fs = require('fs');
const path = require('path');

const SQL_DUMP_PATH = '../../Reference Files/wp_6fbrt.sql';

console.log('🔍 **REAL WORDPRESS DATA PARSER**\n');
console.log('📋 **PARSING PRODUCTION DATA WITH ID PRESERVATION**\n');

/**
 * Main parsing function for production data
 */
function parseRealWordPressData() {
  try {
    const sqlContent = fs.readFileSync(path.join(__dirname, SQL_DUMP_PATH), 'utf8');
    
    console.log('📋 Loading production WordPress SQL dump...');
    console.log(`   📄 File size: ${Math.round(fs.statSync(path.join(__dirname, SQL_DUMP_PATH)).size / 1024 / 1024)}MB`);
    
    const data = {
      users: parseRealUsers(sqlContent),
      posts: parseRealPosts(sqlContent),
      userMeta: parseRealUserMeta(sqlContent),
      postMeta: parseRealPostMeta(sqlContent),
      terms: parseRealTerms(sqlContent),
      termTaxonomy: parseRealTermTaxonomy(sqlContent),
      termRelationships: parseRealTermRelationships(sqlContent)
    };
    
    console.log('\n📊 **PARSED PRODUCTION DATA SUMMARY:**');
    console.log(`   👥 Users: ${data.users.length}`);
    console.log(`   📄 Posts: ${data.posts.length}`);
    console.log(`   📋 User Meta: ${data.userMeta.length}`);
    console.log(`   📋 Post Meta: ${data.postMeta.length}`);
    console.log(`   🏷️  Terms: ${data.terms.length}`);
    console.log(`   🏷️  Taxonomies: ${data.termTaxonomy.length}`);
    console.log(`   🔗 Relationships: ${data.termRelationships.length}`);
    
    return data;
  } catch (error) {
    console.error('❌ Error parsing production WordPress data:', error.message);
    throw error;
  }
}

/**
 * Parse real users from production WordPress data
 */
function parseRealUsers(sqlContent) {
  console.log('   👥 Parsing production users...');
  
  const users = [];
  
  // Find the users INSERT section
  const userSectionMatch = sqlContent.match(/INSERT INTO `xVhkH_users` VALUES\s*([^;]+);/s);
  
  if (userSectionMatch) {
    const valuesSection = userSectionMatch[1];
    
    // Use a more sophisticated approach to split user records
    const userRecords = extractUserRecords(valuesSection);
    
    userRecords.forEach(record => {
      try {
        const user = parseUserRecord(record);
        if (user && user.user_email && user.user_email.includes('@')) {
          users.push(user);
        }
      } catch (error) {
        console.warn(`     ⚠️  Skipping malformed user: ${error.message}`);
      }
    });
  }
  
  console.log(`   ✅ Parsed ${users.length} production users`);
  return users;
}

/**
 * Extract individual user records from VALUES section
 */
function extractUserRecords(valuesSection) {
  const records = [];
  let currentRecord = '';
  let parenDepth = 0;
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < valuesSection.length; i++) {
    const char = valuesSection[i];
    const nextChar = valuesSection[i + 1];
    
    if (char === '(' && !inQuotes) {
      parenDepth++;
      if (parenDepth === 1) {
        currentRecord = ''; // Start new record
        continue;
      }
    } else if (char === ')' && !inQuotes) {
      parenDepth--;
      if (parenDepth === 0) {
        // End of record
        if (currentRecord.trim()) {
          records.push(currentRecord.trim());
        }
        currentRecord = '';
        continue;
      }
    } else if ((char === "'" || char === '"') && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      if (nextChar === quoteChar) {
        i++; // Skip escaped quote
      } else {
        inQuotes = false;
        quoteChar = '';
      }
    }
    
    if (parenDepth > 0) {
      currentRecord += char;
    }
  }
  
  return records;
}

/**
 * Parse individual user record
 */
function parseUserRecord(recordString) {
  // Split by comma but respect quoted strings
  const fields = splitCSVRespectingQuotes(recordString);
  
  if (fields.length < 10) {
    throw new Error(`Insufficient user fields: ${fields.length}`);
  }
  
  return {
    ID: parseInt(cleanField(fields[0])),
    user_login: cleanField(fields[1]),
    user_pass: cleanField(fields[2]),
    user_nicename: cleanField(fields[3]),
    user_email: cleanField(fields[4]),
    user_url: cleanField(fields[5]),
    user_registered: cleanField(fields[6]),
    user_activation_key: cleanField(fields[7]),
    user_status: parseInt(cleanField(fields[8])),
    display_name: cleanField(fields[9])
  };
}

/**
 * Parse real posts from production WordPress data
 */
function parseRealPosts(sqlContent) {
  console.log('   📄 Parsing production posts...');
  
  const posts = [];
  
  // Find all post INSERT statements
  const postMatches = sqlContent.matchAll(/INSERT INTO `xVhkH_posts` VALUES\s*([^;]+);/gs);
  
  for (const match of postMatches) {
    const valuesSection = match[1];
    const postRecords = extractPostRecords(valuesSection);
    
    postRecords.forEach(record => {
      try {
        const post = parsePostRecord(record);
        if (post && post.ID) {
          posts.push(post);
        }
      } catch (error) {
        console.warn(`     ⚠️  Skipping malformed post: ${error.message}`);
      }
    });
  }
  
  console.log(`   ✅ Parsed ${posts.length} production posts`);
  return posts;
}

/**
 * Extract individual post records from VALUES section
 */
function extractPostRecords(valuesSection) {
  const records = [];
  let currentRecord = '';
  let parenDepth = 0;
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < valuesSection.length; i++) {
    const char = valuesSection[i];
    const nextChar = valuesSection[i + 1];
    
    if (char === '(' && !inQuotes) {
      parenDepth++;
      if (parenDepth === 1) {
        currentRecord = '';
        continue;
      }
    } else if (char === ')' && !inQuotes && parenDepth === 1) {
      // Check if this is the end of a record by looking ahead
      let j = i + 1;
      while (j < valuesSection.length && /\s/.test(valuesSection[j])) j++;
      
      if (j >= valuesSection.length || valuesSection[j] === ';' || valuesSection[j] === ',') {
        // End of record
        parenDepth--;
        if (currentRecord.trim()) {
          records.push(currentRecord.trim());
        }
        currentRecord = '';
        continue;
      }
    } else if (char === ')' && !inQuotes) {
      parenDepth--;
    } else if ((char === "'" || char === '"') && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      if (nextChar === quoteChar) {
        i++; // Skip escaped quote
      } else {
        inQuotes = false;
        quoteChar = '';
      }
    }
    
    if (parenDepth > 0) {
      currentRecord += char;
    }
  }
  
  return records;
}

/**
 * Parse individual post record
 */
function parsePostRecord(recordString) {
  const fields = splitCSVRespectingQuotes(recordString);
  
  if (fields.length < 23) {
    throw new Error(`Insufficient post fields: ${fields.length}`);
  }
  
  return {
    ID: parseInt(cleanField(fields[0])),
    post_author: parseInt(cleanField(fields[1])),
    post_date: cleanField(fields[2]),
    post_date_gmt: cleanField(fields[3]),
    post_content: cleanField(fields[4]),
    post_title: cleanField(fields[5]),
    post_excerpt: cleanField(fields[6]),
    post_status: cleanField(fields[7]),
    comment_status: cleanField(fields[8]),
    ping_status: cleanField(fields[9]),
    post_password: cleanField(fields[10]),
    post_name: cleanField(fields[11]),
    to_ping: cleanField(fields[12]),
    pinged: cleanField(fields[13]),
    post_modified: cleanField(fields[14]),
    post_modified_gmt: cleanField(fields[15]),
    post_content_filtered: cleanField(fields[16]),
    post_parent: parseInt(cleanField(fields[17])),
    guid: cleanField(fields[18]),
    menu_order: parseInt(cleanField(fields[19])),
    post_type: cleanField(fields[20]),
    post_mime_type: cleanField(fields[21]),
    comment_count: parseInt(cleanField(fields[22]))
  };
}

/**
 * Parse real user meta
 */
function parseRealUserMeta(sqlContent) {
  console.log('   📋 Parsing production user meta...');
  
  return parseSimpleTable(sqlContent, 'xVhkH_usermeta', 4, (fields) => ({
    umeta_id: parseInt(cleanField(fields[0])),
    user_id: parseInt(cleanField(fields[1])),
    meta_key: cleanField(fields[2]),
    meta_value: cleanField(fields[3])
  }));
}

/**
 * Parse real post meta
 */
function parseRealPostMeta(sqlContent) {
  console.log('   📋 Parsing production post meta...');
  
  return parseSimpleTable(sqlContent, 'xVhkH_postmeta', 4, (fields) => ({
    meta_id: parseInt(cleanField(fields[0])),
    post_id: parseInt(cleanField(fields[1])),
    meta_key: cleanField(fields[2]),
    meta_value: cleanField(fields[3])
  }));
}

/**
 * Parse real terms
 */
function parseRealTerms(sqlContent) {
  console.log('   🏷️  Parsing production terms...');
  
  return parseSimpleTable(sqlContent, 'xVhkH_terms', 4, (fields) => ({
    term_id: parseInt(cleanField(fields[0])),
    name: cleanField(fields[1]),
    slug: cleanField(fields[2]),
    term_group: parseInt(cleanField(fields[3]))
  }));
}

/**
 * Parse real term taxonomy
 */
function parseRealTermTaxonomy(sqlContent) {
  console.log('   🏷️  Parsing production term taxonomy...');
  
  return parseSimpleTable(sqlContent, 'xVhkH_term_taxonomy', 6, (fields) => ({
    term_taxonomy_id: parseInt(cleanField(fields[0])),
    term_id: parseInt(cleanField(fields[1])),
    taxonomy: cleanField(fields[2]),
    description: cleanField(fields[3]),
    parent: parseInt(cleanField(fields[4])),
    count: parseInt(cleanField(fields[5]))
  }));
}

/**
 * Parse real term relationships
 */
function parseRealTermRelationships(sqlContent) {
  console.log('   🔗 Parsing production term relationships...');
  
  return parseSimpleTable(sqlContent, 'xVhkH_term_relationships', 3, (fields) => ({
    object_id: parseInt(cleanField(fields[0])),
    term_taxonomy_id: parseInt(cleanField(fields[1])),
    term_order: parseInt(cleanField(fields[2]))
  }));
}

/**
 * Parse simple table with fixed structure
 */
function parseSimpleTable(sqlContent, tableName, expectedFields, fieldMapper) {
  const records = [];
  
  const matches = sqlContent.matchAll(new RegExp(`INSERT INTO \`${tableName}\` VALUES\\s*([^;]+);`, 'gs'));
  
  for (const match of matches) {
    const valuesSection = match[1];
    const tableRecords = extractSimpleRecords(valuesSection);
    
    tableRecords.forEach(record => {
      try {
        const fields = splitCSVRespectingQuotes(record);
        if (fields.length >= expectedFields) {
          const mappedRecord = fieldMapper(fields);
          if (mappedRecord) {
            records.push(mappedRecord);
          }
        }
      } catch (error) {
        // Skip malformed records
      }
    });
  }
  
  console.log(`   ✅ Parsed ${records.length} ${tableName} records`);
  return records;
}

/**
 * Extract simple records (for tables with small, fixed fields)
 */
function extractSimpleRecords(valuesSection) {
  const records = [];
  let currentRecord = '';
  let parenDepth = 0;
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < valuesSection.length; i++) {
    const char = valuesSection[i];
    const nextChar = valuesSection[i + 1];
    
    if (char === '(' && !inQuotes) {
      parenDepth++;
      if (parenDepth === 1) {
        currentRecord = '';
        continue;
      }
    } else if (char === ')' && !inQuotes) {
      parenDepth--;
      if (parenDepth === 0) {
        if (currentRecord.trim()) {
          records.push(currentRecord.trim());
        }
        currentRecord = '';
        continue;
      }
    } else if ((char === "'" || char === '"') && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      if (nextChar === quoteChar) {
        i++; // Skip escaped quote
      } else {
        inQuotes = false;
        quoteChar = '';
      }
    }
    
    if (parenDepth > 0) {
      currentRecord += char;
    }
  }
  
  return records;
}

/**
 * Split CSV line respecting quoted strings
 */
function splitCSVRespectingQuotes(line) {
  const fields = [];
  let currentField = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if ((char === "'" || char === '"') && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      currentField += char;
    } else if (char === quoteChar && inQuotes) {
      if (nextChar === quoteChar) {
        // Escaped quote
        currentField += char + nextChar;
        i++; // Skip next char
      } else {
        // End of quoted string
        inQuotes = false;
        quoteChar = '';
        currentField += char;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  // Add the last field
  if (currentField) {
    fields.push(currentField.trim());
  }
  
  return fields;
}

/**
 * Clean field value (remove quotes, handle NULL)
 */
function cleanField(value) {
  if (!value) return '';
  
  const trimmed = value.trim();
  
  // Handle NULL
  if (trimmed === 'NULL') return null;
  
  // Remove quotes
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }
  
  return trimmed;
}

/**
 * Export parsed data to JSON
 */
function exportRealWordPressData() {
  const data = parseRealWordPressData();
  const outputPath = path.join(__dirname, 'real-wordpress-data.json');
  
  console.log(`\n💾 Exporting parsed production data to: ${outputPath}`);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log('✅ Export completed successfully!');
  
  return data;
}

// Export for use in migration
module.exports = {
  parseRealWordPressData,
  parseRealUsers,
  parseRealPosts,
  parseRealTerms,
  parseRealTermTaxonomy,
  parseRealTermRelationships,
  exportRealWordPressData
};

// Run if called directly
if (require.main === module) {
  exportRealWordPressData();
} 