import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { verifyDualJWT } from '@/lib/jwt-utils'

const prisma = new PrismaClient()

// WordPress-compatible CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Validation schema for address update - more flexible for legacy compatibility
const addressUpdateSchema = z.object({
  address: z.union([
    z.object({
      formatted_address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postcode: z.string().optional(),
      country: z.string().optional(),
      latitude: z.union([z.number(), z.string()]).optional(),
      longitude: z.union([z.number(), z.string()]).optional()
    }),
    z.any() // Allow Google Places object from legacy app
  ]).optional(),
  pay_rate: z.union([z.string(), z.number()]).optional(),
  pay_model: z.string().optional(),
  spoken_lang: z.array(z.union([z.number(), z.string()])).optional().default([]),
  short_bio: z.string().optional(),
  // Additional legacy formats
  location: z.any().optional(),
  rate: z.union([z.string(), z.number()]).optional(),
  languages: z.array(z.union([z.number(), z.string()])).optional().default([])
})

export async function POST(request: NextRequest) {
  try {
    // Get user from JWT token with dual verification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        code: 401,
        message: 'Authentication required'
      }, { 
        status: 401,
        headers: corsHeaders
      })
    }

    const token = authHeader.substring(7)
    
    // Use dual JWT verification for WordPress and NextAuth tokens
    const verificationResult = verifyDualJWT(token)
    if (!verificationResult) {
      return NextResponse.json({
        code: 401,
        message: 'Invalid token'
      }, { 
        status: 401,
        headers: corsHeaders
      })
    }

    const decoded = verificationResult.decoded
    const userId = decoded.user_id
    console.log(`🔑 [users/address] Using ${verificationResult.tokenType} token for user: ${decoded.user_email}`)

    const body = await request.json()
    console.log('📝 [users/address] Request body:', body)
    
    // Validate input data
    const validatedData = addressUpdateSchema.parse(body)
    const { address, pay_rate, pay_model, spoken_lang, short_bio, location, rate, languages } = validatedData
    
    // Flexible data extraction for legacy compatibility
    const finalAddress = address || location
    const finalPayRate = pay_rate || rate
    const finalShortBio = short_bio
    const finalSpokenLang = [...(spoken_lang || []), ...(languages || [])].map(id => 
      typeof id === 'string' ? parseInt(id) : id
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

    // Get current notification settings
    let notificationSettings: any = {}
    if (user.profile?.notificationSettings) {
      try {
        notificationSettings = JSON.parse(String(user.profile.notificationSettings))
      } catch (e) {
        console.error('Error parsing notification settings:', e)
      }
    }

    // Update location in profile
    const profileData: any = {}
    if (finalAddress) {
      profileData.location = JSON.stringify(finalAddress)
    }

    // Update bio if provided
    if (finalShortBio !== undefined) {
      profileData.bio = finalShortBio
    }

    // Handle spoken languages - store in notification settings
    if (finalSpokenLang && finalSpokenLang.length > 0) {
      // Find languages by WordPress ID to get names
      const languages = await prisma.language.findMany({
        where: {
          wordpressId: { in: finalSpokenLang }
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
    if (finalPayRate !== undefined) {
      notificationSettings.payRate = String(finalPayRate)
    }
    if (pay_model) {
      notificationSettings.payModel = pay_model
    }

    // *** CRITICAL FIX *** Set com_step to 'final' to mark registration as complete
    notificationSettings.comStep = 'final'

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

    // Log successful completion
    console.log('✅ [users/address] Registration completed successfully:', {
      userId,
      addressSet: !!finalAddress,
      bioSet: !!finalShortBio,
      languagesSet: finalSpokenLang.length,
      payRateSet: !!finalPayRate,
      payModelSet: !!pay_model,
      comStepSet: 'final'
    })

    return NextResponse.json(
      {
        code: 200,
        message: 'User address and preferences updated successfully',
        data: {
          user_id: userId,
          address_updated: !!finalAddress,
          bio_updated: !!finalShortBio,
          languages_updated: finalSpokenLang ? finalSpokenLang.length : 0,
          pay_preferences_updated: !!(finalPayRate || pay_model),
          registration_completed: true,
          step: 'final'
        }
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Address update error:', error)

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
        message: 'Failed to update user address'
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 