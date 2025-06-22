import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Add CORS headers for legacy app testing
  response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3001')
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