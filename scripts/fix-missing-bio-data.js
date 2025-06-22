const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importMissingBioData() {
  console.log('🔍 Importing missing bio data from WordPress SQL...');
  
  // Read the WordPress SQL file
  const sqlPath = path.join(__dirname, '../../Reference Files/wp_6fbrt.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  
  // Extract bio data from the SQL file
  const bioMatches = sqlContent.match(/\(\d+,\s*(\d+),\s*'short_bio',\s*'([^']+)'\)/g);
  
  if (!bioMatches) {
    console.log('❌ No bio data found in SQL file');
    return;
  }
  
  console.log(`📊 Found ${bioMatches.length} bio entries in WordPress SQL`);
  
  const bioData = [];
  for (const match of bioMatches) {
    const bioMatch = match.match(/\(\d+,\s*(\d+),\s*'short_bio',\s*'([^']+)'\)/);
    if (bioMatch) {
      const userId = parseInt(bioMatch[1]);
      const bio = bioMatch[2]
        .replace(/\\'/g, "'")  // Unescape single quotes
        .replace(/\\n/g, "\n")  // Convert \\n to actual newlines
        .replace(/\\\\/g, "\\");  // Unescape backslashes
      
      if (bio && bio.trim() && bio !== 'NULL') {
        bioData.push({ userId, bio: bio.trim() });
      }
    }
  }
  
  console.log(`✅ Parsed ${bioData.length} valid bio entries`);
  
  // Update user profiles with bio data
  let updatedCount = 0;
  let notFoundCount = 0;
  
  for (const { userId, bio } of bioData) {
    try {
      // Find user by WordPress ID
      const user = await prisma.user.findFirst({
        where: { 
          OR: [
            { id: `user_${userId}` },
            { wordpressId: userId }
          ]
        },
        include: { profile: true }
      });
      
      if (user) {
        if (user.profile) {
          // Update existing profile
          await prisma.userProfile.update({
            where: { userId: user.id },
            data: { bio }
          });
        } else {
          // Create new profile with bio
          await prisma.userProfile.create({
            data: {
              userId: user.id,
              bio
            }
          });
        }
        updatedCount++;
        console.log(`✅ Updated bio for user ${user.firstName} ${user.lastName} (${user.id})`);
      } else {
        notFoundCount++;
        console.log(`❌ User not found for WordPress ID: ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Error updating bio for user ${userId}:`, error.message);
    }
  }
  
  console.log('\n📊 Bio Import Summary:');
  console.log(`✅ Successfully updated: ${updatedCount} users`);
  console.log(`❌ Users not found: ${notFoundCount} users`);
  console.log(`📝 Total bio entries processed: ${bioData.length}`);
  
  // Show some examples of updated users
  console.log('\n📋 Sample updated users with bios:');
  const updatedUsers = await prisma.user.findMany({
    where: { 
      profile: { 
        bio: { not: null }
      }
    },
    include: { profile: true },
    take: 5
  });
  
  updatedUsers.forEach(user => {
    const bioPreview = user.profile.bio.length > 50 
      ? user.profile.bio.substring(0, 50) + '...'
      : user.profile.bio;
    console.log(`- ${user.firstName} ${user.lastName}: "${bioPreview}"`);
  });
  
  await prisma.$disconnect();
}

importMissingBioData().catch(console.error); 