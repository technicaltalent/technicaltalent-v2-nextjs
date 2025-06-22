import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

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

// WordPress-compatible assigned jobs endpoint
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [assigned/jobs] Getting assigned jobs...')

    // Verify authentication
    const user = await verifyAuthToken(request)
    if (!user) {
      console.log('❌ [assigned/jobs] No auth token')
      return NextResponse.json({
        code: 200,
        message: 'No jobs found',
        job_detail: []
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      })
    }

    let jobs
    
    if (user.role === 'EMPLOYER') {
      console.log('👔 [assigned/jobs] Getting employer jobs')
      // For employers: return their posted jobs (all statuses)
      jobs = await prisma.job.findMany({
        where: {
          employerId: user.id
        },
        include: {
          applications: {
            select: {
              id: true,
              status: true,
              type: true,
              message: true,
              createdAt: true,
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
          updatedAt: 'desc'
        }
      })
    } else {
      console.log('🎭 [assigned/jobs] Getting talent assigned jobs')
      // For talent: get jobs where they are selected or assigned
      jobs = await prisma.job.findMany({
        where: {
          OR: [
            // User is selected talent
            {
              selectedTalent: user.id
            },
            // Job status is ASSIGNED and user has applied
            {
              AND: [
                { status: 'ASSIGNED' },
                {
                  applications: {
                    some: {
                      talentId: user.id
                    }
                  }
                }
              ]
            }
          ]
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
              talentId: user.id
            },
            select: {
              id: true,
              status: true,
              message: true,
              type: true,
              createdAt: true
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
          updatedAt: 'desc'
        }
      })
    }

    console.log(`📊 [assigned/jobs] Found ${jobs.length} jobs for ${user.role}`)

    // Format response to match WordPress structure (with job_detail array)
    const formattedJobs = jobs.map(job => {
      // Parse location
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

      if (user.role === 'EMPLOYER') {
        // Employer view: show job management info
        const pendingApplications = job.applications.filter(app => app.status === 'PENDING').length
        const acceptedApplications = job.applications.filter(app => app.status === 'ACCEPTED').length
        
        return {
          id: job.id,
          title: job.title,
          description: job.description,
          address: {
            formatted_address: formattedAddress
          },
          rate: job.payRate,
          payment: job.payType?.toLowerCase(),
          status: job.status.toLowerCase(),
          start_date: job.startDate?.toISOString(),
          end_date: job.endDate?.toISOString(),
          applications_count: job.applications.length,
          pending_applications: pendingApplications,
          accepted_applications: acceptedApplications,
          awarded: acceptedApplications > 0,
          job_start_date: job.startDate ? [{ date: job.startDate.toISOString().split('T')[0] }] : [],
          created_at: job.createdAt.toISOString(),
          updated_at: job.updatedAt.toISOString()
        }
             } else {
         // Talent view: show assignment details (this branch only runs for talent users)
         const userApplication = job.applications[0] // Should only be one application per user per job
         const jobEmployer = (job as any).employer // Safe to cast since we know this is talent path
         
         return {
           id: job.id,
           title: job.title,
           description: job.description,
           employer: {
             id: jobEmployer.id,
             name: `${jobEmployer.firstName || ''} ${jobEmployer.lastName || ''}`.trim(),
             email: jobEmployer.email,
             profile_image: jobEmployer.profile?.profileImageUrl || null
           },
          address: {
            formatted_address: formattedAddress
          },
          location: location,
          required_skills: job.requiredSkills ? job.requiredSkills.split(',') : [],
          rate: job.payRate,
          payment: job.payType?.toLowerCase(),
          pay_rate: job.payRate,
          pay_type: job.payType?.toLowerCase(),
          status: job.status.toLowerCase(),
          start_date: job.startDate?.toISOString(),
          end_date: job.endDate?.toISOString(),
          payment_status: job.paymentStatus.toLowerCase(),
          is_selected_talent: job.selectedTalent === user.id,
          job_start_date: job.startDate ? [{ date: job.startDate.toISOString().split('T')[0] }] : [],
          invite: userApplication?.status === 'ACCEPTED' ? 'accept' : userApplication?.status === 'REJECTED' ? 'deny' : 'pending',
          awarded: job.selectedTalent === user.id,
          talent_id: user.id, // For chat functionality
          assignment: userApplication ? {
            application_id: userApplication.id,
            application_status: userApplication.status.toLowerCase(),
            application_type: userApplication.type.toLowerCase(),
            message: userApplication.message,
            applied_at: userApplication.createdAt.toISOString()
          } : null,
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
    })

    // Return in WordPress-compatible format
    const response = {
      code: 200,
      message: `Jobs retrieved successfully for ${user.role.toLowerCase()}`,
      job_detail: formattedJobs,
      total_jobs: formattedJobs.length,
      user_role: user.role.toLowerCase()
    }

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })

  } catch (error) {
    console.error('❌ [assigned/jobs] Error:', error)
    
    return NextResponse.json({
      code: 500,
      message: 'Failed to retrieve jobs',
      job_detail: []
    }, {
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