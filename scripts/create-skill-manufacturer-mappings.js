const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSkillManufacturerMappings() {
  console.log('🔗 **CREATING SKILL-MANUFACTURER CATEGORY MAPPINGS**\n')

  // Clear existing mappings
  console.log('🗑️  Clearing existing mappings...')
  await prisma.skillManufacturerMapping.deleteMany()

  // Define the initial mappings based on WordPress data
  const mappings = [
    { skillWordpressId: 2, manufacturerCategory: 'Audio' },      // Audio skill -> Audio manufacturers
    { skillWordpressId: 3, manufacturerCategory: 'Lighting' },  // Lighting skill -> Lighting manufacturers  
    { skillWordpressId: 4, manufacturerCategory: 'Video' },     // Video skill -> Video manufacturers
    { skillWordpressId: 125, manufacturerCategory: 'Stage' },   // Stage skill -> Stage manufacturers
    // Note: skill_182 (Licenses) doesn't have equipment manufacturers, so no mapping
  ]

  console.log('🔧 Creating skill-manufacturer mappings...')
  
  for (const mapping of mappings) {
    try {
      // Verify the skill exists
      const skill = await prisma.skill.findUnique({
        where: { wordpressId: mapping.skillWordpressId }
      })
      
      if (!skill) {
        console.log(`⚠️  Skipping mapping for skill WordPress ID ${mapping.skillWordpressId} - skill not found`)
        continue
      }

      const created = await prisma.skillManufacturerMapping.create({
        data: {
          skillWordpressId: mapping.skillWordpressId,
          manufacturerCategory: mapping.manufacturerCategory,
          isActive: true
        }
      })

      console.log(`✅ Created mapping: Skill ${skill.name} (WP ID: ${mapping.skillWordpressId}) → ${mapping.manufacturerCategory} manufacturers`)
    } catch (error) {
      console.log(`❌ Failed to create mapping for skill ${mapping.skillWordpressId}:`, error.message)
    }
  }

  // Verify the mappings
  console.log('\n🔍 **VERIFICATION:**')
  const allMappings = await prisma.skillManufacturerMapping.findMany({
    include: {
      skill: true
    }
  })

  console.log(`📊 Total mappings created: ${allMappings.length}`)
  
  for (const mapping of allMappings) {
    console.log(`   • ${mapping.skill?.name || 'Unknown'} (WP ID: ${mapping.skillWordpressId}) → ${mapping.manufacturerCategory}`)
  }

  console.log('\n✅ **SKILL-MANUFACTURER MAPPINGS CREATED SUCCESSFULLY!**')
}

createSkillManufacturerMappings()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 