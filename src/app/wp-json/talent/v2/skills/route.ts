import { NextRequest, NextResponse } from 'next/server'

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

// Redirect to our new API endpoint
export async function GET(req: NextRequest) {
  try {
    // Forward the request to our new API endpoint
    const response = await fetch(`${req.nextUrl.origin}/api/talent/v2/skills`)
    
    const data = await response.json()
    
    // Return the response from our new API with CORS headers
    return NextResponse.json(data, { status: response.status, headers: corsHeaders })
    
  } catch (error) {
    console.error('WordPress skills redirect error:', error)
    return NextResponse.json(
      {
        code: 'rest_internal_server_error',
        message: 'Internal server error',
        data: { status: 500 }
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 