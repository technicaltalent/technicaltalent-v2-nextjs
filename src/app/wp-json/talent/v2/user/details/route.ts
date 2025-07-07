import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyDualJWT } from '@/lib/jwt-utils'

const prisma = new PrismaClient()

// WordPress-compatible user details endpoint
export async function GET(request: NextRequest) {
  try {
    // Track API call sequence for login flow debugging
    const callTimestamp = Date.now()
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const referer = request.headers.get('referer') || 'direct'
    console.log(`🔢 [user/details] Call at ${new Date().toISOString()}`)
    console.log(`📱 [user/details] User-Agent: ${userAgent}`)
    console.log(`🔗 [user/details] Referer: ${referer}`)
    
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
        notificationSettings = JSON.parse(String(user.profile.notificationSettings))
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

    // Parse location data for iOS ProfileModel compatibility
    let address = {}
    if (user.profile?.location) {
      try {
        const locationData = JSON.parse(String(user.profile.location))
        address = {
          formatted_address: locationData.formatted_address || '',
          place_id: locationData.place_id || ''
        }
      } catch (error) {
        console.error('Error parsing location:', error)
        // iOS ProfileModel expects an empty object, not null
        address = {}
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
      code: 200, // ✅ CRITICAL: iOS app needs this as NUMBER for navigation logic
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
      // iOS app expects this for job management
      first_jobid: null,
      // Legacy ProfileDetail component expects these fields at root level
      spoken_lang: notificationSettings.spokenLanguages || [],
      address: address || {}, // ✅ iOS app expects empty object when no address
      // ✅ CRITICAL: iOS app ProfileModel expects short_bio at root level
      short_bio: user.profile?.bio || '',
      usermeta: {
        first_name: [user.firstName || ''],
        last_name: [user.lastName || ''],
        phone_number: user.phone ? [String(user.phone)] : [],
        user_status: user.status ? [String(user.status)] : [] // ✅ iOS app expects array format
      },
      profile_meta: {
        tal_rate: notificationSettings.payRate ? [String(notificationSettings.payRate)] : [],
        payment_model: notificationSettings.payModel ? [String(notificationSettings.payModel)] : [],
        short_bio: user.profile?.bio ? [String(user.profile.bio)] : []
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
      responseKeys: Object.keys(response),
      responseCode: response.code, // iOS app specifically looks for this
      addressStructure: {
        hasAddress: !!response.address,
        addressKeys: response.address ? Object.keys(response.address) : [],
        addressEmpty: !response.address || Object.keys(response.address).length === 0
      },
      profileMetaStructure: {
        hasPayRate: !!response.profile_meta?.tal_rate?.length,
        hasPayModel: !!response.profile_meta?.payment_model?.length,
        hasBio: !!response.profile_meta?.short_bio?.length
      }
    })

    // ENHANCED iOS LOGIN DEBUGGING - Track exact values for conditional logic
    console.log('🐛 [LOGIN DEBUG] iOS checkStepForRegisterProcess values:', {
      exactStep: JSON.stringify(response.step),
      exactRoles: JSON.stringify(response.userinfo.roles),
      exactUserStatus: JSON.stringify(response.usermeta?.user_status),
      stepEqualsString: response.step === "final",
      stepEqualsStringQuoted: response.step === '"final"',
      rolesFirstElement: response.userinfo.roles[0],
      rolesFirstEqualsString: response.userinfo.roles[0] === "talent",
      userStatusFirst: response.usermeta?.user_status?.[0],
      userStatusNotDisabled: response.usermeta?.user_status?.[0] !== "Disabled",
      wouldNavigateConditions: {
        stepFinal: response.step === "final",
        rolesTalent: response.userinfo.roles[0] === "talent",
        statusActive: response.usermeta?.user_status?.[0] !== "Disabled",
        allConditionsMet: (
          response.step === "final" && 
          response.userinfo.roles[0] === "talent" && 
          response.usermeta?.user_status?.[0] !== "Disabled"
        )
      }
    })

    // Show timestamp for login flow tracking
    console.log('🕐 [LOGIN DEBUG] Response generated at:', new Date().toISOString())

    // Final marker for call sequence tracking
    console.log('✅ [user/details] Response sent successfully - if this is the 3rd call, HomePageNavigation loaded')

    // Critical debug: Log the exact JSON the iOS app will receive
    console.log('📱 [user/details] Exact JSON response for iOS parsing:', JSON.stringify({
      code: response.code, // Keep as number for iOS app
      step: response.step,
      roles: response.userinfo.roles[0] || '',
      userStatus: response.usermeta.user_status || ''
    }, null, 2))

    // Debug: iOS app navigation requirements
    console.log('🚀 [user/details] iOS navigation check:', {
      codeIs200: response.code === 200,
      stepIsFinal: response.step === 'final',
      roleIsTalent: response.userinfo.roles[0] === 'talent',
      userStatusNotDisabled: response.usermeta.user_status[0] !== 'Disabled',
      shouldNavigateToHome: response.code === 200 && response.step === 'final' && response.userinfo.roles[0] === 'talent'
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