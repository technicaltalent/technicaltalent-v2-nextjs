import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/user-free-plans/[id] - Get a specific user free plan
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const plan = await prisma.userFreePlan.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })

    if (!plan) {
      return NextResponse.json(
        { error: 'User free plan not found' },
        { status: 404 }
      )
    }

    const formattedPlan = {
      id: plan.id,
      userId: plan.userId,
      userEmail: plan.user.email,
      userName: `${plan.user.firstName || ''} ${plan.user.lastName || ''}`.trim() || 'Unknown User',
      userRole: plan.user.role,
      freeJobsAllowed: plan.freeJobsAllowed,
      freeJobsUsed: plan.freeJobsUsed,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString()
    }

    return NextResponse.json({ plan: formattedPlan })
  } catch (error) {
    console.error('Error fetching user free plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user free plan' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/user-free-plans/[id] - Update a user free plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { freeJobsAllowed, isActive } = body

    if (freeJobsAllowed !== undefined && freeJobsAllowed < 0) {
      return NextResponse.json(
        { error: 'Free jobs allowed must be non-negative' },
        { status: 400 }
      )
    }

    // Check if plan exists
    const existingPlan = await prisma.userFreePlan.findUnique({
      where: { id: params.id }
    })

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'User free plan not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (freeJobsAllowed !== undefined) updateData.freeJobsAllowed = freeJobsAllowed
    if (isActive !== undefined) updateData.isActive = isActive

    const plan = await prisma.userFreePlan.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })

    const formattedPlan = {
      id: plan.id,
      userId: plan.userId,
      userEmail: plan.user.email,
      userName: `${plan.user.firstName || ''} ${plan.user.lastName || ''}`.trim() || 'Unknown User',
      userRole: plan.user.role,
      freeJobsAllowed: plan.freeJobsAllowed,
      freeJobsUsed: plan.freeJobsUsed,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString()
    }

    return NextResponse.json({ plan: formattedPlan })
  } catch (error) {
    console.error('Error updating user free plan:', error)
    return NextResponse.json(
      { error: 'Failed to update user free plan' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/user-free-plans/[id] - Delete a user free plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if plan exists
    const existingPlan = await prisma.userFreePlan.findUnique({
      where: { id: params.id }
    })

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'User free plan not found' },
        { status: 404 }
      )
    }

    await prisma.userFreePlan.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'User free plan deleted successfully' })
  } catch (error) {
    console.error('Error deleting user free plan:', error)
    return NextResponse.json(
      { error: 'Failed to delete user free plan' },
      { status: 500 }
    )
  }
} 