import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { 
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  Users,
  Building2,
  Mail,
  Phone,
  Briefcase,
  FileText,
  Settings,
  Eye
} from 'lucide-react'

interface JobDetail {
  id: string
  wordpressId: number | null
  title: string
  description: string | null
  location: string | null
  requiredSkills: string | null
  payRate: number | null
  payType: string | null
  status: string
  startDate: Date | null
  endDate: Date | null
  paymentStatus: string
  notifyTalent: boolean
  selectedTalent: string | null
  createdAt: Date
  updatedAt: Date
  employer: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    phone: string | null
    role: string
  }
  applications: {
    id: string
    status: string
    message: string | null
    createdAt: Date
    talent: {
      id: string
      firstName: string | null
      lastName: string | null
      email: string
    }
  }[]
  manufacturers: {
    manufacturer: {
      id: string
      name: string
      description: string | null
    }
  }[]
}

async function getJobDetail(id: string): Promise<JobDetail | null> {
  try {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        employer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true
          }
        },
        applications: {
          include: {
            talent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        manufacturers: {
          include: {
            manufacturer: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    })

    return job
  } catch (error) {
    console.error('Error fetching job:', error)
    return null
  }
}

function JobHeader({ job }: { job: JobDetail }) {
  const employerName = `${job.employer.firstName || ''} ${job.employer.lastName || ''}`.trim() || job.employer.email
  const location = job.location ? JSON.parse(job.location) : null
  
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link 
          href="/admin/jobs"
          className="flex items-center space-x-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Jobs</span>
        </Link>
      </div>
      
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{job.title}</h1>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Building2 className="h-4 w-4" />
              <span>by {employerName}</span>
            </div>
            {job.wordpressId && (
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4" />
                <span>WP ID: {job.wordpressId}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Created {job.createdAt.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={
            job.status === 'OPEN' ? 'default' : 
            job.status === 'ASSIGNED' ? 'secondary' :
            job.status === 'COMPLETED' ? 'outline' : 'destructive'
          }>
            {job.status}
          </Badge>
          <Badge variant={
            job.paymentStatus === 'PAID' ? 'default' :
            job.paymentStatus === 'PENDING' ? 'secondary' : 'destructive'
          }>
            {job.paymentStatus}
          </Badge>
        </div>
      </div>
    </div>
  )
}

function JobDetails({ job }: { job: JobDetail }) {
  const location = job.location ? JSON.parse(job.location) : null
  const requiredSkills = job.requiredSkills ? JSON.parse(job.requiredSkills) : null
  
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Job Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5" />
            <span>Job Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {job.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
            </div>
          )}
          
          {location && (
            <div>
              <h4 className="font-medium mb-2 flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>Location</span>
              </h4>
              <div className="text-sm text-muted-foreground">
                {location.address && <div>{location.address}</div>}
                <div>{[location.city, location.state, location.postcode].filter(Boolean).join(', ')}</div>
                {location.country && <div>{location.country}</div>}
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-4">
            {job.payRate && (
              <div>
                <h4 className="font-medium mb-1 flex items-center space-x-1">
                  <DollarSign className="h-4 w-4" />
                  <span>Pay Rate</span>
                </h4>
                <p className="text-sm text-muted-foreground">
                  ${job.payRate}{job.payType ? `/${job.payType.toLowerCase()}` : ''}
                </p>
              </div>
            )}
            
            {(job.startDate || job.endDate) && (
              <div>
                <h4 className="font-medium mb-1 flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Duration</span>
                </h4>
                <p className="text-sm text-muted-foreground">
                  {job.startDate && job.startDate.toLocaleDateString()}
                  {job.startDate && job.endDate && ' - '}
                  {job.endDate && job.endDate.toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
          
          {requiredSkills && requiredSkills.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Required Skills</h4>
              <div className="flex flex-wrap gap-2">
                {requiredSkills.map((skill: string, index: number) => (
                  <Badge key={index} variant="outline">{skill}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {job.manufacturers.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Equipment/Manufacturers</h4>
              <div className="flex flex-wrap gap-2">
                {job.manufacturers.map((mfg) => (
                  <Badge key={mfg.manufacturer.id} variant="outline">
                    {mfg.manufacturer.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Employer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Employer Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Contact Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{job.employer.email}</span>
              </div>
              {job.employer.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{job.employer.phone}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{job.employer.role}</Badge>
              </div>
            </div>
          </div>
          
          <div className="border-t my-4" />
          
          <div>
            <h4 className="font-medium mb-2">Job Settings</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Notify Talent:</span>
                <Badge variant={job.notifyTalent ? "default" : "secondary"}>
                  {job.notifyTalent ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              {job.selectedTalent && (
                <div className="flex justify-between">
                  <span>Selected Talent:</span>
                  <span className="font-medium">{job.selectedTalent}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span>{job.updatedAt.toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function JobApplications({ applications }: { applications: JobDetail['applications'] }) {
  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Applications</span>
          </CardTitle>
          <CardDescription>No applications yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No talent has applied for this position yet.</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Applications ({applications.length})</span>
        </CardTitle>
        <CardDescription>Manage talent applications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {applications.map((application) => {
            const talentName = `${application.talent.firstName || ''} ${application.talent.lastName || ''}`.trim() || application.talent.email
            
            return (
              <div key={application.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{talentName}</h4>
                    <p className="text-sm text-muted-foreground">{application.talent.email}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      application.status === 'ACCEPTED' ? 'default' :
                      application.status === 'PENDING' ? 'secondary' : 'destructive'
                    }>
                      {application.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {application.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {application.message && (
                  <div className="mt-2 p-3 bg-muted rounded text-sm">
                    <p>{application.message}</p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2 mt-3">
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    View Profile
                  </Button>
                  {application.status === 'PENDING' && (
                    <>
                      <Button variant="outline" size="sm">
                        Reject
                      </Button>
                      <Button size="sm">
                        Accept
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await getJobDetail(params.id)
  
  if (!job) {
    notFound()
  }
  
  return (
    <div className="space-y-6">
      <JobHeader job={job} />
      <JobDetails job={job} />
      <JobApplications applications={job.applications} />
    </div>
  )
} 