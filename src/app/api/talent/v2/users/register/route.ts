import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { trackEvent, EVENTS } from '@/lib/analytics'

// Validation schema matching WordPress expectations
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.enum(['talent', 'employer'], {
    errorMap: () => ({ message: 'Role must be either talent or employer' })
  }).optional(),
  phone: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input data
    const validatedData = registerSchema.parse(body)
    const { email, password, first_name, last_name, role, phone } = validatedData

    // Default role to 'talent' if not provided (role selection comes in next step)
    const userRole = role || 'talent'

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { 
          code: 400, 
          message: 'User with this email already exists',
          data: null
        },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hash(password, 12)

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: first_name,
        lastName: last_name,
        phone,
        role: userRole.toUpperCase() as 'TALENT' | 'EMPLOYER',
        profile: {
          create: {
            // Store notification settings as JSON string for SQLite
            notificationSettings: JSON.stringify({
              email: true,
              sms: true,
              push: true
            })
          }
        }
      },
      include: {
        profile: true
      }
    })

    // Generate JWT token for mobile app compatibility
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

    // Track registration event (safe with test API key)
    try {
      await trackEvent(user.id, EVENTS.USER_REGISTERED, {
        email: user.email,
        role: user.role,
        registration_source: 'api'
      })
    } catch (analyticsError) {
      console.log('Analytics tracking skipped in development:', analyticsError)
    }

    // Return WordPress-compatible response format with user_token
    return NextResponse.json(
      {
        code: 200,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            role: user.role.toLowerCase(),
            status: user.status.toLowerCase(),
            created_at: user.createdAt.toISOString()
          }
        },
        // Mobile app compatibility: Include user_token matching WordPress format
        user_token: {
          token: userToken,
          user_id: user.id,
          user_email: user.email,
          user_role: user.role.toLowerCase()
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Registration error:', error)

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