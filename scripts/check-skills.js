const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkData() {
  const skillCount = await prisma.skill.count()
  const manufacturerCount = await prisma.manufacturer.count()
  
  console.log(`Total skills: ${skillCount}`)
  console.log(`Total manufacturers: ${manufacturerCount}`)

  if (skillCount > 0) {
    const parentSkills = await prisma.skill.findMany({
      where: { parentId: null }
    })

    console.log('\nParent skills:')
    for (const skill of parentSkills) {
      console.log(`  • ${skill.name} (WP ID: ${skill.wordpressId})`)
    }
  }

  await prisma.$disconnect()
}

checkData() 