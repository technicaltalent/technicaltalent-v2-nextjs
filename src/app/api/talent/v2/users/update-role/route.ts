import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

// Validation schema for role update
const updateRoleSchema = z.object({
  role: z.enum(['talent', 'employer'], {
    errorMap: () => ({ message: 'Role must be either talent or employer' })
  })
})

// Helper function to verify JWT token
async function verifyAuthToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No valid authorization token provided')
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  const jwtSecret = process.env.NEXTAUTH_SECRET || 'development-secret-key'
  
  try {
    const decoded = jwt.verify(token, jwtSecret) as any
    return decoded
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const tokenData = await verifyAuthToken(request)
    const userId = tokenData.user_id

    const body = await request.json()
    
    // Validate input data
    const validatedData = updateRoleSchema.parse(body)
    const { role } = validatedData

    // Update user role
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role.toUpperCase() as 'TALENT' | 'EMPLOYER'
      },
      include: {
        profile: true
      }
    })

    // Generate new JWT token with updated role
    const jwtSecret = process.env.NEXTAUTH_SECRET || 'development-secret-key'
    const userToken = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      jwtSecret
    )

    // Return WordPress-compatible response format
    return NextResponse.json(
      {
        code: 200,
        message: 'User role updated successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            role: user.role.toLowerCase(),
            status: user.status.toLowerCase(),
            updated_at: user.updatedAt.toISOString()
          }
        },
        // Updated token with new role
        user_token: {
          token: userToken,
          user_id: user.id,
          user_email: user.email,
          user_role: user.role.toLowerCase()
        }
      },
      { status: 200 }
    )

  } catch (error: any) {
    console.error('Role update error:', error)

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

    if (error.message && (error.message.includes('token') || error.message.includes('authorization'))) {
      return NextResponse.json(
        {
          code: 401,
          message: 'Unauthorized: ' + error.message,
          data: null
        },
        { status: 401 }
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