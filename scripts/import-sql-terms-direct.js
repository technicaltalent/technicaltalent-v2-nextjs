#!/usr/bin/env node

/**
 * Import SQL Terms Direct
 * Direct extraction of terms data from SQL dump using the exact pattern we can see
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SQL_DUMP_PATH = '../../Reference Files/wp_6fbrt.sql';

console.log('🔧 **DIRECT SQL TERMS IMPORT**\n');

async function importSQLTermsDirect() {
  try {
    console.log('📁 **READING SQL DUMP DIRECTLY**');
    const sqlContent = fs.readFileSync(path.join(__dirname, SQL_DUMP_PATH), 'utf8');
    
    // Extract terms data using direct string matching
    const termsData = extractTermsFromSQL(sqlContent);
    const taxonomyData = extractTaxonomyFromSQL(sqlContent);
    
    console.log(`\n📊 **EXTRACTED DATA:**`);
    console.log(`   🏷️  Terms: ${termsData.length}`);
    console.log(`   📋 Taxonomies: ${taxonomyData.length}`);
    
    // Show samples
    console.log('\n🔍 **SAMPLE TERMS:**');
    termsData.slice(0, 10).forEach(term => {
      console.log(`   • ID: ${term.id}, Name: "${term.name}", Slug: "${term.slug}"`);
    });
    
    // Show skill and language terms specifically
    const skillTerms = getSkillTerms(termsData, taxonomyData);
    const languageTerms = getLanguageTerms(termsData, taxonomyData);
    
    console.log(`\n🛠️  **SKILL TERMS FOUND:** ${skillTerms.length}`);
    skillTerms.forEach(term => {
      console.log(`   • ${term.name} (ID: ${term.id})`);
    });
    
    console.log(`\n🌐 **LANGUAGE TERMS FOUND:** ${languageTerms.length}`);
    languageTerms.slice(0, 10).forEach(term => {
      console.log(`   • ${term.name} (ID: ${term.id})`);
    });
    
  } catch (error) {
    console.error('❌ **ERROR:**', error);
  }
}

/**
 * Extract terms data directly from SQL
 */
function extractTermsFromSQL(sqlContent) {
  console.log('   🔍 Extracting terms using direct approach...');
  
  // Find the exact section with terms data
  const termsSection = sqlContent.match(/INSERT INTO `xVhkH_terms`[^;]*VALUES\s*\n([\s\S]*?);/);
  
  if (!termsSection) {
    console.log('   ❌ Could not find terms section');
    return [];
  }
  
  const terms = [];
  const valuesText = termsSection[1];
  
  // Split by comma and parentheses to find individual term records
  // Look for patterns like (1, 'Uncategorized', 'uncategorized', 0),
  const termPattern = /\((\d+),\s*'([^']*)',\s*'([^']*)',\s*(\d+)\)/g;
  
  let match;
  while ((match = termPattern.exec(valuesText)) !== null) {
    const term = {
      id: parseInt(match[1]),
      name: match[2].replace(/&amp;/g, '&'), // Decode HTML entities
      slug: match[3],
      group: parseInt(match[4])
    };
    
    terms.push(term);
  }
  
  console.log(`   ✅ Extracted ${terms.length} terms`);
  return terms;
}

/**
 * Extract taxonomy data directly from SQL
 */
function extractTaxonomyFromSQL(sqlContent) {
  console.log('   🔍 Extracting taxonomy using direct approach...');
  
  const taxonomySection = sqlContent.match(/INSERT INTO `xVhkH_term_taxonomy`[^;]*VALUES\s*\n([\s\S]*?);/);
  
  if (!taxonomySection) {
    console.log('   ❌ Could not find taxonomy section');
    return [];
  }
  
  const taxonomies = [];
  const valuesText = taxonomySection[1];
  
  // Look for patterns like (1, 1, 'category', '', 0, 9),
  const taxonomyPattern = /\((\d+),\s*(\d+),\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*(\d+)\)/g;
  
  let match;
  while ((match = taxonomyPattern.exec(valuesText)) !== null) {
    const taxonomy = {
      term_taxonomy_id: parseInt(match[1]),
      term_id: parseInt(match[2]),
      taxonomy: match[3],
      description: match[4] || null,
      parent: parseInt(match[5]),
      count: parseInt(match[6])
    };
    
    taxonomies.push(taxonomy);
  }
  
  console.log(`   ✅ Extracted ${taxonomies.length} taxonomies`);
  return taxonomies;
}

/**
 * Get skill terms (skillset taxonomy)
 */
function getSkillTerms(termsData, taxonomyData) {
  const skillsetTaxonomies = taxonomyData.filter(tax => tax.taxonomy === 'skillset');
  const skillsetTermIds = new Set(skillsetTaxonomies.map(tax => tax.term_id));
  
  return termsData.filter(term => skillsetTermIds.has(term.id));
}

/**
 * Get language terms (spoken_lang taxonomy)
 */
function getLanguageTerms(termsData, taxonomyData) {
  const spokenLangTaxonomies = taxonomyData.filter(tax => tax.taxonomy === 'spoken_lang');
  const spokenLangTermIds = new Set(spokenLangTaxonomies.map(tax => tax.term_id));
  
  return termsData.filter(term => spokenLangTermIds.has(term.id));
}

// Run the direct extraction
importSQLTermsDirect()
  .then(() => {
    console.log('\n✅ Direct extraction completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Extraction failed:', error);
    process.exit(1);
  }); 