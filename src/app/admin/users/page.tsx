import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  MapPin
} from 'lucide-react'
import { UsersClient } from './users-client'

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  role: string
  status: string
  createdAt: Date
  profile?: {
    location: string | null
    profileImageUrl: string | null
  } | null
}

async function getUsers(page = 1, limit = 20, search = '', roleFilter = '', statusFilter = '') {
  const skip = (page - 1) * limit
  
  const where = {
    AND: [
      search ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } }
        ]
      } : {},
      roleFilter ? { role: roleFilter as any } : {},
      statusFilter ? { status: statusFilter as any } : {}
    ].filter(Boolean)
  }

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        profile: {
          select: {
            location: true,
            profileImageUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.user.count({ where })
  ])

  return { users, totalCount }
}

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

export default async function UsersPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ page?: string; search?: string; role?: string; status?: string }> 
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ''
  const role = params.role || ''
  const status = params.status || ''
  
  const { users, totalCount } = await getUsers(page, 20, search, role, status)
  
  // Get total stats across all users (not just current page)
  const allUsers = await prisma.user.findMany({
    select: { role: true, status: true }
  })
  
  const totalStats = {
    total: allUsers.length,
    talent: allUsers.filter(u => u.role === 'TALENT').length,
    employers: allUsers.filter(u => u.role === 'EMPLOYER').length,
    active: allUsers.filter(u => u.status === 'ACTIVE').length
  }

  const totalPages = Math.ceil(totalCount / 20)

  return (
    <UsersClient
      users={users}
      totalCount={totalCount}
      totalStats={totalStats}
      totalPages={totalPages}
      currentPage={page}
      initialSearch={search}
      initialRole={role}
      initialStatus={status}
    />
  )
} 