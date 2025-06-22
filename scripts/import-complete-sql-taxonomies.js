#!/usr/bin/env node

/**
 * Import Complete SQL Taxonomies
 * Fixed SQL parsing to import ALL terms from the SQL dump
 * 1. skillset → Skills (with proper hierarchy)
 * 2. spoken_lang → Languages  
 * 3. Create user-skill relationships
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SQL_DUMP_PATH = '../../Reference Files/wp_6fbrt.sql';

console.log('🔧 **IMPORTING COMPLETE SQL TAXONOMIES (FIXED PARSING)**\n');

/**
 * Update Skills with Image URLs
 */
async function updateSkillImages() {
  console.log('   🖼️  Updating skill images...');

  // Define image mappings based on skill names and categories
  const imageMap = {
    // Exact skill name matches
    'Audio': '/images/audio.png',
    'Lighting': '/images/lighting.png', 
    'Video': '/images/video.png',
    'Stage': '/images/Stage.png',
    'General': '/images/Certification.png',
    'Licenses & Certificates': '/images/Certification.png',
    'Licenses / Tickets': '/images/Certification.png',
    'Certifications': '/images/Certification.png',
    
    // Category-based matches (fallback)
    'Audio Engineer': '/images/audio.png',
    'Sound': '/images/audio.png',
    'Lighting Designer': '/images/lighting.png',
    'Video Editor': '/images/video.png',
    'Video Production': '/images/video.png',
    'Stage Manager': '/images/Stage.png',
    'Stage Hand': '/images/Stage.png'
  };

  try {
    // Get all parent skills (skills without a parent)
    const parentSkills = await prisma.skill.findMany({
      where: {
        parentId: null,
        isActive: true
      }
    });

    console.log(`   📊 Found ${parentSkills.length} parent skills to update`);

    for (const skill of parentSkills) {
      let imageUrl = null;

      // Try exact name match first
      if (imageMap[skill.name]) {
        imageUrl = imageMap[skill.name];
      }
      // Try partial name matching
      else {
        for (const [key, image] of Object.entries(imageMap)) {
          if (skill.name.toLowerCase().includes(key.toLowerCase()) || 
              key.toLowerCase().includes(skill.name.toLowerCase())) {
            imageUrl = image;
            break;
          }
        }
      }

      // Update the skill with the image URL
      if (imageUrl) {
        await prisma.skill.update({
          where: { id: skill.id },
          data: { imageUrl }
        });
        
        console.log(`   ✅ Updated ${skill.name} with image: ${imageUrl}`);
      } else {
        console.log(`   ⚠️  No image mapping found for: ${skill.name}`);
      }
    }

    console.log('   🎉 Skill images update completed!');

  } catch (error) {
    console.error('   ❌ Error updating skill images:', error);
  }
}

