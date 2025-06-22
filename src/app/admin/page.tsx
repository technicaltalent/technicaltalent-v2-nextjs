import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Briefcase, UserCheck, TrendingUp, Clock, CheckCircle } from 'lucide-react'

async function getDashboardStats() {
  const [
    totalUsers,
    totalJobs,
    activeJobs,
    completedJobs,
    totalSkills,
    recentUsers,
    recentJobs
  ] = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.job.count({
      where: { status: 'OPEN' }
    }),
    prisma.job.count({
      where: { status: 'COMPLETED' }
    }),
    prisma.skill.count(),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true
      }
    }),
    prisma.job.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        employer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })
  ])

  return {
    totalUsers,
    totalJobs,
    activeJobs,
    completedJobs,
    totalSkills,
    recentUsers,
    recentJobs
  }
}

function StatsCard({ title, value, description, icon: Icon, trend }: {
  title: string
  value: number
  description: string
  icon: any
  trend?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
        {trend && (
          <Badge variant="secondary" className="mt-2">
            {trend}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

function RecentActivity({ users, jobs }: { users: any[], jobs: any[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>Latest user registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="text-right">
                  <Badge variant={user.role === 'talent' ? 'default' : 'secondary'}>
                    {user.role}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>Latest job postings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    by {job.employer.firstName} {job.employer.lastName}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={
                    job.status === 'OPEN' ? 'default' : 
                    job.status === 'COMPLETED' ? 'secondary' : 'outline'
                  }>
                    {job.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Technical Talent platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          description="Registered talent and employers"
          icon={Users}
        />
        <StatsCard
          title="Posted Jobs"
          value={stats.totalJobs}
          description="All job postings"
          icon={Briefcase}
        />
        <StatsCard
          title="Active Jobs"
          value={stats.activeJobs}
          description="Currently open positions"
          icon={Clock}
        />
        <StatsCard
          title="Completed Jobs"
          value={stats.completedJobs}
          description="Successfully finished jobs"
          icon={CheckCircle}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Skills Available"
          value={stats.totalSkills}
          description="Total number of skills in system"
          icon={UserCheck}
        />
        <StatsCard
          title="Success Rate"
          value={Math.round((stats.completedJobs / Math.max(stats.totalJobs, 1)) * 100)}
          description="Jobs completed successfully"
          icon={TrendingUp}
        />
        <StatsCard
          title="Active Rate"
          value={Math.round((stats.activeJobs / Math.max(stats.totalJobs, 1)) * 100)}
          description="Currently active jobs"
          icon={TrendingUp}
        />
      </div>

      {/* Recent Activity */}
      <Suspense fallback={<div>Loading recent activity...</div>}>
        <RecentActivity users={stats.recentUsers} jobs={stats.recentJobs} />
      </Suspense>
    </div>
  )
} 