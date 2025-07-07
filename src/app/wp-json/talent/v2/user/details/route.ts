import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyDualJWT } from '@/lib/jwt-utils'

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

    // Extract and verify JWT token (supports both WordPress and NextAuth)
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    const verificationResult = verifyDualJWT(token)
    if (!verificationResult) {
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

    const decoded = verificationResult.decoded
    console.log(`🔑 [user/details] Using ${verificationResult.tokenType} token for user: ${decoded.user_email}`)

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
    let comStep = 'sign-in' // Default to sign-in for new users
    let notificationSettings: any = {}
    if (user.profile?.notificationSettings) {
      try {
        notificationSettings = JSON.parse(user.profile.notificationSettings)
        if (notificationSettings.comStep) {
          comStep = notificationSettings.comStep
        }
      } catch (error) {
        console.error('Error parsing notification settings:', error)
      }
    }

    // NEW LOGIC: Determine step based on profile completion, not just role existence
    const hasSkills = user.skills && user.skills.length > 0
    const hasLocation = user.profile?.location && user.profile.location !== null
    const hasCompleteProfile = user.firstName && user.lastName && hasSkills && hasLocation
    
    // Only set to 'final' if user has completed all setup steps
    if (hasCompleteProfile && notificationSettings.comStep === 'final') {
      comStep = 'final'
    } else if (hasSkills && hasLocation) {
      comStep = 'final' // User has basic required info
    } else if (hasSkills) {
      comStep = 'skills' // User has skills but needs location
    } else if (user.role && (user.role === 'TALENT' || user.role === 'EMPLOYER')) {
      comStep = 'profile-type' // User has role but needs skills/profile setup
    } else {
      comStep = 'sign-in' // New user needs to select role
    }

    console.log(`🔍 [user/details] Step determination for user ${user.id}:`, {
      hasSkills,
      hasLocation,
      hasCompleteProfile,
      notificationStepSetting: notificationSettings.comStep,
      finalStep: comStep
    })

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
      },
      // ✅ Add user_token object for iOS app compatibility
      user_token: {
        token: token,
        user_id: user.id,
        user_email: user.email,
        user_role: user.role.toLowerCase()
      }
    }

    // Debug logging - show exact response for iOS app troubleshooting
    console.log('📱 [user/details] iOS app response debug:', {
      step: String(response.step),
      userRoles: response.userinfo.roles,
      userRole: String(user.role),
      hasUserToken: !!response.user_token,
      responseKeys: Object.keys(response)
    })

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