async function importCompleteSQLTaxonomies() {
  try {
    console.log('📁 **READING WORDPRESS SQL DUMP**');
    const sqlContent = fs.readFileSync(path.join(__dirname, SQL_DUMP_PATH), 'utf8');
    
    // Parse WordPress data with corrected parsing
    const terms = parseAllWordPressTerms(sqlContent);
    const termTaxonomy = parseAllWordPressTermTaxonomy(sqlContent);
    const termRelationships = parseAllWordPressTermRelationships(sqlContent);
    
    console.log(`\n📊 **CORRECTED DATA SCOPE:**`);
    console.log(`   🏷️  Terms: ${terms.length}`);
    console.log(`   📋 Term Taxonomy: ${termTaxonomy.length}`);
    console.log(`   🔗 Term Relationships: ${termRelationships.length}`);
    
    // Clear existing skills, languages, and manufacturers
    console.log('\n🗑️  **CLEARING EXISTING SKILLS, LANGUAGES & MANUFACTURERS**');
    await prisma.userSkill.deleteMany();
    await prisma.skill.deleteMany();
    await prisma.language.deleteMany();
    await prisma.manufacturer.deleteMany();
    
    // Import Skills (skillset taxonomy) with proper hierarchy
    console.log('\n🛠️  **IMPORTING COMPLETE SKILLSET TAXONOMY**');
    await importCompleteSkillsetTaxonomy(terms, termTaxonomy);
    
    // Update skill images
    console.log('\n🖼️  **UPDATING SKILL IMAGES**');
    await updateSkillImages();
    
    // Import Languages (spoken_lang taxonomy)
    console.log('\n🌐 **IMPORTING COMPLETE SPOKEN_LANG TAXONOMY**');
    await importCompleteSpokenLangTaxonomy(terms, termTaxonomy);
    
    // Import Manufacturers (brand taxonomy) with proper hierarchy
    console.log('\n🏭 **IMPORTING COMPLETE BRAND TAXONOMY**');
    await importCompleteBrandTaxonomy(terms, termTaxonomy);
    
    // Create user-skill relationships
    console.log('\n🔗 **CREATING USER-SKILL RELATIONSHIPS**');
    await createAllUserSkillRelationships(termRelationships, termTaxonomy);
    
    console.log('\n✅ **COMPLETE TAXONOMIES IMPORT FINISHED!**');
    await verifyCompleteImport();
    
  } catch (error) {
    console.error('❌ **ERROR:**', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Parse ALL WordPress terms from SQL dump (FIXED LINE-BY-LINE APPROACH)
 */
function parseAllWordPressTerms(sqlContent) {
  console.log('   🔍 Parsing terms with FIXED line-by-line approach...');
  
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
    console.log('   ❌ Could not find complete terms INSERT statement');
    return [];
  }
  
  // Extract all lines between start and end
  const termsLines = lines.slice(startLine + 1, endLine + 1); // Skip the INSERT line, include the end
  console.log(`   📊 Lines extracted: ${termsLines.length} (from line ${startLine + 2} to ${endLine + 1})`);
  
  // Join all lines to get the complete VALUES section
  const valuesText = termsLines.join('\n');
  
  // Extract all terms using robust pattern matching
  const terms = [];
  const termPattern = /\((\d+),\s*'([^']*)',\s*'([^']*)',\s*(\d+)\)/g;
  
  let match;
  while ((match = termPattern.exec(valuesText)) !== null) {
    const term = {
      term_id: parseInt(match[1]),
      name: match[2].replace(/&amp;/g, '&'), // Decode HTML entities
      slug: match[3],
      term_group: parseInt(match[4])
    };
    
    terms.push(term);
  }
  
  console.log(`   ✅ Parsed ${terms.length} terms from SQL`);
  return terms;
}

/**
 * Parse ALL WordPress term taxonomy (corrected parsing)
 */
function parseAllWordPressTermTaxonomy(sqlContent) {
  console.log('   🔍 Parsing term taxonomy with corrected logic...');
  
  const taxonomyTableMatch = sqlContent.match(/INSERT INTO `xVhkH_term_taxonomy`[^;]*VALUES\s*\n([\s\S]*?);/);
  
  if (!taxonomyTableMatch) {
    console.log('   ❌ Could not find term_taxonomy table INSERT statement');
    return [];
  }
  
  const valuesSection = taxonomyTableMatch[1];
  const taxonomies = [];
  
  const lines = valuesSection.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('(') && trimmedLine.includes("'")) {
      try {
        // Extract taxonomy data - pattern (tax_id, term_id, 'taxonomy', 'description', parent, count)
        const taxMatch = trimmedLine.match(/^\((\d+),\s*(\d+),\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*(\d+)\)[,]?$/);
        
        if (taxMatch) {
          const taxonomy = {
            term_taxonomy_id: parseInt(taxMatch[1]),
            term_id: parseInt(taxMatch[2]),
            taxonomy: taxMatch[3],
            description: taxMatch[4] || null,
            parent: parseInt(taxMatch[5]),
            count: parseInt(taxMatch[6])
          };
          
          taxonomies.push(taxonomy);
        }
      } catch (error) {
        console.log(`   ⚠️  Skipped malformed taxonomy line: ${trimmedLine.substring(0, 50)}...`);
      }
    }
  }
  
  console.log(`   ✅ Parsed ${taxonomies.length} taxonomies from SQL`);
  return taxonomies;
}

/**
 * Parse ALL WordPress term relationships
 */
function parseAllWordPressTermRelationships(sqlContent) {
  console.log('   🔍 Parsing term relationships...');
  
  const relationshipsTableMatch = sqlContent.match(/INSERT INTO `xVhkH_term_relationships`[^;]*VALUES\s*\n([\s\S]*?);/);
  
  if (!relationshipsTableMatch) {
    console.log('   ❌ Could not find term_relationships table INSERT statement');
    return [];
  }
  
  const valuesSection = relationshipsTableMatch[1];
  const relationships = [];
  
  const lines = valuesSection.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('(') && trimmedLine.match(/^\(\d+,\s*\d+,\s*\d+\)/)) {
      try {
        const relMatch = trimmedLine.match(/^\((\d+),\s*(\d+),\s*(\d+)\)[,]?$/);
        
        if (relMatch) {
          const relationship = {
            object_id: parseInt(relMatch[1]),
            term_taxonomy_id: parseInt(relMatch[2]),
            term_order: parseInt(relMatch[3])
          };
          
          relationships.push(relationship);
        }
      } catch (error) {
        console.log(`   ⚠️  Skipped malformed relationship line`);
      }
    }
  }
  
  console.log(`   ✅ Parsed ${relationships.length} relationships from SQL`);
  return relationships;
}

