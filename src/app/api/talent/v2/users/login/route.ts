import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

// Input validation schema
const loginSchema = z.object({
  username: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

// Standard WordPress-compatible response format
const createResponse = (code: number, message: string, data: any = null, errors: any = null) => {
  const response: any = { code, message }
  if (data) response.data = data
  if (errors) response.errors = errors
  return response
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate input
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
      
      return NextResponse.json(
        createResponse(400, 'Validation error', null, errors),
        { status: 400 }
      )
    }

    const { username, password } = validation.data

    // Find user by email (username field contains email)
    const user = await prisma.user.findUnique({
      where: { email: username }
    })

    if (!user) {
      return NextResponse.json(
        createResponse(403, 'Invalid credentials'),
        { status: 403 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash || '')
    if (!isValidPassword) {
      return NextResponse.json(
        createResponse(403, 'Invalid credentials'),
        { status: 403 }
      )
    }

    // Generate JWT token (WordPress compatible format)
    const token = jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        role: user.role.toUpperCase(),
      },
      process.env.NEXTAUTH_SECRET || 'development-secret-key',
      { expiresIn: '24h' }
    )

    // WordPress-compatible response format
    const responseData = {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.role,
        status: user.status,
        created_at: user.createdAt,
      }
    }

    // Add user_token for mobile app compatibility
    const userToken = {
      token,
      user_id: user.id,
      user_email: user.email,
      user_role: user.role
    }

    return NextResponse.json(
      {
        ...createResponse(200, 'Login successful', responseData),
        user_token: userToken,
        // Also add legacy JWT token format for WordPress compatibility
        token,
        user_display_name: `${user.firstName} ${user.lastName}`,
        user_email: user.email,
        user_nicename: user.email.split('@')[0]
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      createResponse(500, 'Internal server error'),
      { status: 500 }
    )
  }
} 