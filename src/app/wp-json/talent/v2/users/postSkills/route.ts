import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { trackEvent, EVENTS } from '@/lib/analytics'
import jwt from 'jsonwebtoken'

// Validation schema for posting skills - flexible for legacy app compatibility
const postSkillsSchema = z.object({
  ids: z.object({
    skills: z.array(z.union([z.string(), z.number()])).optional().default([]),
    brands: z.array(z.union([z.string(), z.number()])).optional().default([])
  }).optional().default({ skills: [], brands: [] }),
  job_id: z.union([z.string(), z.number()]).optional().nullable(),
  note: z.string().optional(),
  // Additional flexibility for different legacy formats
  skills: z.array(z.union([z.string(), z.number()])).optional().default([]),
  brands: z.array(z.union([z.string(), z.number()])).optional().default([]),
  skill_ids: z.array(z.union([z.string(), z.number()])).optional().default([]),
  brand_ids: z.array(z.union([z.string(), z.number()])).optional().default([])
})

export async function POST(request: NextRequest) {
  // Enhanced logging for mobile app debugging
  console.log('🔧 [postSkills] Request received')
  console.log('🔧 [postSkills] Headers:', Object.fromEntries(request.headers.entries()))
  console.log('🔧 [postSkills] URL:', request.url)
  
  try {
    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    console.log('🔧 [postSkills] Auth header:', authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : 'MISSING')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [postSkills] Authentication failed - missing or invalid auth header')
      return NextResponse.json(
        {
          code: 401,
          message: 'Authentication required'
        },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
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
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      )
    }

    let body: any
    try {
      body = await request.json()
      console.log('🔧 [postSkills] Request body:', JSON.stringify(body, null, 2))
    } catch (jsonError) {
      console.log('❌ [postSkills] JSON parsing failed:', jsonError)
      return NextResponse.json(
        {
          code: 400,
          message: 'Invalid JSON in request body'
        },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      )
    }
    
    // Validate input data
    console.log('🔧 [postSkills] Validating request data...')
    const validatedData = postSkillsSchema.parse(body)
    const { ids, job_id, note, skills, brands, skill_ids, brand_ids } = validatedData
    
    // Flexible data extraction to handle different legacy formats
    const skillWordpressIds = [
      ...(ids?.skills || []),
      ...(skills || []),
      ...(skill_ids || [])
    ].map(id => String(id)) // Convert all to strings
    
    const brandWordpressIds = [
      ...(ids?.brands || []),
      ...(brands || []),
      ...(brand_ids || [])
    ].map(id => String(id)) // Convert all to strings
    
    console.log('🔧 [postSkills] Flexible data extraction:', { 
      skillCount: skillWordpressIds.length, 
      brandCount: brandWordpressIds.length, 
      job_id, 
      note,
      skillsRaw: skillWordpressIds,
      brandsRaw: brandWordpressIds
    })
    
    let skillIds: string[] = []
    let manufacturerIds: string[] = []
    
    console.log('🔧 [postSkills] Processing skills:', skillWordpressIds)
    console.log('🔧 [postSkills] Processing brands:', brandWordpressIds)
    
    if (skillWordpressIds.length > 0) {
      // Parse skill IDs to handle both "88" and "skill_2" formats
      const parsedSkillIds = skillWordpressIds
        .map(id => {
          // Handle "skill_X" format by extracting the number
          if (typeof id === 'string' && id.startsWith('skill_')) {
            const numericPart = id.replace('skill_', '')
            const parsed = parseInt(numericPart)
            console.log(`🔧 [postSkills] Parsed "${id}" -> ${parsed}`)
            return parsed
          }
          // Handle direct numeric strings
          const parsed = parseInt(id)
          console.log(`🔧 [postSkills] Parsed "${id}" -> ${parsed}`)
          return parsed
        })
        .filter(id => !isNaN(id)) // Remove any invalid/NaN values
      
      // Remove duplicates immediately to avoid issues with frontend sending duplicates
      const uniqueSkillIds = [...new Set(parsedSkillIds)]
      console.log('🔧 [postSkills] Removed duplicates:', parsedSkillIds.length, '->', uniqueSkillIds.length)
      
      console.log('🔧 [postSkills] Final unique skill IDs:', uniqueSkillIds)
      console.log('🔧 [postSkills] Looking up skills in database...')
      
      const existingSkills = await prisma.skill.findMany({
        where: {
          wordpressId: { in: uniqueSkillIds },
          isActive: true
        }
      })

      console.log('🔧 [postSkills] Found skills:', existingSkills.map(s => ({ id: s.id, wordpressId: s.wordpressId, name: s.name })))

      if (existingSkills.length !== uniqueSkillIds.length) {
        const foundWordpressIds = existingSkills.map(s => s.wordpressId)
        const missingIds = uniqueSkillIds.filter(id => !foundWordpressIds.includes(id))
        console.log('❌ [postSkills] Skills not found:', missingIds)
        
        return NextResponse.json(
          {
            code: 400,
            message: 'One or more skills not found',
            missing_skills: missingIds
          },
          { 
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          }
        )
      }
      
      // Get the internal skill IDs for database operations
      skillIds = existingSkills.map(skill => skill.id)
      console.log('🔧 [postSkills] Internal skill IDs:', skillIds)
    }

    // Process brands/manufacturers
    if (brandWordpressIds.length > 0) {
      // Parse manufacturer IDs (similar to skills)
      const parsedManufacturerIds = brandWordpressIds
        .map(id => {
          const parsed = parseInt(id)
          console.log(`🔧 [postSkills] Parsed brand "${id}" -> ${parsed}`)
          return parsed
        })
        .filter(id => !isNaN(id))
      
      // Remove duplicates
      const uniqueManufacturerIds = [...new Set(parsedManufacturerIds)]
      
      console.log('🔧 [postSkills] Final parsed manufacturer IDs:', parsedManufacturerIds)
      console.log('🔧 [postSkills] Unique manufacturer IDs for validation:', uniqueManufacturerIds)
      console.log('🔧 [postSkills] Looking up manufacturers in database...')
      
      const existingManufacturers = await prisma.manufacturer.findMany({
        where: {
          wordpressId: { in: uniqueManufacturerIds },
          isActive: true
        }
      })

      console.log('🔧 [postSkills] Found manufacturers:', existingManufacturers.map(m => ({ id: m.id, wordpressId: m.wordpressId, name: m.name })))

      if (existingManufacturers.length !== uniqueManufacturerIds.length) {
        const foundWordpressIds = existingManufacturers.map(m => m.wordpressId)
        const missingIds = uniqueManufacturerIds.filter(id => !foundWordpressIds.includes(id))
        console.log('❌ [postSkills] Manufacturers not found:', missingIds)
        
        return NextResponse.json(
          {
            code: 400,
            message: 'One or more manufacturers not found',
            missing_manufacturers: missingIds
          },
          { 
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
          }
        )
      }
      
      // Get the internal manufacturer IDs for database operations
      manufacturerIds = existingManufacturers.map(manufacturer => manufacturer.id)
      console.log('🔧 [postSkills] Internal manufacturer IDs:', manufacturerIds)
    }

    // IMPROVED APPROACH: Context-aware replacement logic
    // Only update skills that are explicitly being managed in this request
    
    console.log('🔧 [postSkills] Using context-aware replacement for job-specific updates')
    
    // Check if this is a job-specific update (has job_id)
    if (job_id && String(job_id).trim() !== '') {
      console.log('🔧 [postSkills] Job-specific update - only replacing skills for this context')
      
      // For job-specific updates, replace skills exactly as sent
      // This fixes the UI issue where removing skills doesn't persist
      
      if (skillIds.length > 0) {
        // First, get existing skills to see what we're replacing
        const existingSkills = await prisma.userSkill.findMany({
          where: { userId: userId },
          include: { skill: true }
        })
        
        console.log('🔧 [postSkills] Current user skills:', existingSkills.map(us => ({ id: us.skill.id, name: us.skill.name, wpId: us.skill.wordpressId })))
        console.log('🔧 [postSkills] New skills being set:', skillIds)
        
        // Delete ALL existing skills and replace with exactly what's sent
        const deleteResult = await prisma.userSkill.deleteMany({
          where: { userId: userId }
        })
        console.log('🔧 [postSkills] Cleared existing skills for exact replacement:', deleteResult.count)
      }
      
      if (manufacturerIds.length > 0) {
        // Same for manufacturers
        const deleteManufacturerResult = await prisma.userManufacturer.deleteMany({
          where: { userId: userId }
        })
        console.log('🔧 [postSkills] Cleared existing manufacturers for exact replacement:', deleteManufacturerResult.count)
      }
    } else {
      console.log('🔧 [postSkills] General skill update - using smart duplicate-aware approach')
      
      // For general updates, check existing skills and only add new ones
      if (skillIds.length > 0) {
        const existingUserSkills = await prisma.userSkill.findMany({
          where: { 
            userId: userId,
            skillId: { in: skillIds }
          }
        })
        
        const existingSkillIds = existingUserSkills.map(us => us.skillId)
        const newSkillIds = skillIds.filter(skillId => !existingSkillIds.includes(skillId))
        
        console.log('🔧 [postSkills] Existing skills found:', existingSkillIds.length)
        console.log('🔧 [postSkills] New skills to add:', newSkillIds.length)
        
        if (newSkillIds.length > 0) {
          const deleteResult = await prisma.userSkill.deleteMany({
            where: { userId: userId }
          })
          console.log('🔧 [postSkills] Cleared existing skills for replacement:', deleteResult.count)
          
          // Replace with all skills (existing + new)
          skillIds = [...new Set([...existingSkillIds, ...newSkillIds])]
        } else {
          console.log('🔧 [postSkills] No new skills to add, user already has all requested skills')
          skillIds = [] // Clear the array so we don't try to recreate existing skills
        }
      }
      
      if (manufacturerIds.length > 0) {
        const existingUserManufacturers = await prisma.userManufacturer.findMany({
          where: { 
            userId: userId,
            manufacturerId: { in: manufacturerIds }
          }
        })
        
        const existingManufacturerIds = existingUserManufacturers.map(um => um.manufacturerId)
        const newManufacturerIds = manufacturerIds.filter(mId => !existingManufacturerIds.includes(mId))
        
        console.log('🔧 [postSkills] Existing manufacturers found:', existingManufacturerIds.length)
        console.log('🔧 [postSkills] New manufacturers to add:', newManufacturerIds.length)
        
        if (newManufacturerIds.length > 0) {
          const deleteResult = await prisma.userManufacturer.deleteMany({
            where: { userId: userId }
          })
          console.log('🔧 [postSkills] Cleared existing manufacturers for replacement:', deleteResult.count)
          
          // Replace with all manufacturers (existing + new)
          manufacturerIds = [...new Set([...existingManufacturerIds, ...newManufacturerIds])]
        } else {
          console.log('🔧 [postSkills] No new manufacturers to add, user already has all requested manufacturers')
          manufacturerIds = [] // Clear the array so we don't try to recreate existing manufacturers
        }
      }
    }

    // Add new skills (only if we have skills to add)
    if (skillIds.length > 0) {
      const userSkillsData = skillIds.map(skillId => ({
        userId: userId,
        skillId: skillId,
        proficiencyLevel: 1, // Default proficiency level
        yearsExperience: null
      }))

      console.log('🔧 [postSkills] Adding new user skills:', userSkillsData.length)
      const createResult = await prisma.userSkill.createMany({
        data: userSkillsData
      })
      console.log('🔧 [postSkills] Created new skills:', createResult.count)
    }

    // Add new manufacturers (only if we have manufacturers to add)
    if (manufacturerIds.length > 0) {
      const userManufacturersData = manufacturerIds.map(manufacturerId => ({
        userId: userId,
        manufacturerId: manufacturerId
      }))

      console.log('🔧 [postSkills] Adding new user manufacturers:', userManufacturersData.length)
      const createResult = await prisma.userManufacturer.createMany({
        data: userManufacturersData
      })
      console.log('🔧 [postSkills] Created new manufacturers:', createResult.count)
    }

    // Track skill addition event
    try {
      await trackEvent(userId, EVENTS.SKILL_ADDED, {
        skills_added: skillIds.length,
        manufacturers_added: manufacturerIds.length,
        skill_ids: skillWordpressIds, // Use WordPress IDs for consistency with mobile app
        manufacturer_ids: brandWordpressIds, // Use WordPress IDs for consistency with mobile app
        job_id: job_id || null,
        note: note || null,
        source: 'api'
      })
    } catch (analyticsError) {
      console.log('Analytics tracking skipped:', analyticsError)
    }

    // Return WordPress-compatible response format
    console.log('✅ [postSkills] Success! Skills added:', skillIds.length, 'Manufacturers added:', manufacturerIds.length)
    return NextResponse.json(
      {
        code: 200,
        message: 'Skills and manufacturers added successfully',
        skills_added: skillIds.length,
        manufacturers_added: manufacturerIds.length,
        job_id: job_id || null
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )

  } catch (error: unknown) {
    console.error('❌ [postSkills] FATAL ERROR:', error)
    console.error('❌ [postSkills] Error type:', error && typeof error === 'object' && 'constructor' in error ? (error.constructor as any).name : typeof error)
    console.error('❌ [postSkills] Error message:', error instanceof Error ? error.message : String(error))
    console.error('❌ [postSkills] Error stack:', error instanceof Error ? error.stack : 'No stack trace')

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
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      )
    }

    return NextResponse.json(
      {
        code: 500,
        message: 'Failed to add skills',
        debug: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  console.log('🔧 [postSkills] OPTIONS request received for CORS preflight')
  console.log('🔧 [postSkills] OPTIONS URL:', request.url)
  console.log('🔧 [postSkills] OPTIONS Headers:', Object.fromEntries(request.headers.entries()))
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
} 