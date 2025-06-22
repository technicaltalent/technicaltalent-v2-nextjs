import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { trackEvent, EVENTS } from '@/lib/analytics'

// Validation schema for job creation
const createJobSchema = z.object({
  title: z.string().min(1, 'Job title is required'),
  description: z.string().min(10, 'Job description must be at least 10 characters'),
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    remote: z.boolean().default(false)
  }).optional(),
  required_skills: z.array(z.string()).optional(),
  pay_rate: z.number().positive().optional(),
  pay_type: z.enum(['HOURLY', 'DAILY', 'FIXED']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional()
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
      where: { id: decoded.user_id }
    })
    
    return user
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || 'OPEN'
    const location = searchParams.get('location')
    const skills = searchParams.get('skills')?.split(',')
    
    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = {
      status: status.toUpperCase() as 'OPEN' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED'
    }

    if (location) {
      whereClause.location = {
        contains: location
      }
    }

    if (skills && skills.length > 0) {
      whereClause.requiredSkills = {
        contains: skills.join(',')
      }
    }

    // Get jobs with employer details
    const jobs = await prisma.job.findMany({
      where: whereClause,
      include: {
        employer: {
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
        applications: {
          select: {
            id: true,
            status: true,
            talentId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    // Get total count for pagination
    const totalJobs = await prisma.job.count({ where: whereClause })

    // Format response to match WordPress structure
    const formattedJobs = jobs.map(job => ({
      job_id: job.id,
      title: job.title,
      description: job.description,
      employer: {
        id: job.employer.id,
        name: `${job.employer.firstName || ''} ${job.employer.lastName || ''}`.trim(),
        email: job.employer.email,
        profile_image: job.employer.profile?.profileImageUrl || null
      },
      location: job.location ? JSON.parse(job.location) : null,
      required_skills: job.requiredSkills ? job.requiredSkills.split(',') : [],
      pay_rate: job.payRate,
      pay_type: job.payType?.toLowerCase(),
      status: job.status.toLowerCase(),
      start_date: job.startDate?.toISOString(),
      end_date: job.endDate?.toISOString(),
      applications_count: job.applications.length,
      created_at: job.createdAt.toISOString(),
      updated_at: job.updatedAt.toISOString()
    }))

    // Track jobs view event
    try {
      await trackEvent('anonymous', EVENTS.JOBS_VIEWED, {
        total_jobs: totalJobs,
        page,
        limit,
        filters: {
          status,
          location,
          skills
        }
      })
    } catch (analyticsError) {
      console.log('Analytics tracking skipped:', analyticsError)
    }

    // Return WordPress-compatible response format
    return NextResponse.json(
      {
        code: 200,
        message: 'Jobs retrieved successfully',
        data: {
          jobs: formattedJobs,
          pagination: {
            current_page: page,
            total_pages: Math.ceil(totalJobs / limit),
            total_jobs: totalJobs,
            per_page: limit
          }
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Jobs retrieval error:', error)

    return NextResponse.json(
      {
        code: 500,
        message: 'Failed to retrieve jobs',
        data: null
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Only employers can create jobs
    if (user.role !== 'EMPLOYER') {
      return NextResponse.json(
        {
          code: 403,
          message: 'Only employers can create jobs',
          data: null
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate input data
    const validatedData = createJobSchema.parse(body)
    const { 
      title, 
      description, 
      location, 
      required_skills, 
      pay_rate, 
      pay_type, 
      start_date, 
      end_date 
    } = validatedData

    // Create job
    const job = await prisma.job.create({
      data: {
        title,
        description,
        employerId: user.id,
        location: location ? JSON.stringify(location) : null,
        requiredSkills: required_skills ? required_skills.join(',') : null,
        payRate: pay_rate,
        payType: pay_type,
        startDate: start_date ? new Date(start_date) : null,
        endDate: end_date ? new Date(end_date) : null,
        status: 'OPEN'
      },
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

    // Track job creation event
    try {
      await trackEvent(user.id, EVENTS.JOB_CREATED, {
        job_id: job.id,
        title: job.title,
        pay_rate: job.payRate,
        pay_type: job.payType,
        required_skills_count: required_skills?.length || 0
      })
    } catch (analyticsError) {
      console.log('Analytics tracking skipped:', analyticsError)
    }

    // Return WordPress-compatible response format
    return NextResponse.json(
      {
        code: 200,
        message: 'Job created successfully',
        data: {
          job: {
            job_id: job.id,
            title: job.title,
            description: job.description,
            employer: {
              id: job.employer.id,
              name: `${job.employer.firstName} ${job.employer.lastName}`,
              email: job.employer.email
            },
            location: job.location ? JSON.parse(job.location) : null,
            required_skills: job.requiredSkills ? job.requiredSkills.split(',') : [],
            pay_rate: job.payRate,
            pay_type: job.payType?.toLowerCase(),
            status: job.status.toLowerCase(),
            start_date: job.startDate?.toISOString(),
            end_date: job.endDate?.toISOString(),
            created_at: job.createdAt.toISOString()
          }
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Job creation error:', error)

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
        message: 'Internal server error',
        data: null
      },
      { status: 500 }
    )
  }
} 