const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importUserLanguages() {
  console.log('🗣️ IMPORTING USER-LANGUAGE RELATIONSHIPS FROM WORDPRESS');
  
  const sqlFilePath = path.join(__dirname, '../../Reference Files/wp_6fbrt.sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.log('❌ WordPress SQL file not found');
    return;
  }
  
  console.log('📖 Reading WordPress SQL file...');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // Step 1: Extract language taxonomy mapping
  console.log('\n=== STEP 1: MAPPING LANGUAGE TAXONOMIES ===');
  
  // Get all languages from our database
  const languages = await prisma.language.findMany();
  console.log(`📚 Found ${languages.length} languages in v2 database`);
  
  // Extract term taxonomy entries for spoken_lang
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
  
  console.log(`🗺️ Found ${spokenLangTaxonomyMapping.size} language taxonomy mappings`);
  
  // Step 2: Extract term relationships
  console.log('\n=== STEP 2: EXTRACTING USER-LANGUAGE RELATIONSHIPS ===');
  
  const termRelationshipMatches = sqlContent.match(/INSERT INTO `xVhkH_term_relationships`[^;]*;/g);
  let userLanguageConnections = [];
  
  if (termRelationshipMatches) {
    termRelationshipMatches.forEach(match => {
      const valuesMatch = match.match(/VALUES\s*(.+);/s);
      if (valuesMatch) {
        const valuesString = valuesMatch[1];
        const rows = valuesString.split(/\),\s*\(/);
        
        rows.forEach(row => {
          const cleanRow = row.replace(/^\(|\)$/g, '');
          const [objectId, termTaxonomyId, termOrder] = cleanRow.split(',').map(v => parseInt(v.trim()));
          
          // Check if this is a language taxonomy
          if (spokenLangTaxonomyMapping.has(termTaxonomyId)) {
            const termId = spokenLangTaxonomyMapping.get(termTaxonomyId);
            userLanguageConnections.push({
              wordpressUserId: objectId,
              languageTermId: termId,
              taxonomyId: termTaxonomyId
            });
          }
        });
      }
    });
  }
  
  console.log(`🔗 Found ${userLanguageConnections.length} user-language connections`);
  
  // Step 3: Map to our database IDs
  console.log('\n=== STEP 3: MAPPING TO V2 DATABASE IDS ===');
  
  const users = await prisma.user.findMany({
    where: { 
      wordpressId: { not: null }
    },
    select: { id: true, wordpressId: true, firstName: true, lastName: true }
  });
  
  console.log(`👥 Found ${users.length} users with WordPress IDs`);
  
  let successfulImports = 0;
  let skippedConnections = 0;
  
  for (const connection of userLanguageConnections) {
    try {
      // Find user by WordPress ID
      const user = users.find(u => u.wordpressId === connection.wordpressUserId);
      if (!user) {
        skippedConnections++;
        continue;
      }
      
      // Find language by WordPress term ID
      const language = languages.find(l => l.wordpressId === connection.languageTermId);
      if (!language) {
        skippedConnections++;
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
        continue; // Skip duplicates
      }
      
      // Create user-language relationship
      await prisma.userLanguage.create({
        data: {
          userId: user.id,
          languageId: language.id,
          proficiencyLevel: 'Conversational' // Default level since WordPress doesn't store this
        }
      });
      
      successfulImports++;
      
      if (successfulImports <= 10) {
        console.log(`✅ Added language "${language.name}" to user "${user.firstName} ${user.lastName}"`);
      }
      
    } catch (error) {
      console.error(`❌ Error importing connection:`, error.message);
      skippedConnections++;
    }
  }
  
  console.log('\n=== IMPORT SUMMARY ===');
  console.log(`✅ Successfully imported: ${successfulImports} user-language relationships`);
  console.log(`⚠️  Skipped connections: ${skippedConnections}`);
  console.log(`📊 Total connections processed: ${userLanguageConnections.length}`);
  
  // Show some examples
  const sampleUserLanguages = await prisma.userLanguage.findMany({
    take: 5,
    include: {
      user: { select: { firstName: true, lastName: true } },
      language: { select: { name: true } }
    }
  });
  
  console.log('\n📋 Sample imported relationships:');
  sampleUserLanguages.forEach(ul => {
    console.log(`   - ${ul.user.firstName} ${ul.user.lastName}: ${ul.language.name} (${ul.proficiencyLevel})`);
  });
  
  await prisma.$disconnect();
}

importUserLanguages().catch(console.error); 