import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyDualJWT } from '@/lib/jwt-utils'

// Helper function to verify JWT token (supports both WordPress and NextAuth)
async function verifyAuthToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    
    const verificationResult = verifyDualJWT(token)
    if (!verificationResult) {
      return null
    }

    const decoded = verificationResult.decoded
    console.log(`🔑 [invited/jobs] Using ${verificationResult.tokenType} token for user: ${decoded.user_email}`)
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.user_id }
    })
    
    return user
  } catch (error) {
    console.error('❌ [invited/jobs] Token verification error:', error)
    return null
  }
}

// WordPress-compatible invited jobs endpoint
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json([], {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      })
    }

    // Get jobs where user has invitation-type applications
    const invitedJobs = await prisma.job.findMany({
      where: {
        applications: {
          some: {
            talentId: user.id,
            type: 'INVITATION'
          }
        }
      },
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
          where: {
            talentId: user.id,
            type: 'INVITATION'
          },
          select: {
            id: true,
            status: true,
            message: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Format response to match WordPress structure
    const formattedJobs = invitedJobs.map(job => {
      const invitation = job.applications[0] // Should only be one invitation per user per job
      
      return {
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
        invitation: {
          invitation_id: invitation.id,
          status: invitation.status.toLowerCase(),
          message: invitation.message,
          invited_at: invitation.createdAt.toISOString()
        },
        created_at: job.createdAt.toISOString(),
        updated_at: job.updatedAt.toISOString()
      }
    })

    return NextResponse.json(formattedJobs, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })

  } catch (error) {
    console.error('Invited jobs error:', error)
    
    return NextResponse.json([], {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 