/**
 * Import complete skillset taxonomy with proper hierarchy
 */
async function importCompleteSkillsetTaxonomy(terms, termTaxonomy) {
  const skillsetTaxonomies = termTaxonomy.filter(tax => tax.taxonomy === 'skillset');
  const skillsetTermIds = new Set(skillsetTaxonomies.map(tax => tax.term_id));
  const skillsetTerms = terms.filter(term => skillsetTermIds.has(term.term_id));
  
  console.log(`   🎯 Found ${skillsetTerms.length} skills in skillset taxonomy`);
  console.log(`   📊 Taxonomy entries: ${skillsetTaxonomies.length}`);
  
  // Create parent skills first (parent = 0)
  const parentTaxonomies = skillsetTaxonomies.filter(tax => tax.parent === 0);
  console.log(`   📂 Creating ${parentTaxonomies.length} parent skill categories...`);
  
  for (const taxonomy of parentTaxonomies) {
    const term = skillsetTerms.find(t => t.term_id === taxonomy.term_id);
    if (!term) continue;
    
    try {
      await prisma.skill.create({
        data: {
          id: `skill_${term.term_id}`,
          wordpressId: term.term_id,
          name: term.name,
          category: 'skillset',
          parentId: null,
          isActive: true
        }
      });
      
      console.log(`   ✅ Created parent skill: ${term.name} (WP ID: ${term.term_id}, Count: ${taxonomy.count})`);
      
    } catch (error) {
      console.log(`   ⚠️  Skipped parent skill ${term.name}: ${error.message}`);
    }
  }
  
  // Create child skills (parent != 0)
  const childTaxonomies = skillsetTaxonomies.filter(tax => tax.parent !== 0);
  console.log(`   📝 Creating ${childTaxonomies.length} child skills...`);
  
  for (const taxonomy of childTaxonomies) {
    const term = skillsetTerms.find(t => t.term_id === taxonomy.term_id);
    if (!term) continue;
    
    try {
      const parentId = `skill_${taxonomy.parent}`;
      
      await prisma.skill.create({
        data: {
          id: `skill_${term.term_id}`,
          wordpressId: term.term_id,
          name: term.name,
          category: 'skillset',
          parentId: parentId,
          isActive: true
        }
      });
      
      console.log(`   ✅ Created child skill: ${term.name} → parent: ${taxonomy.parent} (WP ID: ${term.term_id}, Count: ${taxonomy.count})`);
      
    } catch (error) {
      console.log(`   ⚠️  Skipped child skill ${term.name}: ${error.message}`);
    }
  }
}

/**
 * Import complete spoken_lang taxonomy
 */
async function importCompleteSpokenLangTaxonomy(terms, termTaxonomy) {
  const spokenLangTaxonomies = termTaxonomy.filter(tax => tax.taxonomy === 'spoken_lang');
  const spokenLangTermIds = new Set(spokenLangTaxonomies.map(tax => tax.term_id));
  const spokenLangTerms = terms.filter(term => spokenLangTermIds.has(term.term_id));
  
  console.log(`   🌐 Found ${spokenLangTerms.length} languages in spoken_lang taxonomy`);
  console.log(`   📊 Taxonomy entries: ${spokenLangTaxonomies.length}`);
  
  for (const taxonomy of spokenLangTaxonomies) {
    const term = spokenLangTerms.find(t => t.term_id === taxonomy.term_id);
    if (!term) continue;
    
    try {
      // Generate ISO code from name
      const isoCode = generateLanguageCode(term.name);
      
      await prisma.language.create({
        data: {
          id: `language_${term.term_id}`,
          wordpressId: term.term_id,
          name: term.name,
          code: isoCode,
          isActive: true
        }
      });
      
      console.log(`   ✅ Created language: ${term.name} (${isoCode}) (WP ID: ${term.term_id}, Count: ${taxonomy.count})`);
      
    } catch (error) {
      console.log(`   ⚠️  Skipped language ${term.name}: ${error.message}`);
    }
  }
}

/**
 * Import complete brand taxonomy with proper hierarchy
 */
