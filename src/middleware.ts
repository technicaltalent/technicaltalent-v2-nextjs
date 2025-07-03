import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Get the origin from the request
  const origin = request.headers.get('origin')
  
  // Allow requests from local development and production Netlify domain
  const allowedOrigins = [
    'http://localhost:3001',
    'https://remarkable-praline-b170c1.netlify.app'
  ]
  
  // Set CORS headers
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else {
    // Fallback to allow all origins for API routes (WordPress compatibility)
    response.headers.set('Access-Control-Allow-Origin', '*')
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers })
  }
  
  // Handle legacy Next.js image optimization requests
  if (request.nextUrl.pathname === '/_next/image') {
    const imageUrl = request.nextUrl.searchParams.get('url')
    
    if (imageUrl) {
      // Instead of redirecting, proxy the request to the direct image URL
      const directUrl = new URL(imageUrl, request.url)
      return NextResponse.rewrite(directUrl)
    }
  }
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/_next/image'
  ]
} 