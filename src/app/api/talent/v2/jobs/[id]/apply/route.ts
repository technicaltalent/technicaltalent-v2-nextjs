import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { trackEvent, EVENTS } from '@/lib/analytics'

// Validation schema for job application
const applicationSchema = z.object({
  message: z.string().min(10, 'Application message must be at least 10 characters').optional(),
  type: z.enum(['application', 'invitation']).default('application')
})

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
      where: { id: decoded.user_id },
      include: { profile: true }
    })
    
    return user
  } catch (error) {
    return null
  }
}

export async function POST(
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

    // Only talent can apply for jobs
    if (user.role !== 'TALENT') {
      return NextResponse.json(
        {
          code: 403,
          message: 'Only talent can apply for jobs',
          data: null
        },
        { status: 403 }
      )
    }

    // Get job details
    const job = await prisma.job.findUnique({
      where: { id: jobId },
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

    // Check if job is still open
    if (job.status !== 'OPEN') {
      return NextResponse.json(
        {
          code: 400,
          message: 'This job is no longer accepting applications',
          data: null
        },
        { status: 400 }
      )
    }

    // Check if user already applied
    const existingApplication = await prisma.jobApplication.findFirst({
      where: {
        jobId,
        talentId: user.id
      }
    })

    if (existingApplication) {
      return NextResponse.json(
        {
          code: 400,
          message: 'You have already applied for this job',
          data: {
            application_id: existingApplication.id,
            status: existingApplication.status.toLowerCase(),
            applied_at: existingApplication.createdAt.toISOString()
          }
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    // Validate input data
    const validatedData = applicationSchema.parse(body)
    const { message, type } = validatedData

    // Create application
    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        talentId: user.id,
        message: message || `Hi, I'm interested in applying for the position: ${job.title}`,
        type: type.toUpperCase() as 'APPLICATION' | 'INVITATION',
        status: 'PENDING'
      },
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
        },
        job: {
          select: {
            id: true,
            title: true,
            employer: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Track job application event
    try {
      await trackEvent(user.id, EVENTS.JOB_APPLICATION, {
        job_id: jobId,
        job_title: job.title,
        employer_id: job.employerId,
        application_type: type,
        has_message: !!message
      })
    } catch (analyticsError) {
      console.log('Analytics tracking skipped:', analyticsError)
    }

    // TODO: Send notification to employer (Firebase/email)
    console.log(`📧 New job application: ${application.talent.firstName} applied for "${job.title}"`)

    // Return WordPress-compatible response format
    return NextResponse.json(
      {
        code: 200,
        message: 'Application submitted successfully',
        data: {
          application: {
            application_id: application.id,
            job: {
              job_id: application.job.id,
              title: application.job.title,
              employer_name: `${application.job.employer.firstName} ${application.job.employer.lastName}`
            },
            talent: {
              id: application.talent.id,
              name: `${application.talent.firstName} ${application.talent.lastName}`,
              email: application.talent.email,
              profile_image: application.talent.profile?.profileImageUrl || null
            },
            message: application.message,
            status: application.status.toLowerCase(),
            type: application.type.toLowerCase(),
            created_at: application.createdAt.toISOString()
          }
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Job application error:', error)

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
        message: 'Failed to submit application',
        data: null
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check application status
export async function GET(
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

    // Get user's application for this job
    const application = await prisma.jobApplication.findFirst({
      where: {
        jobId,
        talentId: user.id
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json(
      {
        code: 200,
        message: application ? 'Application found' : 'No application found',
        data: {
          has_applied: !!application,
          application: application ? {
            application_id: application.id,
            status: application.status.toLowerCase(),
            message: application.message,
            created_at: application.createdAt.toISOString(),
            job_status: application.job.status.toLowerCase()
          } : null
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Application status check error:', error)

    return NextResponse.json(
      {
        code: 500,
        message: 'Failed to check application status',
        data: null
      },
      { status: 500 }
    )
  }
} 