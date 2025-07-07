import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// WordPress-compatible JWT auth endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

         // Validate required fields
     if (!username || !password) {
       return NextResponse.json({
         code: '[jwt_auth] empty_username_password',
         message: 'The username and password can not be empty.',
         data: { status: 403 }
       }, { 
         status: 403,
         headers: {
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type, Authorization',
         }
       })
     }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: username }
    })

         if (!user) {
       return NextResponse.json({
         code: '[jwt_auth] invalid_username',
         message: 'The username is not valid.',
         data: { status: 403 }
       }, { 
         status: 403,
         headers: {
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type, Authorization',
         }
       })
     }

    // Verify password
         if (!user.passwordHash) {
       return NextResponse.json({
         code: '[jwt_auth] invalid_password',
         message: 'The password is not valid.',
         data: { status: 403 }
       }, { 
         status: 403,
         headers: {
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type, Authorization',
         }
       })
     }
    
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
         if (!isValidPassword) {
       return NextResponse.json({
         code: '[jwt_auth] invalid_password',
         message: 'The password is not valid.',
         data: { status: 403 }
       }, { 
         status: 403,
         headers: {
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type, Authorization',
         }
       })
     }

    // Generate JWT token using WordPress secret for compatibility
    const jwtSecret = process.env.WORDPRESS_JWT_SECRET || 'fallback-secret'
    const token = jwt.sign(
      {
        user_id: user.id,
        user_email: user.email,
        user_role: user.role.toLowerCase()
      },
      jwtSecret,
      { expiresIn: '7d' }
    )

    // Return WordPress-compatible response format
    return NextResponse.json({
      token,
      user_email: user.email,
      user_nicename: user.email.split('@')[0],
      user_display_name: user.email,
      user_id: user.id
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })

     } catch (error) {
     console.error('JWT Auth Error:', error)
     return NextResponse.json({
       code: '[jwt_auth] internal_error',
       message: 'Internal server error.',
       data: { status: 500 }
     }, { 
       status: 500,
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