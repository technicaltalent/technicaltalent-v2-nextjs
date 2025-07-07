import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyDualJWT } from '@/lib/jwt-utils'

const prisma = new PrismaClient()

// WordPress-compatible CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Verify auth token helper (supports both WordPress and NextAuth)
async function verifyAuthToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    
    const verificationResult = verifyDualJWT(token)
    if (!verificationResult) {
      return null
    }

    const decoded = verificationResult.decoded
    console.log(`🔑 [user/getskills] Using ${verificationResult.tokenType} token for user: ${decoded.user_email}`)
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.user_id },
      include: { profile: true }
    })

    return user
  } catch (error) {
    console.error('❌ [user/getskills] Token verification error:', error)
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
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

    const { jobId } = await params

    console.log('🔍 [user/getskills] Getting user skills for job:', {
      userId: user.id,
      jobId: jobId
    })

    // Check if this is a new job (just created, no skills selected yet)
    // For new jobs, we should return empty skills to allow fresh selection
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      console.log('⚠️ [user/getskills] Job not found:', jobId)
      return NextResponse.json({
        code: 404,
        message: 'Job not found',
        data: null
      }, { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Check if user has explicitly saved skills for this job context
    // Since we don't have job-specific skill storage yet, we'll check if this is a very new job
    const jobAge = Date.now() - new Date(job.createdAt).getTime()
    const isNewJob = jobAge < 60000 // Less than 1 minute old = new job

    let userSkills: any[] = []
    let userManufacturers: any[] = []

    if (isNewJob) {
      console.log('🆕 [user/getskills] New job detected - returning empty skills for fresh selection')
      // Return empty skills for new jobs to allow fresh selection
    } else {
      console.log('📋 [user/getskills] Existing job - returning user\'s global skills')
      // Get user's current skills for existing jobs
      userSkills = await prisma.userSkill.findMany({
        where: {
          userId: user.id
        },
        include: {
          skill: true
        }
      })

      // Get user's current manufacturers/equipment
      userManufacturers = await prisma.userManufacturer.findMany({
        where: {
          userId: user.id
        },
        include: {
          manufacturer: true
        }
      })
    }

    // Format skills for WordPress compatibility
    const formattedSkills = userSkills.map(userSkill => ({
      term_id: userSkill.skill.wordpressId || userSkill.skill.id,
      name: userSkill.skill.name,
      slug: userSkill.skill.name.toLowerCase().replace(/\s+/g, '-'),
      category: userSkill.skill.category || '',
      parent_id: userSkill.skill.parentId || null
    }))

    // Format manufacturers for WordPress compatibility  
    const formattedManufacturers = userManufacturers.map(userManufacturer => ({
      term_id: userManufacturer.manufacturer.wordpressId || userManufacturer.manufacturer.id,
      name: userManufacturer.manufacturer.name,
      slug: userManufacturer.manufacturer.name.toLowerCase().replace(/\s+/g, '-'),
      category: userManufacturer.manufacturer.category || '',
      parent_id: userManufacturer.manufacturer.parentId || null
    }))

    // WordPress-compatible response format
    const response = {
      code: 200,
      message: 'User skills retrieved successfully',
      data: {
        skills: formattedSkills,
        equipment: formattedManufacturers,
        brands: formattedManufacturers, // Legacy alias for equipment
        job_id: jobId,
        user_id: user.id
      }
    }

    console.log('✅ [user/getskills] Skills retrieved:', {
      userId: user.id,
      jobId: jobId,
      skillCount: formattedSkills.length,
      equipmentCount: formattedManufacturers.length
    })

    return NextResponse.json(response, { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('Get user skills error:', error)
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