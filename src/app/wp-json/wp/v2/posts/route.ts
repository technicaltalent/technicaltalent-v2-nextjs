import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('[wp] / status=200')
    
    // Return sample industry news data in WordPress post format
    // This matches what the iOS app expects from /wp-json/wp/v2/posts
    const posts = [
      {
        id: 1,
        date: "2024-01-15T10:00:00Z",
        date_gmt: "2024-01-15T10:00:00Z",
        guid: {
          rendered: "https://dev.technicaltalent.com.au/post/1"
        },
        modified: "2024-01-15T10:00:00Z",
        modified_gmt: "2024-01-15T10:00:00Z",
        slug: "audio-industry-trends-2024",
        status: "publish",
        type: "post",
        link: "https://dev.technicaltalent.com.au/news/audio-industry-trends-2024",
        title: {
          rendered: "Audio Industry Trends 2024"
        },
        content: {
          rendered: "<p>The audio industry continues to evolve with new technologies and opportunities for technical professionals.</p>",
          protected: false
        },
        excerpt: {
          rendered: "<p>Latest trends in the audio industry for technical talent professionals.</p>",
          protected: false
        },
        author: 1,
        featured_media: 0,
        comment_status: "open",
        ping_status: "open",
        sticky: false,
        template: "",
        format: "standard",
        meta: [],
        categories: [1],
        tags: [],
        _links: {
          self: [
            {
              href: "https://dev.technicaltalent.com.au/wp-json/wp/v2/posts/1"
            }
          ]
        }
      },
      {
        id: 2,
        date: "2024-01-10T08:30:00Z",
        date_gmt: "2024-01-10T08:30:00Z",
        guid: {
          rendered: "https://dev.technicaltalent.com.au/post/2"
        },
        modified: "2024-01-10T08:30:00Z",
        modified_gmt: "2024-01-10T08:30:00Z",
        slug: "lighting-technology-updates",
        status: "publish",
        type: "post",
        link: "https://dev.technicaltalent.com.au/news/lighting-technology-updates",
        title: {
          rendered: "Lighting Technology Updates"
        },
        content: {
          rendered: "<p>New developments in LED and intelligent lighting systems are creating exciting opportunities.</p>",
          protected: false
        },
        excerpt: {
          rendered: "<p>Updates on the latest lighting technologies and industry developments.</p>",
          protected: false
        },
        author: 1,
        featured_media: 0,
        comment_status: "open",
        ping_status: "open",
        sticky: false,
        template: "",
        format: "standard",
        meta: [],
        categories: [2],
        tags: [],
        _links: {
          self: [
            {
              href: "https://dev.technicaltalent.com.au/wp-json/wp/v2/posts/2"
            }
          ]
        }
      },
      {
        id: 3,
        date: "2024-01-05T14:15:00Z",
        date_gmt: "2024-01-05T14:15:00Z",
        guid: {
          rendered: "https://dev.technicaltalent.com.au/post/3"
        },
        modified: "2024-01-05T14:15:00Z",
        modified_gmt: "2024-01-05T14:15:00Z",
        slug: "video-production-careers",
        status: "publish",
        type: "post",
        link: "https://dev.technicaltalent.com.au/news/video-production-careers",
        title: {
          rendered: "Video Production Career Opportunities"
        },
        content: {
          rendered: "<p>The video production industry is booming with new opportunities for skilled technical professionals.</p>",
          protected: false
        },
        excerpt: {
          rendered: "<p>Explore career opportunities in the growing video production industry.</p>",
          protected: false
        },
        author: 1,
        featured_media: 0,
        comment_status: "open",
        ping_status: "open",
        sticky: false,
        template: "",
        format: "standard",
        meta: [],
        categories: [3],
        tags: [],
        _links: {
          self: [
            {
              href: "https://dev.technicaltalent.com.au/wp-json/wp/v2/posts/3"
            }
          ]
        }
      }
    ]

    return NextResponse.json(posts, { status: 200 })

  } catch (error) {
    console.error('❌ [wp/posts] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 