const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJobsData() {
  try {
    console.log('🔍 Checking Current Jobs Data...\n');
    
    // Get all jobs with their relationships
    const jobs = await prisma.job.findMany({
      include: {
        employer: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true }
        },
        scheduleEntries: true,
        applications: {
          select: { id: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📊 Total Jobs Found: ${jobs.length}\n`);
    
    jobs.forEach((job, index) => {
      console.log(`📋 Job ${index + 1}:`);
      console.log(`   ID: ${job.id}`);
      console.log(`   Title: ${job.title}`);
      console.log(`   WordPress ID: ${job.wordpressId || 'None'}`);
      console.log(`   Employer: ${job.employer?.email || 'Unknown'} (${job.employer?.firstName} ${job.employer?.lastName})`);
      console.log(`   Employer Role: ${job.employer?.role || 'Unknown'}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Pay Rate: $${job.payRate || 0}`);
      console.log(`   Pay Type: ${job.payType || 'Not set'}`);
      console.log(`   Payment Status: ${job.paymentStatus}`);
      console.log(`   Location: ${job.location || 'Not set'}`);
      console.log(`   Start Date: ${job.startDate || 'Not set'}`);
      console.log(`   End Date: ${job.endDate || 'Not set'}`);
      console.log(`   Schedule Entries: ${job.scheduleEntries?.length || 0}`);
      console.log(`   Applications: ${job.applications?.length || 0}`);
      
      if (job.scheduleEntries && job.scheduleEntries.length > 0) {
        console.log(`   📅 Schedule Details:`);
        job.scheduleEntries.forEach((entry, i) => {
          console.log(`     ${i + 1}. Date: ${entry.date}, Time: ${entry.startTime} - ${entry.endTime}`);
        });
      }
      
      if (job.schedule) {
        console.log(`   📋 WordPress Schedule Data: Yes (${job.schedule.length} chars)`);
      }
      
      console.log('');
    });
    
    // Check JobSchedule table
    const scheduleCount = await prisma.jobSchedule.count();
    console.log(`📅 Total Schedule Entries in Database: ${scheduleCount}`);
    
    // Check for employers
    const employerCount = await prisma.user.count({
      where: { role: 'employer' }
    });
    console.log(`👨‍💼 Total Employers in Database: ${employerCount}`);
    
    // Show some employer details
    const employers = await prisma.user.findMany({
      where: { role: 'employer' },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        _count: {
          select: { jobsAsEmployer: true }
        }
      }
    });
    
    console.log(`\n👨‍💼 Employer Breakdown:`);
    employers.forEach(emp => {
      console.log(`   ${emp.email} (${emp.firstName} ${emp.lastName}): ${emp._count.jobsAsEmployer} jobs`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJobsData();
