#!/usr/bin/env node

/**
 * Extract All Terms Fixed
 * Use line-by-line approach to get ALL terms from the SQL dump
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SQL_DUMP_PATH = '../../Reference Files/wp_6fbrt.sql';

console.log('🔧 **EXTRACTING ALL TERMS FIXED**\n');

async function extractAllTermsFixed() {
  try {
    console.log('📁 **READING SQL DUMP LINE BY LINE**');
    const sqlContent = fs.readFileSync(path.join(__dirname, SQL_DUMP_PATH), 'utf8');
    const lines = sqlContent.split('\n');
    
    console.log(`📊 **FILE INFO:**`);
    console.log(`   Total lines: ${lines.length}`);
    
    // Find the start and end of the terms INSERT statement
    let startLine = -1;
    let endLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("INSERT INTO `xVhkH_terms`")) {
        startLine = i;
        console.log(`   ✅ Found terms INSERT at line ${i + 1}`);
      }
      
      // Look for the end - a line that ends with ); after the start
      if (startLine !== -1 && i > startLine && lines[i].trim().endsWith(');')) {
        endLine = i;
        console.log(`   ✅ Found terms INSERT end at line ${i + 1}`);
        break;
      }
    }
    
    if (startLine === -1 || endLine === -1) {
      console.log('   ❌ Could not find complete terms INSERT statement');
      return;
    }
    
    // Extract all lines between start and end
    const termsLines = lines.slice(startLine + 1, endLine + 1); // Skip the INSERT line, include the end
    console.log(`\n📊 **TERMS SECTION INFO:**`);
    console.log(`   Lines extracted: ${termsLines.length}`);
    console.log(`   From line ${startLine + 2} to ${endLine + 1}`);
    
    // Join all lines to get the complete VALUES section
    const valuesText = termsLines.join('\n');
    
    // Extract all terms
    const allTerms = extractAllTermsFromText(valuesText);
    
    console.log(`\n🎯 **EXTRACTION RESULTS:**`);
    console.log(`   Total terms found: ${allTerms.length}`);
    
    if (allTerms.length > 0) {
      console.log(`   First term: ID ${allTerms[0].id} - "${allTerms[0].name}"`);
      console.log(`   Last term: ID ${allTerms[allTerms.length - 1].id} - "${allTerms[allTerms.length - 1].name}"`);
      
      // Check for high ID terms
      const highIdTerms = allTerms.filter(term => term.id > 50);
      console.log(`   Terms with ID > 50: ${highIdTerms.length}`);
      
      // Check for specific terms we know should exist
      const specificTerms = ['Front of House', 'Monitors', 'Hindi', 'English', 'Audio', 'Lighting'];
      console.log(`\n🔍 **SPECIFIC TERMS CHECK:**`);
      specificTerms.forEach(termName => {
        const found = allTerms.find(term => term.name === termName);
        if (found) {
          console.log(`   ✅ Found "${termName}" - ID ${found.id}`);
        } else {
          console.log(`   ❌ Missing "${termName}"`);
        }
      });
      
      // Show skill and language breakdown
      const taxonomyData = extractTaxonomyData(sqlContent);
      const skillTerms = getSkillTerms(allTerms, taxonomyData);
      const languageTerms = getLanguageTerms(allTerms, taxonomyData);
      
      console.log(`\n📊 **TAXONOMY BREAKDOWN:**`);
      console.log(`   Skills (skillset): ${skillTerms.length}`);
      console.log(`   Languages (spoken_lang): ${languageTerms.length}`);
      
      // Sample skills
      if (skillTerms.length > 0) {
        console.log(`\n🛠️  **SAMPLE SKILLS:**`);
        skillTerms.slice(0, 10).forEach(term => {
          console.log(`   • ${term.name} (ID: ${term.id})`);
        });
      }
      
      // Sample languages
      if (languageTerms.length > 0) {
        console.log(`\n🌐 **SAMPLE LANGUAGES:**`);
        languageTerms.slice(0, 10).forEach(term => {
          console.log(`   • ${term.name} (ID: ${term.id})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ **ERROR:**', error);
  }
}

/**
 * Extract all terms from the text using improved pattern matching
 */
function extractAllTermsFromText(valuesText) {
  const terms = [];
  
  // Use a more robust pattern that handles multi-line values
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
  
  return terms;
}

/**
 * Extract taxonomy data for filtering
 */
function extractTaxonomyData(sqlContent) {
  const taxonomyMatch = sqlContent.match(/INSERT INTO `xVhkH_term_taxonomy`[^;]*VALUES\s*\n([\s\S]*?);/);
  
  if (!taxonomyMatch) {
    return [];
  }
  
  const taxonomies = [];
  const valuesText = taxonomyMatch[1];
  const taxonomyPattern = /\((\d+),\s*(\d+),\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*(\d+)\)/g;
  
  let match;
  while ((match = taxonomyPattern.exec(valuesText)) !== null) {
    taxonomies.push({
      term_taxonomy_id: parseInt(match[1]),
      term_id: parseInt(match[2]),
      taxonomy: match[3],
      description: match[4] || null,
      parent: parseInt(match[5]),
      count: parseInt(match[6])
    });
  }
  
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

// Run the extraction
extractAllTermsFixed()
  .then(() => {
    console.log('\n✅ All terms extraction completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Extraction failed:', error);
    process.exit(1);
  }); 