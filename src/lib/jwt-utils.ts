import jwt from 'jsonwebtoken'

interface JWTPayload {
  user_id: string
  user_email: string
  user_role: string
  iss?: string // WordPress issuer
  iat?: number
  exp?: number
  data?: any // WordPress user data
}

interface VerificationResult {
  decoded: JWTPayload
  tokenType: 'wordpress' | 'nextauth'
  success: boolean
}

/**
 * Dual JWT verification for seamless WordPress → NextAuth migration
 * Supports both WordPress JWT tokens and NextAuth tokens during transition
 */
export function verifyDualJWT(token: string): VerificationResult | null {
  if (!token) {
    return null
  }

  // Get secrets from environment
  const nextAuthSecret = process.env.NEXTAUTH_SECRET || 'development-secret-key-replace-in-production'
  const wordpressSecret = process.env.WORDPRESS_JWT_SECRET || process.env.JWT_AUTH_SECRET_KEY || nextAuthSecret

  console.log('🔍 [JWT] Attempting dual token verification...')

  let nextAuthError: any = null
  let wordpressError: any = null

  // Try NextAuth token first (preferred)
  try {
    const decoded = jwt.verify(token, nextAuthSecret) as JWTPayload
    console.log('✅ [JWT] NextAuth token verified successfully')
    
    return {
      decoded,
      tokenType: 'nextauth',
      success: true
    }
  } catch (error) {
    nextAuthError = error
    console.log('⚠️ [JWT] NextAuth verification failed, trying WordPress format...')
  }

  // Try WordPress JWT token format
  try {
    const decoded = jwt.verify(token, wordpressSecret) as any
    console.log('✅ [JWT] WordPress token verified successfully')

    // Transform WordPress token format to NextAuth format
    let transformedPayload: JWTPayload

    if (decoded.data && decoded.data.user) {
      // WordPress JWT Auth plugin format
      const wpUser = decoded.data.user
      transformedPayload = {
        user_id: wpUser.id?.toString() || decoded.data.user.id?.toString(),
        user_email: wpUser.user_email || wpUser.email,
        user_role: wpUser.roles?.[0] || 'talent', // Default to talent
        iss: decoded.iss,
        iat: decoded.iat,
        exp: decoded.exp
      }
    } else if (decoded.user_id || decoded.userId) {
      // Direct WordPress token format
      transformedPayload = {
        user_id: decoded.user_id || decoded.userId,
        user_email: decoded.user_email || decoded.email,
        user_role: decoded.user_role || decoded.role || 'talent'
      }
    } else {
      throw new Error('Unrecognized WordPress token format')
    }

    return {
      decoded: transformedPayload,
      tokenType: 'wordpress',
      success: true
    }
  } catch (error) {
    wordpressError = error
    console.log('❌ [JWT] Both token verifications failed:', {
      nextAuth: nextAuthError?.message || 'Unknown error',
      wordpress: wordpressError?.message || 'Unknown error'
    })
  }

  return null
}

/**
 * Legacy JWT verification (backwards compatibility)
 * @deprecated Use verifyDualJWT instead
 */
export function verifyJWT(token: string, secret?: string): any {
  const result = verifyDualJWT(token)
  return result?.decoded || null
}

/**
 * Check if a token is WordPress format (for analytics/logging)
 */
export function isWordPressToken(token: string): boolean {
  try {
    const payload = jwt.decode(token) as any
    return !!(payload?.data?.user || payload?.iss?.includes('wordpress'))
  } catch {
    return false
  }
}

/**
 * Get token type without verification (for logging)
 */
export function getTokenType(token: string): 'wordpress' | 'nextauth' | 'unknown' {
  try {
    const payload = jwt.decode(token) as any
    if (payload?.data?.user || payload?.iss?.includes('wordpress')) {
      return 'wordpress'
    }
    if (payload?.user_id && payload?.user_email && !payload?.data) {
      return 'nextauth'
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
} 