import { NextRequest, NextResponse } from 'next/server'
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

// Get WordPress posts (news/blog posts)
export async function GET(req: NextRequest) {
  try {
    // Extract JWT token from Authorization header if present
    const authHeader = req.headers.get('authorization')
    
    // For now, return empty array as there are no posts in the new system
    // This can be enhanced later when content management is implemented
    const posts: any[] = []

    return NextResponse.json(
      posts,
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('❌ [wp/v2/posts] Error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: 'Internal server error',
        data: []
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 