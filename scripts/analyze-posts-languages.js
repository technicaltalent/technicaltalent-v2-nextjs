const fs = require('fs');
const path = require('path');

async function analyzePostsLanguages() {
  console.log('🔍 ANALYZING WORDPRESS POSTS AND LANGUAGE RELATIONSHIPS');
  
  const sqlFilePath = path.join(__dirname, '../../Reference Files/wp_6fbrt.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  
  // Step 1: Extract posts and their authors
  console.log('\n=== STEP 1: EXTRACTING WORDPRESS POSTS ===');
  
  const postMatches = sqlContent.match(/INSERT INTO `xVhkH_posts`[^;]*;/g);
  let posts = [];
  
  if (postMatches) {
    postMatches.forEach(match => {
      const valuesMatch = match.match(/VALUES\s*(.+);/s);
      if (valuesMatch) {
        const valuesString = valuesMatch[1];
        const rows = valuesString.split(/\),\s*\(/);
        
        rows.forEach(row => {
          const cleanRow = row.replace(/^\(|\)$/g, '');
          const parts = cleanRow.split(',').map(p => p.trim());
          
          if (parts.length >= 14) {
            // WordPress posts structure: ID, post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt, post_status, comment_status, ping_status, post_password, post_name, post_modified, post_modified_gmt, post_content_filtered, post_parent, guid, menu_order, post_type, post_mime_type, comment_count
            const postId = parseInt(parts[0]);
            const postAuthor = parseInt(parts[1]);
            const postType = parts[18] ? parts[18].replace(/['"]/g, '') : 'post';
            const postTitle = parts[5] ? parts[5].replace(/['"]/g, '') : '';
            
            posts.push({
              id: postId,
              author: postAuthor,
              type: postType,
              title: postTitle
            });
          }
        });
      }
    });
  }
  
  console.log(`📄 Total posts extracted: ${posts.length}`);
  
  // Group by post type
  const postTypes = {};
  posts.forEach(post => {
    if (!postTypes[post.type]) postTypes[post.type] = 0;
    postTypes[post.type]++;
  });
  
  console.log('📊 Posts by type:');
  Object.entries(postTypes).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  
  // Find talent-related posts
  const talentPosts = posts.filter(post => 
    post.type === 'talent' || 
    post.title.toLowerCase().includes('talent') ||
    post.type === 'user' ||
    post.type === 'profile'
  );
  
  console.log(`🎯 Talent-related posts: ${talentPosts.length}`);
  if (talentPosts.length > 0) {
    console.log('📋 Sample talent posts:');
    talentPosts.slice(0, 10).forEach(post => {
      console.log(`   ID ${post.id} by Author ${post.author}: "${post.title}" (${post.type})`);
    });
  }
  
  // Step 2: Map language relationships to posts and then to users
  console.log('\n=== STEP 2: MAPPING LANGUAGE RELATIONSHIPS ===');
  
  // Get language taxonomy mappings
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
  
  // Get term relationships
  const termRelationshipMatches = sqlContent.match(/INSERT INTO `xVhkH_term_relationships`[^;]*;/g);
  let postLanguageConnections = [];
  
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
              postLanguageConnections.push({
                objectId: objectId,
                languageTermId: termId,
                taxonomyId: termTaxonomyId
              });
            }
          }
        });
      }
    });
  }
  
  console.log(`🔗 Language connections found: ${postLanguageConnections.length}`);
  
  // Map post IDs to user IDs
  const postToUserMap = new Map();
  posts.forEach(post => {
    postToUserMap.set(post.id, post.author);
  });
  
  // Convert post language connections to user language connections
  let userLanguageConnections = [];
  let postConnections = [];
  let directUserConnections = [];
  
  postLanguageConnections.forEach(conn => {
    if (postToUserMap.has(conn.objectId)) {
      // This object ID is a post, get the author (user)
      const userId = postToUserMap.get(conn.objectId);
      userLanguageConnections.push({
        userId: userId,
        languageTermId: conn.languageTermId,
        source: 'post'
      });
      postConnections.push(conn);
    } else {
      // This might be a direct user connection
      userLanguageConnections.push({
        userId: conn.objectId,
        languageTermId: conn.languageTermId,
        source: 'user'
      });
      directUserConnections.push(conn);
    }
  });
  
  console.log(`👤 Direct user connections: ${directUserConnections.length}`);
  console.log(`📄 Post-based connections: ${postConnections.length}`);
  console.log(`🔗 Total user-language mappings: ${userLanguageConnections.length}`);
  
  // Analyze user ID ranges
  const userIds = userLanguageConnections.map(c => c.userId);
  const uniqueUserIds = [...new Set(userIds)];
  
  console.log(`\n📊 User ID analysis:`);
  console.log(`   Unique users with languages: ${uniqueUserIds.length}`);
  console.log(`   User ID range: ${Math.min(...userIds)} - ${Math.max(...userIds)}`);
  console.log(`   Sample user IDs: ${uniqueUserIds.slice(0, 20).join(', ')}`);
  
  // Show language usage
  const languageUsage = new Map();
  userLanguageConnections.forEach(conn => {
    languageUsage.set(conn.languageTermId, (languageUsage.get(conn.languageTermId) || 0) + 1);
  });
  
  console.log(`\n🗣️ Language usage:`);
  const sortedLanguages = Array.from(languageUsage.entries()).sort((a, b) => b[1] - a[1]);
  sortedLanguages.slice(0, 10).forEach(([termId, count]) => {
    console.log(`   Language ${termId}: ${count} users`);
  });
  
  return {
    posts: posts,
    userLanguageConnections: userLanguageConnections,
    uniqueUsers: uniqueUserIds.length
  };
}

analyzePostsLanguages().catch(console.error); 