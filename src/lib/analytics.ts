import { PostHog } from 'posthog-node'

// Server-side PostHog client - only initialize if API key is present
let serverPostHog: PostHog | null = null

if (process.env.POSTHOG_API_KEY && process.env.POSTHOG_API_KEY !== 'test-key') {
  serverPostHog = new PostHog(
    process.env.POSTHOG_API_KEY,
    { 
      host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
      flushAt: 1,
      flushInterval: 1000
    }
  )
}

// Server-side event tracking
export async function trackEvent(
  userId: string,
  event: string,
  properties?: Record<string, any>
) {
  // Skip tracking if PostHog is not configured
  if (!serverPostHog) {
    console.log(`📊 Analytics (skipped): ${event} for user ${userId}`, properties)
    return
  }

  try {
    serverPostHog.capture({
      distinctId: userId,
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        platform: 'web',
        source: 'nextjs-api'
      }
    })
    
    // Ensure events are sent
    await serverPostHog.flush()
    console.log(`📊 Analytics tracked: ${event} for user ${userId}`)
  } catch (error) {
    console.error('PostHog server tracking error:', error)
  }
}

// Event types for type safety
export const EVENTS = {
  USER_REGISTERED: 'user_registered',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  JOB_CREATED: 'job_created',
  JOB_VIEWED: 'job_viewed',
  JOB_UPDATED: 'job_updated',
  JOB_APPLICATION: 'job_application',
  JOBS_VIEWED: 'jobs_viewed',
  SKILL_ADDED: 'skill_added',
  SKILLS_VIEWED: 'skills_viewed',
  SKILL_UPDATED: 'skill_updated',
  PAYMENT_COMPLETED: 'payment_completed',
  ADMIN_ACTION: 'admin_action'
} as const

export type EventType = typeof EVENTS[keyof typeof EVENTS] 