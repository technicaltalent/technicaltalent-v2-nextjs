import { NextRequest, NextResponse } from 'next/server'
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

// WordPress-compatible notification status endpoint
export async function GET(request: NextRequest) {
  try {
    console.log('🔔 [notify/status] Getting notification settings...')

    // Get user from JWT token with dual verification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [notify/status] No auth header')
      return NextResponse.json(
        { code: 401, message: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)
    
    // Use dual JWT verification for WordPress and NextAuth tokens
    const verificationResult = verifyDualJWT(token)
    if (!verificationResult) {
      console.log('❌ [notify/status] Invalid token')
      return NextResponse.json(
        { code: 401, message: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    const decoded = verificationResult.decoded
    const userId = decoded.user_id
    console.log(`🔑 [notify/status] Using ${verificationResult.tokenType} token for user: ${decoded.user_email}`)

    // Find the user and their notification settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    })

    if (!user) {
      console.log('❌ [notify/status] User not found')
      return NextResponse.json(
        { code: 404, message: 'User not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Parse notification settings from user profile
    let notificationSettings: any = {}
    if (user.profile?.notificationSettings) {
      try {
        notificationSettings = JSON.parse(user.profile.notificationSettings)
      } catch (e) {
        console.error('Error parsing notification settings:', e)
      }
    }

    // Default notification settings
    const phoneNotifications = notificationSettings.phoneNotifications || "1" // Default enabled
    const emailNotifications = notificationSettings.emailNotifications || "1" // Default enabled
    const awayDates = notificationSettings.awayDates || []

    // WordPress-compatible response format
    const response = {
      code: 200,
      message: 'Notification settings retrieved successfully',
      phone: phoneNotifications,
      email: emailNotifications,
      away_date: awayDates
    }

    console.log('✅ [notify/status] Notification settings retrieved:', {
      userId: userId,
      phone: phoneNotifications,
      email: emailNotifications,
      awayDatesCount: awayDates.length
    })

    return NextResponse.json(response, { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('❌ [notify/status] Error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: 'Internal server error'
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 