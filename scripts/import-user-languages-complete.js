const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importUserLanguagesComplete() {
  console.log('🗣️ COMPREHENSIVE USER-LANGUAGE IMPORT (Direct + Post-based)');
  
  const sqlFilePath = path.join(__dirname, '../../Reference Files/wp_6fbrt.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // Step 1: Load our database data
  console.log('\n=== STEP 1: LOADING DATABASE DATA ===');
  
  const languages = await prisma.language.findMany();
  const users = await prisma.user.findMany({
    where: { wordpressId: { not: null } },
    select: { id: true, wordpressId: true, firstName: true, lastName: true }
  });
  
  console.log(`📚 Languages: ${languages.length}`);
  console.log(`👥 Users: ${users.length}`);
  
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
  
  // Step 2: Extract WordPress posts and create post-to-user mapping
  console.log('\n=== STEP 2: EXTRACTING WORDPRESS POSTS ===');
  
  const postMatches = sqlContent.match(/INSERT INTO `xVhkH_posts`[^;]*;/g);
  let postToUserMap = new Map();
  
  if (postMatches) {
    postMatches.forEach(match => {
      const valuesMatch = match.match(/VALUES\s*(.+);/s);
      if (valuesMatch) {
        const valuesString = valuesMatch[1];
        const rows = valuesString.split(/\),\s*\(/);
        
        rows.forEach(row => {
          const cleanRow = row.replace(/^\(|\)$/g, '');
          const parts = cleanRow.split(',').map(p => p.trim());
          
          if (parts.length >= 2) {
            const postId = parseInt(parts[0]);
            const postAuthor = parseInt(parts[1]);
            
            if (!isNaN(postId) && !isNaN(postAuthor)) {
              postToUserMap.set(postId, postAuthor);
            }
          }
        });
      }
    });
  }
  
  console.log(`📄 Post-to-user mappings: ${postToUserMap.size}`);
  
  // Step 3: Extract language taxonomy mappings
  console.log('\n=== STEP 3: EXTRACTING LANGUAGE TAXONOMIES ===');
  
  const taxonomyMatches = sqlContent.match(/INSERT INTO `xVhkH_term_taxonomy`[^;]*;/g);
  let spokenLangTaxonomyMapping = new Map();
  
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
  
  // Step 4: Extract term relationships and resolve to users
  console.log('\n=== STEP 4: EXTRACTING TERM RELATIONSHIPS ===');
  
  const termRelationshipMatches = sqlContent.match(/INSERT INTO `xVhkH_term_relationships`[^;]*;/g);
  let allUserLanguageConnections = [];
  
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
              
              // Try to resolve objectId to userId
              let userId = null;
              let source = 'unknown';
              
              // Option 1: Direct user connection
              if (userByWordpressId.has(objectId)) {
                userId = objectId;
                source = 'direct_user';
              }
              // Option 2: Post-based connection
              else if (postToUserMap.has(objectId)) {
                userId = postToUserMap.get(objectId);
                source = 'post_author';
              }
              
              if (userId) {
                allUserLanguageConnections.push({
                  userId: userId,
                  languageTermId: termId,
                  source: source
                });
              }
            }
          }
        });
      }
    });
  }
  
  console.log(`🔗 Total user-language connections found: ${allUserLanguageConnections.length}`);
  
  // Group by source
  const directConnections = allUserLanguageConnections.filter(c => c.source === 'direct_user');
  const postConnections = allUserLanguageConnections.filter(c => c.source === 'post_author');
  
  console.log(`👤 Direct user connections: ${directConnections.length}`);
  console.log(`📄 Post-based connections: ${postConnections.length}`);
  
  // Step 5: Import with detailed tracking
  console.log('\n=== STEP 5: IMPORTING TO DATABASE ===');
  
  let stats = {
    processed: 0,
    imported: 0,
    userNotFound: 0,
    languageNotFound: 0,
    duplicates: 0,
    errors: 0
  };
  
  for (const connection of allUserLanguageConnections) {
    stats.processed++;
    
    try {
      // Find user in our database
      const user = userByWordpressId.get(connection.userId);
      if (!user) {
        stats.userNotFound++;
        continue;
      }
      
      // Find language in our database
      const language = languageByWordpressId.get(connection.languageTermId);
      if (!language) {
        stats.languageNotFound++;
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
          proficiencyLevel: 'Conversational'
        }
      });
      
      stats.imported++;
      
      if (stats.imported <= 30) {
        console.log(`✅ ${user.firstName} ${user.lastName} -> ${language.name} (${connection.source})`);
      } else if (stats.imported % 25 === 0) {
        console.log(`   ... ${stats.imported} imported so far`);
      }
      
    } catch (error) {
      stats.errors++;
      if (stats.errors <= 5) {
        console.error(`❌ Error:`, error.message);
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
  
  // Final verification
  const totalUserLanguages = await prisma.userLanguage.count();
  console.log(`\n🎯 Total user-language relationships in database: ${totalUserLanguages}`);
  
  // Show sample users with languages
  const sampleUsersWithLanguages = await prisma.user.findMany({
    where: {
      userLanguages: {
        some: {}
      }
    },
    include: {
      userLanguages: {
        include: {
          language: true
        }
      }
    },
    take: 5
  });
  
  console.log('\n📋 Sample users with languages:');
  sampleUsersWithLanguages.forEach(user => {
    const languageNames = user.userLanguages.map(ul => ul.language.name).join(', ');
    console.log(`   ${user.firstName} ${user.lastName}: ${languageNames}`);
  });
  
  await prisma.$disconnect();
}

importUserLanguagesComplete().catch(console.error); 