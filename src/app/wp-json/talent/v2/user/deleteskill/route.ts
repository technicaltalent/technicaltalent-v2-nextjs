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

// Validate delete skill request
const deleteSkillSchema = z.object({
  skillid: z.union([z.string(), z.number()]),
  job_id: z.union([z.string(), z.number()]).optional(),
})

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// WordPress-compatible delete skill endpoint
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
    console.log(`🔑 [user/deleteskill] Using ${verificationResult.tokenType} token for user: ${decoded.user_email}`)

    // Parse request body
    const body = await request.json()
    console.log('🗑️ [deleteskill] Request body:', body)
    
    const validatedData = deleteSkillSchema.parse(body)
    const { skillid, job_id } = validatedData

    console.log('🗑️ [deleteskill] Deleting skill:', { skillid, job_id, userId: userId })

    // Convert skillid to number for WordPress compatibility
    const skillWordpressId = parseInt(String(skillid))
    
    if (isNaN(skillWordpressId)) {
      return NextResponse.json({
        code: 400,
        message: 'Invalid skill ID provided',
        data: null
      }, { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Find the skill by WordPress ID
    const skill = await prisma.skill.findFirst({
      where: {
        wordpressId: skillWordpressId,
        isActive: true
      }
    })

    if (!skill) {
      return NextResponse.json({
        code: 404,
        message: 'Skill not found',
        data: null
      }, { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    console.log('🗑️ [deleteskill] Found skill to delete:', { id: skill.id, name: skill.name, wpId: skill.wordpressId })

    // Delete the user's skill assignment
    const deleteResult = await prisma.userSkill.deleteMany({
      where: {
        userId: userId,
        skillId: skill.id
      }
    })

    console.log('🗑️ [deleteskill] Deleted user skills:', deleteResult.count)

    // If no skills were deleted, it means the user didn't have this skill
    if (deleteResult.count === 0) {
      return NextResponse.json({
        code: 404,
        message: 'User does not have this skill assigned',
        data: null
      }, { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // WordPress-compatible success response
    const response = {
      code: 200,
      message: 'Skill deleted successfully',
      data: {
        skill_id: skillWordpressId,
        skill_name: skill.name,
        user_id: userId,
        job_id: job_id || null,
        deleted_count: deleteResult.count
      }
    }

    console.log('✅ [deleteskill] Success! Skill deleted:', { skillId: skillWordpressId, skillName: skill.name, deletedCount: deleteResult.count })

    return NextResponse.json(response, { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('Delete skill error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        code: 400,
        message: 'Invalid request data',
        errors: error.errors
      }, { 
        status: 400, 
        headers: corsHeaders 
      })
    }

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