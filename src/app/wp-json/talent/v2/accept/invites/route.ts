import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyDualJWT } from '@/lib/jwt-utils'

// WordPress-compatible CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle preflight requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// Validation schema for accepting invitations
const acceptInviteSchema = z.object({
  invitation_id: z.string().min(1, 'Invitation ID is required'),
  action: z.enum(['accept', 'decline']).default('accept'),
  message: z.string().optional() // Optional response message
})

// WordPress-compatible accept invitation endpoint
export async function POST(request: NextRequest) {
  try {
    console.log('✉️ [accept/invites] Processing invitation response...')

    // Get user from JWT token with dual verification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [accept/invites] No auth header')
      return NextResponse.json(
        { code: 401, message: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)
    
    // Use dual JWT verification for WordPress and NextAuth tokens
    const verificationResult = verifyDualJWT(token)
    if (!verificationResult) {
      console.log('❌ [accept/invites] Invalid token')
      return NextResponse.json(
        { code: 401, message: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    const decoded = verificationResult.decoded
    const userId = decoded.user_id
    console.log(`🔑 [accept/invites] Using ${verificationResult.tokenType} token for user: ${decoded.user_email}`)

    // Parse request body
    const body = await request.json()
    console.log('📝 [accept/invites] Request payload:', body)

    // Validate input data
    const validatedData = acceptInviteSchema.parse(body)
    const { invitation_id, action, message } = validatedData

    // Find the invitation
    const invitation = await prisma.jobApplication.findFirst({
      where: {
        id: invitation_id,
        talentId: userId,
        type: 'INVITATION'
      },
      include: {
        job: {
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
        },
        talent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!invitation) {
      console.log('❌ [accept/invites] Invitation not found')
      return NextResponse.json(
        { code: 404, message: 'Invitation not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if invitation is still pending
    if (invitation.status !== 'PENDING') {
      console.log('❌ [accept/invites] Invitation already processed')
      return NextResponse.json(
        { 
          code: 400, 
          message: `Invitation already ${invitation.status.toLowerCase()}`,
          data: {
            current_status: invitation.status.toLowerCase(),
            processed_at: invitation.createdAt.toISOString()
          }
        },
        { status: 400, headers: corsHeaders }
      )
    }

    // Update invitation status
    const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED'
    const updatedInvitation = await prisma.jobApplication.update({
      where: { id: invitation_id },
      data: { 
        status: newStatus,
        message: message || invitation.message // Keep original message if no new one provided
      }
    })

    // If accepted, potentially update job status to ASSIGNED
    if (action === 'accept') {
      await prisma.job.update({
        where: { id: invitation.job.id },
        data: {
          status: 'ASSIGNED',
          selectedTalent: userId
        }
      })
      console.log(`✅ [accept/invites] Job ${invitation.job.id} assigned to ${userId}`)
    }

    console.log(`✅ [accept/invites] Invitation ${action}ed successfully:`, {
      invitationId: invitation_id,
      jobTitle: invitation.job.title,
      talentName: `${invitation.talent.firstName} ${invitation.talent.lastName}`,
      employerName: `${invitation.job.employer.firstName} ${invitation.job.employer.lastName}`,
      action: action,
      newStatus: newStatus
    })

    // Return WordPress-compatible response
    return NextResponse.json(
      {
        code: 200,
        message: `Invitation ${action}ed successfully`,
        data: {
          invitation_id: invitation_id,
          job_id: invitation.job.id,
          job_title: invitation.job.title,
          employer: {
            name: `${invitation.job.employer.firstName} ${invitation.job.employer.lastName}`,
            email: invitation.job.employer.email
          },
          action: action,
          status: newStatus.toLowerCase(),
          message: message || null,
          processed_at: new Date().toISOString(),
          job_status: action === 'accept' ? 'assigned' : invitation.job.status.toLowerCase()
        }
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('❌ [accept/invites] Error processing invitation:', error)
    
    if (error instanceof z.ZodError) {
      console.error('❌ [accept/invites] Validation errors:', error.errors)
      return NextResponse.json(
        {
          code: 400,
          message: 'Validation error: ' + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
          errors: error.errors
        },
        { status: 400, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        code: 500,
        message: 'Internal server error while processing invitation'
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 