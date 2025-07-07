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

// WordPress-compatible GET user role endpoint
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
    console.log(`🔑 [users/role GET] Using ${verificationResult.tokenType} token for user: ${decoded.user_email}`)

    // Find user by ID from token
    const user = await prisma.user.findUnique({
      where: { id: decoded.user_id },
      include: { profile: true }
    })

    if (!user) {
      return NextResponse.json({
        code: 'rest_user_invalid',
        message: 'User not found',
        data: { status: 404 }
      }, { 
        status: 404,
        headers: corsHeaders
      })
    }

    // Return WordPress-compatible response
    const response = {
      code: 200,
      message: 'User role retrieved successfully',
      data: {
        user_id: user.id,
        role: user.role.toLowerCase(),
        roles: [user.role.toLowerCase()], // WordPress format
        status: user.status.toLowerCase()
      }
    }

    return NextResponse.json(response, {
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Get role error:', error)
    return NextResponse.json({
      code: 'rest_internal_error',
      message: 'Internal server error',
      data: { status: 500 }
    }, { 
      status: 500,
      headers: corsHeaders
    })
  }
}

// WordPress-compatible role assignment endpoint
export async function POST(request: NextRequest) {
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
    console.log(`🔑 [users/role POST] Using ${verificationResult.tokenType} token for user: ${decoded.user_email}`)

    // Parse request body
    const body = await request.json()
    const { role } = body

    // Validate role
    if (!role || !['talent', 'employer'].includes(role.toLowerCase())) {
      return NextResponse.json({
        code: 'rest_invalid_param',
        message: 'Invalid role. Must be "talent" or "employer"',
        data: { status: 400 }
      }, { 
        status: 400,
        headers: corsHeaders
      })
    }

    // Find user by ID from token
    const user = await prisma.user.findUnique({
      where: { id: decoded.user_id },
      include: { profile: true }
    })

    if (!user) {
      return NextResponse.json({
        code: 'rest_user_invalid',
        message: 'User not found',
        data: { status: 404 }
      }, { 
        status: 404,
        headers: corsHeaders
      })
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: role.toUpperCase() === 'TALENT' ? 'TALENT' : 'EMPLOYER'
      }
    })

    // Update com_step to profile-type (matching WordPress behavior)
    if (user.profile) {
      const currentSettings = user.profile.notificationSettings ? 
        JSON.parse(String(user.profile.notificationSettings)) : {}
      
      const updatedSettings = {
        ...currentSettings,
        comStep: 'profile-type'
      }

      await prisma.userProfile.update({
        where: { userId: user.id },
        data: {
          notificationSettings: JSON.stringify(updatedSettings)
        }
      })
    }

    // Return WordPress-compatible response
    const response = {
      code: 200,
      message: `User role '${role}' Assigned Successfully`,
      data: {
        user_id: user.id,
        role: role.toLowerCase(),
        step: 'profile-type'
      }
    }

    return NextResponse.json(response, {
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Role assignment error:', error)
    return NextResponse.json({
      code: 'rest_internal_error',
      message: 'Internal server error',
      data: { status: 500 }
    }, { 
      status: 500,
      headers: corsHeaders
    })
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
} 