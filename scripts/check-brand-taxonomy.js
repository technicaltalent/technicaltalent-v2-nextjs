#!/usr/bin/env node

/**
 * Check Brand Taxonomy in SQL Dump
 * Use the same fixed parsing approach to see all brand taxonomy terms
 */

const fs = require('fs');
const path = require('path');

const SQL_DUMP_PATH = '../../Reference Files/wp_6fbrt.sql';

console.log('🏭 **CHECKING BRAND TAXONOMY FROM SQL DUMP**\n');

function checkBrandTaxonomy() {
  try {
    console.log('📁 **READING SQL DUMP**');
    const sqlContent = fs.readFileSync(path.join(__dirname, SQL_DUMP_PATH), 'utf8');
    
    // Extract all terms using the same fixed approach
    console.log('\n🔍 **EXTRACTING ALL TERMS...**');
    const allTerms = extractAllTermsFromSQL(sqlContent);
    console.log(`   ✅ Extracted ${allTerms.length} total terms`);
    
    // Extract taxonomy data
    console.log('\n🔍 **EXTRACTING TAXONOMY DATA...**');
    const taxonomyData = extractTaxonomyData(sqlContent);
    console.log(`   ✅ Extracted ${taxonomyData.length} taxonomy entries`);
    
    // Filter for brand taxonomy
    const brandTaxonomies = taxonomyData.filter(tax => tax.taxonomy === 'brand');
    console.log(`\n🏭 **BRAND TAXONOMY ENTRIES:** ${brandTaxonomies.length}`);
    
    if (brandTaxonomies.length > 0) {
      const brandTermIds = new Set(brandTaxonomies.map(tax => tax.term_id));
      const brandTerms = allTerms.filter(term => brandTermIds.has(term.id));
      
      console.log(`\n📝 **BRAND TERMS FOUND:** ${brandTerms.length}`);
      
      // Show hierarchical structure
      const parentBrands = brandTerms.filter(term => {
        const taxonomy = brandTaxonomies.find(tax => tax.term_id === term.id);
        return taxonomy && taxonomy.parent === 0;
      });
      
      const childBrands = brandTerms.filter(term => {
        const taxonomy = brandTaxonomies.find(tax => tax.term_id === term.id);
        return taxonomy && taxonomy.parent !== 0;
      });
      
      console.log(`\n📊 **HIERARCHICAL STRUCTURE:**`);
      console.log(`   🏢 Parent Brands: ${parentBrands.length}`);
      console.log(`   🔧 Child Brands: ${childBrands.length}`);
      
      if (parentBrands.length > 0) {
        console.log(`\n🏢 **PARENT BRANDS:**`);
        parentBrands.forEach(brand => {
          const taxonomy = brandTaxonomies.find(tax => tax.term_id === brand.id);
          console.log(`   • ${brand.name} (ID: ${brand.id}, Count: ${taxonomy.count})`);
          
          // Show children
          const children = childBrands.filter(child => {
            const childTax = brandTaxonomies.find(tax => tax.term_id === child.id);
            return childTax && childTax.parent === brand.id;
          });
          
          if (children.length > 0) {
            children.slice(0, 5).forEach(child => {
              const childTax = brandTaxonomies.find(tax => tax.term_id === child.id);
              console.log(`     └─ ${child.name} (ID: ${child.id}, Count: ${childTax.count})`);
            });
            if (children.length > 5) {
              console.log(`     └─ ... and ${children.length - 5} more children`);
            }
          }
        });
      }
      
      // Sample of all brand terms
      console.log(`\n📋 **SAMPLE BRAND TERMS:**`);
      brandTerms.slice(0, 20).forEach(term => {
        const taxonomy = brandTaxonomies.find(tax => tax.term_id === term.id);
        const parentInfo = taxonomy.parent === 0 ? '(Parent)' : `(Child of ${taxonomy.parent})`;
        console.log(`   • ${term.name} (ID: ${term.id}) ${parentInfo} - Count: ${taxonomy.count}`);
      });
      
      if (brandTerms.length > 20) {
        console.log(`   ... and ${brandTerms.length - 20} more brand terms`);
      }
    }
    
  } catch (error) {
    console.error('❌ **ERROR:**', error);
  }
}

/**
 * Extract all terms using the same fixed line-by-line approach as skills
 */
function extractAllTermsFromSQL(sqlContent) {
  const lines = sqlContent.split('\n');
  
  // Find the start and end of the terms INSERT statement
  let startLine = -1;
  let endLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("INSERT INTO `xVhkH_terms`")) {
      startLine = i;
    }
    
    // Look for the end - a line that ends with ); after the start
    if (startLine !== -1 && i > startLine && lines[i].trim().endsWith(');')) {
      endLine = i;
      break;
    }
  }
  
  if (startLine === -1 || endLine === -1) {
    return [];
  }
  
  // Extract all lines between start and end
  const termsLines = lines.slice(startLine + 1, endLine + 1);
  const valuesText = termsLines.join('\n');
  
  // Extract all terms using robust pattern matching
  const terms = [];
  const termPattern = /\((\d+),\s*'([^']*)',\s*'([^']*)',\s*(\d+)\)/g;
  
  let match;
  while ((match = termPattern.exec(valuesText)) !== null) {
    const term = {
      id: parseInt(match[1]),
      name: match[2].replace(/&amp;/g, '&'),
      slug: match[3],
      group: parseInt(match[4])
    };
    
    terms.push(term);
  }
  
  return terms;
}

/**
 * Extract taxonomy data using the same approach
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

// Run the check
checkBrandTaxonomy();
console.log('\n✅ Brand taxonomy check completed!'); 