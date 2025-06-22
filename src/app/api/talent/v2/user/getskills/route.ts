import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { trackEvent, EVENTS } from '@/lib/analytics'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          code: 401,
          message: 'Authentication required',
          skill: []
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const jwtSecret = process.env.NEXTAUTH_SECRET || 'development-secret-key'
    
    let userId: string
    try {
      const decoded = jwt.verify(token, jwtSecret) as any
      userId = decoded.user_id
    } catch (error) {
      return NextResponse.json(
        {
          code: 401,
          message: 'Invalid token',
          skill: []
        },
        { status: 401 }
      )
    }

    // Get user's skills
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Format skills to match WordPress structure
    const skills = userSkills.map(userSkill => ({
      term_id: userSkill.skill.id,
      name: userSkill.skill.name,
      parent: userSkill.skill.parentId || 0,
      slug: userSkill.skill.name.toLowerCase().replace(/\s+/g, '-'),
      description: userSkill.skill.category || '',
      proficiency_level: userSkill.proficiencyLevel,
      years_experience: userSkill.yearsExperience,
      parent_name: userSkill.skill.parent?.name || null
    }))

    // Track user skills view event
    try {
      await trackEvent(userId, EVENTS.SKILLS_VIEWED, {
        skills_count: skills.length,
        source: 'user_skills_api'
      })
    } catch (analyticsError) {
      console.log('Analytics tracking skipped:', analyticsError)
    }

    // Return WordPress-compatible response format
    return NextResponse.json(
      {
        code: 200,
        message: 'User skills retrieved successfully',
        skill: skills,
        total_skills: skills.length
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('User skills retrieval error:', error)

    return NextResponse.json(
      {
        code: 500,
        message: 'Failed to retrieve user skills',
        skill: []
      },
      { status: 500 }
    )
  }
} 