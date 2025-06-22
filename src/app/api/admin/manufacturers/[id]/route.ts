import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/admin/manufacturers/[id] - Get individual manufacturer
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { id: params.id }
    })

    if (!manufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      code: 200,
      data: { manufacturer }
    })

  } catch (error) {
    console.error('Error fetching manufacturer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manufacturer' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/manufacturers/[id] - Update manufacturer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      isActive 
    } = body

    // Check if manufacturer exists
    const existingManufacturer = await prisma.manufacturer.findUnique({
      where: { id: params.id }
    })

    if (!existingManufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      )
    }

    // Check if name is being changed and if it conflicts with another
    if (name && name !== existingManufacturer.name) {
      const conflictingManufacturer = await prisma.manufacturer.findUnique({
        where: { name }
      })

      if (conflictingManufacturer) {
        return NextResponse.json(
          { error: 'Manufacturer with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Update manufacturer
    const manufacturer = await prisma.manufacturer.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(website !== undefined && { website }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json({
      code: 200,
      message: 'Manufacturer updated successfully',
      data: { manufacturer }
    })

  } catch (error) {
    console.error('Error updating manufacturer:', error)
    return NextResponse.json(
      { error: 'Failed to update manufacturer' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/manufacturers/[id] - Delete manufacturer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if manufacturer exists
    const existingManufacturer = await prisma.manufacturer.findUnique({
      where: { id: params.id }
    })

    if (!existingManufacturer) {
      return NextResponse.json(
        { error: 'Manufacturer not found' },
        { status: 404 }
      )
    }

    // Check if manufacturer is being used in any jobs
    const jobCount = await prisma.jobManufacturer.count({
      where: { manufacturerId: params.id }
    })

    if (jobCount > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete manufacturer. It is used in ${jobCount} job(s). Consider setting it as inactive instead.` 
        },
        { status: 400 }
      )
    }

    // Delete manufacturer
    await prisma.manufacturer.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      code: 200,
      message: 'Manufacturer deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting manufacturer:', error)
    return NextResponse.json(
      { error: 'Failed to delete manufacturer' },
      { status: 500 }
    )
  }
} 