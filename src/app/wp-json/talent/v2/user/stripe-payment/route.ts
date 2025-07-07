import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { verifyDualJWT } from '@/lib/jwt-utils'

// Lazy Stripe initialization to avoid build-time errors
function getStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required')
  }
  return new Stripe(stripeKey, {
    apiVersion: '2025-05-28.basil'
  })
}

// WordPress-compatible CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle preflight requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

// Validation schema for payment processing
const stripePaymentSchema = z.object({
  job_id: z.string().min(1, 'Job ID is required'),
  payment_method_id: z.string().optional(), // Stripe payment method ID
  payment_token: z.string().optional(), // Alternative payment token
  amount: z.union([z.string(), z.number()]).optional(), // Payment amount (fallback to job amount)
  currency: z.string().default('AUD'), // Currency code
  description: z.string().optional(), // Payment description
  metadata: z.record(z.any()).optional() // Additional metadata
})

// WordPress-compatible Stripe payment endpoint
export async function POST(request: NextRequest) {
  try {
    console.log('💳 [user/stripe-payment] Processing payment...')

    // Get user from JWT token with dual verification
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [user/stripe-payment] No auth header')
      return NextResponse.json(
        { code: 401, message: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.substring(7)
    
    // Use dual JWT verification for WordPress and NextAuth tokens
    const verificationResult = verifyDualJWT(token)
    if (!verificationResult) {
      console.log('❌ [user/stripe-payment] Invalid token')
      return NextResponse.json(
        { code: 401, message: 'Invalid token' },
        { status: 401, headers: corsHeaders }
      )
    }

    const decoded = verificationResult.decoded
    const userId = decoded.user_id
    console.log(`🔑 [user/stripe-payment] Using ${verificationResult.tokenType} token for user: ${decoded.user_email}`)

    // Parse request body
    const body = await request.json()
    console.log('📝 [user/stripe-payment] Payment request:', { 
      ...body, 
      payment_method_id: body.payment_method_id ? '***' : undefined,
      payment_token: body.payment_token ? '***' : undefined 
    })

    // Validate input data
    const validatedData = stripePaymentSchema.parse(body)
    const { job_id, payment_method_id, payment_token, amount, currency, description, metadata } = validatedData

    // Find the job
    const job = await prisma.job.findUnique({
      where: { id: job_id },
      include: {
        employer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        applications: {
          where: {
            talentId: userId,
            status: 'ACCEPTED'
          }
        }
      }
    })

    if (!job) {
      console.log('❌ [user/stripe-payment] Job not found')
      return NextResponse.json(
        { code: 404, message: 'Job not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if user is authorized to make payment for this job
    const isEmployer = job.employerId === userId
    const isAssignedTalent = job.applications.length > 0 || job.selectedTalent === userId
    
    if (!isEmployer && !isAssignedTalent) {
      console.log('❌ [user/stripe-payment] User not authorized for this job')
      return NextResponse.json(
        { code: 403, message: 'Not authorized to make payment for this job' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Determine payment amount (use provided amount or job rate)
    const paymentAmount = amount ? 
      (typeof amount === 'string' ? parseFloat(amount) : amount) : 
      (job.payRate ? Number(job.payRate) : 0)

    if (paymentAmount <= 0) {
      console.log('❌ [user/stripe-payment] Invalid payment amount')
      return NextResponse.json(
        { code: 400, message: 'Invalid payment amount' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Convert to cents for Stripe (AUD)
    const amountInCents = Math.round(paymentAmount * 100)

         // Create payment intent with Stripe
     const stripe = getStripe()
     const paymentIntentData: Stripe.PaymentIntentCreateParams = {
       amount: amountInCents,
       currency: currency.toLowerCase(),
       description: description || `Payment for job: ${job.title}`,
       metadata: {
         job_id: job_id,
         employer_id: job.employerId,
         payer_id: userId,
         job_title: job.title,
         ...metadata
       }
     }

     // Add payment method if provided
     if (payment_method_id) {
       paymentIntentData.payment_method = payment_method_id
       paymentIntentData.confirm = true // Auto-confirm if payment method provided
     }

     const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        jobId: job_id,
        payerId: userId,
        amount: paymentAmount,
        currency: currency.toUpperCase(),
        stripeChargeId: paymentIntent.id,
        status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PENDING'
      }
    })

    // Update job payment status if payment succeeded
    if (paymentIntent.status === 'succeeded') {
      await prisma.job.update({
        where: { id: job_id },
        data: {
          paymentStatus: 'PAID'
        }
      })
      console.log(`✅ [user/stripe-payment] Job payment completed for: ${job.title}`)
    }

    console.log(`✅ [user/stripe-payment] Payment intent created:`, {
      paymentIntentId: paymentIntent.id,
      jobTitle: job.title,
      amount: `${currency.toUpperCase()} $${paymentAmount}`,
      status: paymentIntent.status,
      transactionId: transaction.id
    })

    // Return WordPress-compatible response
    return NextResponse.json(
      {
        code: 200,
        message: 'Payment processed successfully',
        data: {
          payment_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          transaction_id: transaction.id,
          job_id: job_id,
          job_title: job.title,
          amount: paymentAmount,
          currency: currency.toUpperCase(),
          status: paymentIntent.status,
          requires_action: paymentIntent.status === 'requires_action',
          requires_payment_method: paymentIntent.status === 'requires_payment_method',
          processing: paymentIntent.status === 'processing',
          succeeded: paymentIntent.status === 'succeeded',
          employer: {
            name: `${job.employer.firstName} ${job.employer.lastName}`,
            email: job.employer.email
          },
          created_at: new Date().toISOString()
        }
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('❌ [user/stripe-payment] Error processing payment:', error)
    
    if (error instanceof z.ZodError) {
      console.error('❌ [user/stripe-payment] Validation errors:', error.errors)
      return NextResponse.json(
        {
          code: 400,
          message: 'Validation error: ' + error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
          errors: error.errors
        },
        { status: 400, headers: corsHeaders }
      )
    }

    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        {
          code: 400,
          message: 'Payment failed: ' + error.message,
          stripe_error: {
            type: error.type,
            code: error.code,
            decline_code: error.decline_code
          }
        },
        { status: 400, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        code: 500,
        message: 'Internal server error while processing payment'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
