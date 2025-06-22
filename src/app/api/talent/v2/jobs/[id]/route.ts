import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { trackEvent, EVENTS } from '@/lib/analytics'

// Helper function to verify JWT token
async function verifyAuthToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    const jwtSecret = process.env.NEXTAUTH_SECRET || 'development-secret-key'
    const decoded = jwt.verify(token, jwtSecret) as any
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.user_id }
    })
    
    return user
  } catch (error) {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id

    // Get job with all related data - try both internal ID and WordPress ID
    let job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            profile: {
              select: {
                profileImageUrl: true,
                bio: true
              }
            }
          }
        },
        applications: {
          include: {
            talent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profile: {
                  select: {
                    profileImageUrl: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        transactions: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true
          }
        }
      }
    })

    // If not found by internal ID, try WordPress ID
    if (!job && !isNaN(Number(jobId))) {
      job = await prisma.job.findFirst({
        where: { wordpressId: Number(jobId) },
        include: {
          employer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profile: {
                select: {
                  profileImageUrl: true,
                  bio: true
                }
              }
            }
          },
          applications: {
            include: {
              talent: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  profile: {
                    select: {
                      profileImageUrl: true
                    }
                  }
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          transactions: {
            select: {
              id: true,
              amount: true,
              status: true,
              createdAt: true
            }
          }
        }
      })
    }

    if (!job) {
      return NextResponse.json(
        {
          code: 404,
          message: 'Job not found',
          data: null
        },
        { status: 404 }
      )
    }

    // Check if user has permission to view this job
    const user = await verifyAuthToken(request)
    const canViewDetails = !user || 
                          user.id === job.employerId || 
                          user.role === 'ADMIN' ||
                          job.applications.some(app => app.talentId === user.id)

    // Format applications based on permissions
    const formattedApplications = canViewDetails 
      ? job.applications.map(app => ({
          application_id: app.id,
          talent: {
            id: app.talent.id,
            name: `${app.talent.firstName} ${app.talent.lastName}`,
            email: app.talent.email,
            profile_image: app.talent.profile?.profileImageUrl || null
          },
          status: app.status.toLowerCase(),
          message: app.message,
          type: app.type.toLowerCase(),
          created_at: app.createdAt.toISOString()
        }))
      : []

    // Track job view event
    try {
      await trackEvent(user?.id || 'anonymous', EVENTS.JOB_VIEWED, {
        job_id: job.id,
        job_title: job.title,
        employer_id: job.employerId,
        user_role: user?.role?.toLowerCase() || 'anonymous'
      })
    } catch (analyticsError) {
      console.log('Analytics tracking skipped:', analyticsError)
    }

    // Return WordPress-compatible response format
    return NextResponse.json(
      {
        code: 200,
        message: 'Job retrieved successfully',
        data: {
          job: {
            job_id: job.id,
            title: job.title,
            description: job.description,
            employer: {
              id: job.employer.id,
              name: `${job.employer.firstName} ${job.employer.lastName}`,
              email: job.employer.email,
              profile_image: job.employer.profile?.profileImageUrl || null,
              bio: job.employer.profile?.bio || null
            },
            location: job.location ? JSON.parse(job.location) : null,
            required_skills: job.requiredSkills ? job.requiredSkills.split(',') : [],
            pay_rate: job.payRate,
            pay_type: job.payType?.toLowerCase(),
            status: job.status.toLowerCase(),
            start_date: job.startDate?.toISOString(),
            end_date: job.endDate?.toISOString(),
            payment_status: job.paymentStatus.toLowerCase(),
            notify_talent: job.notifyTalent,
            selected_talent: job.selectedTalent,
            applications: formattedApplications,
            applications_count: job.applications.length,
            transactions: job.transactions.map(tx => ({
              transaction_id: tx.id,
              amount: tx.amount,
              status: tx.status.toLowerCase(),
              created_at: tx.createdAt.toISOString()
            })),
            created_at: job.createdAt.toISOString(),
            updated_at: job.updatedAt.toISOString()
          }
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Job retrieval error:', error)

    return NextResponse.json(
      {
        code: 500,
        message: 'Failed to retrieve job',
        data: null
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id
    
    // Verify authentication
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json(
        {
          code: 401,
          message: 'Authentication required',
          data: null
        },
        { status: 401 }
      )
    }

    // Get existing job
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId }
    })

    if (!existingJob) {
      return NextResponse.json(
        {
          code: 404,
          message: 'Job not found',
          data: null
        },
        { status: 404 }
      )
    }

    // Check permission to update
    if (existingJob.employerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          code: 403,
          message: 'You can only update your own jobs',
          data: null
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const updateData: any = {}

    // Only update provided fields
    if (body.title) updateData.title = body.title
    if (body.description) updateData.description = body.description
    if (body.location) updateData.location = JSON.stringify(body.location)
    if (body.required_skills) updateData.requiredSkills = body.required_skills.join(',')
    if (body.pay_rate) updateData.payRate = body.pay_rate
    if (body.pay_type) updateData.payType = body.pay_type.toUpperCase()
    if (body.status) updateData.status = body.status.toUpperCase()
    if (body.start_date) updateData.startDate = new Date(body.start_date)
    if (body.end_date) updateData.endDate = new Date(body.end_date)
    if (body.selected_talent) updateData.selectedTalent = body.selected_talent

    // Update job
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: updateData,
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Track job update event
    try {
      await trackEvent(user.id, EVENTS.JOB_UPDATED, {
        job_id: updatedJob.id,
        updated_fields: Object.keys(updateData),
        job_status: updatedJob.status
      })
    } catch (analyticsError) {
      console.log('Analytics tracking skipped:', analyticsError)
    }

    return NextResponse.json(
      {
        code: 200,
        message: 'Job updated successfully',
        data: {
          job: {
            job_id: updatedJob.id,
            title: updatedJob.title,
            description: updatedJob.description,
            status: updatedJob.status.toLowerCase(),
            updated_at: updatedJob.updatedAt.toISOString()
          }
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Job update error:', error)

    return NextResponse.json(
      {
        code: 500,
        message: 'Failed to update job',
        data: null
      },
      { status: 500 }
    )
  }
} 