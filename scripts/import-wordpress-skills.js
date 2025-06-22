// WordPress Skills Import Script
// Parses WordPress XML export and imports skills into Next.js database

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Parse WordPress XML export file
function parseWordPressXML(filePath) {
  console.log('📖 Reading WordPress export file...')
  const xmlContent = fs.readFileSync(filePath, 'utf-8')
  
  // Extract terms using regex patterns
  const termPattern = /<wp:term>(.*?)<\/wp:term>/gs
  const terms = []
  
  let match
  while ((match = termPattern.exec(xmlContent)) !== null) {
    const termContent = match[1]
    
    // Extract term details
    const termIdMatch = termContent.match(/<wp:term_id>(\d+)<\/wp:term_id>/)
    const taxonomyMatch = termContent.match(/<wp:term_taxonomy><!\[CDATA\[(.*?)\]\]><\/wp:term_taxonomy>/)
    const slugMatch = termContent.match(/<wp:term_slug><!\[CDATA\[(.*?)\]\]><\/wp:term_slug>/)
    const parentMatch = termContent.match(/<wp:term_parent><!\[CDATA\[(.*?)\]\]><\/wp:term_parent>/)
    const nameMatch = termContent.match(/<wp:term_name><!\[CDATA\[(.*?)\]\]><\/wp:term_name>/)
    
    if (termIdMatch && taxonomyMatch && nameMatch) {
      const term = {
        id: parseInt(termIdMatch[1]),
        taxonomy: taxonomyMatch[1],
        slug: slugMatch ? slugMatch[1] : '',
        parent: parentMatch ? parentMatch[1] : '',
        name: nameMatch[1]
      }
      
      // Only include skillset taxonomy for now
      if (term.taxonomy === 'skillset') {
        terms.push(term)
      }
    }
  }
  
  console.log(`✅ Found ${terms.length} skills in WordPress export`)
  return terms
}

// Convert WordPress terms to our database structure
function convertTermsToSkills(terms) {
  const skills = []
  const parentMap = new Map()
  
  // First pass: create parent skills
  for (const term of terms) {
    if (!term.parent || term.parent === '') {
      const skill = {
        originalId: term.id,
        name: term.name,
        category: term.taxonomy,
        slug: term.slug,
        parentId: null,
        isActive: true
      }
      skills.push(skill)
      parentMap.set(term.slug, skill)
    }
  }
  
  // Second pass: create child skills
  for (const term of terms) {
    if (term.parent && term.parent !== '') {
      const parentSkill = parentMap.get(term.parent)
      if (parentSkill) {
        const skill = {
          originalId: term.id,
          name: term.name,
          category: term.taxonomy,
          slug: term.slug,
          parentSlug: term.parent,
          isActive: true
        }
        skills.push(skill)
      } else {
        console.warn(`⚠️  Parent not found for skill: ${term.name} (parent: ${term.parent})`)
      }
    }
  }
  
  return skills
}

// Import skills into database
async function importSkills(skills) {
  console.log('🏗️  Importing skills into database...')
  
  // Clear existing skills
  await prisma.userSkill.deleteMany({})
  await prisma.skill.deleteMany({})
  
  const parentSkillMap = new Map()
  
  // First, create all parent skills
  const parentSkills = skills.filter(skill => !skill.parentSlug)
  
  for (const skillData of parentSkills) {
    const skill = await prisma.skill.create({
      data: {
        name: skillData.name,
        category: skillData.category,
        isActive: skillData.isActive
      }
    })
    
    parentSkillMap.set(skillData.slug, skill.id)
    console.log(`✅ Created parent skill: ${skill.name}`)
  }
  
  // Then create child skills
  const childSkills = skills.filter(skill => skill.parentSlug)
  
  for (const skillData of childSkills) {
    const parentId = parentSkillMap.get(skillData.parentSlug)
    
    if (parentId) {
      const skill = await prisma.skill.create({
        data: {
          name: skillData.name,
          category: skillData.category,
          parentId: parentId,
          isActive: skillData.isActive
        }
      })
      
      console.log(`  ✅ Created child skill: ${skill.name} (parent: ${skillData.parentSlug})`)
    } else {
      console.warn(`⚠️  Could not find parent for: ${skillData.name}`)
    }
  }
  
  console.log('🎉 Skills import completed!')
}

// Main execution
async function main() {
  try {
    const xmlFilePath = '/Users/jcalder/Downloads/talent.WordPress.2025-05-31 (1).xml'
    
    if (!fs.existsSync(xmlFilePath)) {
      console.error('❌ WordPress export file not found at:', xmlFilePath)
      console.error('💡 Please update the file path in the script')
      process.exit(1)
    }
    
    console.log('🚀 Starting WordPress skills import...')
    
    // Parse WordPress XML
    const terms = parseWordPressXML(xmlFilePath)
    
    // Convert to our format
    const skills = convertTermsToSkills(terms)
    
    console.log(`📊 Skills breakdown:`)
    const parentCount = skills.filter(s => !s.parentSlug).length
    const childCount = skills.filter(s => s.parentSlug).length
    console.log(`   Parent skills: ${parentCount}`)
    console.log(`   Child skills: ${childCount}`)
    console.log(`   Total skills: ${skills.length}`)
    
    // Import into database
    await importSkills(skills)
    
    // Verify import
    const totalSkills = await prisma.skill.count()
    console.log(`✅ Database now contains ${totalSkills} skills`)
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the import
main() 