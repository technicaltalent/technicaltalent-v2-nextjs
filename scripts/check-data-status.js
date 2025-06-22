const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDataStatus() {
  try {
    console.log('📊 Database Status Check');
    console.log('========================');
    
    // Check all main data counts
    const userCount = await prisma.user.count();
    const jobCount = await prisma.job.count();
    const skillCount = await prisma.skill.count();
    const manufacturerCount = await prisma.manufacturer.count();
    const languageCount = await prisma.language.count();
    const userProfileCount = await prisma.userProfile.count();
    const userSkillCount = await prisma.userSkill.count();
    
    console.log(`👥 Users: ${userCount}`);
    console.log(`💼 Jobs: ${jobCount}`);
    console.log(`🛠️  Skills: ${skillCount}`);
    console.log(`🏭 Manufacturers: ${manufacturerCount}`);
    console.log(`🗣️  Languages: ${languageCount}`);
    console.log(`📝 User Profiles: ${userProfileCount}`);
    console.log(`🔗 User-Skill Links: ${userSkillCount}`);
    
    // Check skills breakdown
    const parentSkills = await prisma.skill.count({ where: { parentId: null } });
    const childSkills = await prisma.skill.count({ where: { parentId: { not: null } } });
    console.log(`   └─ Parent Skills: ${parentSkills}`);
    console.log(`   └─ Child Skills: ${childSkills}`);
    
    // Check job locations
    const jobsWithLocation = await prisma.job.count({
      where: {
        location: { not: null }
      }
    });
    
    console.log(`📍 Jobs with location data: ${jobsWithLocation}/${jobCount}`);
    
    // Sample some jobs with location data
    const sampleJobs = await prisma.job.findMany({
      where: {
        location: { not: null }
      },
      select: {
        id: true,
        title: true,
        location: true
      },
      take: 5
    });
    
    console.log('\n📍 Sample Job Locations:');
    sampleJobs.forEach(job => {
      console.log(`   • ${job.title}`);
      console.log(`     Location: ${job.location || 'N/A'}`);
      // Try to parse location JSON if available
      if (job.location) {
        try {
          const locationData = JSON.parse(job.location);
          console.log(`     Parsed: ${JSON.stringify(locationData, null, 2)}`);
        } catch (e) {
          console.log(`     Raw: ${job.location}`);
        }
      }
    });
    
    console.log('\n✅ Database status check completed!');
    
  } catch (error) {
    console.error('❌ Error checking database status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDataStatus(); 