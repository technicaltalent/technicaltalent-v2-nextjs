import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

// PUT /api/admin/skill-manufacturer-mappings/[id] - Update mapping
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { manufacturerCategory, isActive } = body

    // Validate required fields
    if (!manufacturerCategory) {
      return NextResponse.json(
        { error: 'Missing manufacturer category' },
        { status: 400 }
      )
    }

    const mapping = await prisma.skillManufacturerMapping.update({
      where: { id },
      data: {
        manufacturerCategory,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        skill: true
      }
    })

    return NextResponse.json(mapping)
  } catch (error: any) {
    console.error('Error updating skill-manufacturer mapping:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Mapping not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update mapping' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/skill-manufacturer-mappings/[id] - Delete mapping
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params

    await prisma.skillManufacturerMapping.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting skill-manufacturer mapping:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Mapping not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete mapping' },
      { status: 500 }
    )
  }
} 