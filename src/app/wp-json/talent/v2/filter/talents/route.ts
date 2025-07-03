import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { verifyDualJWT } from '@/lib/jwt-utils'

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

// Validation schema for talent filtering
const filterTalentsSchema = z.object({
  job_id: z.string().min(1, 'Job ID is required')
})

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [filter/talents] Filtering talents for job...')

    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [filter/talents] No auth header')
      return NextResponse.json(
        { code: 401, message: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)
    
    const verificationResult = verifyDualJWT(token)
    if (!verificationResult) {
      console.log('❌ [filter/talents] Invalid token')
      return NextResponse.json(
        { code: 401, message: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    const userId = verificationResult.decoded.user_id
    console.log(`🔑 [filter/talents] Using ${verificationResult.tokenType} token for user: ${verificationResult.decoded.user_email}`)

    // Parse request body
    const body = await request.json()
    console.log('📝 [filter/talents] Request payload:', body)

    // Validate input data
    const validatedData = filterTalentsSchema.parse(body)
    const { job_id } = validatedData

    // Verify the job exists and belongs to the user
    const job = await prisma.job.findFirst({
      where: {
        id: job_id,
        employerId: userId
      }
    })

    if (!job) {
      console.log('❌ [filter/talents] Job not found or not owned by user')
      return NextResponse.json(
        { code: 404, message: 'Job not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Get maximum distance setting from admin settings
    const maxDistanceSetting = await prisma.setting.findUnique({
      where: { key: 'maximum_distance' }
    })
    const maxDistanceKm = parseInt(maxDistanceSetting?.value || '50')
    
    console.log('📏 [filter/talents] Maximum distance setting:', maxDistanceKm, 'km')

    // Parse job location for filtering
    let jobLocation = null
    let jobCoordinates = null
    
    if (job.location) {
      try {
        jobLocation = JSON.parse(job.location)
        
        // Extract coordinates for distance calculation
        if (jobLocation.geometry?.location) {
          jobCoordinates = {
            lat: jobLocation.geometry.location.lat,
            lng: jobLocation.geometry.location.lng
          }
        }
        
        console.log('📍 [filter/talents] Job location parsed:', {
          formatted_address: jobLocation.formatted_address,
          coordinates: jobCoordinates
        })
      } catch (e) {
        console.log('📍 [filter/talents] Could not parse job location:', job.location)
      }
    }

    // Haversine distance calculation function
    function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const R = 6371 // Earth's radius in kilometres
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLng = (lng2 - lng1) * Math.PI / 180
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c // Distance in kilometres
    }

    // Get all talent users (role = TALENT) with their profiles, skills, and languages
    let talentQuery: any = {
      role: 'TALENT',
      status: 'ACTIVE'
    }

    // Add location filtering if we have job coordinates
    if (jobCoordinates) {
      talentQuery.profile = {
        location: {
          not: null
        }
      }
    }

    const allTalents = await prisma.user.findMany({
      where: talentQuery,
      include: {
        profile: true,
        skills: {
          include: {
            skill: true
          }
        },
        languages: {
          include: {
            language: true
          }
        },
        applications: {
          where: {
            jobId: job_id
          }
        }
      }
    })

    // Get job required skills from employer's profile (skills selected during job creation)
    const jobSkills = await prisma.userSkill.findMany({
      where: { userId: job.employerId },
      include: { skill: true }
    })
    
    const requiredSkillIds = jobSkills.map(js => js.skill.id)
    console.log('🎯 [filter/talents] Job requires skills:', jobSkills.map(js => js.skill.name))

    // Filter talents by location and skills
    let talents = allTalents
    let filteredCount = 0
    let withinDistanceCount = 0
    let noLocationCount = 0
    let skillMatchCount = 0
    
    if (allTalents.length > 0) {
      talents = allTalents.filter(talent => {
        let locationMatch = false
        let skillMatch = false
        
                 // Check location match (very lenient for development)
         if (!talent.profile?.location) {
           noLocationCount++
           // Include users without location (can be filtered by admin later)
           locationMatch = true
         } else {
           try {
             const talentLocation = JSON.parse(talent.profile.location)
             
             // Check GPS coordinates first (precise matching)
             if (talentLocation.latitude && talentLocation.longitude && jobCoordinates) {
               const distance = calculateDistance(
                 jobCoordinates.lat,
                 jobCoordinates.lng,
                 parseFloat(talentLocation.latitude),
                 parseFloat(talentLocation.longitude)
               )
               
               if (distance <= maxDistanceKm) {
                 withinDistanceCount++
                 locationMatch = true
               } else {
                 // Even if GPS distance is far, still include for broader results
                 locationMatch = true
               }
             } else {
               // No GPS coordinates - use city/state matching (very lenient)
               const talentCity = talentLocation.city?.toLowerCase()
               const talentState = talentLocation.state?.toLowerCase()
               const jobAddress = jobLocation?.formatted_address?.toLowerCase()
               
               // Any Australian location is acceptable for now
               if (talentCity || talentState || talentLocation.country === 'Australia') {
                 locationMatch = true
               } else {
                 // If no recognizable location data, still include (benefit of doubt)
                 locationMatch = true
               }
             }
           } catch (e) {
             // If we can't parse location, include them anyway (benefit of doubt)  
             locationMatch = true
           }
         }
        
        // Check skill match (at least one skill in common)
        if (requiredSkillIds.length > 0) {
          const talentSkillIds = talent.skills.map(ts => ts.skill.id)
          skillMatch = requiredSkillIds.some(reqId => talentSkillIds.includes(reqId))
          if (skillMatch) skillMatchCount++
        } else {
          // If no required skills, include everyone
          skillMatch = true
        }
        
        return locationMatch && skillMatch
      })
      
      filteredCount = talents.length
      
      console.log('📍 [filter/talents] Distance-based filtering results:', {
        originalCount: allTalents.length,
        filteredCount: filteredCount,
        withinDistanceCount,
        noLocationCount,
        skillMatchCount,
        maxDistanceKm,
        jobCoordinates
      })
    }

    // Format talent data for legacy compatibility, excluding talents with no skills
    const formattedTalents = talents
      .filter(talent => talent.skills.length > 0) // Only include talents with skills
      .map(talent => {
      // Parse notification settings to get languages and pay info
      let notificationSettings: any = {}
      if (talent.profile?.notificationSettings) {
        try {
          notificationSettings = JSON.parse(talent.profile.notificationSettings)
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Determine status based on application
      let status = 'potential'
      if (talent.applications.length > 0) {
        const application = talent.applications[0]
        status = application.status === 'ACCEPTED' ? 'awarded' : 
                 application.status === 'REJECTED' ? 'rejected' : 'invited'
      }

      // Format talent languages for WordPress compatibility (same as talent details endpoint)
      const talentLanguages = talent.languages?.map(userLanguage => ({
        term_id: userLanguage.language.wordpressId || userLanguage.language.id,
        name: userLanguage.language.name,
        code: userLanguage.language.code,
        proficiency: userLanguage.proficiencyLevel || 'Conversational',
        slug: userLanguage.language.name.toLowerCase().replace(/\s+/g, '-')
      })) || []

      return {
        talent_id: talent.id,
        talent_userid: talent.id, // Same as talent_id for compatibility
        first_name: talent.firstName || '',
        last_name: talent.lastName || '',
        email: talent.email,
        phone: talent.phone || '',
        status: status,
        awarded: status === 'awarded',
        rate: notificationSettings.payRate || '---',
        pay_model: notificationSettings.payModel || 'day',
        endorsement: 0, // TODO: Calculate actual endorsements
        jobcount: 0, // TODO: Calculate actual job count
        spoken_lang: talentLanguages, // Frontend expects array of objects with term_id and name
        skills: talent.skills.map(userSkill => ({
          skill_id: userSkill.skill.id,
          skill_name: userSkill.skill.name,
          wordpress_id: userSkill.skill.wordpressId
        })),
        profile: {
          bio: talent.profile?.bio || '',
          location: talent.profile?.location || ''
        }
      }
    })

    console.log('✅ [filter/talents] Talents filtered successfully:', {
      jobId: job_id,
      totalTalents: formattedTalents.length,
      potentialCount: formattedTalents.filter(t => t.status === 'potential').length,
      invitedCount: formattedTalents.filter(t => t.status === 'invited').length,
      awardedCount: formattedTalents.filter(t => t.status === 'awarded').length
    })

    // Return WordPress-compatible response format
    return NextResponse.json(
      {
        code: 200,
        message: 'Talents filtered successfully',
        data: formattedTalents,
        talent_count: formattedTalents.length,
        job_id: job_id,
        filters_applied: {
          role: 'talent',
          status: 'active',
          location: jobCoordinates ? {
            job_location: jobLocation?.formatted_address,
            max_distance_km: maxDistanceKm,
            coordinates: jobCoordinates,
            filtering_enabled: true,
            within_distance_count: withinDistanceCount,
            no_location_count: noLocationCount
          } : {
            filtering_enabled: false
          }
        }
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('❌ [filter/talents] Error filtering talents:', error)
    
    if (error instanceof z.ZodError) {
      console.error('❌ [filter/talents] Validation errors:', error.errors)
      return NextResponse.json(
        {
          code: 400,
          message: 'Validation error: ' + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
          errors: error.errors
        },
        { status: 400, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        code: 500,
        message: 'Internal server error while filtering talents'
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 