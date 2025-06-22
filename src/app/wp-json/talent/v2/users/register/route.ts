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

// Map legacy field names to our API format
function mapFieldNames(body: any) {
  const mapped: any = {}
  
  // Email mapping
  mapped.email = body.Email || body.email || body.user_email || body.username
  
  // Password mapping  
  mapped.password = body.Password || body.password || body.user_password
  
  // Name mapping - handle the specific legacy form field names
  mapped.first_name = body.First_Name || body.first_name || body.firstName || body.fname || body.user_first_name
  mapped.last_name = body.Last_Name || body.last_name || body.lastName || body.lname || body.user_last_name
  
  // Role mapping - default to 'talent' if not specified
  mapped.role = body.role || body.user_role || body.account_type || 'talent'
  
  // Phone mapping - handle the legacy 'Number' field name
  mapped.phone = body.Number || body.phone || body.phone_number || body.user_phone
  
  // Additional fields that might be in the form
  if (body.business_name) mapped.business_name = body.business_name
  if (body.AbnNumber) mapped.abn_number = body.AbnNumber
  
  return mapped
}

// Redirect to our new API endpoint
export async function POST(req: NextRequest) {
  try {
    // Get the request body
    const originalBody = await req.json()
    
    console.log('Original registration request:', originalBody)
    
    // Map field names to our expected format
    const mappedBody = mapFieldNames(originalBody)
    
    console.log('Mapped registration request:', mappedBody)
    
    // Forward the request to our new API endpoint
    const response = await fetch(`${req.nextUrl.origin}/api/talent/v2/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mappedBody)
    })
    
    const data = await response.json()
    
    // Return the response from our new API with CORS headers
    return NextResponse.json(data, { status: response.status, headers: corsHeaders })
    
  } catch (error) {
    console.error('WordPress registration redirect error:', error)
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