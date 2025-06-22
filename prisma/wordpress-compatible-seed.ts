import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Technical Talent Platform with WordPress-compatible data...\n')

  // Clear existing data
  console.log('🧹 Cleaning existing data...')
  await prisma.jobApplication.deleteMany()
  await prisma.userSkill.deleteMany()
  await prisma.job.deleteMany()
  await prisma.userProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.skill.deleteMany()

  // Seed Skills (matching WordPress taxonomy)
  console.log('🎯 Creating WordPress-compatible skills...')
  const skillCategories = [
    {
      name: 'Audio Equipment',
      category: 'Technical Skills',
      children: [
        { name: 'Microphones', category: 'Audio Equipment' },
        { name: 'Speakers & PA Systems', category: 'Audio Equipment' },
        { name: 'Mixing Boards', category: 'Audio Equipment' },
        { name: 'Amplifiers', category: 'Audio Equipment' },
        { name: 'Audio Recording', category: 'Audio Equipment' },
        { name: 'Wireless Systems', category: 'Audio Equipment' }
      ]
    },
    {
      name: 'Video Equipment', 
      category: 'Technical Skills',
      children: [
        { name: 'Cameras', category: 'Video Equipment' },
        { name: 'Lighting Setup', category: 'Video Equipment' },
        { name: 'Video Editing', category: 'Video Equipment' },
        { name: 'Live Streaming', category: 'Video Equipment' }
      ]
    },
    {
      name: 'Stage Management',
      category: 'Production Skills', 
      children: [
        { name: 'Stage Setup', category: 'Stage Management' },
        { name: 'Event Coordination', category: 'Stage Management' },
        { name: 'Safety Management', category: 'Stage Management' },
        { name: 'Crowd Control', category: 'Stage Management' }
      ]
    },
    {
      name: 'Entertainment',
      category: 'Performance Skills',
      children: [
        { name: 'DJ Services', category: 'Entertainment' },
        { name: 'MC/Host', category: 'Entertainment' },
        { name: 'Live Music', category: 'Entertainment' },
        { name: 'Photography', category: 'Entertainment' }
      ]
    },
    {
      name: 'Technical Support',
      category: 'Support Skills',
      children: [
        { name: 'Equipment Maintenance', category: 'Technical Support' },
        { name: 'Troubleshooting', category: 'Technical Support' },
        { name: 'Power Distribution', category: 'Technical Support' },
        { name: 'Cable Management', category: 'Technical Support' }
      ]
    }
  ]

  const skillsMap = new Map()

  for (const skillCategory of skillCategories) {
    const parentSkill = await prisma.skill.create({
      data: {
        name: skillCategory.name,
        category: skillCategory.category,
        isActive: true
      }
    })

    skillsMap.set(skillCategory.name, parentSkill.id)
    console.log(`✅ Created parent skill: ${parentSkill.name}`)

    for (const childData of skillCategory.children) {
      const childSkill = await prisma.skill.create({
        data: {
          name: childData.name,
          category: childData.category,
          parentId: parentSkill.id,
          isActive: true
        }
      })

      skillsMap.set(childData.name, childSkill.id)
      console.log(`  ✅ Created child skill: ${childSkill.name}`)
    }
  }

  // Seed Users (matching WordPress user structure)
  console.log('\n👥 Creating WordPress-compatible users...')
  
  // Create Employers (matching post_author pattern)
  const employers = [
    {
      wordpressId: 699, // Matching the original post_author
      email: 'sarah@weddingbliss.com.au',
      password: 'password123',
      firstName: 'Sarah',
      lastName: 'Mitchell',
      role: 'EMPLOYER',
      phone: '+61 2 9555 0101',
      bio: 'Wedding planner organizing luxury events across Sydney',
      location: {
        address_components: [
          { long_name: 'Sydney', short_name: 'Sydney', types: ['locality', 'political'] },
          { long_name: 'New South Wales', short_name: 'NSW', types: ['administrative_area_level_1', 'political'] },
          { long_name: 'Australia', short_name: 'AU', types: ['country', 'political'] }
        ],
        formatted_address: 'Sydney NSW, Australia',
        geometry: { location: { lat: -33.8688197, lng: 151.2092955 } },
        place_id: 'ChIJP3Sa8ziYEmsRUKgyFmh9AQM'
      }
    },
    {
      wordpressId: 801,
      email: 'james@corporateevents.com.au',
      password: 'password123',
      firstName: 'James',
      lastName: 'Chen',
      role: 'EMPLOYER',
      phone: '+61 3 8555 0102',
      bio: 'Corporate event manager coordinating large-scale conferences',
      location: {
        address_components: [
          { long_name: 'Melbourne', short_name: 'Melbourne', types: ['colloquial_area', 'locality', 'political'] },
          { long_name: 'Victoria', short_name: 'VIC', types: ['administrative_area_level_1', 'political'] },
          { long_name: 'Australia', short_name: 'AU', types: ['country', 'political'] }
        ],
        formatted_address: 'Melbourne VIC, Australia',
        geometry: { location: { lat: -37.8136276, lng: 144.9630576 } },
        place_id: 'ChIJ90260rVG1moRkM2MIXVWBAQ'
      }
    },
    {
      wordpressId: 902,
      email: 'maria@musicfestival.org',
      password: 'password123',
      firstName: 'Maria',
      lastName: 'Rodriguez',
      role: 'EMPLOYER',
      phone: '+61 7 3555 0103',
      bio: 'Festival director organizing annual music festivals',
      location: {
        address_components: [
          { long_name: 'Brisbane', short_name: 'Brisbane', types: ['locality', 'political'] },
          { long_name: 'Queensland', short_name: 'QLD', types: ['administrative_area_level_1', 'political'] },
          { long_name: 'Australia', short_name: 'AU', types: ['country', 'political'] }
        ],
        formatted_address: 'Brisbane QLD, Australia',
        geometry: { location: { lat: -27.4705, lng: 153.0260 } },
        place_id: 'ChIJoQ8Q6NtQkWsRhHMqYrHuAAU'
      }
    }
  ]

  const employerUsers = []
  for (const employerData of employers) {
    const hashedPassword = await hash(employerData.password, 12)
    const user = await prisma.user.create({
      data: {
        email: employerData.email,
        passwordHash: hashedPassword,
        firstName: employerData.firstName,
        lastName: employerData.lastName,
        role: employerData.role as 'EMPLOYER',
        phone: employerData.phone,
        profile: {
          create: {
            bio: employerData.bio,
            location: JSON.stringify(employerData.location),
            notificationSettings: JSON.stringify({
              email: true,
              sms: true,
              push: true
            })
          }
        }
      },
      include: { profile: true }
    })
    employerUsers.push({ ...user, wordpressId: employerData.wordpressId })
    console.log(`✅ Created employer: ${user.firstName} ${user.lastName} (WP ID: ${employerData.wordpressId})`)
  }

  // Create Talent/Freelancers (matching invitation system IDs)
  const talents = [
    {
      wordpressId: 506, // This is the user who accepted the invitation in the WordPress data
      email: 'alex@audiopro.com',
      password: 'password123',
      firstName: 'Alex',
      lastName: 'Thompson',
      role: 'TALENT',
      phone: '+61 2 9555 0201',
      bio: 'Professional audio engineer with 10+ years experience in live events and concerts',
      skills: ['Microphones', 'Mixing Boards', 'Speakers & PA Systems', 'Wireless Systems'],
      experience: [8, 10, 9, 7]
    },
    {
      wordpressId: 1373, // This user denied the invitation
      email: 'jenny@videoproduction.com.au',
      password: 'password123',
      firstName: 'Jenny',
      lastName: 'Kim',
      role: 'TALENT',
      phone: '+61 3 8555 0202',
      bio: 'Creative video producer specializing in event documentation',
      skills: ['Cameras', 'Video Editing', 'Live Streaming', 'Lighting Setup'],
      experience: [6, 8, 3, 5]
    },
    {
      wordpressId: 1357, // This user also denied
      email: 'mike@stagetech.net',
      password: 'password123',
      firstName: 'Mike',
      lastName: 'O\'Brien',
      role: 'TALENT',
      phone: '+61 7 3555 0203',
      bio: 'Experienced stage manager and technical coordinator',
      skills: ['Stage Setup', 'Event Coordination', 'Safety Management', 'Crowd Control'],
      experience: [12, 10, 8, 7]
    },
    {
      wordpressId: 1253, // Another who denied
      email: 'lisa@djservices.com.au',
      password: 'password123',
      firstName: 'Lisa',
      lastName: 'Park',
      role: 'TALENT',
      phone: '+61 2 9555 0204',
      bio: 'Professional DJ and MC for events and parties',
      skills: ['DJ Services', 'MC/Host', 'Audio Equipment'],
      experience: [8, 6, 10]
    },
    {
      wordpressId: 1107, // Last one who denied
      email: 'david@techsupport.pro',
      password: 'password123',
      firstName: 'David',
      lastName: 'Wilson',
      role: 'TALENT',
      phone: '+61 4 1555 0205',
      bio: 'Technical support specialist and equipment technician',
      skills: ['Equipment Maintenance', 'Troubleshooting', 'Power Distribution'],
      experience: [15, 12, 10]
    }
  ]

  const talentUsers = []
  for (const talentData of talents) {
    const hashedPassword = await hash(talentData.password, 12)
    const user = await prisma.user.create({
      data: {
        email: talentData.email,
        passwordHash: hashedPassword,
        firstName: talentData.firstName,
        lastName: talentData.lastName,
        role: talentData.role as 'TALENT',
        phone: talentData.phone,
        profile: {
          create: {
            bio: talentData.bio,
            location: JSON.stringify({
              formatted_address: talentData.email.includes('9555') ? 'Sydney NSW, Australia' : 
                                talentData.email.includes('8555') ? 'Melbourne VIC, Australia' :
                                'Brisbane QLD, Australia'
            }),
            notificationSettings: JSON.stringify({
              email: true,
              sms: true,
              push: true
            })
          }
        }
      },
      include: { profile: true }
    })

    // Add skills to talent
    for (let i = 0; i < talentData.skills.length; i++) {
      const skillName = talentData.skills[i]
      const skillId = skillsMap.get(skillName)
      if (skillId) {
        await prisma.userSkill.create({
          data: {
            userId: user.id,
            skillId: skillId,
            proficiencyLevel: Math.min(5, Math.floor(talentData.experience[i] / 2) + 2),
            yearsExperience: talentData.experience[i]
          }
        })
      }
    }

    talentUsers.push({ ...user, wordpressId: talentData.wordpressId })
    console.log(`✅ Created talent: ${user.firstName} ${user.lastName} (WP ID: ${talentData.wordpressId})`)
  }

  // Create Jobs (matching WordPress post structure)
  console.log('\n💼 Creating WordPress-compatible jobs...')
  
  const jobs = [
    {
      // Based on the actual WordPress post 1417
      wordpressId: 1417,
      title: 'Audio Engineer for Corporate Event',
      description: 'We need an experienced audio engineer for a corporate event in Melbourne. The role involves setting up and managing sound equipment for presentations and entertainment. Professional equipment handling and experience with corporate venues required.',
      employerId: employerUsers.find(u => u.wordpressId === 699)?.id, // Sarah from Wedding Bliss
      location: {
        address_components: [
          { long_name: 'Melbourne', short_name: 'Melbourne', types: ['colloquial_area', 'locality', 'political'] },
          { long_name: 'Victoria', short_name: 'VIC', types: ['administrative_area_level_1', 'political'] },
          { long_name: 'Australia', short_name: 'AU', types: ['country', 'political'] }
        ],
        formatted_address: 'Melbourne VIC, Australia',
        geometry: { location: { lat: -37.8136276, lng: 144.9630576 } },
        place_id: 'ChIJ90260rVG1moRkM2MIXVWBAQ'
      },
      requiredSkills: ['Microphones', 'Speakers & PA Systems', 'Mixing Boards'],
      payRate: 40, // Matching the WordPress rate
      payType: 'HOURLY', // Matching pmt: "hour"
      status: 'ASSIGNED', // Since invitation was accepted
      startDate: new Date('2025-05-30'), // Matching the schedule date
      endDate: new Date('2025-05-30'),
      selectedTalent: talentUsers.find(u => u.wordpressId === 506)?.id, // Alex who accepted
      paymentStatus: 'PAID', // Matching payment_status: "paid"
      freeJob: true, // Matching free_job: "1"
      
      // WordPress-specific metadata
      wordpressData: {
        invitation_sent: [1398, 1384, 1380, 1373, 1370, 1357, 1355, 1332, 1323, 1321, 506], // Sample from real data
        invitation_accepted: [506],
        invitation_denied: [1373, 1357, 1253, 1107],
        tal_lat: -37.8136276,
        tal_lng: 144.9630576,
        address_name: 'Melbourne VIC, Australia'
      }
    },
    {
      wordpressId: 1418,
      title: 'Wedding DJ and MC - Luxury Venue',
      description: 'Professional DJ and MC needed for high-end wedding reception. Must provide own equipment suitable for 150 guests, experience with wedding timeline coordination, and professional presentation.',
      employerId: employerUsers.find(u => u.wordpressId === 699)?.id,
      location: {
        address_components: [
          { long_name: 'Sydney', short_name: 'Sydney', types: ['locality', 'political'] },
          { long_name: 'New South Wales', short_name: 'NSW', types: ['administrative_area_level_1', 'political'] },
          { long_name: 'Australia', short_name: 'AU', types: ['country', 'political'] }
        ],
        formatted_address: 'Sydney NSW, Australia',
        geometry: { location: { lat: -33.8688197, lng: 151.2092955 } },
        place_id: 'ChIJP3Sa8ziYEmsRUKgyFmh9AQM'
      },
      requiredSkills: ['DJ Services', 'MC/Host', 'Audio Equipment'],
      payRate: 120,
      payType: 'HOURLY',
      status: 'OPEN',
      startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
      endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      
      wordpressData: {
        invitation_sent: [506, 1253, 1107],
        invitation_accepted: [],
        invitation_denied: [],
        tal_lat: -33.8688197,
        tal_lng: 151.2092955,
        address_name: 'Sydney NSW, Australia'
      }
    },
    {
      wordpressId: 1419,
      title: 'Festival Stage Setup Crew',
      description: 'Multiple positions available for music festival stage setup and breakdown. Must have experience with large outdoor events, own transport, and ability to work long hours. Safety certification preferred.',
      employerId: employerUsers.find(u => u.wordpressId === 902)?.id,
      location: {
        address_components: [
          { long_name: 'Brisbane', short_name: 'Brisbane', types: ['locality', 'political'] },
          { long_name: 'Queensland', short_name: 'QLD', types: ['administrative_area_level_1', 'political'] },
          { long_name: 'Australia', short_name: 'AU', types: ['country', 'political'] }
        ],
        formatted_address: 'Brisbane QLD, Australia',
        geometry: { location: { lat: -27.4705, lng: 153.0260 } },
        place_id: 'ChIJoQ8Q6NtQkWsRhHMqYrHuAAU'
      },
      requiredSkills: ['Stage Setup', 'Event Coordination', 'Safety Management'],
      payRate: 2500,
      payType: 'DAILY',
      status: 'OPEN',
      startDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000),
      
      wordpressData: {
        invitation_sent: [1357, 506, 1373],
        invitation_accepted: [],
        invitation_denied: [],
        tal_lat: -27.4705,
        tal_lng: 153.0260,
        address_name: 'Brisbane QLD, Australia'
      }
    }
  ]

  const createdJobs = []
  for (const jobData of jobs) {
    const job = await prisma.job.create({
      data: {
        title: jobData.title,
        description: jobData.description,
        employerId: jobData.employerId!,
        location: JSON.stringify(jobData.location),
        requiredSkills: jobData.requiredSkills.join(','),
        payRate: jobData.payRate,
        payType: jobData.payType as 'HOURLY' | 'DAILY',
        status: jobData.status as 'OPEN' | 'ASSIGNED',
        startDate: jobData.startDate,
        endDate: jobData.endDate,
        selectedTalent: jobData.selectedTalent || null,
        paymentStatus: jobData.paymentStatus === 'PAID' ? 'PAID' : 'PENDING'
      }
    })
    createdJobs.push({ ...job, wordpressId: jobData.wordpressId, wordpressData: jobData.wordpressData })
    console.log(`✅ Created job: ${job.title} (WP ID: ${jobData.wordpressId}, Status: ${job.status})`)
  }

  // Create Job Applications (matching WordPress invitation system)
  console.log('\n📝 Creating WordPress-compatible applications...')
  
  const applications = [
    // Application for the assigned job (mimicking the accepted invitation)
    {
      jobId: createdJobs.find(j => j.wordpressId === 1417)?.id,
      talentId: talentUsers.find(u => u.wordpressId === 506)?.id, // Alex who accepted
      message: 'I have extensive experience with corporate audio setups in Melbourne. I own professional equipment suitable for corporate presentations and have worked at similar venues. I can provide references from previous corporate clients.',
      status: 'ACCEPTED',
      type: 'INVITATION' // This was an invitation, not an application
    },
    // Applications for open jobs
    {
      jobId: createdJobs.find(j => j.wordpressId === 1418)?.id,
      talentId: talentUsers.find(u => u.wordpressId === 1253)?.id, // Lisa (DJ)
      message: 'Hi! I specialize in wedding DJ services and MC work. I have my own professional sound system suitable for 150+ guests and extensive experience with luxury wedding venues in Sydney. I understand the importance of timeline coordination and professional presentation.',
      status: 'PENDING',
      type: 'APPLICATION'
    },
    {
      jobId: createdJobs.find(j => j.wordpressId === 1419)?.id,
      talentId: talentUsers.find(u => u.wordpressId === 1357)?.id, // Mike (Stage Setup)
      message: 'I have over 10 years experience with festival stage setup and breakdown. I hold current safety certifications and have my own transport. I\'ve worked at major festivals across Queensland and understand the demanding nature of festival production.',
      status: 'PENDING',
      type: 'APPLICATION'
    }
  ]

  for (const appData of applications) {
    if (appData.jobId && appData.talentId) {
      const application = await prisma.jobApplication.create({
        data: {
          jobId: appData.jobId,
          talentId: appData.talentId,
          message: appData.message,
          status: appData.status as 'PENDING' | 'ACCEPTED',
          type: appData.type as 'APPLICATION' | 'INVITATION'
        }
      })
      console.log(`✅ Created ${appData.type.toLowerCase()}: ${application.id}`)
    }
  }

  console.log('\n🎉 WordPress-compatible database seeded successfully!')
  console.log(`
📊 WordPress Migration Summary:
- ${skillCategories.length} skill categories (${skillCategories.reduce((acc, cat) => acc + cat.children.length, 0)} total skills)
- ${employerUsers.length} employers with WordPress IDs
- ${talentUsers.length} talent users with WordPress IDs  
- ${createdJobs.length} jobs with WordPress post structure
- ${applications.length} applications/invitations
- GPS coordinates and location data matching WordPress format
- Payment rates and types matching WordPress metadata
- Invitation system data preserved

🚀 Ready to test WordPress-compatible API responses!
`)

  // Log WordPress ID mappings for reference
  console.log('\n🔗 WordPress ID Mappings:')
  employerUsers.forEach(u => console.log(`Employer: ${u.firstName} ${u.lastName} (WP: ${u.wordpressId}) -> ${u.id}`))
  talentUsers.forEach(u => console.log(`Talent: ${u.firstName} ${u.lastName} (WP: ${u.wordpressId}) -> ${u.id}`))
  createdJobs.forEach(j => console.log(`Job: ${j.title} (WP: ${j.wordpressId}) -> ${j.id}`))
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 