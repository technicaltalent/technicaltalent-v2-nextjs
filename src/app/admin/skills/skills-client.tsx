'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  TreePine,
  X
} from 'lucide-react'

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
  parent?: {
    id: string
    name: string
  }
}

interface SkillStats {
  total: number
  active: number
  parents: number
  children: number
}

function SkillRow({ 
  skill, 
  level = 0, 
  isExpanded = false, 
  onToggle,
  hasFilters = false 
}: {
  skill: Skill
  level?: number
  isExpanded?: boolean
  onToggle?: () => void
  hasFilters?: boolean
}) {
  const hasChildren = skill.children && skill.children.length > 0
  const userCount = skill._count?.userSkills || 0
  const childrenCount = skill._count?.children || 0

  return (
    <>
      <TableRow className={level > 0 ? 'bg-gray-50' : ''}>
        <TableCell>
          <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
            {hasChildren && !hasFilters ? (
              <button onClick={onToggle} className="mr-2 p-1 hover:bg-gray-200 rounded">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6 mr-2"></div>
            )}
            <div>
              <div className="font-medium">{skill.name}</div>
              {skill.category && (
                <div className="text-sm text-gray-500">{skill.category}</div>
              )}
              {hasFilters && skill.parent && (
                <div className="text-xs text-blue-600">Parent: {skill.parent.name}</div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          {skill.parentId === null ? (
            <Badge variant="secondary">
              Parent {!hasFilters ? `(${childrenCount} children)` : ''}
            </Badge>
          ) : (
            <Badge variant="outline">
              Child Skill
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4 text-gray-400" />
            <span>{userCount}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={skill.isActive ? 'default' : 'secondary'}>
            {skill.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="text-sm text-gray-500">
            {skill.createdAt.toLocaleDateString()}
          </div>
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
      
      {/* Render children if expanded and not filtered */}
      {hasChildren && isExpanded && !hasFilters && skill.children?.map((child) => (
        <SkillRow 
          key={child.id} 
          skill={child} 
          level={level + 1}
          hasFilters={hasFilters}
        />
      ))}
    </>
  )
}

function SkillsTable({ skills, hasFilters }: { skills: Skill[], hasFilters: boolean }) {
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set())

  const toggleExpand = (skillId: string) => {
    const newExpanded = new Set(expandedSkills)
    if (newExpanded.has(skillId)) {
      newExpanded.delete(skillId)
    } else {
      newExpanded.add(skillId)
    }
    setExpandedSkills(newExpanded)
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Skill Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skills.map((skill) => (
            <SkillRow 
              key={skill.id} 
              skill={skill}
              isExpanded={expandedSkills.has(skill.id)}
              onToggle={() => toggleExpand(skill.id)}
              hasFilters={hasFilters}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SkillsStats({ totalStats, totalUserSkills }: {
  totalStats: SkillStats
  totalUserSkills: number
}) {
  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStats.total}</div>
          <p className="text-xs text-muted-foreground">All skill categories</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Parent Categories</CardTitle>
          <TreePine className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStats.parents}</div>
          <p className="text-xs text-muted-foreground">Main categories</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Child Skills</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStats.children}</div>
          <p className="text-xs text-muted-foreground">Specific skills</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Skill Assignments</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUserSkills}</div>
          <p className="text-xs text-muted-foreground">User-skill relationships</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function SkillsClient({ 
  skills,
  totalStats,
  totalUserSkills,
  hasFilters,
  initialSearch,
  initialStatus,
  initialType
}: {
  skills: Skill[]
  totalStats: SkillStats
  totalUserSkills: number
  hasFilters: boolean
  initialSearch: string
  initialStatus: string
  initialType: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [typeFilter, setTypeFilter] = useState(initialType)

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    
    if (searchTerm) {
      params.set('search', searchTerm)
    } else {
      params.delete('search')
    }
    
    if (statusFilter) {
      params.set('status', statusFilter)
    } else {
      params.delete('status')
    }

    if (typeFilter) {
      params.set('type', typeFilter)
    } else {
      params.delete('type')
    }
    
    const newUrl = `/admin/skills?${params.toString()}`
    router.push(newUrl)
    router.refresh() // Force server component to re-execute
  }, [searchTerm, statusFilter, typeFilter, router, searchParams])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setTypeFilter('')
  }

  const hasActiveFilters = searchTerm || statusFilter || typeFilter

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Skills Management</h1>
          <p className="text-muted-foreground">
            Manage skill categories and individual skills ({skills.length} skills)
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Skill
        </Button>
      </div>

      <SkillsStats totalStats={totalStats} totalUserSkills={totalUserSkills} />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Skills Directory</CardTitle>
          <CardDescription>
            {hasFilters ? 'Filtered results' : 'Hierarchical view of all skills and categories'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search skills and categories..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-[140px]"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-[140px]"
            >
              <option value="">All Types</option>
              <option value="PARENT">Parent Categories</option>
              <option value="CHILD">Child Skills</option>
            </select>
            
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="px-3">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              <span>Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchTerm}"
                </Badge>
              )}
              {statusFilter && (
                <Badge variant="secondary" className="text-xs">
                  Status: {statusFilter}
                </Badge>
              )}
              {typeFilter && (
                <Badge variant="secondary" className="text-xs">
                  Type: {typeFilter}
                </Badge>
              )}
            </div>
          )}

          {/* Skills Table */}
          <SkillsTable skills={skills} hasFilters={hasFilters} />

          {skills.length === 0 && (
            <div className="text-center py-12">
              <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No skills found</h3>
              <p className="mt-1 text-gray-500">
                {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Get started by adding your first skill category.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 