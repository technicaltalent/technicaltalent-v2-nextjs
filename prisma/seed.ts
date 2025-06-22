import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Technical Talent Platform database with realistic data...\n')

  // Clear existing data
  console.log('🧹 Cleaning existing data...')
  await prisma.jobApplication.deleteMany()
  await prisma.userSkill.deleteMany()
  await prisma.job.deleteMany()
  await prisma.userProfile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.skill.deleteMany()

  // Seed Skills with realistic technical skills
  console.log('🎯 Creating skills categories...')
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
        { name: 'Wireless Systems', category: 'Audio Equipment' },
        { name: 'Monitor Systems', category: 'Audio Equipment' }
      ]
    },
    {
      name: 'Video Equipment',
      category: 'Technical Skills',
      children: [
        { name: 'Cameras', category: 'Video Equipment' },
        { name: 'Lighting Setup', category: 'Video Equipment' },
        { name: 'Video Editing', category: 'Video Equipment' },
        { name: 'Live Streaming', category: 'Video Equipment' },
        { name: 'Projection Systems', category: 'Video Equipment' },
        { name: 'Video Production', category: 'Video Equipment' }
      ]
    },
    {
      name: 'Stage Management',
      category: 'Production Skills',
      children: [
        { name: 'Stage Setup', category: 'Stage Management' },
        { name: 'Crowd Control', category: 'Stage Management' },
        { name: 'Event Coordination', category: 'Stage Management' },
        { name: 'Safety Management', category: 'Stage Management' },
        { name: 'Equipment Transport', category: 'Stage Management' },
        { name: 'Venue Management', category: 'Stage Management' }
      ]
    },
    {
      name: 'Entertainment',
      category: 'Performance Skills',
      children: [
        { name: 'DJ Services', category: 'Entertainment' },
        { name: 'Live Music', category: 'Entertainment' },
        { name: 'MC/Host', category: 'Entertainment' },
        { name: 'Dancing', category: 'Entertainment' },
        { name: 'Photography', category: 'Entertainment' },
        { name: 'Event Planning', category: 'Entertainment' }
      ]
    },
    {
      name: 'Technical Support',
      category: 'Support Skills',
      children: [
        { name: 'Equipment Maintenance', category: 'Technical Support' },
        { name: 'Troubleshooting', category: 'Technical Support' },
        { name: 'Cable Management', category: 'Technical Support' },
        { name: 'Power Distribution', category: 'Technical Support' },
        { name: 'Network Setup', category: 'Technical Support' }
      ]
    }
  ]

  const skillsMap = new Map()

  for (const skillCategory of skillCategories) {
    // Create parent skill
    const parentSkill = await prisma.skill.create({
      data: {
        name: skillCategory.name,
        category: skillCategory.category,
        isActive: true
      }
    })

    skillsMap.set(skillCategory.name, parentSkill.id)
    console.log(`✅ Created parent skill: ${parentSkill.name}`)

    // Create child skills
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

  // Seed Users with realistic profiles
  console.log('\n👥 Creating users...')
  
  // Create Employers
  const employers = [
    {
      email: 'sarah@weddingbliss.com.au',
      password: 'password123',
      firstName: 'Sarah',
      lastName: 'Mitchell',
      role: 'EMPLOYER',
      phone: '+61 2 9555 0101',
      bio: 'Wedding planner with 8 years experience organizing luxury events across Sydney. Specializing in outdoor ceremonies and reception coordination.',
      company: 'Wedding Bliss Events'
    },
    {
      email: 'james@corporateevents.com.au',
      password: 'password123',
      firstName: 'James',
      lastName: 'Chen',
      role: 'EMPLOYER',
      phone: '+61 3 8555 0102',
      bio: 'Corporate event manager coordinating large-scale conferences, product launches, and team building events for Fortune 500 companies.',
      company: 'Corporate Events Melbourne'
    },
    {
      email: 'maria@musicfestival.org',
      password: 'password123',
      firstName: 'Maria',
      lastName: 'Rodriguez',
      role: 'EMPLOYER',
      phone: '+61 7 3555 0103',
      bio: 'Festival director organizing annual music festivals featuring local and international artists. Experience with multi-stage events and large crowds.',
      company: 'Brisbane Music Festival'
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
            location: JSON.stringify({
              city: employerData.company.includes('Sydney') ? 'Sydney' : 
                    employerData.company.includes('Melbourne') ? 'Melbourne' : 'Brisbane',
              state: employerData.company.includes('Sydney') ? 'NSW' : 
                     employerData.company.includes('Melbourne') ? 'VIC' : 'QLD',
              country: 'Australia'
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
    employerUsers.push(user)
    console.log(`✅ Created employer: ${user.firstName} ${user.lastName}`)
  }

  // Create Talent/Freelancers
  const talents = [
    {
      email: 'alex@audiopro.com',
      password: 'password123',
      firstName: 'Alex',
      lastName: 'Thompson',
      role: 'TALENT',
      phone: '+61 2 9555 0201',
      bio: 'Professional audio engineer with 10+ years experience in live events, concerts, and corporate functions. Specialized in large venue sound systems and wireless microphone setups.',
      skills: ['Microphones', 'Mixing Boards', 'Speakers & PA Systems', 'Wireless Systems', 'Audio Recording'],
      experience: [5, 8, 7, 6, 4] // years of experience for each skill
    },
    {
      email: 'jenny@videoproduction.com.au',
      password: 'password123',
      firstName: 'Jenny',
      lastName: 'Kim',
      role: 'TALENT',
      phone: '+61 3 8555 0202',
      bio: 'Creative video producer and camera operator specializing in event documentation, live streaming, and promotional content. Expert in multi-camera setups and real-time editing.',
      skills: ['Cameras', 'Video Editing', 'Live Streaming', 'Lighting Setup', 'Video Production'],
      experience: [6, 8, 3, 5, 7]
    },
    {
      email: 'mike@stagetech.net',
      password: 'password123',
      firstName: 'Mike',
      lastName: 'O\'Brien',
      role: 'TALENT',
      phone: '+61 7 3555 0203',
      bio: 'Experienced stage manager and technical coordinator. Specializes in large events, festival production, and crew coordination. RSGB certified for safety management.',
      skills: ['Stage Setup', 'Event Coordination', 'Safety Management', 'Equipment Transport', 'Crowd Control'],
      experience: [12, 10, 8, 9, 7]
    },
    {
      email: 'lisa@djservices.com.au',
      password: 'password123',
      firstName: 'Lisa',
      lastName: 'Park',
      role: 'TALENT',
      phone: '+61 2 9555 0204',
      bio: 'Professional DJ and MC with extensive experience in weddings, corporate events, and private parties. Owns comprehensive sound system suitable for venues up to 300 people.',
      skills: ['DJ Services', 'MC/Host', 'Audio Equipment', 'Event Planning', 'Microphones'],
      experience: [8, 6, 10, 4, 9]
    },
    {
      email: 'david@techsupport.pro',
      password: 'password123',
      firstName: 'David',
      lastName: 'Wilson',
      role: 'TALENT',
      phone: '+61 4 1555 0205',
      bio: 'Technical support specialist and equipment technician. Expert in troubleshooting audio/video equipment, power distribution, and emergency repairs during live events.',
      skills: ['Equipment Maintenance', 'Troubleshooting', 'Power Distribution', 'Cable Management', 'Network Setup'],
      experience: [15, 12, 10, 14, 6]
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
              city: talentData.email.includes('9555') ? 'Sydney' : 
                    talentData.email.includes('8555') ? 'Melbourne' :
                    talentData.email.includes('3555') ? 'Brisbane' : 'Sydney',
              state: talentData.email.includes('9555') ? 'NSW' : 
                     talentData.email.includes('8555') ? 'VIC' :
                     talentData.email.includes('3555') ? 'QLD' : 'NSW',
              country: 'Australia'
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
            proficiencyLevel: Math.min(5, Math.floor(talentData.experience[i] / 2) + 2), // 2-5 scale based on experience
            yearsExperience: talentData.experience[i]
          }
        })
      }
    }

    talentUsers.push(user)
    console.log(`✅ Created talent: ${user.firstName} ${user.lastName} with ${talentData.skills.length} skills`)
  }

  // Create realistic Jobs
  console.log('\n💼 Creating jobs...')
  
  const jobs = [
    {
      title: 'Audio Engineer for Luxury Wedding',
      description: 'We need an experienced audio engineer for a high-end wedding ceremony and reception at Darling Harbour. The event will host 150 guests with live music performances, speeches, and dancing. Requirements include wireless microphone setup for ceremony, sound system for reception, and coordination with live band. Professional appearance and experience with outdoor venues essential.',
      employerId: employerUsers[0].id, // Sarah from Wedding Bliss
      location: {
        address: 'Darling Harbour Convention Centre',
        city: 'Sydney',
        state: 'NSW',
        country: 'Australia',
        remote: false
      },
      requiredSkills: ['Microphones', 'Speakers & PA Systems', 'Mixing Boards', 'Wireless Systems'],
      payRate: 85,
      payType: 'HOURLY',
      status: 'OPEN',
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'Multi-Camera Video Production Team',
      description: 'Seeking experienced video production team for annual company conference. 2-day event with 500+ attendees, multiple keynote presentations, panel discussions, and networking sessions. Need 3-camera setup, live streaming capabilities, and same-day highlight reel production. Professional equipment and crew coordination essential.',
      employerId: employerUsers[1].id, // James from Corporate Events
      location: {
        address: 'Melbourne Convention Centre',
        city: 'Melbourne',
        state: 'VIC',
        country: 'Australia',
        remote: false
      },
      requiredSkills: ['Cameras', 'Live Streaming', 'Video Production', 'Lighting Setup'],
      payRate: 2500,
      payType: 'DAILY',
      status: 'OPEN',
      startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
      endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'Festival Stage Manager',
      description: 'Lead stage manager needed for 3-day music festival with 4 stages and 50+ artists. Responsible for stage setup, artist coordination, crew management, and safety compliance. Must have experience with large outdoor events, crowd management, and emergency procedures. RSGB certification preferred.',
      employerId: employerUsers[2].id, // Maria from Music Festival
      location: {
        address: 'South Bank Parklands',
        city: 'Brisbane',
        state: 'QLD',
        country: 'Australia',
        remote: false
      },
      requiredSkills: ['Stage Setup', 'Event Coordination', 'Safety Management', 'Crowd Control'],
      payRate: 4500,
      payType: 'DAILY',
      status: 'OPEN',
      startDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 6+ weeks from now
      endDate: new Date(Date.now() + 48 * 24 * 60 * 60 * 1000)
    },
    {
      title: 'DJ and MC for Corporate Gala',
      description: 'Professional DJ and MC required for annual charity gala dinner. 200 guests, elegant venue, mix of background music during dinner and dance music afterward. MC duties include introducing speakers, conducting auction, and maintaining event flow. Black-tie event requiring professional presentation.',
      employerId: employerUsers[1].id, // James from Corporate Events
      location: {
        address: 'Crown Palladium',
        city: 'Melbourne',
        state: 'VIC',
        country: 'Australia',
        remote: false
      },
      requiredSkills: ['DJ Services', 'MC/Host', 'Audio Equipment', 'Event Planning'],
      payRate: 120,
      payType: 'HOURLY',
      status: 'ASSIGNED',
      startDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
      selectedTalent: talentUsers[3].id // Lisa Park
    },
    {
      title: 'Technical Support - Equipment Troubleshooting',
      description: 'Experienced technical support needed for large corporate conference. On-site troubleshooting for audio/video equipment, power distribution systems, and network connectivity. Must be available for pre-event setup, live event support, and post-event breakdown. Quick problem-solving skills essential.',
      employerId: employerUsers[0].id, // Sarah from Wedding Bliss
      location: {
        address: 'International Convention Centre',
        city: 'Sydney',
        state: 'NSW',
        country: 'Australia',
        remote: false
      },
      requiredSkills: ['Equipment Maintenance', 'Troubleshooting', 'Power Distribution', 'Cable Management'],
      payRate: 65,
      payType: 'HOURLY',
      status: 'COMPLETED',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      endDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      selectedTalent: talentUsers[4].id, // David Wilson
      paymentStatus: 'PAID'
    }
  ]

  const createdJobs = []
  for (const jobData of jobs) {
    const job = await prisma.job.create({
      data: {
        title: jobData.title,
        description: jobData.description,
        employerId: jobData.employerId,
        location: JSON.stringify(jobData.location),
        requiredSkills: jobData.requiredSkills.join(','),
        payRate: jobData.payRate,
        payType: jobData.payType as 'HOURLY' | 'DAILY' | 'FIXED',
        status: jobData.status as 'OPEN' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED',
        startDate: jobData.startDate,
        endDate: jobData.endDate,
        selectedTalent: jobData.selectedTalent || null,
        paymentStatus: (jobData as any).paymentStatus || 'PENDING'
      }
    })
    createdJobs.push(job)
    console.log(`✅ Created job: ${job.title} (${job.status})`)
  }

  // Create Job Applications
  console.log('\n📝 Creating job applications...')
  
  const applications = [
    // Applications for Wedding Audio Engineer job
    {
      jobId: createdJobs[0].id,
      talentId: talentUsers[0].id, // Alex Thompson
      message: 'Hi Sarah, I have extensive experience with luxury wedding audio setups, including outdoor venues at Darling Harbour. I own professional wireless microphone systems and have worked with live bands at similar high-end events. My equipment includes a digital mixing board perfect for the 150-guest capacity. I would love to help make this wedding perfect!',
      status: 'PENDING',
      type: 'APPLICATION'
    },
    {
      jobId: createdJobs[0].id,
      talentId: talentUsers[4].id, // David Wilson
      message: 'Hello, I have 15 years of experience in audio engineering and technical support for luxury events. While my specialty is troubleshooting, I also have comprehensive audio setup experience and can provide backup technical support if needed during the event.',
      status: 'PENDING',
      type: 'APPLICATION'
    },
    // Applications for Video Production job
    {
      jobId: createdJobs[1].id,
      talentId: talentUsers[1].id, // Jenny Kim
      message: 'Hi James, I specialize in multi-camera corporate events and live streaming. I have all the equipment needed for a 3-camera setup and can provide real-time editing for highlight reels. I\'ve worked at Melbourne Convention Centre before and understand their technical requirements.',
      status: 'ACCEPTED',
      type: 'APPLICATION'
    },
    // Applications for Festival Stage Manager
    {
      jobId: createdJobs[2].id,
      talentId: talentUsers[2].id, // Mike O'Brien
      message: 'Hi Maria, I have managed stages at festivals across Australia for over 10 years. I hold RSGB certification and have experience coordinating 50+ artist performances. I understand the complexities of multi-stage festivals and have excellent relationships with crew and vendors in Brisbane.',
      status: 'PENDING',
      type: 'APPLICATION'
    },
    // Applications for completed job (Technical Support)
    {
      jobId: createdJobs[4].id,
      talentId: talentUsers[4].id, // David Wilson
      message: 'I have 15 years of technical support experience and am available for immediate troubleshooting support. I carry a comprehensive toolkit and have worked at ICC Sydney many times.',
      status: 'ACCEPTED',
      type: 'APPLICATION'
    }
  ]

  for (const appData of applications) {
    const application = await prisma.jobApplication.create({
      data: {
        jobId: appData.jobId,
        talentId: appData.talentId,
        message: appData.message,
        status: appData.status as 'PENDING' | 'ACCEPTED' | 'REJECTED',
        type: appData.type as 'APPLICATION' | 'INVITATION'
      }
    })
    console.log(`✅ Created application for job: ${application.id}`)
  }

  console.log('\n🎉 Database seeded successfully!')
  console.log(`
📊 Seeding Summary:
- ${skillCategories.length} skill categories with ${skillCategories.reduce((acc, cat) => acc + cat.children.length, 0)} child skills
- ${employerUsers.length} employers
- ${talentUsers.length} talented freelancers 
- ${createdJobs.length} jobs (OPEN: ${createdJobs.filter(j => j.status === 'OPEN').length}, ASSIGNED: ${createdJobs.filter(j => j.status === 'ASSIGNED').length}, COMPLETED: ${createdJobs.filter(j => j.status === 'COMPLETED').length})
- ${applications.length} job applications

🚀 Ready to test the API endpoints!
`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 