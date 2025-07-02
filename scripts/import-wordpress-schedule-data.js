#!/usr/bin/env node

/**
 * Import WordPress Schedule Data to Next.js v2 Database
 * 
 * This script:
 * 1. Updates the database schema to include JobSchedule model
 * 2. Imports WordPress schedule data from existing jobs
 * 3. Parses WordPress serialized PHP schedule arrays
 * 4. Creates JobSchedule entries for each date/time combination
 * 5. Updates Job.schedule field with WordPress-compatible data
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// WordPress schedule data parser
function parseWordPressSchedule(scheduleString) {
  if (!scheduleString) return [];
  
  try {
    // Parse WordPress serialized PHP array format
    // Example: a:1:{i:0;a:3:{s:4:"date";s:10:"2023-01-28";s:9:"startTime";s:5:"21:00";s:7:"endTime";s:5:"06:00";}}
    
    const entries = [];
    const matches = scheduleString.match(/i:\d+;a:3:\{[^}]+\}/g);
    
    if (!matches) return [];
    
    for (const match of matches) {
      const dateMatch = match.match(/s:4:"date";s:\d+:"([^"]+)"/);
      const startTimeMatch = match.match(/s:9:"startTime";s:\d+:"([^"]+)"/);
      const endTimeMatch = match.match(/s:7:"endTime";s:\d+:"([^"]+)"/);
      
      if (dateMatch && startTimeMatch && endTimeMatch) {
        entries.push({
          date: dateMatch[1],
          startTime: startTimeMatch[1],
          endTime: endTimeMatch[1]
        });
      }
    }
    
    return entries;
  } catch (error) {
    console.error('Error parsing schedule:', error.message);
    return [];
  }
}

// Create WordPress-compatible schedule string
function createWordPressSchedule(scheduleEntries) {
  if (!scheduleEntries.length) return null;
  
  let serialized = `a:${scheduleEntries.length}:{`;
  
  scheduleEntries.forEach((entry, index) => {
    serialized += `i:${index};a:3:{s:4:"date";s:${entry.date.length}:"${entry.date}";s:9:"startTime";s:${entry.startTime.length}:"${entry.startTime}";s:7:"endTime";s:${entry.endTime.length}:"${entry.endTime}";}`;
  });
  
  serialized += '}';
  return serialized;
}

async function readWordPressSQL() {
  const sqlPath = path.join(__dirname, '../../Reference Files/wp_6fbrt.sql');
  
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ WordPress SQL file not found:', sqlPath);
    process.exit(1);
  }
  
  console.log('📖 Reading WordPress SQL file...');
  return fs.readFileSync(sqlPath, 'utf-8');
}

async function extractScheduleData(sqlContent) {
  console.log('🔍 Extracting schedule data from WordPress SQL...');
  
  const scheduleData = [];
  const lines = sqlContent.split('\n');
  
  for (const line of lines) {
    // Look for schedule meta data in postmeta entries
    if (line.includes("'schedule'")) {
      // Match format: (meta_id, post_id, 'schedule', 'value'),
      const regex = /\((\d+),\s*(\d+),\s*'schedule',\s*'([^']+)'\)/g;
      let match;
      
      while ((match = regex.exec(line)) !== null) {
        const [, metaId, postId, scheduleValue] = match;
        scheduleData.push({
          wordpressPostId: parseInt(postId),
          scheduleValue: scheduleValue
        });
      }
    }
  }
  
  console.log(`✅ Found ${scheduleData.length} jobs with schedule data`);
  return scheduleData;
}

async function migrateScheduleData() {
  console.log('🚀 Starting WordPress schedule data migration...');
  
  try {
    // 1. Read WordPress SQL file
    const sqlContent = await readWordPressSQL();
    
    // 2. Extract schedule data
    const scheduleData = await extractScheduleData(sqlContent);
    
    if (scheduleData.length === 0) {
      console.log('⚠️  No schedule data found in WordPress SQL');
      return;
    }
    
    // 3. Process each job with schedule data
    let importedCount = 0;
    let updatedJobs = 0;
    
    for (const scheduleItem of scheduleData) {
      try {
        // Find existing job by WordPress ID
        const job = await prisma.job.findUnique({
          where: { wordpressId: scheduleItem.wordpressPostId }
        });
        
        if (!job) {
          console.log(`⚠️  Job not found for WordPress ID ${scheduleItem.wordpressPostId}`);
          continue;
        }
        
        // Parse WordPress schedule data (handle escaped quotes)
        const unescapedSchedule = scheduleItem.scheduleValue.replace(/\\"/g, '"');
        const scheduleEntries = parseWordPressSchedule(unescapedSchedule);
        
        if (scheduleEntries.length === 0) {
          console.log(`⚠️  No valid schedule entries for job ${job.id}`);
          continue;
        }
        
        // Create JobSchedule entries
        for (const entry of scheduleEntries) {
          await prisma.jobSchedule.create({
            data: {
              jobId: job.id,
              date: entry.date,
              startTime: entry.startTime,
              endTime: entry.endTime
            }
          });
          importedCount++;
        }
        
        // Update job with WordPress schedule string and derived start date
        const firstEntry = scheduleEntries[0];
        const startDateTime = new Date(`${firstEntry.date}T${firstEntry.startTime}:00.000Z`);
        
        await prisma.job.update({
          where: { id: job.id },
          data: {
            schedule: scheduleItem.scheduleValue,
            startDate: startDateTime
          }
        });
        
        updatedJobs++;
        console.log(`✅ Updated job ${job.title} with ${scheduleEntries.length} schedule entries`);
        
      } catch (error) {
        console.error(`❌ Error processing job ${scheduleItem.wordpressPostId}:`, error.message);
      }
    }
    
    console.log('\n🎉 Schedule data migration completed!');
    console.log(`📊 Summary:`);
    console.log(`   • ${updatedJobs} jobs updated with schedule data`);
    console.log(`   • ${importedCount} schedule entries created`);
    console.log(`   • ${scheduleData.length - updatedJobs} jobs skipped (not found or invalid data)`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🎯 WordPress Schedule Data Migration');
    console.log('=====================================\n');
    
    await migrateScheduleData();
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseWordPressSchedule,
  createWordPressSchedule
}; 