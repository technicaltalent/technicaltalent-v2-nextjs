import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

// Get all available languages
export async function GET(req: NextRequest) {
  try {
    // Get all languages from database
    const languages = await prisma.language.findMany({
      orderBy: {
        name: 'asc'
      }
    })

    // Format for WordPress compatibility - legacy frontend expects data.lang
    const formattedLanguages = languages.map(lang => ({
      term_id: lang.wordpressId,  // Legacy frontend expects term_id
      name: lang.name,
      code: lang.code,
      id: lang.id,
      wordpress_id: lang.wordpressId
    }))

    // Return WordPress-compatible response format - legacy expects data.lang
    return NextResponse.json(
      {
        code: 200,
        message: 'Languages retrieved successfully',
        data: {
          lang: formattedLanguages,  // Changed from 'languages' to 'lang'
          total: languages.length
        },
        lang: formattedLanguages  // Add lang at root level for legacy compatibility
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('Get languages error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: 'Internal server error',
        data: null
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 