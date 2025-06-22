import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

// Initialize Stripe lazily only when needed
function getStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required')
  }
  return new Stripe(stripeKey, {
    apiVersion: '2025-05-28.basil',
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, currency = 'aud', description, user_token } = body

    // Verify user token
    if (!user_token) {
      return NextResponse.json(
        { error: 'User token is required' },
        { status: 401 }
      )
    }

    let userId: string
    try {
      const decoded = jwt.verify(user_token, process.env.NEXTAUTH_SECRET!) as any
      userId = decoded.user_id
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid user token' },
        { status: 401 }
      )
    }

    // Create payment intent
    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description,
      metadata: {
        userId,
      },
    })

    // Log payment attempt (simplified for now)
    console.log('Payment intent created:', {
      userId,
      amount,
      currency,
      paymentIntentId: paymentIntent.id,
      description,
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('Payment creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