async function importCompleteBrandTaxonomy(terms, termTaxonomy) {
  const brandTaxonomies = termTaxonomy.filter(tax => tax.taxonomy === 'brand');
  const brandTermIds = new Set(brandTaxonomies.map(tax => tax.term_id));
  const brandTerms = terms.filter(term => brandTermIds.has(term.term_id));
  
  console.log(`   🏭 Found ${brandTerms.length} manufacturers in brand taxonomy`);
  console.log(`   📊 Taxonomy entries: ${brandTaxonomies.length}`);
  
  // Create parent manufacturers first (parent = 0)
  const parentTaxonomies = brandTaxonomies.filter(tax => tax.parent === 0);
  console.log(`   📂 Creating ${parentTaxonomies.length} parent manufacturer categories...`);
  
  for (const taxonomy of parentTaxonomies) {
    const term = brandTerms.find(t => t.term_id === taxonomy.term_id);
    if (!term) continue;
    
    try {
      await prisma.manufacturer.create({
        data: {
          id: `manufacturer_${term.term_id}`,
          wordpressId: term.term_id,
          name: term.name,
          category: term.name.toLowerCase(), // Use the name as category (Audio, Lighting, Video, Stage)
          parentId: null,
          isActive: true
        }
      });
      
      console.log(`   ✅ Created parent manufacturer: ${term.name} (WP ID: ${term.term_id}, Count: ${taxonomy.count})`);
      
    } catch (error) {
      console.log(`   ⚠️  Skipped parent manufacturer ${term.name}: ${error.message}`);
    }
  }
  
  // Create child manufacturers (parent != 0)
  const childTaxonomies = brandTaxonomies.filter(tax => tax.parent !== 0);
  console.log(`   📝 Creating ${childTaxonomies.length} child manufacturers...`);
  
  for (const taxonomy of childTaxonomies) {
    const term = brandTerms.find(t => t.term_id === taxonomy.term_id);
    if (!term) continue;
    
    try {
      const parentId = `manufacturer_${taxonomy.parent}`;
      
      // Get the parent to determine category
      const parentTaxonomy = brandTaxonomies.find(tax => tax.term_id === taxonomy.parent);
      const parentTerm = brandTerms.find(t => t.term_id === taxonomy.parent);
      const category = parentTerm ? parentTerm.name.toLowerCase() : 'equipment';
      
      await prisma.manufacturer.create({
        data: {
          id: `manufacturer_${term.term_id}`,
          wordpressId: term.term_id,
          name: term.name,
          category: category,
          parentId: parentId,
          isActive: true
        }
      });
      
      console.log(`   ✅ Created child manufacturer: ${term.name} → parent: ${taxonomy.parent} (WP ID: ${term.term_id}, Count: ${taxonomy.count})`);
      
    } catch (error) {
      console.log(`   ⚠️  Skipped child manufacturer ${term.name}: ${error.message}`);
    }
  }
}

/**
 * Create ALL user-skill relationships
 */
async function createAllUserSkillRelationships(termRelationships, termTaxonomy) {
  // Filter for skillset relationships
  const skillsetTaxIds = termTaxonomy
    .filter(tax => tax.taxonomy === 'skillset')
    .map(tax => tax.term_taxonomy_id);
  
  const skillsetRelationships = termRelationships.filter(rel => 
    skillsetTaxIds.includes(rel.term_taxonomy_id)
  );
  
  console.log(`   🔗 Found ${skillsetRelationships.length} user-skill relationships`);
  
  let created = 0;
  for (const relationship of skillsetRelationships) {
    try {
      // Check if user exists
      const userId = `user_${relationship.object_id}`;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      if (!user) {
        continue; // Skip if user doesn't exist
      }
      
      // Find the skill from the term_taxonomy_id
      const taxonomy = termTaxonomy.find(tax => tax.term_taxonomy_id === relationship.term_taxonomy_id);
      if (!taxonomy) continue;
      
      const skillId = `skill_${taxonomy.term_id}`;
      const skill = await prisma.skill.findUnique({ where: { id: skillId } });
      
      if (!skill) {
        continue; // Skip if skill doesn't exist
      }
      
      // Create user-skill relationship
      await prisma.userSkill.create({
        data: {
          userId: userId,
          skillId: skillId,
          proficiencyLevel: Math.floor(Math.random() * 3) + 3, // 3-5 scale
          yearsExperience: Math.floor(Math.random() * 5) + 1    // 1-5 years
        }
      });
      
      created++;
      
      if (created % 200 === 0) {
        console.log(`   ✅ Created ${created} user-skill relationships...`);
      }
      
    } catch (error) {
      // Skip duplicates or other errors
      if (!error.message.includes('Unique constraint')) {
        console.log(`   ⚠️  Skipped relationship: ${error.message}`);
      }
    }
  }
  
  console.log(`   ✅ Successfully created ${created} user-skill relationships`);
}

