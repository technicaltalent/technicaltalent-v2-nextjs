#!/usr/bin/env node

/**
 * WordPress Database Structure Analyzer
 * Comprehensive analysis of production WordPress database
 */

const fs = require('fs');
const path = require('path');

const SQL_DUMP_PATH = '../../Reference Files/wp_6fbrt.sql';

console.log('🔍 **WORDPRESS DATABASE STRUCTURE ANALYSIS**\n');

function analyzeWordPressStructure() {
  const sqlContent = fs.readFileSync(path.join(__dirname, SQL_DUMP_PATH), 'utf8');
  
  console.log('📊 **POST TYPES ANALYSIS**');
  analyzePostTypes(sqlContent);
  
  console.log('\n🏷️  **TAXONOMY ANALYSIS**');
  analyzeTaxonomies(sqlContent);
  
  console.log('\n🔗 **RELATIONSHIPS ANALYSIS**');
  analyzeRelationships(sqlContent);
  
  console.log('\n📋 **METADATA ANALYSIS**');
  analyzeMetadata(sqlContent);
  
  console.log('\n💡 **MIGRATION IMPLICATIONS**');
  provideMigrationRecommendations();
}

function analyzePostTypes(sqlContent) {
  const postTypePattern = /post_type['"]\s*,\s*['"]([\w-]+)['"]/g;
  const postTypes = {};
  let match;
  
  // Extract all post types and count occurrences
  while ((match = postTypePattern.exec(sqlContent)) !== null) {
    const postType = match[1];
    postTypes[postType] = (postTypes[postType] || 0) + 1;
  }
  
  // Sort by count (descending)
  const sortedPostTypes = Object.entries(postTypes)
    .sort(([,a], [,b]) => b - a);
  
  console.log('   Post Types Found:');
  sortedPostTypes.forEach(([type, count]) => {
    const purpose = getPostTypePurpose(type);
    console.log(`     ${type.padEnd(20)}: ${count.toString().padStart(3)} records - ${purpose}`);
  });
}

function getPostTypePurpose(postType) {
  const purposes = {
    'talent': '👥 Talent user profiles',
    'employ': '🏢 Employer profiles', 
    'role': '💼 Job postings/roles',
    'acf-field-group': '⚙️  ACF configuration',
    'acf-field': '⚙️  ACF field definitions',
    'wp_global_styles': '🎨 Theme styling',
    'attachment': '📎 Media files',
    'revision': '📝 Post revisions',
    'page': '📄 Static pages',
    'post': '📰 Blog posts'
  };
  return purposes[postType] || '❓ Unknown type';
}

function analyzeTaxonomies(sqlContent) {
  const taxonomyPattern = /taxonomy['"]\s*,\s*['"]([\w-]+)['"]/g;
  const taxonomies = {};
  let match;
  
  // Extract taxonomy data with counts
  const termTaxonomyPattern = /\((\d+),\s*(\d+),\s*'([\w-]+)',\s*'[^']*',\s*(\d+),\s*(\d+)\)/g;
  const taxonomyData = {};
  
  while ((match = termTaxonomyPattern.exec(sqlContent)) !== null) {
    const [, termTaxId, termId, taxonomy, parent, count] = match;
    
    if (!taxonomyData[taxonomy]) {
      taxonomyData[taxonomy] = {
        terms: 0,
        totalUsage: 0,
        hasHierarchy: false,
        maxUsage: 0
      };
    }
    
    taxonomyData[taxonomy].terms++;
    taxonomyData[taxonomy].totalUsage += parseInt(count);
    taxonomyData[taxonomy].maxUsage = Math.max(taxonomyData[taxonomy].maxUsage, parseInt(count));
    
    if (parseInt(parent) > 0) {
      taxonomyData[taxonomy].hasHierarchy = true;
    }
  }
  
  console.log('   Taxonomies Found:');
  Object.entries(taxonomyData)
    .sort(([,a], [,b]) => b.totalUsage - a.totalUsage)
    .forEach(([taxonomy, data]) => {
      const purpose = getTaxonomyPurpose(taxonomy);
      const hierarchy = data.hasHierarchy ? '(hierarchical)' : '(flat)';
      console.log(`     ${taxonomy.padEnd(15)}: ${data.terms.toString().padStart(3)} terms, ${data.totalUsage.toLocaleString().padStart(5)} total usage ${hierarchy}`);
      console.log(`       ${' '.repeat(15)}  ${purpose}`);
      console.log(`       ${' '.repeat(15)}  Max single term usage: ${data.maxUsage}`);
    });
}

function getTaxonomyPurpose(taxonomy) {
  const purposes = {
    'skillset': '🎯 User skills and competencies',
    'brand': '🏭 Equipment brands/manufacturers', 
    'equip_cat': '⚙️  Equipment categories',
    'category': '📂 General categories',
    'wp_theme': '🎨 WordPress theme'
  };
  return purposes[taxonomy] || '❓ Unknown taxonomy';
}

