import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { trackEvent, EVENTS } from '@/lib/analytics'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔐 Auth attempt for:', credentials?.email)
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials')
          return null
        }

        try {
          // Debug: Check database connection
          const userCount = await prisma.user.count()
          console.log('🔍 Total users in database:', userCount)
          
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { profile: true }
          })

          if (!user) {
            console.log('❌ User not found:', credentials.email)
            // Debug: Let's see what users DO exist
            const allEmails = await prisma.user.findMany({
              select: { email: true }
            })
            console.log('🔍 All emails in database:', allEmails.map(u => u.email))
            return null
          }

          if (!user.passwordHash) {
            console.log('❌ User has no password hash:', credentials.email)
            return null
          }

          console.log('🔍 Comparing password for user:', user.email)
          const isPasswordValid = await compare(credentials.password, user.passwordHash)
          console.log('🔐 Password valid:', isPasswordValid)
          
          if (!isPasswordValid) {
            console.log('❌ Invalid password for:', credentials.email)
            return null
          }

          // Track login event (skip for now to avoid issues)
          try {
            await trackEvent(user.id, EVENTS.USER_LOGIN, {
              email: user.email,
              role: user.role
            })
          } catch (trackError) {
            console.log('⚠️ Analytics tracking failed:', trackError)
            // Continue with login even if tracking fails
          }

          const userSession = {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            status: user.status
          }

          console.log('✅ Auth successful for:', user.email, 'Role:', user.role)
          return userSession
        } catch (error) {
          console.error('❌ Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role
        token.status = user.status
      }
      return token
    },
    session: async ({ session, token }) => {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.status = token.status as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET
}

// Types for NextAuth session
declare module 'next-auth' {
  interface User {
    role: string
    status: string
  }
  
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      status: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    status: string
  }
} 