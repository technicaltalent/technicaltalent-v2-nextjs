const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importUserLanguagesFixed() {
  console.log('🗣️ IMPORTING USER-LANGUAGE RELATIONSHIPS (IMPROVED VERSION)');
  
  const sqlFilePath = path.join(__dirname, '../../Reference Files/wp_6fbrt.sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.log('❌ WordPress SQL file not found');
    return;
  }
  
  console.log('📖 Reading WordPress SQL file...');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // Step 1: Get our database data
  console.log('\n=== STEP 1: LOADING DATABASE DATA ===');
  
  const languages = await prisma.language.findMany();
  const users = await prisma.user.findMany({
    where: { wordpressId: { not: null } },
    select: { id: true, wordpressId: true, firstName: true, lastName: true }
  });
  
  console.log(`📚 Languages in database: ${languages.length}`);
  console.log(`👥 Users with WordPress IDs: ${users.length}`);
  
  // Create lookup maps
  const userByWordpressId = new Map();
  users.forEach(user => {
    userByWordpressId.set(user.wordpressId, user);
  });
  
  const languageByWordpressId = new Map();
  languages.forEach(lang => {
    if (lang.wordpressId) {
      languageByWordpressId.set(lang.wordpressId, lang);
    }
  });
  
  console.log(`🗺️ User lookup map size: ${userByWordpressId.size}`);
  console.log(`🗺️ Language lookup map size: ${languageByWordpressId.size}`);
  
  // Step 2: Extract language taxonomy mapping
  console.log('\n=== STEP 2: EXTRACTING LANGUAGE TAXONOMIES ===');
  
  const taxonomyMatches = sqlContent.match(/INSERT INTO `xVhkH_term_taxonomy`[^;]*;/g);
  let spokenLangTaxonomyMapping = new Map(); // taxonomyId -> termId
  
  if (taxonomyMatches) {
    taxonomyMatches.forEach(match => {
      if (match.includes('spoken_lang')) {
        const valuesMatch = match.match(/VALUES\s*(.+);/s);
        if (valuesMatch) {
          const valuesString = valuesMatch[1];
          const rows = valuesString.split(/\),\s*\(/);
          
          rows.forEach(row => {
            if (row.includes('spoken_lang')) {
              const cleanRow = row.replace(/^\(|\)$/g, '');
              const parts = cleanRow.split(',').map(p => p.trim().replace(/['"]/g, ''));
              if (parts.length >= 3) {
                const termTaxonomyId = parseInt(parts[0]);
                const termId = parseInt(parts[1]);
                const taxonomy = parts[2];
                
                if (taxonomy === 'spoken_lang') {
                  spokenLangTaxonomyMapping.set(termTaxonomyId, termId);
                }
              }
            }
          });
        }
      }
    });
  }
  
  console.log(`🗺️ Language taxonomy mappings: ${spokenLangTaxonomyMapping.size}`);
  
  // Step 3: Extract and process term relationships
  console.log('\n=== STEP 3: PROCESSING TERM RELATIONSHIPS ===');
  
  const termRelationshipMatches = sqlContent.match(/INSERT INTO `xVhkH_term_relationships`[^;]*;/g);
  let userLanguageConnections = [];
  
  if (termRelationshipMatches) {
    termRelationshipMatches.forEach(match => {
      const valuesMatch = match.match(/VALUES\s*(.+);/s);
      if (valuesMatch) {
        const valuesString = valuesMatch[1];
        const rows = valuesString.split(/\),\s*\(/).map(row => row.replace(/^\(|\)$/g, ''));
        
        rows.forEach(row => {
          const parts = row.split(',').map(v => parseInt(v.trim()));
          if (parts.length >= 3) {
            const [objectId, termTaxonomyId, termOrder] = parts;
            
            // Check if this is a language taxonomy
            if (spokenLangTaxonomyMapping.has(termTaxonomyId)) {
              const termId = spokenLangTaxonomyMapping.get(termTaxonomyId);
              userLanguageConnections.push({
                wordpressUserId: objectId,
                languageTermId: termId,
                taxonomyId: termTaxonomyId
              });
            }
          }
        });
      }
    });
  }
  
  console.log(`🔗 Extracted ${userLanguageConnections.length} user-language connections`);
  
  // Step 4: Import with detailed tracking
  console.log('\n=== STEP 4: IMPORTING RELATIONSHIPS ===');
  
  let stats = {
    processed: 0,
    imported: 0,
    userNotFound: 0,
    languageNotFound: 0,
    duplicates: 0,
    errors: 0
  };
  
  for (const connection of userLanguageConnections) {
    stats.processed++;
    
    try {
      // Find user by WordPress ID
      const user = userByWordpressId.get(connection.wordpressUserId);
      if (!user) {
        stats.userNotFound++;
        if (stats.userNotFound <= 5) {
          console.log(`⚠️  User not found: WordPress ID ${connection.wordpressUserId}`);
        }
        continue;
      }
      
      // Find language by WordPress term ID
      const language = languageByWordpressId.get(connection.languageTermId);
      if (!language) {
        stats.languageNotFound++;
        if (stats.languageNotFound <= 5) {
          console.log(`⚠️  Language not found: WordPress ID ${connection.languageTermId}`);
        }
        continue;
      }
      
      // Check if relationship already exists
      const existingRelation = await prisma.userLanguage.findUnique({
        where: {
          userId_languageId: {
            userId: user.id,
            languageId: language.id
          }
        }
      });
      
      if (existingRelation) {
        stats.duplicates++;
        continue;
      }
      
      // Create user-language relationship
      await prisma.userLanguage.create({
        data: {
          userId: user.id,
          languageId: language.id,
          proficiencyLevel: 'Conversational' // Default level
        }
      });
      
      stats.imported++;
      
      if (stats.imported <= 20) {
        console.log(`✅ ${user.firstName} ${user.lastName} -> ${language.name}`);
      } else if (stats.imported % 50 === 0) {
        console.log(`   ... ${stats.imported} imported so far`);
      }
      
    } catch (error) {
      stats.errors++;
      if (stats.errors <= 5) {
        console.error(`❌ Error importing:`, error.message);
      }
    }
  }
  
  console.log('\n=== FINAL IMPORT SUMMARY ===');
  console.log(`📊 Connections processed: ${stats.processed}`);
  console.log(`✅ Successfully imported: ${stats.imported}`);
  console.log(`❌ User not found: ${stats.userNotFound}`);
  console.log(`❌ Language not found: ${stats.languageNotFound}`);
  console.log(`⚠️  Duplicates skipped: ${stats.duplicates}`);
  console.log(`💥 Errors: ${stats.errors}`);
  
  // Show final count
  const totalUserLanguages = await prisma.userLanguage.count();
  console.log(`\n🎯 Total user-language relationships in database: ${totalUserLanguages}`);
  
  await prisma.$disconnect();
}

importUserLanguagesFixed().catch(console.error); 