#!/usr/bin/env node

/**
 * Debug SQL VALUES Section
 * See exactly what's being extracted from the VALUES section
 */

const fs = require('fs');
const path = require('path');

const SQL_DUMP_PATH = '../../Reference Files/wp_6fbrt.sql';

console.log('🔍 **DEBUGGING SQL VALUES SECTION**\n');

function debugSQLValuesSection() {
  try {
    console.log('📁 **READING SQL DUMP**');
    const sqlContent = fs.readFileSync(path.join(__dirname, SQL_DUMP_PATH), 'utf8');
    
    console.log(`📊 **FILE INFO:**`);
    console.log(`   File size: ${(sqlContent.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Find the exact section with terms data
    console.log('\n🔍 **FINDING TERMS SECTION...**');
    const termsSection = sqlContent.match(/INSERT INTO `xVhkH_terms`[^;]*VALUES\s*\n([\s\S]*?);/);
    
    if (!termsSection) {
      console.log('   ❌ Could not find terms section');
      return;
    }
    
    console.log('   ✅ Found terms section');
    const valuesText = termsSection[1];
    
    console.log(`\n📊 **VALUES SECTION INFO:**`);
    console.log(`   Length: ${valuesText.length} characters`);
    console.log(`   Lines: ${valuesText.split('\n').length}`);
    
    // Show first and last few lines
    const lines = valuesText.split('\n');
    console.log(`\n📝 **FIRST 10 LINES:**`);
    lines.slice(0, 10).forEach((line, i) => {
      console.log(`   ${i + 1}: ${line}`);
    });
    
    console.log(`\n📝 **LAST 10 LINES:**`);
    lines.slice(-10).forEach((line, i) => {
      console.log(`   ${lines.length - 10 + i + 1}: ${line}`);
    });
    
    // Count how many term records we can find
    const termPattern = /\((\d+),\s*'([^']*)',\s*'([^']*)',\s*(\d+)\)/g;
    
    let termCount = 0;
    let match;
    const allTerms = [];
    
    while ((match = termPattern.exec(valuesText)) !== null) {
      termCount++;
      allTerms.push({
        id: parseInt(match[1]),
        name: match[2],
        slug: match[3],
        group: parseInt(match[4])
      });
    }
    
    console.log(`\n🎯 **PATTERN MATCHING RESULTS:**`);
    console.log(`   Total terms found: ${termCount}`);
    
    if (allTerms.length > 0) {
      console.log(`   First term: ID ${allTerms[0].id} - "${allTerms[0].name}"`);
      console.log(`   Last term: ID ${allTerms[allTerms.length - 1].id} - "${allTerms[allTerms.length - 1].name}"`);
    }
    
    // Check if we're finding terms with IDs like 88, 135, etc.
    const highIdTerms = allTerms.filter(term => term.id > 50);
    console.log(`   Terms with ID > 50: ${highIdTerms.length}`);
    
    if (highIdTerms.length > 0) {
      console.log(`   Sample high-ID terms:`);
      highIdTerms.slice(0, 5).forEach(term => {
        console.log(`     • ID ${term.id}: "${term.name}"`);
      });
    }
    
    // Look for specific terms we know should exist
    const specificTerms = ['Front of House', 'Monitors', 'Hindi', 'English'];
    specificTerms.forEach(termName => {
      const found = allTerms.find(term => term.name === termName);
      if (found) {
        console.log(`   ✅ Found "${termName}" - ID ${found.id}`);
      } else {
        console.log(`   ❌ Missing "${termName}"`);
      }
    });
    
  } catch (error) {
    console.error('❌ **ERROR:**', error);
  }
}

// Run the debug
debugSQLValuesSection();
console.log('\n✅ Debug completed!'); 