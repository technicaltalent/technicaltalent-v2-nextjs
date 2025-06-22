#!/usr/bin/env node

/**
 * Debug SQL Taxonomy Parsing
 * Specifically debug what's happening with skillset and spoken_lang taxonomies
 */

const fs = require('fs');
const path = require('path');

const SQL_DUMP_PATH = '../../Reference Files/wp_6fbrt.sql';

console.log('🔍 **DEBUGGING SQL TAXONOMY PARSING**\n');

function debugSQLTaxonomyParsing() {
  console.log('📁 **READING WORDPRESS SQL DUMP**');
  const sqlContent = fs.readFileSync(path.join(__dirname, SQL_DUMP_PATH), 'utf8');
  
  console.log(`📊 **SQL FILE INFO:**`);
  console.log(`   File size: ${(sqlContent.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Total lines: ${sqlContent.split('\n').length}`);
  
  // 1. Debug Terms table
  console.log('\n🏷️  **DEBUGGING TERMS TABLE:**');
  const termMatches = sqlContent.match(/INSERT INTO `xVhkH_terms`[\s\S]*?VALUES[\s\S]*?;/g);
  console.log(`   Found ${termMatches ? termMatches.length : 0} term insert statements`);
  
  if (termMatches) {
    // Extract all terms and show sample
    const allTerms = [];
    termMatches.forEach(match => {
      const valuePattern = /\(([^)]+)\)/g;
      let valueMatch;
      
      while ((valueMatch = valuePattern.exec(match)) !== null) {
        const values = parseCSVRow(valueMatch[1]);
        if (values.length >= 3) {
          allTerms.push({
            term_id: parseInt(values[0]),
            name: cleanFieldValue(values[1]),
            slug: cleanFieldValue(values[2])
          });
        }
      }
    });
    
    console.log(`   Total terms extracted: ${allTerms.length}`);
    console.log('   Sample terms:');
    allTerms.slice(0, 10).forEach(term => {
      console.log(`     • ID: ${term.term_id}, Name: "${term.name}", Slug: "${term.slug}"`);
    });
  }
  
  // 2. Debug Term Taxonomy table
  console.log('\n📋 **DEBUGGING TERM TAXONOMY TABLE:**');
  const taxonomyMatches = sqlContent.match(/INSERT INTO `xVhkH_term_taxonomy`[\s\S]*?VALUES[\s\S]*?;/g);
  console.log(`   Found ${taxonomyMatches ? taxonomyMatches.length : 0} taxonomy insert statements`);
  
  if (taxonomyMatches) {
    const allTaxonomies = [];
    taxonomyMatches.forEach(match => {
      const valuePattern = /\(([^)]+)\)/g;
      let valueMatch;
      
      while ((valueMatch = valuePattern.exec(match)) !== null) {
        const values = parseCSVRow(valueMatch[1]);
        if (values.length >= 5) {
          allTaxonomies.push({
            term_taxonomy_id: parseInt(values[0]),
            term_id: parseInt(values[1]),
            taxonomy: cleanFieldValue(values[2]),
            description: cleanFieldValue(values[3]),
            parent: parseInt(values[4]) || 0,
            count: parseInt(values[5]) || 0
          });
        }
      }
    });
    
    console.log(`   Total taxonomies extracted: ${allTaxonomies.length}`);
    
    // Group by taxonomy type
    const taxonomyGroups = {};
    allTaxonomies.forEach(tax => {
      if (!taxonomyGroups[tax.taxonomy]) {
        taxonomyGroups[tax.taxonomy] = [];
      }
      taxonomyGroups[tax.taxonomy].push(tax);
    });
    
    console.log('\n   📊 **TAXONOMY BREAKDOWN:**');
    Object.entries(taxonomyGroups).forEach(([taxName, taxes]) => {
      console.log(`     ${taxName}: ${taxes.length} terms`);
      
      if (taxName === 'skillset') {
        console.log('       🎯 **SKILLSET DETAILS:**');
        const parents = taxes.filter(t => t.parent === 0);
        const children = taxes.filter(t => t.parent !== 0);
        console.log(`         Parents: ${parents.length}, Children: ${children.length}`);
        
        parents.forEach(parent => {
          console.log(`         • Parent: ID ${parent.term_id}, Count: ${parent.count}`);
        });
        
        console.log('         Sample children:');
        children.slice(0, 5).forEach(child => {
          console.log(`         • Child: ID ${child.term_id}, Parent: ${child.parent}, Count: ${child.count}`);
        });
      }
      
      if (taxName === 'spoken_lang') {
        console.log('       🌐 **SPOKEN_LANG DETAILS:**');
        taxes.forEach(lang => {
          console.log(`         • Language: ID ${lang.term_id}, Count: ${lang.count}`);
        });
      }
    });
  }
  
  // 3. Debug specific skillset and spoken_lang extraction
  console.log('\n🔍 **SPECIFIC TAXONOMY DEBUGGING:**');
  
  console.log('\n   🛠️  **SKILLSET TAXONOMY:**');
  const skillsetTaxonomies = allTaxonomies.filter(tax => tax.taxonomy === 'skillset');
  console.log(`     Found ${skillsetTaxonomies.length} skillset taxonomy entries`);
  
  const skillsetTermIds = new Set(skillsetTaxonomies.map(tax => tax.term_id));
  const skillsetTerms = allTerms.filter(term => skillsetTermIds.has(term.term_id));
  console.log(`     Matched ${skillsetTerms.length} skillset terms`);
  
  console.log('     All skillset terms:');
  skillsetTerms.forEach(term => {
    const taxonomy = skillsetTaxonomies.find(tax => tax.term_id === term.term_id);
    console.log(`       • ${term.name} (ID: ${term.term_id}, Parent: ${taxonomy?.parent || 0}, Count: ${taxonomy?.count || 0})`);
  });
  
  console.log('\n   🌐 **SPOKEN_LANG TAXONOMY:**');
  const spokenLangTaxonomies = allTaxonomies.filter(tax => tax.taxonomy === 'spoken_lang');
  console.log(`     Found ${spokenLangTaxonomies.length} spoken_lang taxonomy entries`);
  
  const spokenLangTermIds = new Set(spokenLangTaxonomies.map(tax => tax.term_id));
  const spokenLangTerms = allTerms.filter(term => spokenLangTermIds.has(term.term_id));
  console.log(`     Matched ${spokenLangTerms.length} spoken_lang terms`);
  
  console.log('     All spoken_lang terms:');
  spokenLangTerms.forEach(term => {
    const taxonomy = spokenLangTaxonomies.find(tax => tax.term_id === term.term_id);
    console.log(`       • ${term.name} (ID: ${term.term_id}, Count: ${taxonomy?.count || 0})`);
  });
  
  // 4. Debug term relationships
  console.log('\n🔗 **TERM RELATIONSHIPS DEBUG:**');
  const relationshipMatches = sqlContent.match(/INSERT INTO `xVhkH_term_relationships`[\s\S]*?VALUES[\s\S]*?;/g);
  console.log(`   Found ${relationshipMatches ? relationshipMatches.length : 0} relationship insert statements`);
  
  if (relationshipMatches) {
    const allRelationships = [];
    relationshipMatches.forEach(match => {
      const valuePattern = /\(([^)]+)\)/g;
      let valueMatch;
      
      while ((valueMatch = valuePattern.exec(match)) !== null) {
        const values = parseCSVRow(valueMatch[1]);
        if (values.length >= 3) {
          allRelationships.push({
            object_id: parseInt(values[0]),
            term_taxonomy_id: parseInt(values[1]),
            term_order: parseInt(values[2]) || 0
          });
        }
      }
    });
    
    console.log(`   Total relationships: ${allRelationships.length}`);
    
    // Filter for skillset relationships
    const skillsetTaxIds = skillsetTaxonomies.map(tax => tax.term_taxonomy_id);
    const skillsetRelationships = allRelationships.filter(rel => 
      skillsetTaxIds.includes(rel.term_taxonomy_id)
    );
    console.log(`   Skillset relationships: ${skillsetRelationships.length}`);
    
    // Filter for spoken_lang relationships
    const spokenLangTaxIds = spokenLangTaxonomies.map(tax => tax.term_taxonomy_id);
    const spokenLangRelationships = allRelationships.filter(rel => 
      spokenLangTaxIds.includes(rel.term_taxonomy_id)
    );
    console.log(`   Spoken_lang relationships: ${spokenLangRelationships.length}`);
  }
}

/**
 * Parse CSV row handling quoted values
 */
function parseCSVRow(row) {
  const values = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < row.length) {
    const char = row[i];
    
    if (char === "'" && !inQuotes) {
      inQuotes = true;
    } else if (char === "'" && inQuotes) {
      if (row[i + 1] === "'") {
        current += "'";
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    
    i++;
  }
  
  values.push(current.trim());
  return values;
}

/**
 * Clean field value
 */
function cleanFieldValue(value) {
  if (!value) return null;
  
  let cleaned = value.toString().trim();
  
  if (cleaned === 'NULL' || cleaned === '') {
    return null;
  }
  
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1);
  }
  
  return cleaned.replace(/''/g, "'");
}

// Run the debug
try {
  debugSQLTaxonomyParsing();
  console.log('\n✅ **DEBUG COMPLETE!**');
} catch (error) {
  console.error('❌ **DEBUG FAILED:**', error);
} 