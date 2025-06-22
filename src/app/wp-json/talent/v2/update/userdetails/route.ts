import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
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

// Validation schema for user details update - flexible for legacy compatibility
const userDetailsUpdateSchema = z.object({
  rate: z.union([z.string(), z.number()]).optional(),
  phone_number: z.string().optional(),
  pay_model: z.string().optional(),
  address: z.object({
    formatted_address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
    latitude: z.union([z.number(), z.string()]).optional(),
    longitude: z.union([z.number(), z.string()]).optional()
  }).optional(),
  spoken_lang: z.array(z.union([z.number(), z.string()])).optional().default([]),
  short_bio: z.string().optional(),
  // Additional legacy formats
  bio: z.string().optional(),
  phone: z.string().optional(),
  location: z.any().optional(),
  languages: z.array(z.union([z.number(), z.string()])).optional().default([])
})

export async function POST(request: NextRequest) {
  try {
    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          code: 401,
          message: 'Authentication required'
        },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)
    const jwtSecret = process.env.NEXTAUTH_SECRET || 'development-secret-key'
    
    let userId: string
    try {
      const decoded = jwt.verify(token, jwtSecret) as any
      userId = decoded.user_id
    } catch (error) {
      return NextResponse.json(
        {
          code: 401,
          message: 'Invalid token'
        },
        { status: 401, headers: corsHeaders }
      )
    }

    const body = await request.json()
    console.log('📝 [update/userdetails] Request body:', body)
    
    // Validate input data
    const validatedData = userDetailsUpdateSchema.parse(body)
    const { rate, phone_number, pay_model, address, spoken_lang, short_bio, bio, phone, location, languages } = validatedData

    // Flexible data extraction for legacy compatibility
    const finalPhone = phone_number || phone
    const finalBio = short_bio || bio
    const finalAddress = address || location
    const finalSpokenLang = [...(spoken_lang || []), ...(languages || [])].map(id => 
      typeof id === 'string' ? parseInt(id) : Number(id)
    ).filter(id => !isNaN(id))

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    })

    if (!user) {
      return NextResponse.json(
        {
          code: 404,
          message: 'User not found'
        },
        { status: 404, headers: corsHeaders }
      )
    }

    // Update user phone number if provided
    const userUpdateData: any = {}
    if (finalPhone) {
      userUpdateData.phone = finalPhone
    }

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData
      })
    }

    // Get current notification settings
    let notificationSettings: any = {}
    if (user.profile?.notificationSettings) {
      try {
        notificationSettings = JSON.parse(user.profile.notificationSettings)
      } catch (e) {
        console.error('Error parsing notification settings:', e)
      }
    }

    // Update profile data
    const profileData: any = {}
    
    if (finalAddress) {
      profileData.location = JSON.stringify(finalAddress)
    }
    
    if (finalBio !== undefined) {
      profileData.bio = finalBio
    }

    // Handle spoken languages - store in notification settings
    if (spoken_lang && spoken_lang.length > 0) {
      // Find languages by WordPress ID to get names
      const languages = await prisma.language.findMany({
        where: {
          wordpressId: { in: spoken_lang }
        }
      })

      // Store language data for legacy compatibility
      notificationSettings.spokenLanguages = languages.map(lang => ({
        term_id: lang.wordpressId,
        name: lang.name,
        code: lang.code
      }))
    }

    // Store pay rate and model
    if (rate !== undefined) {
      notificationSettings.payRate = String(rate)
    }
    if (pay_model) {
      notificationSettings.payModel = pay_model
    }

    // Update notification settings
    profileData.notificationSettings = JSON.stringify(notificationSettings)

    if (user.profile) {
      // Update existing profile
      await prisma.userProfile.update({
        where: { userId: userId },
        data: profileData
      })
    } else {
      // Create new profile
      await prisma.userProfile.create({
        data: {
          userId: userId,
          ...profileData
        }
      })
    }

    return NextResponse.json(
      {
        code: 200,
        message: 'User details updated successfully',
        data: {
          user_id: userId,
          phone_updated: !!phone_number,
          address_updated: !!address,
          bio_updated: short_bio !== undefined,
          languages_updated: spoken_lang ? spoken_lang.length : 0,
          pay_preferences_updated: !!(rate || pay_model)
        }
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('User details update error:', error)

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
        { status: 400, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        code: 500,
        message: 'Failed to update user details'
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 