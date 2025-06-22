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

export async function GET(request: NextRequest) {
  try {
    console.log('🎬 [roles/getfields] Getting equipment types and venue types...')

    // Get equipment types (from manufacturers categories)
    const equipmentTypes = await prisma.manufacturer.findMany({
      where: {
        parentId: null, // Only parent categories
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Format equipment types for legacy compatibility
    const formattedEquipmentTypes = equipmentTypes.map(manufacturer => ({
      term_id: manufacturer.wordpressId || manufacturer.id,
      name: manufacturer.name,
      id: manufacturer.id,
      wordpress_id: manufacturer.wordpressId
    }))

    // Define venue types (these could be stored in database later)
    const venueTypes = [
      { term_id: 1, name: 'Concert Hall', id: 'venue_1' },
      { term_id: 2, name: 'Theatre', id: 'venue_2' },
      { term_id: 3, name: 'Club/Bar', id: 'venue_3' },
      { term_id: 4, name: 'Festival', id: 'venue_4' },
      { term_id: 5, name: 'Corporate Event', id: 'venue_5' },
      { term_id: 6, name: 'Wedding', id: 'venue_6' },
      { term_id: 7, name: 'Conference', id: 'venue_7' },
      { term_id: 8, name: 'Stadium', id: 'venue_8' },
      { term_id: 9, name: 'Arena', id: 'venue_9' },
      { term_id: 10, name: 'Outdoor Event', id: 'venue_10' },
      { term_id: 11, name: 'Studio', id: 'venue_11' },
      { term_id: 12, name: 'House of Worship', id: 'venue_12' }
    ]

    console.log('✅ [roles/getfields] Returning data:', {
      equipmentTypesCount: formattedEquipmentTypes.length,
      venueTypesCount: venueTypes.length
    })

    // Return WordPress-compatible response format
    return NextResponse.json(
      {
        code: 200,
        message: 'Role fields retrieved successfully',
        equip_type: formattedEquipmentTypes,
        venue: venueTypes,
        data: {
          equip_type: formattedEquipmentTypes,
          venue: venueTypes
        }
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('❌ [roles/getfields] Error:', error)
    return NextResponse.json(
      {
        code: 500,
        message: 'Internal server error',
        equip_type: [],
        venue: []
      },
      { status: 500, headers: corsHeaders }
    )
  }
} 