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
  Users, 
  Search, 
  Filter, 
  MoreHorizontal,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  MapPin,
  X
} from 'lucide-react'

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

interface UserStats {
  total: number
  talent: number
  employers: number
  active: number
}

function UserTableRow({ user }: { user: User }) {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'
  
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            {user.profile?.profileImageUrl ? (
              <img 
                src={user.profile.profileImageUrl} 
                alt={fullName}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-gray-600">
                {fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            )}
          </div>
          <div>
            <div className="font-medium">{fullName}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={
          user.role === 'TALENT' ? 'default' : 
          user.role === 'EMPLOYER' ? 'secondary' : 
          'outline'
        }>
          {user.role}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}>
          {user.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <Phone className="h-3 w-3" />
          <span>{user.phone || 'N/A'}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <MapPin className="h-3 w-3" />
          <span>{user.profile?.location ? JSON.parse(user.profile.location).addressName || 'N/A' : 'N/A'}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>{user.createdAt.toLocaleDateString()}</span>
        </div>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function UserStats({ 
  users, 
  totalStats 
}: { 
  users: User[]; 
  totalStats: UserStats
}) {
  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStats.total}</div>
          <p className="text-xs text-muted-foreground">All registered users</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Talent</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStats.talent}</div>
          <p className="text-xs text-muted-foreground">Registered talent</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Employers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStats.employers}</div>
          <p className="text-xs text-muted-foreground">Registered employers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStats.active}</div>
          <p className="text-xs text-muted-foreground">Currently active</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function UsersClient({ 
  users,
  totalCount,
  totalStats,
  totalPages,
  currentPage,
  initialSearch,
  initialRole,
  initialStatus
}: {
  users: User[]
  totalCount: number
  totalStats: UserStats
  totalPages: number
  currentPage: number
  initialSearch: string
  initialRole: string
  initialStatus: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [roleFilter, setRoleFilter] = useState(initialRole)
  const [statusFilter, setStatusFilter] = useState(initialStatus)

  // Debounce the search to avoid too many requests
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      
      if (searchTerm) {
        params.set('search', searchTerm)
      } else {
        params.delete('search')
      }
      
      if (roleFilter) {
        params.set('role', roleFilter)
      } else {
        params.delete('role')
      }

      if (statusFilter) {
        params.set('status', statusFilter)
      } else {
        params.delete('status')
      }
      
      // Reset to page 1 when filters change
      params.set('page', '1')
      
      const newUrl = `/admin/users?${params.toString()}`
      router.push(newUrl)
      router.refresh() // Force server component to re-execute
    }, 300) // 300ms debounce
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm, roleFilter, statusFilter, router, searchParams])

  const clearFilters = () => {
    setSearchTerm('')
    setRoleFilter('')
    setStatusFilter('')
  }

  const hasFilters = searchTerm || roleFilter || statusFilter

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage talent and employer accounts ({totalCount} total users)
          </p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <UserStats users={users} totalStats={totalStats} />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Search and filter users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-[140px]"
            >
              <option value="">All Roles</option>
              <option value="TALENT">Talent</option>
              <option value="EMPLOYER">Employer</option>
              <option value="ADMIN">Admin</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-[140px]"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters} className="px-3">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {hasFilters && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              <span>Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchTerm}"
                </Badge>
              )}
              {roleFilter && (
                <Badge variant="secondary" className="text-xs">
                  Role: {roleFilter}
                </Badge>
              )}
              {statusFilter && (
                <Badge variant="secondary" className="text-xs">
                  Status: {statusFilter}
                </Badge>
              )}
            </div>
          )}

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <UserTableRow key={user.id} user={user} />
                ))}
              </TableBody>
            </Table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-gray-500">
                {hasFilters ? 'Try adjusting your search or filters.' : 'Get started by adding your first user.'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} users
              </div>
              <div className="flex items-center space-x-2">
                {currentPage > 1 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const params = new URLSearchParams(searchParams)
                      params.set('page', String(currentPage - 1))
                      router.push(`/admin/users?${params.toString()}`)
                      router.refresh()
                    }}
                  >
                    Previous
                  </Button>
                )}
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const params = new URLSearchParams(searchParams)
                          params.set('page', String(pageNum))
                          router.push(`/admin/users?${params.toString()}`)
                          router.refresh()
                        }}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  
                  {totalPages > 5 && (
                    <>
                      {totalPages > 6 && <span className="text-gray-500">...</span>}
                      <Button
                        variant={totalPages === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const params = new URLSearchParams(searchParams)
                          params.set('page', String(totalPages))
                          router.push(`/admin/users?${params.toString()}`)
                          router.refresh()
                        }}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                {currentPage < totalPages && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const params = new URLSearchParams(searchParams)
                      params.set('page', String(currentPage + 1))
                      router.push(`/admin/users?${params.toString()}`)
                      router.refresh()
                    }}
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 