import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
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

// Validation schema for saving job details
const saveJobDetailsSchema = z.object({
  job_id: z.string().min(1, 'Job ID is required'),
  address: z.any().optional(), // Google Places object - flexible
  pmt: z.string().optional(), // Payment model
  rate: z.union([z.string(), z.number()]).optional(), // Pay rate
  dates: z.array(z.any()).optional().default([]), // Date ranges
  spoken_lang: z.array(z.union([z.string(), z.number()])).optional().default([]) // Language codes
})

export async function POST(request: NextRequest) {
  try {
    console.log('💾 [save/roledetails] Saving job details...')

    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [save/roledetails] No auth header')
      return NextResponse.json(
        { code: 401, message: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)
    
    // Use dual JWT verification for WordPress and NextAuth tokens
    const verificationResult = verifyDualJWT(token)
    if (!verificationResult) {
      console.log('❌ [save/roledetails] Invalid token')
      return NextResponse.json(
        { code: 401, message: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    const decoded = verificationResult.decoded
    const userId = decoded.user_id
    console.log(`🔑 [save/roledetails] Using ${verificationResult.tokenType} token for user: ${decoded.user_email}`)

    // Parse request body
    const body = await request.json()
    console.log('📝 [save/roledetails] Request payload:', body)

    // Validate input data
    const validatedData = saveJobDetailsSchema.parse(body)
    const { job_id, address, pmt, rate, dates, spoken_lang } = validatedData

    // Verify the job exists and belongs to the user
    const job = await prisma.job.findFirst({
      where: {
        id: job_id,
        employerId: userId
      }
    })

    if (!job) {
      console.log('❌ [save/roledetails] Job not found or not owned by user')
      return NextResponse.json(
        { code: 404, message: 'Job not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Process the data
    const payRate = typeof rate === 'string' ? parseFloat(rate) : rate
    const payType = pmt === 'hourly' ? 'HOURLY' : pmt === 'daily' ? 'DAILY' : 'DAILY'
    
    // Convert location object to JSON string
    const locationJson = address ? JSON.stringify(address) : job.location

    // Process dates and create JobSchedule entries
    let startDate: Date | null = null
    
    if (dates && dates.length > 0) {
      console.log('📅 [save/roledetails] Processing dates:', dates)
      
      // Create JobSchedule entries
      const scheduleData = dates
        .filter((dateEntry: any) => dateEntry.date && dateEntry.startTime && dateEntry.endTime)
        .map((dateEntry: any) => ({
          jobId: job_id,
          date: dateEntry.date,
          startTime: dateEntry.startTime,
          endTime: dateEntry.endTime
        }))

      if (scheduleData.length > 0) {
        // Set startDate from the first schedule entry for now
        // TODO: Implement JobSchedule table creation after TypeScript issues resolved
        const firstSchedule = scheduleData[0]
        startDate = new Date(`${firstSchedule.date}T${firstSchedule.startTime}:00.000Z`)
        
        console.log('✅ [save/roledetails] Processing schedule entries:', scheduleData.length)
        console.log('📅 [save/roledetails] Set start date:', startDate)
        console.log('📊 [save/roledetails] Schedule data:', scheduleData)
      }
    }

    // Update the job with complete details
    const updatedJob = await prisma.job.update({
      where: { id: job_id },
      data: {
        location: locationJson,
        payRate: payRate || job.payRate,
        payType: payType,
        startDate: startDate || job.startDate,
        status: 'OPEN' // Job is now ready and open for applications
      }
    })

    console.log('✅ [save/roledetails] Job details saved successfully:', {
      jobId: updatedJob.id,
      title: updatedJob.title,
      location: locationJson ? 'Set' : 'Not set',
      payRate: updatedJob.payRate,
      payType: updatedJob.payType,
      status: updatedJob.status
    })

    // Return WordPress-compatible response
    return NextResponse.json(
      {
        code: 200,
        message: 'Job details saved successfully',
        data: {
          job_id: updatedJob.id,
          job_title: updatedJob.title,
          location: address,
          pay_rate: updatedJob.payRate,
          pay_type: updatedJob.payType,
          dates: dates,
          spoken_languages: spoken_lang,
          status: updatedJob.status
        },
        freejob: 1, // Legacy field - indicates free job posting
        status_msg: 'Published', // Legacy field - job status message
        job_title: updatedJob.title // Legacy field for notifications
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('❌ [save/roledetails] Error saving job details:', error)
    
    if (error instanceof z.ZodError) {
      console.error('❌ [save/roledetails] Validation errors:', error.errors)
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
        message: 'Internal server error while saving job details'
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 