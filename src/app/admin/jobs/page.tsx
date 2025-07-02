import { Suspense } from 'react'
import Link from 'next/link'
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
  Eye
} from 'lucide-react'
import { JobsClient } from './jobs-client'

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

async function getJobs(page = 1, limit = 20, search = '', statusFilter = '', paymentFilter = '') {
  const skip = (page - 1) * limit
  
  const where = {
    AND: [
      search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { employer: { 
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } }
            ]
          }}
        ]
      } : {},
      statusFilter ? { status: statusFilter as any } : {},
      paymentFilter ? { paymentStatus: paymentFilter as any } : {}
    ].filter(Boolean)
  }
  
  const [jobs, totalCount] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        employer: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        applications: {
          include: {
            talent: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          take: 5 // Limit applications shown
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.job.count({ where })
  ])

  return { jobs, totalCount }
}

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

function JobTableRow({ job }: { job: Job }) {
  const employerName = `${job.employer.firstName || ''} ${job.employer.lastName || ''}`.trim() || job.employer.email
  
  // Safe JSON parsing for location
  let location = null
  try {
    location = job.location ? JSON.parse(job.location) : null
  } catch (error) {
    console.warn('Failed to parse job location JSON:', job.location, error)
    location = { addressName: job.location || 'Invalid location data' }
  }
  
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

function JobStats({ jobs }: { jobs: Job[] }) {
  const openJobs = jobs.filter(j => j.status === 'OPEN').length
  const assignedJobs = jobs.filter(j => j.status === 'ASSIGNED').length
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED').length
  const paidJobs = jobs.filter(j => j.paymentStatus === 'PAID').length
  
  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{jobs.length}</div>
          <p className="text-xs text-muted-foreground">All job postings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Jobs</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openJobs}</div>
          <p className="text-xs text-muted-foreground">Available positions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedJobs}</div>
          <p className="text-xs text-muted-foreground">Finished jobs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paid Jobs</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{paidJobs}</div>
          <p className="text-xs text-muted-foreground">Payment completed</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function JobsPage({ 
  searchParams 
}: { 
  searchParams: { page?: string; search?: string; status?: string; payment?: string } 
}) {
  const page = Number(searchParams.page) || 1
  const search = searchParams.search || ''
  const status = searchParams.status || ''
  const payment = searchParams.payment || ''

  const { jobs, totalCount } = await getJobs(page, 20, search, status, payment)
  
  // Get total stats
  const allJobs = await prisma.job.findMany({
    select: { status: true, paymentStatus: true }
  })
  
  const totalStats = {
    total: allJobs.length,
    open: allJobs.filter(j => j.status === 'OPEN').length,
    assigned: allJobs.filter(j => j.status === 'ASSIGNED').length,
    completed: allJobs.filter(j => j.status === 'COMPLETED').length,
    paid: allJobs.filter(j => j.paymentStatus === 'PAID').length
  }

  const totalPages = Math.ceil(totalCount / 20)

  // Serialize dates to avoid JSON serialization errors
  const serializedJobs = jobs.map(job => ({
    ...job,
    createdAt: job.createdAt.toISOString(),
    startDate: job.startDate?.toISOString() || null,
    endDate: job.endDate?.toISOString() || null
  }))

  return (
    <JobsClient
      jobs={serializedJobs}
      totalCount={totalCount}
      totalStats={totalStats}
      totalPages={totalPages}
      currentPage={page}
      initialSearch={search}
      initialStatus={status}
      initialPayment={payment}
    />
  )
} 