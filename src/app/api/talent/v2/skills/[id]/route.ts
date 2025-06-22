import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { trackEvent, EVENTS } from '@/lib/analytics'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobid')
    const { id: skillId } = await params

    // Find the parent skill by ID
    const parentSkill = await prisma.skill.findUnique({
      where: {
        id: skillId,
        isActive: true
      }
    })

    if (!parentSkill) {
      return NextResponse.json(
        {
          code: 404,
          message: 'Skill not found',
          subcat: [],
          brand: []
        },
        { status: 404 }
      )
    }

    // Get child skills (subcategories)
    const childSkills = await prisma.skill.findMany({
      where: {
        parentId: skillId,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Format subcategories to match WordPress structure
    const subcat = childSkills.map(skill => ({
      term_id: skill.id,
      name: skill.name,
      parent: skill.parentId,
      slug: skill.name.toLowerCase().replace(/\s+/g, '-'),
      description: skill.category || ''
    }))

    // For now, we'll return empty brands array since we haven't imported brand data yet
    // This will be populated when we import the brand taxonomy from WordPress
    const brand: Array<{
      term_id: string;
      name: string;
      parent: string | null;
      slug: string;
      description: string;
    }> = []

    // Get user's current skills in this category (placeholder for now)
    // This will be implemented when we have user authentication
    const user_skill = {
      current: [], // User's current skills in this category
      other: []    // Other skills user has added
    }

    const user_brand = {
      current: [], // User's current brands/equipment
      other: []    // Other brands user has added
    }

    // Track child skills view event
    try {
      await trackEvent('anonymous', EVENTS.SKILLS_VIEWED, {
        parent_skill_id: skillId,
        parent_skill_name: parentSkill.name,
        child_skills_count: childSkills.length,
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
        message: 'Child skills retrieved successfully',
        subcat: subcat,
        brand: brand,
        user_skill: user_skill,
        user_brand: user_brand
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Child skills retrieval error:', error)

    return NextResponse.json(
      {
        code: 500,
        message: 'Failed to retrieve child skills',
        subcat: [],
        brand: []
      },
      { status: 500 }
    )
  }
} 