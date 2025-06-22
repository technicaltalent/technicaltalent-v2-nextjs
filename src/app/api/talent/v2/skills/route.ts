import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { trackEvent, EVENTS } from '@/lib/analytics'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobid')
    
    // Get all parent skills (main categories)
    const skills = await prisma.skill.findMany({
      where: {
        parentId: null, // Top-level skills only
        isActive: true
      },
      include: {
        children: {
          where: {
            isActive: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Check if user is authenticated and get their skill selections
    let userSkillsByCategory: Record<string, number> = {}
    const authHeader = request.headers.get('authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7) // Remove 'Bearer ' prefix
        const decoded: any = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'development-secret-key-replace-in-production')
        const userId = decoded.user_id
        // Get count of user's skills in each parent category
        const userSkillCounts = await prisma.userSkill.findMany({
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

        // Count skills by parent category (only count child skills, not parent skills themselves)
        userSkillsByCategory = userSkillCounts.reduce((acc, userSkill) => {
          const parentSkill = userSkill.skill.parent
          // Only count skills that have a parent (i.e., child skills)
          if (parentSkill && parentSkill.wordpressId) {
            const parentKey = `skill_${parentSkill.wordpressId}`
            acc[parentKey] = (acc[parentKey] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>)

      } catch (jwtError) {
        // JWT verification failed, continue without user data
        console.log('JWT verification failed for skills list:', jwtError)
      }
    }

    // Format response to match WordPress structure
    const formattedSkills = skills.map(skill => ({
      terms: {
        term_id: `skill_${skill.wordpressId}`, // Use WordPress ID format for mobile app compatibility
        name: skill.name,
        parent: skill.parentId || 0,
        slug: skill.name.toLowerCase().replace(/\s+/g, '-'),
        description: skill.category || ''
      },
      image: null, // Will be handled by mobile app with fallback images
      subcat_count: skill.children.length,
      has_children: skill.children.length > 0,
      // Add user selection count for this category
      user_selections: userSkillsByCategory[`skill_${skill.wordpressId}`] || 0
    }))

    // Track skills view event
    try {
      await trackEvent('anonymous', EVENTS.SKILLS_VIEWED, {
        skill_count: skills.length,
        job_id: jobId || null,
        source: 'api'
      })
    } catch (analyticsError) {
      console.log('Analytics tracking skipped:', analyticsError)
    }

    // Return WordPress-compatible response format
    return NextResponse.json(
      {
        code: 200,
        message: 'Skills retrieved successfully',
        skill: formattedSkills,
        total_skills: skills.length
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Skills retrieval error:', error)

    return NextResponse.json(
      {
        code: 500,
        message: 'Failed to retrieve skills',
        skill: []
      },
      { status: 500 }
    )
  }
} 