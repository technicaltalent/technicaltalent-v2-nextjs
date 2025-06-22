const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkLatestUserData() {
  try {
    console.log('🔍 Checking latest user registration data...\n')
    
    // Get the most recently created user (likely the test user)
    const latestUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        profile: true,
        skills: {
          include: {
            skill: true
          }
        }
      }
    })

    if (!latestUser) {
      console.log('❌ No users found in database')
      return
    }

    console.log('👤 Latest User Data:')
    console.log('==================')
    console.log(`ID: ${latestUser.id}`)
    console.log(`Email: ${latestUser.email}`)
    console.log(`Name: ${latestUser.firstName} ${latestUser.lastName}`)
    console.log(`Role: ${latestUser.role}`)
    console.log(`Phone: ${latestUser.phone || 'Not set'}`)
    console.log(`Created: ${latestUser.createdAt}`)
    console.log(`Updated: ${latestUser.updatedAt}`)

    if (latestUser.profile) {
      console.log('\n📝 Profile Data:')
      console.log('================')
      console.log(`Bio: ${latestUser.profile.bio || 'Not set'}`)
      
      // Parse location if exists
      if (latestUser.profile.location) {
        try {
          const location = JSON.parse(latestUser.profile.location)
          console.log('📍 Location:', JSON.stringify(location, null, 2))
        } catch (e) {
          console.log(`📍 Location (raw): ${latestUser.profile.location}`)
        }
      } else {
        console.log('📍 Location: Not set')
      }

      // Parse notification settings (contains pay rate, languages, com_step)
      if (latestUser.profile.notificationSettings) {
        try {
          const settings = JSON.parse(latestUser.profile.notificationSettings)
          console.log('\n⚙️ Notification Settings:')
          console.log('=========================')
          console.log(`COM Step: ${settings.comStep || 'Not set'} ${settings.comStep === 'final' ? '✅' : '❌'}`)
          console.log(`Pay Rate: ${settings.payRate || 'Not set'}`)
          console.log(`Pay Model: ${settings.payModel || 'Not set'}`)
          
          if (settings.spokenLanguages && settings.spokenLanguages.length > 0) {
            console.log(`Spoken Languages: ${settings.spokenLanguages.map(lang => lang.name).join(', ')}`)
          } else {
            console.log('Spoken Languages: Not set')
          }
          
          // Show all other settings
          const otherSettings = { ...settings }
          delete otherSettings.comStep
          delete otherSettings.payRate
          delete otherSettings.payModel
          delete otherSettings.spokenLanguages
          
          if (Object.keys(otherSettings).length > 0) {
            console.log('Other settings:', JSON.stringify(otherSettings, null, 2))
          }
        } catch (e) {
          console.log(`⚙️ Notification Settings (raw): ${latestUser.profile.notificationSettings}`)
        }
      } else {
        console.log('\n⚙️ Notification Settings: Not set ❌')
      }
    } else {
      console.log('\n📝 Profile: Not created ❌')
    }

    if (latestUser.skills && latestUser.skills.length > 0) {
      console.log('\n🎯 User Skills:')
      console.log('===============')
      latestUser.skills.forEach(userSkill => {
        console.log(`- ${userSkill.skill.name} (Level: ${userSkill.proficiencyLevel})`)
      })
    } else {
      console.log('\n🎯 Skills: None set')
    }

    // Summary
    console.log('\n📊 Registration Status Summary:')
    console.log('================================')
    const hasProfile = !!latestUser.profile
    const hasLocation = !!(latestUser.profile?.location)
    const hasBio = !!(latestUser.profile?.bio)
    const hasNotificationSettings = !!(latestUser.profile?.notificationSettings)
    let comStep = null
    let hasPayRate = false
    let hasLanguages = false
    
    if (hasNotificationSettings) {
      try {
        const settings = JSON.parse(latestUser.profile.notificationSettings)
        comStep = settings.comStep
        hasPayRate = !!(settings.payRate)
        hasLanguages = !!(settings.spokenLanguages && settings.spokenLanguages.length > 0)
      } catch (e) {
        // ignore
      }
    }

    console.log(`✅ Profile Created: ${hasProfile ? 'Yes' : 'No'}`)
    console.log(`✅ Location Set: ${hasLocation ? 'Yes' : 'No'}`)
    console.log(`✅ Bio Set: ${hasBio ? 'Yes' : 'No'}`)
    console.log(`✅ Pay Rate Set: ${hasPayRate ? 'Yes' : 'No'}`)
    console.log(`✅ Languages Set: ${hasLanguages ? 'Yes' : 'No'}`)
    console.log(`✅ COM Step: ${comStep || 'Not set'} ${comStep === 'final' ? '(COMPLETE ✅)' : '(INCOMPLETE ❌)'}`)
    console.log(`✅ Has Skills: ${latestUser.skills.length > 0 ? 'Yes' : 'No'} (${latestUser.skills.length} skills)`)

    const isCompleteRegistration = hasProfile && comStep === 'final'
    console.log(`\n🎯 Registration Status: ${isCompleteRegistration ? 'COMPLETE ✅' : 'INCOMPLETE ❌'}`)

  } catch (error) {
    console.error('❌ Error checking user data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkLatestUserData() 