import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

// Standard WordPress-compatible response format
const createResponse = (code: number, message: string, data: any = null) => {
  const response: any = { code, message }
  if (data) response.data = data
  return response
}

// Extract user from JWT token
const getUserFromToken = async (authHeader: string | null) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'development-secret-key') as any
    
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

    return user
  } catch (error) {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const user = await getUserFromToken(authHeader)

    if (!user) {
      return NextResponse.json(
        createResponse(401, 'Authentication required'),
        { status: 401 }
      )
    }

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
      skills: user.skills.map(userSkill => ({
        id: userSkill.skill.id,
        name: userSkill.skill.name,
        level: userSkill.proficiencyLevel
      }))
    }

    // Determine completion step (WordPress compatibility)
    let step = 'final'
    
    // Check if profile is incomplete
    if (!user.firstName || !user.lastName) {
      step = 'profile'
    } else if (user.skills.length === 0) {
      step = 'skills'
    }

    return NextResponse.json({
      code: 200,
      message: 'User details retrieved successfully',
      userinfo,
      step,
      data: {
        user: userinfo
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