/**
 * Generate language codes
 */
function generateLanguageCode(languageName) {
  const languageMap = {
    'English': 'en',
    'Spanish': 'es', 
    'French': 'fr',
    'German': 'de',
    'Italian': 'it',
    'Portuguese': 'pt',
    'Mandarin Chinese': 'zh-CN',
    'Chinese': 'zh',
    'Japanese': 'ja',
    'Korean': 'ko',
    'Arabic': 'ar',
    'Russian': 'ru',
    'Hindi': 'hi',
    'Dutch': 'nl',
    'Bengali': 'bn',
    'Urdu': 'ur',
    'Indonesian': 'id',
    'Turkish': 'tr',
    'Vietnamese': 'vi',
    'Thai': 'th',
    'Persian (Farsi)': 'fa',
    'Farsi (Persian)': 'fa',
    'Polish': 'pl',
    'Ukrainian': 'uk',
    'Romanian': 'ro',
    'Tagalog (Filipino)': 'tl',
    'Tamil': 'ta',
    'Telugu': 'te',
    'Marathi': 'mr',
    'Gujarati': 'gu',
    'Kannada': 'kn',
    'Malayalam': 'ml',
    'Burmese': 'my',
    'Nepali': 'ne',
    'Sinhalese': 'si'
  };
  
  return languageMap[languageName] || languageName.toLowerCase().substring(0, 2);
}

/**
 * Verify complete import results
 */
async function verifyCompleteImport() {
  console.log('\n🔍 **VERIFICATION RESULTS:**');
  
  const skillCount = await prisma.skill.count();
  const languageCount = await prisma.language.count();
  const manufacturerCount = await prisma.manufacturer.count();
  const userSkillCount = await prisma.userSkill.count();
  
  console.log(`   🛠️  Skills: ${skillCount}`);
  console.log(`   🌐 Languages: ${languageCount}`);
  console.log(`   🏭 Manufacturers: ${manufacturerCount}`);
  console.log(`   🔗 User-Skill Links: ${userSkillCount}`);
  
  // Check hierarchy
  const parentSkills = await prisma.skill.count({ where: { parentId: null } });
  const childSkills = await prisma.skill.count({ where: { parentId: { not: null } } });
  console.log(`   └─ Parent Skills: ${parentSkills}`);
  console.log(`   └─ Child Skills: ${childSkills}`);
  
  const parentManufacturers = await prisma.manufacturer.count({ where: { parentId: null } });
  const childManufacturers = await prisma.manufacturer.count({ where: { parentId: { not: null } } });
  console.log(`   └─ Parent Manufacturers: ${parentManufacturers}`);
  console.log(`   └─ Child Manufacturers: ${childManufacturers}`);
  
  // Sample some data
  const sampleParentSkills = await prisma.skill.findMany({ 
    where: { parentId: null },
    include: { children: { take: 3 } }
  });
  
  const sampleParentManufacturers = await prisma.manufacturer.findMany({ 
    where: { parentId: null },
    include: { children: { take: 3 } }
  });
  
  const sampleLanguages = await prisma.language.findMany({ take: 10 });
  
  console.log('\n📝 **Sample Parent Skills with Children:**');
  sampleParentSkills.forEach(skill => {
    console.log(`   • ${skill.name} (WP ID: ${skill.wordpressId})`);
    skill.children.forEach(child => {
      console.log(`     └─ ${child.name} (WP ID: ${child.wordpressId})`);
    });
  });
  
  console.log('\n🏭 **Sample Parent Manufacturers with Children:**');
  sampleParentManufacturers.forEach(manufacturer => {
    console.log(`   • ${manufacturer.name} (WP ID: ${manufacturer.wordpressId})`);
    manufacturer.children.forEach(child => {
      console.log(`     └─ ${child.name} (WP ID: ${child.wordpressId})`);
    });
  });
  
  console.log('\n🗣️  **Sample Languages:**');
  sampleLanguages.forEach(lang => {
    console.log(`   • ${lang.name} (${lang.code}) (WP ID: ${lang.wordpressId})`);
  });
}

// Run if called directly
if (require.main === module) {
  importCompleteSQLTaxonomies()
    .then(() => {
      console.log('\n✅ Complete SQL taxonomies import finished successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import failed:', error);
      process.exit(1);
    });
}

module.exports = {
  importCompleteSQLTaxonomies,
  importCompleteSkillsetTaxonomy,
  importCompleteSpokenLangTaxonomy,
  createAllUserSkillRelationships
}; 