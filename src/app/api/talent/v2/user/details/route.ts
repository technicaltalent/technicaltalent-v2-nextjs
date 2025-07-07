import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyDualJWT } from '@/lib/jwt-utils'

// Standard WordPress-compatible response format
const createResponse = (code: number, message: string, data: any = null) => {
  const response: any = { code, message }
  if (data) response.data = data
  return response
}

// Extract user from JWT token using dual verification
const getUserFromToken = async (authHeader: string | null): Promise<{ user: any; token: string } | null> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    
    // Use dual JWT verification for WordPress and NextAuth tokens
    const verificationResult = verifyDualJWT(token)
    
    if (!verificationResult?.success) {
      return null
    }

    const { decoded } = verificationResult
    
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
      return null
    }

    return { user, token }
  } catch (error) {
    console.error('❌ [JWT] Token verification error:', error)
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const result = await getUserFromToken(authHeader)

    if (!result) {
      return NextResponse.json(
        createResponse(401, 'Authentication required'),
        { status: 401 }
      )
    }

    const { user, token } = result

    console.log(`🔑 [user/details] Using nextauth token for user: ${user.email}`)

    // WordPress-compatible user info format
    const userinfo = {
      ID: user.wordpressId || user.id,
      user_login: user.email.split('@')[0],
      user_nicename: user.email.split('@')[0],
      user_email: user.email,
      user_url: '',
      user_registered: user.createdAt,
      user_activation_key: '',
      user_status: '0',
      display_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      phone_number: user.phone || '',
      roles: [user.role.toLowerCase()], // WordPress role format
      // Additional profile data
      profile_image: user.profile?.profileImageUrl || null,
      bio: user.profile?.bio || '',
      location: user.profile?.location ? JSON.parse(user.profile.location) : null,
      business_name: '', // Not in current schema
      abn_number: '', // Not in current schema
      website_url: '', // Not in current schema
      skills: user.skills.map((userSkill: any) => ({
        id: userSkill.skill.id,
        name: userSkill.skill.name,
        level: userSkill.proficiencyLevel
      }))
    }

    // Determine completion step (WordPress compatibility)
    const hasSkills = user.skills.length > 0
    const hasLocation = user.profile?.location != null
    const hasCompleteProfile = !!(user.firstName && user.lastName && user.phone)
    const notificationStepSetting = 'final' // Default to final
    
    let step = 'final'
    
    // Check if profile is incomplete
    if (!user.firstName || !user.lastName) {
      step = 'profile'
    } else if (user.skills.length === 0) {
      step = 'skills'
    }

    // Debug logging for step determination
    console.log(`🔍 [user/details] Step determination for user ${user.id}:`, {
      hasSkills,
      hasLocation,
      hasCompleteProfile,
      notificationStepSetting,
      finalStep: step
    })

    // Debug phone number array format
    const phoneArray = user.phone ? [user.phone] : []
    console.log(`📞 [user/details] Phone number debug:`, {
      userPhone: user.phone,
      phoneArray,
      payRate: user.profile?.payRate || '',
      payModel: user.profile?.payModel || '',
      bio: user.profile?.bio || ''
    })

    return NextResponse.json({
      code: 200,
      message: 'User details retrieved successfully',
      userinfo,
      step,
      data: {
        user: userinfo
      },
      // ✅ Add user_token object for iOS app compatibility
      user_token: {
        token: token,
        user_id: user.id,
        user_email: user.email,
        user_role: user.role.toLowerCase()
      }
    })

  } catch (error) {
    console.error('User details error:', error)
    return NextResponse.json(
      createResponse(500, 'Internal server error'),
      { status: 500 }
    )
  }
} 