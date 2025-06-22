import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/settings - Fetch all settings
export async function GET() {
  try {
    // For now, we'll use a simple approach with a settings table
    // In production, you might want to use a more sophisticated settings management system
    
    const settings = await prisma.setting.findMany()
    
    // Convert array of settings to structured object
    const paymentSettings = {
      baseJobFee: parseFloat(settings.find(s => s.key === 'base_job_fee')?.value || '0'),
      extraSmsNotificationFee: parseFloat(settings.find(s => s.key === 'extra_sms_notification_fee')?.value || '0'),
      stripeSecretKey: settings.find(s => s.key === 'stripe_secret_key')?.value || '',
      currency: settings.find(s => s.key === 'currency')?.value || 'AUD'
    }
    
    const systemSettings = {
      platformName: settings.find(s => s.key === 'platform_name')?.value || 'Technical Talent',
      supportEmail: settings.find(s => s.key === 'support_email')?.value || 'support@technicaltalent.com.au',
      smsNotificationsEnabled: settings.find(s => s.key === 'sms_notifications_enabled')?.value === 'true',
      emailNotificationsEnabled: settings.find(s => s.key === 'email_notifications_enabled')?.value === 'true',
      jobAutoExpireDays: parseInt(settings.find(s => s.key === 'job_auto_expire_days')?.value || '30'),
      maxJobPostingsPerUser: parseInt(settings.find(s => s.key === 'max_job_postings_per_user')?.value || '10'),
      maximumDistance: parseInt(settings.find(s => s.key === 'maximum_distance')?.value || '50'),
      adminMessage: settings.find(s => s.key === 'admin_message')?.value || ''
    }

    return NextResponse.json({
      paymentSettings,
      systemSettings
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentSettings, systemSettings } = body

    // Update payment settings if provided
    if (paymentSettings) {
      const paymentUpdates = [
        { key: 'base_job_fee', value: paymentSettings.baseJobFee.toString() },
        { key: 'extra_sms_notification_fee', value: paymentSettings.extraSmsNotificationFee.toString() },
        { key: 'stripe_secret_key', value: paymentSettings.stripeSecretKey },
        { key: 'currency', value: paymentSettings.currency }
      ]

      for (const update of paymentUpdates) {
        await prisma.setting.upsert({
          where: { key: update.key },
          update: { value: update.value },
          create: { key: update.key, value: update.value }
        })
      }
    }

    // Update system settings if provided
    if (systemSettings) {
      const systemUpdates = [
        { key: 'platform_name', value: systemSettings.platformName },
        { key: 'support_email', value: systemSettings.supportEmail },
        { key: 'sms_notifications_enabled', value: systemSettings.smsNotificationsEnabled.toString() },
        { key: 'email_notifications_enabled', value: systemSettings.emailNotificationsEnabled.toString() },
        { key: 'job_auto_expire_days', value: systemSettings.jobAutoExpireDays.toString() },
        { key: 'max_job_postings_per_user', value: systemSettings.maxJobPostingsPerUser.toString() },
        { key: 'maximum_distance', value: systemSettings.maximumDistance.toString() },
        { key: 'admin_message', value: systemSettings.adminMessage }
      ]

      for (const update of systemUpdates) {
        await prisma.setting.upsert({
          where: { key: update.key },
          update: { value: update.value },
          create: { key: update.key, value: update.value }
        })
      }
    }

    return NextResponse.json({ message: 'Settings updated successfully' })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
} 