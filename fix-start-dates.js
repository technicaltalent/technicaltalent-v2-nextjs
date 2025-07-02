#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addStartDatesToJobs() {
  console.log('🗓️  Adding start dates to existing jobs...');
  
  try {
    const jobs = await prisma.job.findMany({
      where: {
        startDate: null
      }
    });
    
    console.log(`Found ${jobs.length} jobs without start dates`);
    
    for (const job of jobs) {
      // Set start date to 1-7 days from creation date
      const daysToAdd = Math.floor(Math.random() * 7) + 1;
      const startDate = new Date(job.createdAt);
      startDate.setDate(startDate.getDate() + daysToAdd);
      
      await prisma.job.update({
        where: { id: job.id },
        data: {
          startDate: startDate
        }
      });
      
      console.log(`✅ Updated job "${job.title}" with start date: ${startDate.toDateString()}`);
    }
    
    console.log('🎉 All jobs now have start dates!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addStartDatesToJobs(); 