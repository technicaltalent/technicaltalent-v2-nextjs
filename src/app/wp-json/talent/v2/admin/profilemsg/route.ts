import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

// CORS headers for legacy app compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle preflight requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// Get admin profile message
export async function GET(req: NextRequest) {
  try {
    // Extract JWT token from Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          code: 401,
          message: 'Authorization header required',
          data: null 
        },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any
      
      // For now, return an empty array of messages
      // This can be enhanced later to pull from admin settings
      // Legacy frontend expects an array with objects containing 'msg' and 'type' properties
      const profileMessages: Array<{msg: string, type: string}> = []

      return NextResponse.json(
        {
          code: 200,
          message: 'Profile messages retrieved successfully',
          data: { profilemsg: profileMessages },
          profilemsg: profileMessages // Legacy format compatibility - array for .map()
        },
        { status: 200, headers: corsHeaders }
      )

    } catch (jwtError) {
      return NextResponse.json(
        {
          code: 401,
          message: 'Invalid or expired token',
          data: null
        },
        { status: 401, headers: corsHeaders }
      )
    }

  } catch (error) {
    console.error('❌ [admin/profilemsg] Error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: 'Internal server error',
        data: null
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 