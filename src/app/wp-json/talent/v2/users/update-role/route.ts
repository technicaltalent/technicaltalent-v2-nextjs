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

// Handle both POST and PUT methods for legacy compatibility
async function handleRoleUpdate(req: NextRequest) {
  try {
    // Get the request body and headers
    const body = await req.json()
    const authHeader = req.headers.get('Authorization')
    
    console.log('WordPress role update request:', body)
    
    // Forward the request to our new API endpoint with auth header
    const apiUrl = `${req.nextUrl.origin}/api/talent/v2/users/update-role`
    console.log('🔄 [update-role] Forwarding to:', apiUrl)
    console.log('🔄 [update-role] Body:', body)
    console.log('🔄 [update-role] Auth header present:', !!authHeader)
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader })
      },
      body: JSON.stringify(body)
    })
    
    console.log('🔄 [update-role] Response status:', response.status)
    
    const data = await response.json()
    
    // Return the response from our new API with CORS headers
    return NextResponse.json(data, { status: response.status, headers: corsHeaders })
    
  } catch (error: any) {
    console.error('WordPress role update redirect error:', error)
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

// Support both POST and PUT methods for maximum compatibility
export async function POST(req: NextRequest) {
  return handleRoleUpdate(req)
}

// Redirect to our new API endpoint
export async function PUT(req: NextRequest) {
  return handleRoleUpdate(req)
} 