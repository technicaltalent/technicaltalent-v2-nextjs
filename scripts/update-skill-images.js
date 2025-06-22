const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Update Skills with Image URLs
 * Maps parent skill categories to their corresponding images
 */
async function updateSkillImages() {
  console.log('🖼️  Updating skill images...');

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

    console.log(`📊 Found ${parentSkills.length} parent skills to update`);

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
        
        console.log(`✅ Updated ${skill.name} with image: ${imageUrl}`);
      } else {
        console.log(`⚠️  No image mapping found for: ${skill.name}`);
      }
    }

    console.log('🎉 Skill images update completed!');

  } catch (error) {
    console.error('❌ Error updating skill images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateSkillImages(); 