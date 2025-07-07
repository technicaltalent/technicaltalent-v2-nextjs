import { NextRequest, NextResponse } from 'next/server'
import { verifyDualJWT } from '@/lib/jwt-utils'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// WordPress-compatible CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders })
}

// WordPress-compatible employer roles list endpoint
export async function GET(request: NextRequest) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        code: 'rest_forbidden',
        message: 'Authorization header missing or invalid',
        data: { status: 401 }
      }, { 
        status: 401,
        headers: corsHeaders
      })
    }

    // Extract and verify JWT token with dual verification
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    const verificationResult = verifyDualJWT(token)
    if (!verificationResult) {
      return NextResponse.json({
        code: 'rest_forbidden',
        message: 'Invalid or expired token',
        data: { status: 401 }
      }, { 
        status: 401,
        headers: corsHeaders
      })
    }

    const decoded = verificationResult.decoded
    console.log(`🔑 [employer/roleslist] Using ${verificationResult.tokenType} token for user: ${decoded.user_email}`)

    // Only employers can access this endpoint
    const user = await prisma.user.findUnique({
      where: { email: decoded.user_email }
    })

    if (!user) {
      console.log('❌ [employer/roleslist] User not found in database')
      return NextResponse.json({
        code: 'rest_forbidden',
        message: 'User not found',
        data: { status: 401 }
      }, { 
        status: 401,
        headers: corsHeaders
      })
    }

    if (user.role !== 'EMPLOYER') {
      console.log('❌ [employer/roleslist] User is not an employer')
      return NextResponse.json(
        { code: 403, message: 'Only employers can access this endpoint' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Get all jobs posted by this employer
    const jobs = await prisma.job.findMany({
      where: {
        employerId: user.id
      },
      include: {
        applications: {
          select: {
            id: true,
            status: true,
            type: true,
            talent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('📊 [employer/roleslist] Found jobs:', jobs.length)

    // Format response to match WordPress structure expected by legacy app
    const formattedResponse = {
      code: 200,
      message: 'Employer jobs retrieved successfully',
      roles: jobs.map(job => {
        // Parse location if it exists
        let location = null
        let formattedAddress = 'Location TBD'
        
        try {
          if (job.location) {
            location = JSON.parse(job.location)
            formattedAddress = location.formatted_address || location.address || 'Location TBD'
          }
        } catch (e) {
          formattedAddress = job.location || 'Location TBD'
        }

        // Count applications by status
        const pendingApplications = job.applications.filter(app => app.status === 'PENDING').length
        const acceptedApplications = job.applications.filter(app => app.status === 'ACCEPTED').length
        const totalApplications = job.applications.length

        // Determine status message and current status for legacy compatibility
        let status_msg = 'open'
        let cur_status = 'Open'
        
        if (job.status === 'OPEN') {
          status_msg = 'inprogress'
          cur_status = 'In Progress'
        } else if (job.status === 'ASSIGNED') {
          status_msg = 'Confirmed'
          cur_status = 'Confirmed'
        } else if (job.status === 'COMPLETED') {
          status_msg = 'complete'
          cur_status = 'Complete'
        } else if (job.status === 'CANCELLED') {
          status_msg = 'cancelled'
          cur_status = 'Cancelled'
        }

        return {
          ID: job.id, // Legacy field
          jobs: {
            ID: job.id,
            post_title: job.title,
            post_content: job.description,
            post_status: job.status.toLowerCase(),
            post_date: job.createdAt.toISOString().split('T')[0], // YYYY-MM-DD format
            post_modified: job.updatedAt.toISOString().split('T')[0]
          },
          title: job.title,
          description: job.description,
          location: formattedAddress,
          pay_rate: job.payRate,
          pay_type: job.payType?.toLowerCase(),
          status: job.status.toLowerCase(),
          payment_status: job.paymentStatus.toLowerCase(),
          start_date: job.startDate?.toISOString().split('T')[0] || null, // YYYY-MM-DD format for legacy compatibility
          end_date: job.endDate?.toISOString().split('T')[0] || null,
          applications_count: totalApplications,
          pending_applications: pendingApplications,
          accepted_applications: acceptedApplications,
          job_status: job.status !== 'CANCELLED' && job.status !== 'COMPLETED', // Legacy boolean field
          created_at: job.createdAt.toISOString(),
          updated_at: job.updatedAt.toISOString(),
          // Legacy compatibility fields that frontend expects
          talents: totalApplications, // Legacy field name for applications count
          space: formattedAddress, // Legacy field name for location/space
          payment: job.paymentStatus?.toLowerCase(), // Legacy payment field - should show payment status, not pay type
          status_msg: status_msg, // Legacy status message field
          cur_status: cur_status, // Legacy current status display field
          rate: job.payRate,
          awarded: acceptedApplications > 0 ? 1 : 0, // Legacy field for awarded status
          email: job.id // Legacy field used for action selector
        }
      }),
      total_jobs: jobs.length,
      employer: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email
      }
    }

    return NextResponse.json(formattedResponse, { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('❌ [employer/roleslist] Error:', error)
    
    return NextResponse.json(
      {
        code: 500,
        message: 'Failed to retrieve employer jobs',
        roles: []
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 