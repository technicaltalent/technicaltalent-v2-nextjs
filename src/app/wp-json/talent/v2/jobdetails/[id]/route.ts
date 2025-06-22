import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

// CORS headers for legacy app compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle preflight requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    console.log('🔍 [jobdetails] Getting job details for ID:', jobId)

    // Get user from JWT token for auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [jobdetails] No auth header')
      return NextResponse.json(
        { code: 401, message: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)
    const jwtSecret = process.env.NEXTAUTH_SECRET || 'development-secret-key'
    
    let userId: string
    try {
      const decoded = jwt.verify(token, jwtSecret) as any
      userId = decoded.user_id
    } catch (error) {
      console.log('❌ [jobdetails] Invalid token')
      return NextResponse.json(
        { code: 401, message: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get job details with employer information
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          include: {
            profile: true
          }
        },
        applications: {
          include: {
            talent: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    })

    if (!job) {
      return NextResponse.json(
        { code: 404, message: 'Job not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Parse location if it exists
    let location = null
    if (job.location) {
      try {
        location = JSON.parse(job.location)
      } catch (e) {
        location = job.location // Fallback to string format
      }
    }

    // Find awarded talent if any
    const awardedApplication = job.applications.find(app => app.status === 'ACCEPTED')
    const awardedTalent = awardedApplication ? {
      talent_id: awardedApplication.talent.id,
      first_name: awardedApplication.talent.firstName,
      last_name: awardedApplication.talent.lastName,
      email: awardedApplication.talent.email
    } : null

    // Parse location address for legacy compatibility
    let address = null
    if (location) {
      if (typeof location === 'object') {
        address = {
          formatted_address: location.formatted_address || 
                           location.address || 
                           `${location.city || ''}, ${location.state || ''} ${location.country || ''}`.trim()
        }
      } else {
        address = {
          formatted_address: location
        }
      }
    }

    // Mock equipment and venue data (these would come from job requirements in a full implementation)
    const equipment_cat = job.requiredSkills ? [{
      term_id: "1",
      name: job.requiredSkills.split(',')[0] || "Audio",
      slug: "audio"
    }] : []

    const venue = [{
      term_id: "1", 
      name: "Standard Venue",
      slug: "standard-venue"
    }]

    // Parse skills from requiredSkills field (simplified for now)
    const skills = job.requiredSkills ? [{
      parent: {
        name: "Audio",
        term_id: "15"
      },
      child: job.requiredSkills.split(',').map((skill, index) => ({
        term_id: `${100 + index}`,
        name: skill.trim(),
        slug: skill.trim().toLowerCase().replace(/\s+/g, '-')
      })),
      brand: [], // Equipment brands would be linked here
      cat_image: "/images/audio.png"
    }] : []

    // Create schedule from start/end dates
    const schedule = []
    if (job.startDate && job.endDate) {
      schedule.push({
        date: job.startDate.toISOString().split('T')[0],
        startTime: "09:00",
        endTime: "17:00"
      })
    }

    // Return WordPress-compatible response format
    const response = {
      code: 200,
      message: 'Job details retrieved successfully',
      job_detail: {
        id: job.id,
        title: job.title,
        description: job.description,
        location: location,
        address: address,
        equipment_cat: equipment_cat,
        venue: venue,
        skills: skills,
        schedule: schedule,
        pay_rate: job.payRate,
        pay_type: job.payType?.toLowerCase(),
        rate: job.payRate, // Legacy field
        payment: job.payType?.toLowerCase(), // Legacy field
        pay_amount: job.payRate, // Legacy field for Stripe
        add_amount: 0, // Additional amount (service fee, etc.)
        status: job.status.toLowerCase(),
        start_date: job.startDate,
        end_date: job.endDate,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
        employer: {
          id: job.employer.id,
          first_name: job.employer.firstName,
          last_name: job.employer.lastName,
          email: job.employer.email
        },
        awarded_talent: awardedTalent,
        applications_count: job.applications.length,
        spoken_lang: [] // Would contain required languages
      },
      payment: job.paymentStatus === 'PAID' ? 'paid' : 'unpaid', // Legacy field
      data: {
        job_id: job.id,
        job_title: job.title,
        employer_id: job.employerId
      }
    }

    console.log('✅ [jobdetails] Job details retrieved:', {
      jobId: job.id,
      title: job.title,
      status: job.status,
      applicationsCount: job.applications.length
    })

    return NextResponse.json(response, { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error: any) {
    console.error('❌ [jobdetails] Error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: 'Internal server error while retrieving job details'
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 