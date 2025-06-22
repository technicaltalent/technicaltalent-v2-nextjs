import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
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

// Validation schema for job creation - flexible for legacy compatibility
const createJobSchema = z.object({
  jobTilte: z.string().min(1, 'Job title is required'), // Legacy typo preserved
  equipType: z.array(z.union([z.string(), z.number(), z.undefined(), z.null()])).optional().default([]),
  venueType: z.array(z.union([z.string(), z.number(), z.undefined(), z.null()])).optional().default([])
})

export async function POST(request: NextRequest) {
  try {
    console.log('🎬 [create/role] Creating new job role...')

    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [create/role] No auth header')
      return NextResponse.json(
        { code: 401, message: 'Authentication required' },
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
      console.log('❌ [create/role] Invalid token')
      return NextResponse.json(
        { code: 401, message: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Parse request body
    const body = await request.json()
    console.log('📝 [create/role] Request payload:', body)
    console.log('📝 [create/role] Raw equipType:', body.equipType)
    console.log('📝 [create/role] Raw venueType:', body.venueType)

    // Validate input data
    const validatedData = createJobSchema.parse(body)
    const { jobTilte, equipType, venueType } = validatedData

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      console.log('❌ [create/role] User not found')
      return NextResponse.json(
        { code: 404, message: 'User not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Convert equipment and venue types to numbers for database lookup
    // Filter out undefined, null, and invalid values
    const equipTypeIds = equipType
      .filter(id => id !== undefined && id !== null && id !== '')
      .map(id => typeof id === 'string' ? parseInt(id) : Number(id))
      .filter(id => !isNaN(id))
    
    const venueTypeIds = venueType
      .filter(id => id !== undefined && id !== null && id !== '')
      .map(id => typeof id === 'string' ? parseInt(id) : Number(id))
      .filter(id => !isNaN(id))

    console.log('🔢 [create/role] Processed IDs:', {
      equipTypeIds,
      venueTypeIds
    })

    // Get equipment types from manufacturers
    let equipmentNames: string[] = []
    if (equipTypeIds.length > 0) {
      const manufacturers = await prisma.manufacturer.findMany({
        where: {
          wordpressId: { in: equipTypeIds }
        }
      })
      equipmentNames = manufacturers.map(m => m.name)
    }

    // Create the job
    const newJob = await prisma.job.create({
      data: {
        title: jobTilte,
        description: `Job requiring ${equipmentNames.join(', ')} expertise`,
        employerId: user.id,
        status: 'OPEN',
        location: 'To be specified', // Will be set in next step
        payRate: 0,
        payType: 'DAILY'
      }
    })

    console.log('✅ [create/role] Job created successfully:', {
      jobId: newJob.id,
      title: newJob.title,
      employerId: newJob.employerId
    })

    // Return WordPress-compatible response
    return NextResponse.json(
      {
        code: 200,
        message: 'Job role created successfully',
        job_id: newJob.id, // Legacy app expects this format
        data: {
          id: newJob.id,
          title: newJob.title,
          employer_id: newJob.employerId,
          equipment_types: equipTypeIds,
          venue_types: venueTypeIds,
          equipment_names: equipmentNames,
          status: newJob.status,
          created_at: newJob.createdAt
        }
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('❌ [create/role] Error creating job:', error)
    
    if (error instanceof z.ZodError) {
      console.error('❌ [create/role] Validation errors:', error.errors)
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
        message: 'Internal server error while creating job role'
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 