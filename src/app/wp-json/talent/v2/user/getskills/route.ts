import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// WordPress-compatible get user skills endpoint
export async function GET(request: NextRequest) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header missing or invalid' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      )
    }

    // Extract and verify JWT token
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'development-secret-key-replace-in-production')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      )
    }

    const userId = decoded.user_id

    // Get user's skills with skill details
    const userSkills = await prisma.userSkill.findMany({
      where: {
        userId: userId
      },
      include: {
        skill: {
          include: {
            parent: true
          }
        }
      }
    })

    // Format response to match WordPress structure
    const formattedSkills = userSkills.map(userSkill => ({
      term_id: userSkill.skill.wordpressId?.toString() || userSkill.skill.id,
      name: userSkill.skill.name,
      slug: userSkill.skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      term_group: 0,
      term_taxonomy_id: userSkill.skill.wordpressId?.toString() || userSkill.skill.id,
      taxonomy: "skills",
      description: userSkill.skill.category || "",
      parent: userSkill.skill.parent?.wordpressId?.toString() || "0",
      count: 0,
      filter: "raw",
      // Additional user-specific data
      proficiency_level: userSkill.proficiencyLevel,
      years_experience: userSkill.yearsExperience
    }))

    return NextResponse.json(formattedSkills, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })

  } catch (error) {
    console.error('Error fetching user skills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user skills' },
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