import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { trackEvent, EVENTS } from '@/lib/analytics'
import jwt from 'jsonwebtoken'

// Validation schema for posting skills
const postSkillsSchema = z.object({
  ids: z.object({
    skills: z.array(z.string()).optional().default([]),
    brands: z.array(z.string()).optional().default([])
  }),
  job_id: z.string().optional(),
  note: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          code: 401,
          message: 'Authentication required'
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
          message: 'Invalid token'
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate input data
    const validatedData = postSkillsSchema.parse(body)
    const { ids, job_id, note } = validatedData

    // Verify all skills exist
    const skillIds = ids.skills || []
    if (skillIds.length > 0) {
      const existingSkills = await prisma.skill.findMany({
        where: {
          id: { in: skillIds },
          isActive: true
        }
      })

      if (existingSkills.length !== skillIds.length) {
        return NextResponse.json(
          {
            code: 400,
            message: 'One or more skills not found'
          },
          { status: 400 }
        )
      }
    }

    // Remove existing skills that are being replaced
    if (skillIds.length > 0) {
      await prisma.userSkill.deleteMany({
        where: {
          userId: userId,
          skillId: { in: skillIds }
        }
      })
    }

    // Add new skills
    const userSkillsData = skillIds.map(skillId => ({
      userId: userId,
      skillId: skillId,
      proficiencyLevel: 1, // Default proficiency level
      yearsExperience: null
    }))

    if (userSkillsData.length > 0) {
      await prisma.userSkill.createMany({
        data: userSkillsData
      })
    }

    // Track skill addition event
    try {
      await trackEvent(userId, EVENTS.SKILL_ADDED, {
        skills_added: skillIds.length,
        skill_ids: skillIds,
        job_id: job_id || null,
        note: note || null,
        source: 'api'
      })
    } catch (analyticsError) {
      console.log('Analytics tracking skipped:', analyticsError)
    }

    // Return WordPress-compatible response format
    return NextResponse.json(
      {
        code: 200,
        message: 'Skills added successfully',
        skills_added: skillIds.length,
        job_id: job_id || null
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Post skills error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          code: 400,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        code: 500,
        message: 'Failed to add skills'
      },
      { status: 500 }
    )
  }
} 