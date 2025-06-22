'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Circle, ExternalLink, Loader2, Play, Users, Layers, Zap } from 'lucide-react'

export default function Home() {
  const [currentTime, setCurrentTime] = useState('')
  const [testResults, setTestResults] = useState<any>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Phase status
  const phases = [
    {
      phase: 'Phase 1',
      title: 'Foundation Setup',
      status: 'complete',
      items: [
        { name: 'Project Structure', complete: true },
        { name: 'Database Schema', complete: true },
        { name: 'Next.js App Setup', complete: true },
        { name: 'Environment Config', complete: true }
      ]
    },
    {
      phase: 'Phase 2',
      title: 'Core API Migration',
      status: 'complete',
      items: [
        { name: 'User Registration API', complete: true },
        { name: 'Skills Management API', complete: true },
        { name: 'Job/Role Management API', complete: true },
        { name: 'Mobile App Compatibility', complete: true }
      ]
    },
    {
      phase: 'Phase 3',
      title: 'Admin Dashboard',
      status: 'planned',
      items: [
        { name: 'Admin Authentication', complete: false },
        { name: 'User Management Interface', complete: false },
        { name: 'Skills Management Interface', complete: false },
        { name: 'Analytics Dashboard', complete: false }
      ]
    }
  ]

  // API Endpoints status
  const apiEndpoints = [
    {
      group: 'Authentication',
      endpoints: [
        { path: '/api/talent/v2/users/register', method: 'POST', status: 'complete', tested: true },
        { path: '/api/talent/v2/users/login', method: 'POST', status: 'complete', tested: true }
      ]
    },
    {
      group: 'Skills Management',
      endpoints: [
        { path: '/api/talent/v2/skills', method: 'GET', status: 'complete', tested: true },
        { path: '/api/talent/v2/skills/{id}', method: 'GET', status: 'complete', tested: true },
        { path: '/api/talent/v2/user/getskills', method: 'GET', status: 'complete', tested: true },
        { path: '/api/talent/v2/users/postskills', method: 'POST', status: 'complete', tested: true }
      ]
    },
    {
      group: 'Job Management',
      endpoints: [
        { path: '/api/talent/v2/jobs', method: 'GET', status: 'complete', tested: true },
        { path: '/api/talent/v2/jobs/{id}', method: 'GET', status: 'complete', tested: true },
        { path: '/api/talent/v2/jobs', method: 'POST', status: 'complete', tested: true },
        { path: '/api/talent/v2/jobs/{id}/apply', method: 'POST', status: 'complete', tested: true },
        { path: '/api/talent/v2/jobs/{id}/apply', method: 'GET', status: 'complete', tested: true }
      ]
    }
  ]

  const runQuickTest = async () => {
    try {
      const response = await fetch('/api/talent/v2/skills')
      const data = await response.json()
      setTestResults({
        skills: {
          status: response.ok ? 'success' : 'error',
          total: data.total_skills || 0,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      setTestResults({
        skills: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Technical Talent Platform v2
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Next.js Full-Stack Migration Dashboard
          </p>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              {currentTime}
            </Badge>
            <Badge variant="default" className="bg-green-600">
              Phase 2: Core API Migration Complete
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="flex items-center p-6">
              <Users className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">User Auth</p>
                <p className="text-2xl font-bold">✅ Complete</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <Layers className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Skills API</p>
                <p className="text-2xl font-bold">✅ Complete</p>
              </div>
            </CardContent>
          </Card>
          
                      <Card>
            <CardContent className="flex items-center p-6">
              <Zap className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Jobs API</p>
                <p className="text-2xl font-bold">✅ Complete</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <ExternalLink className="h-8 w-8 text-purple-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">Mobile Ready</p>
                <p className="text-2xl font-bold">✅ Verified</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Migration Phases */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Migration Progress</CardTitle>
            <CardDescription>
              8-week migration plan from WordPress + Next.js to unified Next.js full-stack
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {phases.map((phase, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">{phase.phase}: {phase.title}</h3>
                    <Badge 
                      variant={phase.status === 'complete' ? 'default' : phase.status === 'in-progress' ? 'secondary' : 'outline'}
                      className={
                        phase.status === 'complete' ? 'bg-green-600' :
                        phase.status === 'in-progress' ? 'bg-blue-600' : ''
                      }
                    >
                      {phase.status === 'complete' ? 'Complete' : 
                       phase.status === 'in-progress' ? 'In Progress' : 'Planned'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    {phase.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-2">
                        {item.complete ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={`text-sm ${item.complete ? 'text-gray-900' : 'text-gray-500'}`}>
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* API Endpoints Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>API Endpoints Status</CardTitle>
            <CardDescription>
              WordPress-compatible API endpoints for mobile app integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {apiEndpoints.map((group, index) => (
                <div key={index}>
                  <h3 className="font-semibold text-lg mb-3">{group.group}</h3>
                  <div className="space-y-2">
                    {group.endpoints.map((endpoint, endpointIndex) => (
                      <div key={endpointIndex} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs font-mono">
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-mono text-gray-600">
                            {endpoint.path}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          {endpoint.tested && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                              Tested ✓
                            </Badge>
                          )}
                          <Badge 
                            variant={endpoint.status === 'complete' ? 'default' : 'outline'}
                            className={endpoint.status === 'complete' ? 'bg-green-600' : ''}
                          >
                            {endpoint.status === 'complete' ? 'Complete' : 'Planned'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Latest Test Results */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Real-Time API Testing</CardTitle>
            <CardDescription>
              Test the Skills API endpoints with real WordPress data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Button onClick={runQuickTest} className="gap-2">
                <Play className="h-4 w-4" />
                Test Skills API
              </Button>
              
              {testResults && (
                <div className="flex items-center gap-2">
                  {testResults.skills.status === 'success' ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">
                        API Working - {testResults.skills.total} skills loaded
                      </span>
                    </>
                  ) : (
                    <>
                      <Circle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700">
                        API Error: {testResults.skills.error}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Latest Test Results (Skills API)</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div>✅ GET /api/talent/v2/skills - All skills retrieved (5 categories)</div>
                <div>✅ GET /api/talent/v2/skills/{`{id}`} - Child skills working (Lighting: 4 subcategories)</div>
                <div>✅ POST /api/talent/v2/users/postskills - Skills addition working</div>
                <div>✅ GET /api/talent/v2/user/getskills - User skills retrieval working</div>
                <div>✅ JWT Authentication - Token generation/validation working</div>
                <div>✅ WordPress Compatibility - Response format verified</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technology Stack */}
        <Card>
          <CardHeader>
            <CardTitle>Technology Stack</CardTitle>
            <CardDescription>
              Modern technologies powering the new platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-black text-white rounded-lg flex items-center justify-center mx-auto mb-2">
                  ▲
                </div>
                <p className="font-semibold">Next.js 14</p>
                <p className="text-sm text-gray-600">App Router</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center mx-auto mb-2">
                  TS
                </div>
                <p className="font-semibold">TypeScript</p>
                <p className="text-sm text-gray-600">Type Safety</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-600 text-white rounded-lg flex items-center justify-center mx-auto mb-2">
                  DB
                </div>
                <p className="font-semibold">Prisma + PostgreSQL</p>
                <p className="text-sm text-gray-600">Database</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-lg flex items-center justify-center mx-auto mb-2">
                  PH
                </div>
                <p className="font-semibold">PostHog</p>
                <p className="text-sm text-gray-600">Analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
