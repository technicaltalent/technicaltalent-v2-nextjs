import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/user-free-plans - Fetch all user free plans
export async function GET() {
  try {
    const plans = await prisma.userFreePlan.findMany({
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
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      userId: plan.userId,
      userEmail: plan.user.email,
      userName: `${plan.user.firstName || ''} ${plan.user.lastName || ''}`.trim() || 'Unknown User',
      userRole: plan.user.role,
      freeJobsAllowed: plan.freeJobsAllowed,
      freeJobsUsed: plan.freeJobsUsed,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString()
    }))

    return NextResponse.json({ plans: formattedPlans })
  } catch (error) {
    console.error('Error fetching user free plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user free plans' },
      { status: 500 }
    )
  }
}

// POST /api/admin/user-free-plans - Create a new user free plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, freeJobsAllowed } = body

    if (!userId || !freeJobsAllowed || freeJobsAllowed < 1) {
      return NextResponse.json(
        { error: 'User ID and valid free jobs allowed count are required' },
        { status: 400 }
      )
    }

    // Check if user exists and is an employer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.role !== 'EMPLOYER') {
      return NextResponse.json(
        { error: 'Free plans can only be assigned to employers' },
        { status: 400 }
      )
    }

    // Check if user already has a free plan
    const existingPlan = await prisma.userFreePlan.findUnique({
      where: { userId }
    })

    if (existingPlan) {
      return NextResponse.json(
        { error: 'User already has a free plan' },
        { status: 400 }
      )
    }

    const plan = await prisma.userFreePlan.create({
      data: {
        userId,
        freeJobsAllowed,
        freeJobsUsed: 0,
        isActive: true
      },
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

    return NextResponse.json({ plan: formattedPlan }, { status: 201 })
  } catch (error) {
    console.error('Error creating user free plan:', error)
    return NextResponse.json(
      { error: 'Failed to create user free plan' },
      { status: 500 }
    )
  }
} 