import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// WordPress-compatible CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Verify auth token helper
async function verifyAuthToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const jwtSecret = process.env.NEXTAUTH_SECRET || 'fallback-secret'
  
  try {
    const decoded = jwt.verify(token, jwtSecret) as any
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.user_id },
      include: { profile: true }
    })

    return user
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({
        code: 401,
        message: 'Authentication required',
        data: null
      }, { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    const { searchParams } = new URL(request.url)
    const talentId = searchParams.get('talent_id')
    const jobId = searchParams.get('job_id')

    console.log('🔍 [get/talentdetails] Getting talent details:', {
      talentId,
      jobId,
      requesterId: user.id
    })

    if (!talentId) {
      return NextResponse.json({
        code: 400,
        message: 'Missing required parameter: talent_id',
        data: null
      }, { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Get talent user details with profile, skills, manufacturers, and languages
    const talent = await prisma.user.findUnique({
      where: { id: talentId },
      include: {
        profile: true,
        skills: {
          include: {
            skill: true
          }
        },
        manufacturers: {
          include: {
            manufacturer: true
          }
        },
        languages: {
          include: {
            language: true
          }
        }
      }
    })

    if (!talent) {
      return NextResponse.json({
        code: 404,
        message: 'Talent not found',
        data: null
      }, { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Format talent skills for WordPress compatibility
    const talentSkills = talent.skills.map(userSkill => ({
      term_id: userSkill.skill.wordpressId || userSkill.skill.id,
      name: userSkill.skill.name,
      slug: userSkill.skill.name.toLowerCase().replace(/\s+/g, '-')
    }))

    // Format talent manufacturers/equipment for WordPress compatibility
    const talentEquipment = talent.manufacturers.map(userManufacturer => ({
      term_id: userManufacturer.manufacturer.wordpressId || userManufacturer.manufacturer.id,
      name: userManufacturer.manufacturer.name,
      category: userManufacturer.manufacturer.category,
      slug: userManufacturer.manufacturer.name.toLowerCase().replace(/\s+/g, '-')
    }))

    // Format talent languages for WordPress compatibility
    const talentLanguages = talent.languages.map(userLanguage => ({
      term_id: userLanguage.language.wordpressId || userLanguage.language.id,
      name: userLanguage.language.name,
      code: userLanguage.language.code,
      proficiency: userLanguage.proficiencyLevel || 'Conversational',
      slug: userLanguage.language.name.toLowerCase().replace(/\s+/g, '-')
    }))

    // Extract just language names for WordPress compatibility (frontend expects array of names)
    const spokenLanguageNames = talentLanguages.map(lang => lang.name)

    // Parse phone number array (WordPress format compatibility)
    const phoneArray: string[] = []
    if (talent.phone) {
      phoneArray.push(talent.phone)
    }

    // Parse location from JSON if available
    let locationData = {
      city: '',
      state: '',
      country: 'Australia',
      formatted_address: ''
    }
    
    if (talent.profile?.location) {
      try {
        const parsedLocation = JSON.parse(talent.profile.location)
        locationData = {
          city: parsedLocation.city || '',
          state: parsedLocation.state || '',
          country: parsedLocation.country || 'Australia',
          formatted_address: parsedLocation.formatted_address || ''
        }
      } catch {
        // If location is not valid JSON, keep defaults
      }
    }

    // Parse notification settings to get languages and other data
    let notificationSettings: any = {}
    if (talent.profile?.notificationSettings) {
      try {
        notificationSettings = JSON.parse(talent.profile.notificationSettings)
      } catch (e) {
        // If notificationSettings is not valid JSON, keep empty object
      }
    }
    
    // Get spoken languages from our UserLanguage relationships (override notification settings)
    const spokenLanguages = spokenLanguageNames.length > 0 ? spokenLanguageNames : (notificationSettings.spokenLanguages || [])

    // WordPress-compatible response format - frontend expects data at root level
    const response = {
      code: 200,
      message: 'Talent details retrieved successfully',
      // Frontend expects talent data directly at root level, not nested under 'data'
      talent_userid: talent.id,
      talent_email: talent.email,
      talent_name: `${talent.firstName || ''} ${talent.lastName || ''}`.trim() || talent.email,
      first_name: talent.firstName || '',
      last_name: talent.lastName || '',
      phone_number: phoneArray,
      short_bio: talent.profile?.bio || '', // Frontend expects 'short_bio'
      profile_image: talent.profile?.profileImageUrl || '',
      location: locationData,
      matched_skills: talentSkills.map(skill => skill.name), // Frontend expects array of skill names
      matched_equipment: talentEquipment.map(eq => eq.name), // Frontend expects array of equipment names
      spoken_lang: talentLanguages, // Frontend expects array of objects with term_id and name
      skills: talentSkills, // Keep original format too for API compatibility
      equipment: talentEquipment, // Keep original format too for API compatibility
      languages: talentLanguages, // Keep original format too for API compatibility
      created_at: talent.createdAt,
      updated_at: talent.updatedAt,
      is_available: talent.status === 'ACTIVE',
      verification_status: 'verified', // Simplified for now
      rating: 0, // Default rating
      total_jobs_completed: 0,
      job_success_rate: 100,
      endorsement: 0, // Frontend expects this field for endorsements display
      status: talent.status === 'ACTIVE' ? 'available' : 'unavailable', // Frontend expects 'status' field
      spoken_language_names: spokenLanguageNames
    }

    console.log('✅ [get/talentdetails] Talent details retrieved:', {
      talentId: talent.id,
      talentName: response.talent_name,
      skillCount: talentSkills.length,
      hasProfile: !!talent.profile
    })

    return NextResponse.json(response, { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('Get talent details error:', error)
    return NextResponse.json({
      code: 500,
      message: 'Internal server error',
      data: null
    }, { 
      status: 500, 
      headers: corsHeaders 
    })
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
} 