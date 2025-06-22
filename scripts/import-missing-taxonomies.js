#!/usr/bin/env node

/**
 * Import Missing Taxonomies
 * Import the correct WordPress taxonomies that were missed:
 * 1. skillset → Skills
 * 2. spoken_lang → Languages
 * 3. Create user-skill relationships
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SQL_DUMP_PATH = '../../Reference Files/wp_6fbrt.sql';

console.log('🔧 **IMPORTING MISSING TAXONOMIES**\n');

async function importMissingTaxonomies() {
  try {
    console.log('📁 **READING WORDPRESS SQL DUMP**');
    const sqlContent = fs.readFileSync(path.join(__dirname, SQL_DUMP_PATH), 'utf8');
    
    // Parse WordPress data
    const terms = parseWordPressTerms(sqlContent);
    const termTaxonomy = parseWordPressTermTaxonomy(sqlContent);
    const termRelationships = parseWordPressTermRelationships(sqlContent);
    
    console.log(`\n📊 **DATA SCOPE:**`);
    console.log(`   🏷️  Terms: ${terms.length}`);
    console.log(`   📋 Term Taxonomy: ${termTaxonomy.length}`);
    console.log(`   🔗 Term Relationships: ${termRelationships.length}`);
    
    // Import Skills (skillset taxonomy)
    console.log('\n🛠️  **IMPORTING SKILLS FROM SKILLSET TAXONOMY**');
    await importSkillsetTaxonomy(terms, termTaxonomy);
    
    // Import Languages (spoken_lang taxonomy)
    console.log('\n🌐 **IMPORTING LANGUAGES FROM SPOKEN_LANG TAXONOMY**');
    await importSpokenLangTaxonomy(terms, termTaxonomy);
    
    // Create user-skill relationships
    console.log('\n🔗 **CREATING USER-SKILL RELATIONSHIPS**');
    await createUserSkillRelationships(termRelationships, termTaxonomy);
    
    console.log('\n✅ **MISSING TAXONOMIES IMPORT COMPLETE!**');
    await verifyImport();
    
  } catch (error) {
    console.error('❌ **ERROR:**', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Import skillset taxonomy as Skills
 */
async function importSkillsetTaxonomy(terms, termTaxonomy) {
  const skillTaxonomies = termTaxonomy.filter(tax => tax.taxonomy === 'skillset');
  const skillTermIds = new Set(skillTaxonomies.map(tax => tax.term_id));
  const skillTerms = terms.filter(term => skillTermIds.has(term.term_id));
  
  console.log(`   🎯 Found ${skillTerms.length} skills in skillset taxonomy`);
  
  // Create parent skills first
  const parentSkills = skillTerms.filter(term => {
    const taxonomy = skillTaxonomies.find(tax => tax.term_id === term.term_id);
    return taxonomy?.parent === 0;
  });
  
  console.log(`   📂 Creating ${parentSkills.length} parent skill categories...`);
  
  for (const term of parentSkills) {
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
      
      console.log(`   ✅ Created parent skill: ${term.name} (WP ID: ${term.term_id})`);
      
    } catch (error) {
      console.log(`   ⚠️  Skipped skill ${term.name}: ${error.message}`);
    }
  }
  
  // Create child skills
  const childSkills = skillTerms.filter(term => {
    const taxonomy = skillTaxonomies.find(tax => tax.term_id === term.term_id);
    return taxonomy?.parent !== 0;
  });
  
  console.log(`   📝 Creating ${childSkills.length} child skills...`);
  
  for (const term of childSkills) {
    try {
      const taxonomy = skillTaxonomies.find(tax => tax.term_id === term.term_id);
      const parentId = taxonomy?.parent ? `skill_${taxonomy.parent}` : null;
      
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
      
      console.log(`   ✅ Created child skill: ${term.name} (parent: ${taxonomy?.parent}) (WP ID: ${term.term_id})`);
      
    } catch (error) {
      console.log(`   ⚠️  Skipped skill ${term.name}: ${error.message}`);
    }
  }
}

/**
 * Import spoken_lang taxonomy as Languages
 */
async function importSpokenLangTaxonomy(terms, termTaxonomy) {
  const langTaxonomies = termTaxonomy.filter(tax => tax.taxonomy === 'spoken_lang');
  const langTermIds = new Set(langTaxonomies.map(tax => tax.term_id));
  const langTerms = terms.filter(term => langTermIds.has(term.term_id));
  
  console.log(`   🌐 Found ${langTerms.length} languages in spoken_lang taxonomy`);
  
  for (const term of langTerms) {
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
      
      console.log(`   ✅ Created language: ${term.name} (${isoCode}) (WP ID: ${term.term_id})`);
      
    } catch (error) {
      console.log(`   ⚠️  Skipped language ${term.name}: ${error.message}`);
    }
  }
}

/**
 * Create user-skill relationships
 */
