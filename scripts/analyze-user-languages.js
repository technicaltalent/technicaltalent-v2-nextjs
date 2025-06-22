const fs = require('fs');
const path = require('path');

async function analyzeUserLanguages() {
  console.log('🔍 ANALYZING USER-LANGUAGE RELATIONSHIPS IN WORDPRESS');
  
  const sqlFilePath = path.join(__dirname, '../../Reference Files/wp_6fbrt.sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.log('❌ WordPress SQL file not found');
    return;
  }
  
  console.log('📖 Reading WordPress SQL file...');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // Look for language taxonomy terms
  console.log('\n=== LANGUAGE TAXONOMY ANALYSIS ===');
  
  // Find spoken_lang taxonomy ID
  const spokenLangTaxonomyMatch = sqlContent.match(/INSERT INTO `xVhkH_term_taxonomy`.*?spoken_lang/gs);
  console.log('🗣️ Spoken language taxonomy matches:', spokenLangTaxonomyMatch ? spokenLangTaxonomyMatch.length : 0);
  
  // Find term relationships with spoken languages
  const termRelationshipMatches = sqlContent.match(/INSERT INTO `xVhkH_term_relationships`[^;]*;/g);
  console.log('🔗 Total term relationship entries:', termRelationshipMatches ? termRelationshipMatches.length : 0);
  
  if (termRelationshipMatches) {
    // Parse term relationships to look for language assignments
    let languageRelationships = 0;
    let userLanguageConnections = [];
    
    termRelationshipMatches.forEach(match => {
      // Extract values from the INSERT statement
      const valuesMatch = match.match(/VALUES\s*(.+);/s);
      if (valuesMatch) {
        const valuesString = valuesMatch[1];
        const rows = valuesString.split(/\),\s*\(/);
        
        rows.forEach(row => {
          const cleanRow = row.replace(/^\(|\)$/g, '');
          const [objectId, termTaxonomyId, termOrder] = cleanRow.split(',').map(v => v.trim());
          
          // Check if this term_taxonomy_id corresponds to spoken languages
          // We need to check against the taxonomy table
          if (termTaxonomyId) {
            userLanguageConnections.push({
              objectId: parseInt(objectId),
              termTaxonomyId: parseInt(termTaxonomyId),
              termOrder: parseInt(termOrder)
            });
          }
        });
      }
    });
    
    console.log(`📊 Total relationship connections found: ${userLanguageConnections.length}`);
    
    // Find term taxonomy entries for spoken_lang
    const taxonomyMatches = sqlContent.match(/INSERT INTO `xVhkH_term_taxonomy`[^;]*;/g);
    let spokenLangTaxonomyIds = [];
    
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
                const parts = cleanRow.split(',');
                if (parts.length >= 2) {
                  const termTaxonomyId = parseInt(parts[0].trim());
                  spokenLangTaxonomyIds.push(termTaxonomyId);
                }
              }
            });
          }
        }
      });
    }
    
    console.log(`🗣️ Spoken language taxonomy IDs found: ${spokenLangTaxonomyIds.length}`);
    console.log('   IDs:', spokenLangTaxonomyIds.slice(0, 10));
    
    // Filter user connections to only spoken languages
    const userLanguageFiltered = userLanguageConnections.filter(conn => 
      spokenLangTaxonomyIds.includes(conn.termTaxonomyId)
    );
    
    console.log(`👥 User-language connections found: ${userLanguageFiltered.length}`);
    
    if (userLanguageFiltered.length > 0) {
      console.log('\n📋 Sample user-language connections:');
      userLanguageFiltered.slice(0, 10).forEach(conn => {
        console.log(`   User/Post ${conn.objectId} -> Language Taxonomy ${conn.termTaxonomyId}`);
      });
      
      // Analyze if these are user IDs or post IDs
      const objectIds = userLanguageFiltered.map(c => c.objectId);
      const uniqueObjectIds = [...new Set(objectIds)];
      console.log(`\n📊 Unique object IDs with languages: ${uniqueObjectIds.length}`);
      console.log('   Sample IDs:', uniqueObjectIds.slice(0, 20));
      
      return {
        totalConnections: userLanguageFiltered.length,
        uniqueObjects: uniqueObjectIds.length,
        connections: userLanguageFiltered,
        taxonomyIds: spokenLangTaxonomyIds
      };
    }
  }
  
  console.log('\n❌ No user-language relationships found in WordPress data');
  return null;
}

// Run analysis
analyzeUserLanguages().catch(console.error); 