'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Settings, 
  DollarSign, 
  Users, 
  CreditCard,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  User,
  Building2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PaymentSettings {
  baseJobFee: number
  extraSmsNotificationFee: number
  stripeSecretKey: string
  currency: string
}

interface UserFreePlan {
  id: string
  userId: string
  userEmail: string
  userName: string
  userRole: string
  freeJobsAllowed: number
  freeJobsUsed: number
  isActive: boolean
  createdAt: string
}

interface SystemSettings {
  platformName: string
  supportEmail: string
  smsNotificationsEnabled: boolean
  emailNotificationsEnabled: boolean
  jobAutoExpireDays: number
  maxJobPostingsPerUser: number
  maximumDistance: number
  adminMessage: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'payment' | 'user-plans' | 'system'>('payment')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    baseJobFee: 0,
    extraSmsNotificationFee: 0,
    stripeSecretKey: '',
    currency: 'AUD'
  })
  const [userFreePlans, setUserFreePlans] = useState<UserFreePlan[]>([])
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    platformName: 'Technical Talent',
    supportEmail: 'support@technicaltalent.com.au',
    smsNotificationsEnabled: true,
    emailNotificationsEnabled: true,
    jobAutoExpireDays: 30,
    maxJobPostingsPerUser: 10,
    maximumDistance: 50,
    adminMessage: ''
  })
  const [editingPlan, setEditingPlan] = useState<UserFreePlan | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newPlanForm, setNewPlanForm] = useState({
    userId: '',
    freeJobsAllowed: 1
  })
  const [employers, setEmployers] = useState<Array<{id: string, email: string, firstName: string, lastName: string}>>([])
  
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
    fetchUserFreePlans()
    fetchEmployers()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        setPaymentSettings(data.paymentSettings || paymentSettings)
        setSystemSettings(data.systemSettings || systemSettings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserFreePlans = async () => {
    try {
      const response = await fetch('/api/admin/user-free-plans')
      if (response.ok) {
        const data = await response.json()
        setUserFreePlans(data.plans || [])
      }
    } catch (error) {
      console.error('Error fetching user free plans:', error)
    }
  }

  const fetchEmployers = async () => {
    try {
      const response = await fetch('/api/admin/users?role=EMPLOYER&limit=1000')
      if (response.ok) {
        const data = await response.json()
        setEmployers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching employers:', error)
    }
  }

  const handleSavePaymentSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentSettings })
      })
      
      if (response.ok) {
        toast({
          title: 'Settings saved',
          description: 'Payment settings have been updated successfully.'
        })
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save payment settings. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSystemSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemSettings })
      })
      
      if (response.ok) {
        toast({
          title: 'Settings saved',
          description: 'System settings have been updated successfully.'
        })
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save system settings. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateUserFreePlan = async () => {
    if (!newPlanForm.userId || newPlanForm.freeJobsAllowed < 1) {
      toast({
        title: 'Error',
        description: 'Please select a user and enter a valid number of free jobs.',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch('/api/admin/user-free-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlanForm)
      })
      
      if (response.ok) {
        toast({
          title: 'Free plan created',
          description: 'User free plan has been created successfully.'
        })
        fetchUserFreePlans()
        setIsDialogOpen(false)
        setNewPlanForm({ userId: '', freeJobsAllowed: 1 })
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create free plan')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create free plan.',
        variant: 'destructive'
      })
    }
  }

  const handleUpdateUserFreePlan = async (plan: UserFreePlan) => {
    try {
      const response = await fetch(`/api/admin/user-free-plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freeJobsAllowed: plan.freeJobsAllowed,
          isActive: plan.isActive
        })
      })
      
      if (response.ok) {
        toast({
          title: 'Plan updated',
          description: 'User free plan has been updated successfully.'
        })
        fetchUserFreePlans()
      } else {
        throw new Error('Failed to update plan')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update free plan. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteUserFreePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this free plan?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/user-free-plans/${planId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast({
          title: 'Plan deleted',
          description: 'User free plan has been deleted successfully.'
        })
        fetchUserFreePlans()
      } else {
        throw new Error('Failed to delete plan')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete free plan. Please try again.',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">
          Configure payment settings, user free plans, and system preferences
        </p>
      </div>

      {/* Settings Navigation */}
      <div className="flex space-x-2 border-b">
        <Button
          variant={activeTab === 'payment' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('payment')}
          className="flex items-center space-x-2"
        >
          <DollarSign className="h-4 w-4" />
          <span>Payment Settings</span>
        </Button>
        <Button
          variant={activeTab === 'user-plans' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('user-plans')}
          className="flex items-center space-x-2"
        >
          <Users className="h-4 w-4" />
          <span>User Free Plans</span>
        </Button>
        <Button
          variant={activeTab === 'system' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('system')}
          className="flex items-center space-x-2"
        >
          <Settings className="h-4 w-4" />
          <span>System Settings</span>
        </Button>
      </div>

      {/* Payment Settings Tab */}
      {activeTab === 'payment' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Payment Configuration</span>
            </CardTitle>
            <CardDescription>
              Configure job posting fees and payment processing settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="baseJobFee">Base Job Posting Fee (AUD)</Label>
                <Input
                  id="baseJobFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentSettings.baseJobFee}
                  onChange={(e) => setPaymentSettings({
                    ...paymentSettings,
                    baseJobFee: parseFloat(e.target.value) || 0
                  })}
                />
                <p className="text-sm text-muted-foreground">
                  Standard fee charged for each job posting
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="extraSmsNotificationFee">Extra SMS Notification Fee (AUD)</Label>
                <Input
                  id="extraSmsNotificationFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentSettings.extraSmsNotificationFee}
                  onChange={(e) => setPaymentSettings({
                    ...paymentSettings,
                    extraSmsNotificationFee: parseFloat(e.target.value) || 0
                  })}
                />
                <p className="text-sm text-muted-foreground">
                  Additional fee for SMS notifications to talent
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={paymentSettings.currency}
                  onValueChange={(value) => setPaymentSettings({
                    ...paymentSettings,
                    currency: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
                    <SelectItem value="USD">US Dollar (USD)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
                <Input
                  id="stripeSecretKey"
                  type="password"
                  value={paymentSettings.stripeSecretKey}
                  onChange={(e) => setPaymentSettings({
                    ...paymentSettings,
                    stripeSecretKey: e.target.value
                  })}
                  placeholder="sk_live_..."
                />
                <p className="text-sm text-muted-foreground">
                  Your Stripe secret key for payment processing
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSavePaymentSettings} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Payment Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Free Plans Tab */}
      {activeTab === 'user-plans' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>User Free Plans</span>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Free Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create User Free Plan</DialogTitle>
                    <DialogDescription>
                      Assign free job postings to an employer
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="userId">Select Employer</Label>
                      <Select
                        value={newPlanForm.userId}
                        onValueChange={(value) => setNewPlanForm({
                          ...newPlanForm,
                          userId: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an employer..." />
                        </SelectTrigger>
                        <SelectContent>
                          {employers
                            .filter(emp => !userFreePlans.some(plan => plan.userId === emp.id))
                            .map((employer) => (
                            <SelectItem key={employer.id} value={employer.id}>
                              {employer.firstName} {employer.lastName} ({employer.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freeJobsAllowed">Free Jobs Allowed</Label>
                      <Input
                        id="freeJobsAllowed"
                        type="number"
                        min="1"
                        value={newPlanForm.freeJobsAllowed}
                        onChange={(e) => setNewPlanForm({
                          ...newPlanForm,
                          freeJobsAllowed: parseInt(e.target.value) || 1
                        })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateUserFreePlan}>
                      Create Free Plan
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <CardDescription>
              Manage free job posting allocations for employers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Free Jobs Allowed</TableHead>
                  <TableHead>Free Jobs Used</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userFreePlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No free plans configured yet
                    </TableCell>
                  </TableRow>
                ) : (
                  userFreePlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{plan.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{plan.userEmail}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={plan.freeJobsAllowed}
                          onChange={(e) => {
                            const updatedPlans = userFreePlans.map(p => 
                              p.id === plan.id 
                                ? { ...p, freeJobsAllowed: parseInt(e.target.value) || 0 }
                                : p
                            )
                            setUserFreePlans(updatedPlans)
                          }}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{plan.freeJobsUsed}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.freeJobsAllowed - plan.freeJobsUsed > 0 ? "default" : "secondary"}>
                          {plan.freeJobsAllowed - plan.freeJobsUsed}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={plan.isActive}
                          onCheckedChange={(checked) => {
                            const updatedPlans = userFreePlans.map(p => 
                              p.id === plan.id 
                                ? { ...p, isActive: checked }
                                : p
                            )
                            setUserFreePlans(updatedPlans)
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateUserFreePlan(plan)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteUserFreePlan(plan.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* System Settings Tab */}
      {activeTab === 'system' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>System Configuration</span>
            </CardTitle>
            <CardDescription>
              Configure general platform settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="platformName">Platform Name</Label>
                <Input
                  id="platformName"
                  value={systemSettings.platformName}
                  onChange={(e) => setSystemSettings({
                    ...systemSettings,
                    platformName: e.target.value
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={systemSettings.supportEmail}
                  onChange={(e) => setSystemSettings({
                    ...systemSettings,
                    supportEmail: e.target.value
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobAutoExpireDays">Job Auto-Expire (Days)</Label>
                <Input
                  id="jobAutoExpireDays"
                  type="number"
                  min="1"
                  value={systemSettings.jobAutoExpireDays}
                  onChange={(e) => setSystemSettings({
                    ...systemSettings,
                    jobAutoExpireDays: parseInt(e.target.value) || 30
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxJobPostingsPerUser">Max Job Postings Per User</Label>
                <Input
                  id="maxJobPostingsPerUser"
                  type="number"
                  min="1"
                  value={systemSettings.maxJobPostingsPerUser}
                  onChange={(e) => setSystemSettings({
                    ...systemSettings,
                    maxJobPostingsPerUser: parseInt(e.target.value) || 10
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maximumDistance">Maximum Distance</Label>
                <Input
                  id="maximumDistance"
                  type="number"
                  min="1"
                  value={systemSettings.maximumDistance}
                  onChange={(e) => setSystemSettings({
                    ...systemSettings,
                    maximumDistance: parseInt(e.target.value) || 50
                  })}
                />
                <p className="text-sm text-muted-foreground">
                  In kilometres
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminMessage">Admin Message</Label>
              <Textarea
                id="adminMessage"
                value={systemSettings.adminMessage}
                onChange={(e) => setSystemSettings({
                  ...systemSettings,
                  adminMessage: e.target.value
                })}
                placeholder="Enter admin message..."
                rows={6}
              />
              <p className="text-sm text-muted-foreground">
                Message displayed to users in the application
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable SMS notifications to talent for job updates
                  </p>
                </div>
                <Switch
                  checked={systemSettings.smsNotificationsEnabled}
                  onCheckedChange={(checked) => setSystemSettings({
                    ...systemSettings,
                    smsNotificationsEnabled: checked
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable email notifications for platform updates
                  </p>
                </div>
                <Switch
                  checked={systemSettings.emailNotificationsEnabled}
                  onCheckedChange={(checked) => setSystemSettings({
                    ...systemSettings,
                    emailNotificationsEnabled: checked
                  })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSystemSettings} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save System Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}