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
  UserCheck, 
  Search, 
  Filter, 
  MoreHorizontal,
  Plus,
  Users,
  ChevronRight,
  ChevronDown,
  TreePine
} from 'lucide-react'
import { SkillsClient } from './skills-client'

interface Skill {
  id: string
  name: string
  category: string | null
  parentId: string | null
  isActive: boolean
  createdAt: Date
  children?: Skill[]
  userSkills: { userId: string }[]
  _count?: {
    children?: number
    userSkills: number
  }
}

async function getSkills(search = '', statusFilter = '', typeFilter = '') {
  // Build where conditions
  const where: any = {
    AND: [
      search ? {
        name: { contains: search, mode: 'insensitive' as const }
      } : {},
      statusFilter ? {
        isActive: statusFilter === 'ACTIVE'
      } : {},
      typeFilter === 'PARENT' ? {
        parentId: null
      } : typeFilter === 'CHILD' ? {
        parentId: { not: null }
      } : {}
    ].filter(Boolean)
  }

  const [parentSkills, totalSkills, totalUserSkills, filteredSkills] = await Promise.all([
    // Get parent skills with their children and user counts (for hierarchy display when no filters)
    !search && !statusFilter && !typeFilter ? prisma.skill.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            userSkills: {
              select: { userId: true }
            },
            _count: {
              select: {
                userSkills: true
              }
            }
          },
          orderBy: { name: 'asc' }
        },
        userSkills: {
          select: { userId: true }
        },
        _count: {
          select: {
            children: true,
            userSkills: true
          }
        }
      },
      orderBy: { name: 'asc' }
    }) : [],
    
    // Get total skills count
    prisma.skill.count(),
    
    // Get total user-skill relationships
    prisma.userSkill.count(),
    
    // Get filtered skills (when search/filters are applied)
    search || statusFilter || typeFilter ? prisma.skill.findMany({
      where,
      include: {
        userSkills: {
          select: { userId: true }
        },
        _count: {
          select: {
            userSkills: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    }) : []
  ])

  return { 
    parentSkills, 
    totalSkills, 
    totalUserSkills, 
    filteredSkills,
    hasFilters: !!(search || statusFilter || typeFilter)
  }
}

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

export default async function SkillsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ search?: string; status?: string; type?: string }> 
}) {
  const params = await searchParams
  const search = params.search || ''
  const status = params.status || ''
  const type = params.type || ''

  const { parentSkills, totalSkills, totalUserSkills, filteredSkills, hasFilters } = await getSkills(search, status, type)
  
  // Calculate stats
  const allSkills = await prisma.skill.findMany({
    select: { isActive: true, parentId: true }
  })
  
  const totalStats = {
    total: allSkills.length,
    active: allSkills.filter(s => s.isActive).length,
    parents: allSkills.filter(s => s.parentId === null).length,
    children: allSkills.filter(s => s.parentId !== null).length
  }

  const skillsToDisplay = hasFilters ? filteredSkills : parentSkills

  return (
    <SkillsClient
      skills={skillsToDisplay}
      totalStats={totalStats}
      totalUserSkills={totalUserSkills}
      hasFilters={hasFilters}
      initialSearch={search}
      initialStatus={status}
      initialType={type}
    />
  )
} 