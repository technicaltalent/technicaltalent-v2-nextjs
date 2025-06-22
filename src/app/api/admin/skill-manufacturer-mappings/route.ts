import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/skill-manufacturer-mappings - List all mappings
export async function GET() {
  try {
    const mappings = await prisma.skillManufacturerMapping.findMany({
      include: {
        skill: true
      },
      orderBy: {
        skill: {
          name: 'asc'
        }
      }
    })

    // Also get all parent skills for the dropdown
    const parentSkills = await prisma.skill.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' }
    })

    // Get available manufacturer categories
    const manufacturerCategories = await prisma.manufacturer.findMany({
      where: { parentId: null },
      select: { name: true },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      mappings,
      parentSkills,
      manufacturerCategories: manufacturerCategories.map(m => m.name)
    })
  } catch (error) {
    console.error('Error fetching skill-manufacturer mappings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch mappings' },
      { status: 500 }
    )
  }
}

// POST /api/admin/skill-manufacturer-mappings - Create new mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { skillWordpressId, manufacturerCategory } = body

    // Validate required fields
    if (!skillWordpressId || !manufacturerCategory) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if skill exists
    const skill = await prisma.skill.findUnique({
      where: { wordpressId: skillWordpressId }
    })

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      )
    }

    // Check if mapping already exists
    const existingMapping = await prisma.skillManufacturerMapping.findUnique({
      where: { skillWordpressId }
    })

    if (existingMapping) {
      return NextResponse.json(
        { error: 'Mapping already exists for this skill' },
        { status: 409 }
      )
    }

    const mapping = await prisma.skillManufacturerMapping.create({
      data: {
        skillWordpressId,
        manufacturerCategory,
        isActive: true
      },
      include: {
        skill: true
      }
    })

    return NextResponse.json(mapping, { status: 201 })
  } catch (error) {
    console.error('Error creating skill-manufacturer mapping:', error)
    return NextResponse.json(
      { error: 'Failed to create mapping' },
      { status: 500 }
    )
  }
} 