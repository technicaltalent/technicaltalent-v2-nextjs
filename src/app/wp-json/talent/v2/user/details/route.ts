import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// WordPress-compatible user details endpoint
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
         headers: {
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type, Authorization',
         }
       })
     }

    // Extract and verify JWT token
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const jwtSecret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
    
    let decoded: any
    try {
      decoded = jwt.verify(token, jwtSecret)
         } catch (error) {
       return NextResponse.json({
         code: 'rest_forbidden',
         message: 'Invalid or expired token',
         data: { status: 401 }
       }, { 
         status: 401,
         headers: {
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type, Authorization',
         }
       })
     }

    // Find user by ID from token
    const user = await prisma.user.findUnique({
      where: { id: decoded.user_id },
      include: {
        profile: true,
        skills: {
          include: {
            skill: true
          }
        }
      }
    })

         if (!user) {
       return NextResponse.json({
         code: 'rest_user_invalid',
         message: 'User not found',
         data: { status: 404 }
       }, { 
         status: 404,
         headers: {
           'Access-Control-Allow-Origin': '*',
           'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type, Authorization',
         }
       })
     }

    // Get profile data from notification settings
    let comStep = 'final' // Default to final
    let notificationSettings: any = {}
    if (user.profile?.notificationSettings) {
      try {
        notificationSettings = JSON.parse(user.profile.notificationSettings)
        comStep = notificationSettings.comStep
      } catch (error) {
        console.error('Error parsing notification settings:', error)
      }
    }

    // If user has no com_step, they need to select talent/employer (WordPress: "sign-in" step)
    if (comStep === undefined || comStep === null) {
      comStep = 'sign-in'
    }

    // Parse location data
    let address = null
    if (user.profile?.location) {
      try {
        address = JSON.parse(user.profile.location)
      } catch (error) {
        console.error('Error parsing location:', error)
      }
    }

    // Debug logging for phone number issue
    console.log('📞 [user/details] Phone number debug:', {
      userPhone: user.phone,
      phoneArray: user.phone ? [user.phone] : [],
      payRate: notificationSettings.payRate,
      payModel: notificationSettings.payModel,
      bio: user.profile?.bio
    })

    // Return WordPress-compatible response format with full profile data
    const response = {
      step: comStep,
      userinfo: {
        ID: user.id,
        user_login: user.email,
        user_email: user.email,
        user_nicename: user.email.split('@')[0],
        user_display_name: user.email,
        roles: comStep === 'sign-in' ? [] : [user.role.toLowerCase()],
        data: {
          user_email: user.email,
          user_login: user.email,
          display_name: user.email
        }
      },
      // Legacy ProfileDetail component expects these fields at root level
      spoken_lang: notificationSettings.spokenLanguages || [],
      address: address,
      usermeta: {
        first_name: [user.firstName || ''],
        last_name: [user.lastName || ''],
        phone_number: user.phone ? [user.phone] : []
      },
      profile_meta: {
        tal_rate: notificationSettings.payRate ? [notificationSettings.payRate] : [],
        payment_model: notificationSettings.payModel ? [notificationSettings.payModel] : [],
        short_bio: user.profile?.bio ? [user.profile.bio] : []
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })

     } catch (error) {
     console.error('User details error:', error)
     return NextResponse.json({
       code: 'rest_internal_error',
       message: 'Internal server error',
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