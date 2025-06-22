'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
  Briefcase, 
  Search, 
  Filter, 
  MoreHorizontal,
  Plus,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Eye,
  X
} from 'lucide-react'

interface Job {
  id: string
  title: string
  description: string | null
  location: string | null
  payRate: number | null
  payType: string | null
  status: string
  startDate: Date | null
  endDate: Date | null
  paymentStatus: string
  notifyTalent: boolean
  selectedTalent: string | null
  createdAt: Date
  employer: {
    firstName: string | null
    lastName: string | null
    email: string
  }
  applications: {
    id: string
    status: string
    talent: {
      firstName: string | null
      lastName: string | null
    }
  }[]
}

interface JobStats {
  total: number
  open: number
  assigned: number
  completed: number
  paid: number
}

function JobTableRow({ job }: { job: Job }) {
  const employerName = `${job.employer.firstName || ''} ${job.employer.lastName || ''}`.trim() || job.employer.email
  const location = job.location ? JSON.parse(job.location) : null
  const applicationsCount = job.applications.length
  const acceptedApplications = job.applications.filter(app => app.status === 'ACCEPTED').length
  
  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{job.title}</div>
          <div className="text-sm text-gray-500">by {employerName}</div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={
          job.status === 'OPEN' ? 'default' : 
          job.status === 'ASSIGNED' ? 'secondary' :
          job.status === 'COMPLETED' ? 'outline' : 'destructive'
        }>
          {job.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-1 text-sm">
          <MapPin className="h-3 w-3 text-gray-400" />
          <span>{location?.addressName || 'Not specified'}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-1 text-sm">
          <DollarSign className="h-3 w-3 text-gray-400" />
          <span>
            {job.payRate ? `$${job.payRate}${job.payType ? `/${job.payType.toLowerCase()}` : ''}` : 'Not specified'}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-1 text-sm">
          <Users className="h-3 w-3 text-gray-400" />
          <span>{acceptedApplications}/{applicationsCount}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={
          job.paymentStatus === 'PAID' ? 'default' :
          job.paymentStatus === 'PENDING' ? 'secondary' : 'destructive'
        }>
          {job.paymentStatus}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>{job.createdAt.toLocaleDateString()}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Link href={`/admin/jobs/${job.id}`}>
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function JobStats({ jobs, totalStats }: { jobs: Job[], totalStats: JobStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStats.total}</div>
          <p className="text-xs text-muted-foreground">All job postings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Jobs</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStats.open}</div>
          <p className="text-xs text-muted-foreground">Available positions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStats.completed}</div>
          <p className="text-xs text-muted-foreground">Finished jobs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paid Jobs</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStats.paid}</div>
          <p className="text-xs text-muted-foreground">Payment completed</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function JobsClient({ 
  jobs,
  totalCount,
  totalStats,
  totalPages,
  currentPage,
  initialSearch,
  initialStatus,
  initialPayment
}: {
  jobs: Job[]
  totalCount: number
  totalStats: JobStats
  totalPages: number
  currentPage: number
  initialSearch: string
  initialStatus: string
  initialPayment: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [paymentFilter, setPaymentFilter] = useState(initialPayment)

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

    if (paymentFilter) {
      params.set('payment', paymentFilter)
    } else {
      params.delete('payment')
    }
    
    // Reset to page 1 when filters change
    params.set('page', '1')
    
    const newUrl = `/admin/jobs?${params.toString()}`
    router.push(newUrl)
    router.refresh() // Force server component to re-execute
  }, [searchTerm, statusFilter, paymentFilter, router, searchParams])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setPaymentFilter('')
  }

  const hasFilters = searchTerm || statusFilter || paymentFilter

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Management</h1>
          <p className="text-muted-foreground">
            Manage and moderate job postings ({totalCount} total jobs)
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Job
        </Button>
      </div>

      <JobStats jobs={jobs} totalStats={totalStats} />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Job Directory</CardTitle>
          <CardDescription>Search and filter job postings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by job title, description, or employer..."
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
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm w-[140px]"
            >
              <option value="">All Payments</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="UNPAID">Unpaid</option>
              <option value="FAILED">Failed</option>
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
              {statusFilter && (
                <Badge variant="secondary" className="text-xs">
                  Status: {statusFilter}
                </Badge>
              )}
              {paymentFilter && (
                <Badge variant="secondary" className="text-xs">
                  Payment: {paymentFilter}
                </Badge>
              )}
            </div>
          )}

          {/* Jobs Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Pay Rate</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <JobTableRow key={job.id} job={job} />
                ))}
              </TableBody>
            </Table>
          </div>

          {jobs.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No jobs found</h3>
              <p className="mt-1 text-gray-500">
                {hasFilters ? 'Try adjusting your search or filters.' : 'Jobs will appear here when employers create them.'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalCount)} of {totalCount} jobs
              </div>
              <div className="flex items-center space-x-2">
                {currentPage > 1 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const params = new URLSearchParams(searchParams)
                      params.set('page', String(currentPage - 1))
                      router.push(`/admin/jobs?${params.toString()}`)
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
                          router.push(`/admin/jobs?${params.toString()}`)
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
                          router.push(`/admin/jobs?${params.toString()}`)
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
                      router.push(`/admin/jobs?${params.toString()}`)
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