async function createUserSkillRelationships(termRelationships, termTaxonomy) {
  // Filter for skillset relationships
  const skillTaxIds = termTaxonomy
    .filter(tax => tax.taxonomy === 'skillset')
    .map(tax => tax.term_taxonomy_id);
  
  const skillRelationships = termRelationships.filter(rel => 
    skillTaxIds.includes(rel.term_taxonomy_id)
  );
  
  console.log(`   🔗 Found ${skillRelationships.length} user-skill relationships`);
  
  let created = 0;
  for (const relationship of skillRelationships) {
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
          proficiencyLevel: 3, // Default proficiency
          yearsExperience: 2    // Default experience
        }
      });
      
      created++;
      
      if (created % 100 === 0) {
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
 * Generate basic ISO language code from language name
 */
function generateLanguageCode(languageName) {
  const languageMap = {
    'English': 'en',
    'Spanish': 'es', 
    'French': 'fr',
    'German': 'de',
    'Italian': 'it',
    'Portuguese': 'pt',
    'Chinese': 'zh',
    'Japanese': 'ja',
    'Korean': 'ko',
    'Arabic': 'ar',
    'Russian': 'ru',
    'Hindi': 'hi',
    'Dutch': 'nl',
    'Swedish': 'sv',
    'Norwegian': 'no',
    'Danish': 'da',
    'Finnish': 'fi',
    'Polish': 'pl',
    'Czech': 'cs',
    'Hungarian': 'hu',
    'Greek': 'el',
    'Turkish': 'tr',
    'Hebrew': 'he',
    'Thai': 'th',
    'Vietnamese': 'vi',
    'Indonesian': 'id',
    'Malay': 'ms',
    'Ukrainian': 'uk',
    'Bulgarian': 'bg',
    'Romanian': 'ro',
    'Croatian': 'hr',
    'Serbian': 'sr',
    'Slovak': 'sk',
    'Slovenian': 'sl',
    'Estonian': 'et',
    'Latvian': 'lv',
    'Lithuanian': 'lt',
    'Mandarin': 'zh-CN',
    'Cantonese': 'zh-HK'
  };
  
  return languageMap[languageName] || languageName.toLowerCase().substring(0, 2);
}

/**
 * Parse WordPress terms from SQL dump
 */
function parseWordPressTerms(sqlContent) {
  const termMatches = sqlContent.match(/INSERT INTO `xVhkH_terms`[\s\S]*?VALUES[\s\S]*?;/g);
  if (!termMatches) return [];
  
  const terms = [];
  termMatches.forEach(match => {
    const valuePattern = /\(([^)]+)\)/g;
    let valueMatch;
    
    while ((valueMatch = valuePattern.exec(match)) !== null) {
      const values = parseCSVRow(valueMatch[1]);
      if (values.length >= 3) {
        terms.push({
          term_id: parseInt(values[0]),
          name: cleanFieldValue(values[1]),
          slug: cleanFieldValue(values[2])
        });
      }
    }
  });
  
  return terms;
}

/**
 * Parse WordPress term taxonomy from SQL dump
 */
function parseWordPressTermTaxonomy(sqlContent) {
  const taxonomyMatches = sqlContent.match(/INSERT INTO `xVhkH_term_taxonomy`[\s\S]*?VALUES[\s\S]*?;/g);
  if (!taxonomyMatches) return [];
  
  const taxonomies = [];
  taxonomyMatches.forEach(match => {
    const valuePattern = /\(([^)]+)\)/g;
    let valueMatch;
    
    while ((valueMatch = valuePattern.exec(match)) !== null) {
      const values = parseCSVRow(valueMatch[1]);
      if (values.length >= 5) {
        taxonomies.push({
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
  
  return taxonomies;
}

/**
 * Parse WordPress term relationships from SQL dump
 */
function parseWordPressTermRelationships(sqlContent) {
  const relationshipMatches = sqlContent.match(/INSERT INTO `xVhkH_term_relationships`[\s\S]*?VALUES[\s\S]*?;/g);
  if (!relationshipMatches) return [];
  
  const relationships = [];
  relationshipMatches.forEach(match => {
    const valuePattern = /\(([^)]+)\)/g;
    let valueMatch;
    
    while ((valueMatch = valuePattern.exec(match)) !== null) {
      const values = parseCSVRow(valueMatch[1]);
      if (values.length >= 3) {
        relationships.push({
          object_id: parseInt(values[0]),
          term_taxonomy_id: parseInt(values[1]),
          term_order: parseInt(values[2]) || 0
        });
      }
    }
  });
  
  return relationships;
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

/**
 * Verify import results
 */
async function verifyImport() {
  console.log('\n🔍 **VERIFICATION RESULTS:**');
  
  const skillCount = await prisma.skill.count();
  const languageCount = await prisma.language.count();
  const userSkillCount = await prisma.userSkill.count();
  
  console.log(`   🛠️  Skills: ${skillCount}`);
  console.log(`   🌐 Languages: ${languageCount}`);
  console.log(`   🔗 User-Skill Links: ${userSkillCount}`);
  
  // Sample some data
  const sampleSkills = await prisma.skill.findMany({ take: 5 });
  const sampleLanguages = await prisma.language.findMany({ take: 5 });
  
  console.log('\n📝 **Sample Skills:**');
  sampleSkills.forEach(skill => {
    console.log(`   • ${skill.name} (WP ID: ${skill.wordpressId})`);
  });
  
  console.log('\n🗣️  **Sample Languages:**');
  sampleLanguages.forEach(lang => {
    console.log(`   • ${lang.name} (${lang.code}) (WP ID: ${lang.wordpressId})`);
  });
}

// Run if called directly
if (require.main === module) {
  importMissingTaxonomies()
    .then(() => {
      console.log('\n✅ Missing taxonomies import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import failed:', error);
      process.exit(1);
    });
}

module.exports = {
  importMissingTaxonomies,
  importSkillsetTaxonomy,
  importSpokenLangTaxonomy,
  createUserSkillRelationships
}; 