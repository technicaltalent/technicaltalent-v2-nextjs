'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Redirect to the correct signin page with preserved parameters
    const redirect = searchParams.get('redirect')
    const callbackUrl = redirect ? `?callbackUrl=${encodeURIComponent(redirect)}` : ''
    router.replace(`/auth/signin${callbackUrl}`)
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
} 