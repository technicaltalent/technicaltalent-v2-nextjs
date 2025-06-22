const fs = require('fs');
const path = require('path');

async function debugLanguageMappings() {
  console.log('🔍 DEBUGGING LANGUAGE TERM ID MAPPINGS');
  
  const sqlFilePath = path.join(__dirname, '../../Reference Files/wp_6fbrt.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
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
                  console.log(`📍 Taxonomy ID ${termTaxonomyId} -> Term ID ${termId}`);
                }
              }
            }
          });
        }
      }
    });
  }
  
  console.log(`\n🗺️ Found ${spokenLangTaxonomyMapping.size} language taxonomy mappings`);
  
  // Extract term relationships to see what term IDs are actually being used
  const termRelationshipMatches = sqlContent.match(/INSERT INTO `xVhkH_term_relationships`[^;]*;/g);
  let languageTermUsage = new Map(); // termId -> usage count
  
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
            languageTermUsage.set(termId, (languageTermUsage.get(termId) || 0) + 1);
          }
        });
      }
    });
  }
  
  console.log(`\n📊 Language term usage in WordPress relationships:`);
  const sortedUsage = Array.from(languageTermUsage.entries()).sort((a, b) => b[1] - a[1]);
  sortedUsage.forEach(([termId, count]) => {
    console.log(`   Term ID ${termId}: ${count} users`);
  });
  
  console.log(`\n🎯 Our imported language WordPress IDs: 135-180`);
  console.log(`🔍 WordPress relationship term IDs: ${Array.from(languageTermUsage.keys()).sort((a,b) => a-b).join(', ')}`);
  
  // Check overlap
  const ourLanguageIds = Array.from({length: 46}, (_, i) => 135 + i);
  const relationshipTermIds = Array.from(languageTermUsage.keys());
  const overlap = ourLanguageIds.filter(id => relationshipTermIds.includes(id));
  
  console.log(`\n✅ Matching IDs (successful imports): ${overlap.join(', ')}`);
  console.log(`❌ Missing in relationships: ${ourLanguageIds.filter(id => !relationshipTermIds.includes(id)).join(', ')}`);
  console.log(`❌ Missing in our import: ${relationshipTermIds.filter(id => !ourLanguageIds.includes(id)).join(', ')}`);
}

debugLanguageMappings().catch(console.error); 