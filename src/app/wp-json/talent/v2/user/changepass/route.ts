import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
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

// Validation schema for password change
const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(6, 'New password must be at least 6 characters'),
  confirm_password: z.string().min(1, 'Password confirmation is required')
}).refine((data) => data.new_password === data.confirm_password, {
  message: "New password and confirmation password don't match",
  path: ["confirm_password"]
})

// WordPress-compatible change password endpoint
export async function POST(request: NextRequest) {
  try {
    console.log('🔐 [user/changepass] Processing password change...')

    // Get user from JWT token with dual verification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [user/changepass] No auth header')
      return NextResponse.json(
        { code: 401, message: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)
    
    // Use dual JWT verification for WordPress and NextAuth tokens
    const verificationResult = verifyDualJWT(token)
    if (!verificationResult) {
      console.log('❌ [user/changepass] Invalid token')
      return NextResponse.json(
        { code: 401, message: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    const decoded = verificationResult.decoded
    const userId = decoded.user_id
    console.log(`🔑 [user/changepass] Using ${verificationResult.tokenType} token for user: ${decoded.user_email}`)

    // Parse request body
    const body = await request.json()
    console.log('📝 [user/changepass] Password change request received')

    // Validate input data
    const validatedData = changePasswordSchema.parse(body)
    const { current_password, new_password } = validatedData

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true
      }
    })

    if (!user) {
      console.log('❌ [user/changepass] User not found')
      return NextResponse.json(
        { code: 404, message: 'User not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Verify current password
    if (!user.passwordHash) {
      console.log('❌ [user/changepass] User has no password set')
      return NextResponse.json(
        { code: 400, message: 'No password is currently set for this account' },
        { status: 400, headers: corsHeaders }
      )
    }

    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.passwordHash)
    if (!isCurrentPasswordValid) {
      console.log('❌ [user/changepass] Current password incorrect')
      return NextResponse.json(
        { code: 400, message: 'Current password is incorrect' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Hash the new password
    const saltRounds = 12
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds)

    // Update the user's password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      }
    })

    console.log(`✅ [user/changepass] Password changed successfully for user: ${user.email}`)

    // Return WordPress-compatible response
    return NextResponse.json(
      {
        code: 200,
        message: 'Password changed successfully',
        data: {
          user_id: userId,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          changed_at: new Date().toISOString(),
          // Security note: Don't include password-related data in response
          security_note: 'Password updated securely'
        }
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('❌ [user/changepass] Error changing password:', error)
    
    if (error instanceof z.ZodError) {
      console.error('❌ [user/changepass] Validation errors:', error.errors)
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
        message: 'Internal server error while changing password'
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 