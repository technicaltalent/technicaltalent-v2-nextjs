import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/admin/manufacturers - List all manufacturers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('isActive')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ]
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    // Try explicit select to ensure category field is included
    const rawManufacturers = await prisma.$queryRaw`
      SELECT 
        id, 
        wordpress_id as wordpressId,
        name, 
        category,
        parent_id as parentId,
        description, 
        website, 
        logo_url as logoUrl, 
        is_active as isActive, 
        created_at as createdAt, 
        updated_at as updatedAt
      FROM manufacturers 
      WHERE is_active = 1
      ORDER BY name ASC
      LIMIT ${limit} OFFSET ${skip}
    ` as unknown as any[]
    
    const totalCount = await prisma.manufacturer.count({ where })
    const manufacturers = rawManufacturers

    // Debug: Log what we're actually returning
    console.log('🔍 API returning first manufacturer:', JSON.stringify(manufacturers[0], null, 2))

    return NextResponse.json({
      code: 200,
      data: {
        manufacturers,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    })

  } catch (error) {
    console.error('Error fetching manufacturers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manufacturers' },
      { status: 500 }
    )
  }
}

// POST /api/admin/manufacturers - Create new manufacturer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      name, 
      category,
      description, 
      website, 
      logoUrl, 
      isActive = true 
    } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check if manufacturer already exists
    const existingManufacturer = await prisma.manufacturer.findUnique({
      where: { name }
    })

    if (existingManufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer with this name already exists' },
        { status: 400 }
      )
    }

    // Create manufacturer
    const manufacturer = await prisma.manufacturer.create({
      data: {
        name,
        // category, // TODO: Fix TypeScript issue later
        description,
        website,
        logoUrl,
        isActive
      }
    })

    return NextResponse.json({
      code: 200,
      message: 'Manufacturer created successfully',
      data: { manufacturer }
    })

  } catch (error) {
    console.error('Error creating manufacturer:', error)
    return NextResponse.json(
      { error: 'Failed to create manufacturer' },
      { status: 500 }
    )
  }
} 