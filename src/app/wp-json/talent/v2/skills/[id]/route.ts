import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

// WordPress-compatible individual skill endpoint - returns child skills for a parent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: skillId } = await params

    // Get the parent skill by WordPress ID (e.g., "skill_2" -> wordpressId = 2)
    const wordpressId = parseInt(skillId.replace('skill_', ''))
    
    if (isNaN(wordpressId)) {
      return NextResponse.json(
        { error: 'Invalid skill ID format' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      )
    }

    // Get child skills for this parent skill
    const childSkills = await prisma.skill.findMany({
      where: {
        parent: {
          wordpressId: wordpressId
        }
      },
      include: {
        parent: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Format child skills for subcat
    const formattedSkills = childSkills.map(skill => ({
      term_id: skill.wordpressId?.toString() || skill.id,
      name: skill.name,
      slug: skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      term_group: 0,
      term_taxonomy_id: skill.wordpressId?.toString() || skill.id,
      taxonomy: "skills",
      description: skill.category || "",
      parent: skill.parent?.wordpressId?.toString() || "0",
      count: 0,
      filter: "raw"
    }))

    // Get manufacturers/brands for this skill category from database mapping
    const skillMapping = await prisma.skillManufacturerMapping.findUnique({
      where: {
        skillWordpressId: wordpressId
      }
    })

    let brands: any[] = []

    if (skillMapping && skillMapping.isActive) {
      // Get manufacturers for this category
      const manufacturers = await prisma.manufacturer.findMany({
        where: {
          category: skillMapping.manufacturerCategory.toLowerCase(), // Our DB stores lowercase
          isActive: true,
          parentId: { not: null } // Only get child manufacturers, not parent categories
        },
        orderBy: {
          name: 'asc'
        }
      })

      // Format manufacturers to match WordPress structure
      brands = manufacturers.map(manufacturer => ({
        term_id: manufacturer.wordpressId?.toString() || manufacturer.id,
        name: manufacturer.name,
        slug: manufacturer.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        term_group: 0,
        term_taxonomy_id: manufacturer.wordpressId?.toString() || manufacturer.id,
        taxonomy: "brands",
        description: manufacturer.description || "",
        parent: "0", // Individual brands don't have parents in this context
        count: 0,
        filter: "raw"
      }))
    }

    // Get user's current skills in this category if authenticated
    let userCurrentSkills: any[] = []
    let userCurrentBrands: any[] = []

    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7) // Remove 'Bearer ' prefix
        const decoded: any = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'development-secret-key-replace-in-production')
        const userId = decoded.user_id

        // Get user's skills - both the parent skill itself AND any child skills
        const userSkills = await prisma.userSkill.findMany({
          where: {
            userId: userId,
            OR: [
              // User has the parent skill itself
              {
                skill: {
                  wordpressId: wordpressId
                }
              },
              // User has child skills under this parent
              {
                skill: {
                  parent: {
                    wordpressId: wordpressId
                  }
                }
              }
            ]
          },
          include: {
            skill: true
          }
        })

        console.log(`🔧 [skills/${skillId}] Found user skills for category:`, userSkills.map(us => ({ 
          id: us.skill.id, 
          wordpressId: us.skill.wordpressId, 
          name: us.skill.name,
          isParent: us.skill.parentId === null
        })))

        // Format user's current skills - MOBILE APP EXPECTS JUST IDs, NOT OBJECTS!
        userCurrentSkills = userSkills
          .filter(userSkill => userSkill.skill.parentId !== null) // Only include child skills, not the parent
          .map(userSkill => userSkill.skill.wordpressId?.toString() || userSkill.skill.id)
        
        console.log(`🔧 [skills/${skillId}] User current child skills:`, userCurrentSkills)

        // Get user's current manufacturers/brands for this skill category
        if (skillMapping && skillMapping.isActive) {
          const userManufacturers = await prisma.userManufacturer.findMany({
            where: {
              userId: userId, 
              manufacturer: {
                category: skillMapping.manufacturerCategory.toLowerCase(),
                isActive: true,
                parentId: { not: null } // Only child manufacturers, not parent categories
              }
            },
            include: {
              manufacturer: true
            }
          })

          // Format user's current manufacturers - MOBILE APP EXPECTS JUST IDs, NOT OBJECTS!
          userCurrentBrands = userManufacturers.map(userManufacturer => 
            userManufacturer.manufacturer.wordpressId?.toString() || userManufacturer.manufacturer.id
          )
        }
        
      } catch (jwtError) {
        // JWT verification failed, continue without user data
        console.log('JWT verification failed, continuing without user data:', jwtError)
      }
    }

    // WordPress-compatible response structure
    const response = {
      subcat: formattedSkills, // Child skills
      brand: brands, // Equipment/brands
      user_skill: {
        current: userCurrentSkills, // User's current skills in this category
        other: []    // User's other skills (empty for now)
      },
      user_brand: {
        current: userCurrentBrands, // User's current brands (empty for now)
        other: []    // User's other brands (empty for now)
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })

  } catch (error) {
    console.error('Error fetching child skills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch child skills' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
} 