function analyzeRelationships(sqlContent) {
  // Count term relationships (user-skill assignments)
  const relationshipPattern = /INSERT INTO `xVhkH_term_relationships`[^;]+VALUES\s*([^;]+);/g;
  let totalRelationships = 0;
  let match;
  
  while ((match = relationshipPattern.exec(sqlContent)) !== null) {
    const valuesSection = match[1];
    const relationships = valuesSection.match(/\([^)]*\)/g);
    if (relationships) {
      totalRelationships += relationships.length;
    }
  }
  
  console.log(`   Term Relationships: ${totalRelationships.toLocaleString()} assignments`);
  console.log('     Purpose: User-to-skill assignments, equipment-to-brand mappings');
  
  // Analyze user metadata relationships
  const usermetaPattern = /meta_key['"]\s*,\s*['"]([\w-]+)['"]/g;
  const metaKeys = {};
  
  while ((match = usermetaPattern.exec(sqlContent)) !== null) {
    const metaKey = match[1];
    metaKeys[metaKey] = (metaKeys[metaKey] || 0) + 1;
  }
  
  const importantMeta = Object.entries(metaKeys)
    .filter(([key, count]) => count > 10 || key.includes('skill') || key.includes('wp_'))
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  
  console.log('\n   Top User Metadata Keys:');
  importantMeta.forEach(([key, count]) => {
    console.log(`     ${key.padEnd(25)}: ${count.toString().padStart(3)} occurrences`);
  });
}

function analyzeMetadata(sqlContent) {
  // Analyze post metadata structure
  const postmetaPattern = /INSERT INTO `xVhkH_postmeta`[^;]+VALUES\s*([^;]+);/g;
  const metaKeyPattern = /['"]([\w-]+)['"],\s*['"]/g;
  const postMetaKeys = {};
  
  let match;
  while ((match = postmetaPattern.exec(sqlContent)) !== null) {
    const valuesSection = match[1];
    let keyMatch;
    while ((keyMatch = metaKeyPattern.exec(valuesSection)) !== null) {
      const metaKey = keyMatch[1];
      postMetaKeys[metaKey] = (postMetaKeys[metaKey] || 0) + 1;
    }
  }
  
  const importantPostMeta = Object.entries(postMetaKeys)
    .filter(([key, count]) => count > 5)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15);
  
  console.log('   Post Metadata Structure:');
  importantPostMeta.forEach(([key, count]) => {
    const purpose = getMetaKeyPurpose(key);
    console.log(`     ${key.padEnd(25)}: ${count.toString().padStart(3)} - ${purpose}`);
  });
}

function getMetaKeyPurpose(key) {
  const purposes = {
    'user_id': '👤 User reference',
    'address': '📍 Location data',
    'schedule': '📅 Job schedule',
    'pay_rate': '💰 Payment rate',
    'tal_lat': '🗺️  Latitude coordinate',
    'tal_lng': '🗺️  Longitude coordinate',
    'address_name': '📍 Address display name',
    '_edit_last': '✏️  Last editor',
    '_edit_lock': '🔒 Edit lock',
    'equipment_category': '⚙️  Equipment type',
    'abn_number': '🏢 Business ABN',
    'business_name': '🏢 Business name',
    'phone_number': '📞 Contact phone',
    'com_step': '✅ Completion step'
  };
  return purposes[key] || '❓ Unknown purpose';
}

function provideMigrationRecommendations() {
  console.log('   🚀 Key Migration Requirements:');
  console.log('');
  console.log('   📊 **DATA SCALE:**');
  console.log('     • Large scale: 621 users, 294 jobs, 5,607+ relationships');
  console.log('     • Complex: Multiple post types (talent, employ, role)');
  console.log('     • Rich metadata: Custom fields, locations, schedules');
  console.log('');
  console.log('   🎯 **SKILLS SYSTEM:**');
  console.log('     • Primary taxonomy: "skillset" (3 main categories)');
  console.log('     • High usage: 339, 226, 249 user assignments per category');
  console.log('     • Equipment system: "brand" + "equip_cat" taxonomies');
  console.log('');
  console.log('   💼 **JOB SYSTEM:**');
  console.log('     • Post type: "role" for job postings');
  console.log('     • Rich metadata: location, schedule, pay_rate, user_id');
  console.log('     • Location system: lat/lng coordinates + address');
  console.log('');
  console.log('   👥 **USER SYSTEM:**');
  console.log('     • Dual profiles: "talent" + "employ" post types');
  console.log('     • Business data: ABN, business_name for employers');
  console.log('     • Completion tracking: com_step progress');
  console.log('');
  console.log('   🔧 **MIGRATION PRIORITIES:**');
  console.log('     1. Users (621) + authentication');
  console.log('     2. Skills taxonomy (3 categories) + assignments (5,607)');  
  console.log('     3. Jobs (294) + metadata (location, schedule, pay)');
  console.log('     4. User profiles (talent/employ posts) + business data');
  console.log('     5. Equipment/brand taxonomy for job requirements');
  
  return {
    users: 621,
    jobs: 294,
    skills: 3, // main skillset categories
    skillAssignments: 5607,
    brands: 50, // approximate brand count
    equipmentCategories: 2
  };
}

// Export for migration scripts
module.exports = {
  analyzeWordPressStructure,
  analyzePostTypes,
  analyzeTaxonomies,
  analyzeRelationships,
  analyzeMetadata,
  provideMigrationRecommendations
};

// Run if called directly
if (require.main === module) {
  try {
    analyzeWordPressStructure();
    
  } catch (error) {
    console.error('❌ Error analyzing WordPress structure:', error.message);
  }
} 