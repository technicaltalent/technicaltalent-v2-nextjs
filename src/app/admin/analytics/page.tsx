import React from 'react'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Briefcase, 
  UserCheck, 
  Clock,
  CheckCircle,
  Star
} from 'lucide-react'

interface AnalyticsData {
  totalUsers: number
  totalJobs: number
  totalSkills: number
  totalManufacturers: number
  newUsersThisMonth: number
  newJobsThisMonth: number
  completedJobs: number
  activeJobs: number
  talentCount: number
  employerCount: number
  skillAssignments: number
  recentActivity: {
    date: string
    users: number
    jobs: number
  }[]
  topSkills: {
    name: string
    count: number
  }[]
  jobStatusBreakdown: {
    status: string
    count: number
  }[]
}

async function getAnalyticsData(): Promise<AnalyticsData> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const [
    totalUsers,
    totalJobs,
    totalSkills,
    totalManufacturers,
    newUsersThisMonth,
    newJobsThisMonth,
    completedJobs,
    activeJobs,
    talentCount,
    employerCount,
    skillAssignments,
    topSkillsData,
    jobStatusData
  ] = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.skill.count(),
    prisma.manufacturer.count(),
    prisma.user.count({
      where: { createdAt: { gte: startOfMonth } }
    }),
    prisma.job.count({
      where: { createdAt: { gte: startOfMonth } }
    }),
    prisma.job.count({
      where: { status: 'COMPLETED' }
    }),
    prisma.job.count({
      where: { status: 'OPEN' }
    }),
    prisma.user.count({
      where: { role: 'TALENT' }
    }),
    prisma.user.count({
      where: { role: 'EMPLOYER' }
    }),
    prisma.userSkill.count(),
    // Top skills by user count
    prisma.skill.findMany({
      include: {
        _count: {
          select: { userSkills: true }
        }
      },
      orderBy: {
        userSkills: {
          _count: 'desc'
        }
      },
      take: 5
    }),
    // Job status breakdown
    prisma.job.groupBy({
      by: ['status'],
      _count: true
    })
  ])

  // Generate mock recent activity data (in a real app, you'd track this)
  const recentActivity = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return {
      date: date.toISOString().split('T')[0],
      users: Math.floor(Math.random() * 10) + 1,
      jobs: Math.floor(Math.random() * 5) + 1
    }
  }).reverse()

  const topSkills = topSkillsData.map(skill => ({
    name: skill.name,
    count: skill._count.userSkills
  }))

  const jobStatusBreakdown = jobStatusData.map(item => ({
    status: item.status,
    count: item._count
  }))

  return {
    totalUsers,
    totalJobs,
    totalSkills,
    totalManufacturers,
    newUsersThisMonth,
    newJobsThisMonth,
    completedJobs,
    activeJobs,
    talentCount,
    employerCount,
    skillAssignments,
    recentActivity,
    topSkills,
    jobStatusBreakdown
  }
}

function MetricCard({ title, value, description, icon: Icon, trend, change }: {
  title: string
  value: number
  description: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
  change?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span>{description}</span>
          {trend && change && (
            <div className={`flex items-center ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : trend === 'down' ? (
                <TrendingDown className="h-3 w-3 mr-1" />
              ) : null}
              <span>{change}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TopSkillsCard({ skills }: { skills: { name: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Skills</CardTitle>
        <CardDescription>Most popular skills among talent</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {skills.map((skill, index) => (
            <div key={skill.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                  {index + 1}
                </div>
                <span className="text-sm font-medium">{skill.name}</span>
              </div>
              <Badge variant="secondary">{skill.count} users</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function JobStatusCard({ breakdown }: { breakdown: { status: string; count: number }[] }) {
  const total = breakdown.reduce((sum, item) => sum + item.count, 0)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Status Breakdown</CardTitle>
        <CardDescription>Distribution of job statuses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {breakdown.map((item) => (
            <div key={item.status} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  item.status === 'OPEN' ? 'bg-blue-500' :
                  item.status === 'ASSIGNED' ? 'bg-yellow-500' :
                  item.status === 'COMPLETED' ? 'bg-green-500' : 'bg-gray-500'
                }`} />
                <span className="text-sm font-medium capitalize">{item.status.toLowerCase()}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{item.count}</div>
                <div className="text-xs text-gray-500">
                  {total > 0 ? Math.round((item.count / total) * 100) : 0}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function RecentActivityCard({ activity }: { activity: { date: string; users: number; jobs: number }[] }) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>User registrations and job postings over the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activity.map((day) => (
            <div key={day.date} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="text-sm font-medium">
                {new Date(day.date).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Users className="h-3 w-3 text-blue-500" />
                  <span>{day.users} users</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Briefcase className="h-3 w-3 text-green-500" />
                  <span>{day.jobs} jobs</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Platform insights and performance metrics
        </p>
      </div>

      {/* Primary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={data.totalUsers}
          description="All registered users"
          icon={Users}
          trend="up"
          change={`+${data.newUsersThisMonth} this month`}
        />
        <MetricCard
          title="Posted Jobs"
          value={data.totalJobs}
          description="All job postings"
          icon={Briefcase}
          trend="up"
          change={`+${data.newJobsThisMonth} this month`}
        />
        <MetricCard
          title="Skills Available"
          value={data.totalSkills}
          description="Skill categories"
          icon={UserCheck}
        />
        <MetricCard
          title="Completed Jobs"
          value={data.completedJobs}
          description="Successfully finished"
          icon={CheckCircle}
          trend="up"
          change={`${Math.round((data.completedJobs / Math.max(data.totalJobs, 1)) * 100)}% success rate`}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Talent Users"
          value={data.talentCount}
          description="Registered talent"
          icon={Users}
        />
        <MetricCard
          title="Employers"
          value={data.employerCount}
          description="Registered employers"
          icon={Briefcase}
        />
        <MetricCard
          title="Active Jobs"
          value={data.activeJobs}
          description="Currently open"
          icon={Clock}
        />
        <MetricCard
          title="Skill Assignments"
          value={data.skillAssignments}
          description="User-skill relationships"
          icon={Star}
        />
      </div>

      {/* Charts and Detailed Views */}
      <div className="grid gap-6 md:grid-cols-3">
        <TopSkillsCard skills={data.topSkills} />
        <JobStatusCard breakdown={data.jobStatusBreakdown} />
        <RecentActivityCard activity={data.recentActivity} />
      </div>
    </div>
  )
} 