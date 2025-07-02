/**
 * Import WordPress Job Status Data
 * 
 * This script:
 * 1. Parses WordPress postmeta table for job_status metadata
 * 2. Maps WordPress job_status values to v2 JobStatus enum values
 * 3. Updates Job records with correct status from WordPress metadata
 * 
 * WordPress job_status values:
 * - 'complete' → 'COMPLETED'
 * - 'booked' → 'ASSIGNED'
 * - 'publish' or null → 'OPEN'
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importWordPressJobStatus() {
  try {
    console.log('🔄 Starting WordPress job status import...');
    
    // Read WordPress SQL file
    const sqlPath = path.join(__dirname, '../../Reference Files/wp_6fbrt.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`WordPress SQL file not found at: ${sqlPath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log(`📖 Read WordPress SQL file (${Math.round(sqlContent.length / 1024 / 1024)}MB)`);
    
    // Parse postmeta for job_status
    console.log('🔍 Parsing job_status metadata...');
    const jobStatusMeta = parseJobStatusMeta(sqlContent);
    console.log(`📊 Found ${jobStatusMeta.length} job_status records`);
    
    // Get current jobs with WordPress IDs
    const jobsWithWordPressIds = await prisma.job.findMany({
      where: {
        wordpressId: { not: null }
      },
      select: {
        id: true,
        wordpressId: true,
        title: true,
        status: true
      }
    });
    
    console.log(`📋 Found ${jobsWithWordPressIds.length} jobs with WordPress IDs in database`);
    
    // Update job statuses
    let updatedCount = 0;
    let statusCounts = {
      COMPLETED: 0,
      ASSIGNED: 0,
      OPEN: 0,
      unchanged: 0
    };
    
    for (const job of jobsWithWordPressIds) {
      const jobStatusRecord = jobStatusMeta.find(meta => meta.post_id === job.wordpressId);
      
      if (jobStatusRecord) {
        const newStatus = mapWordPressStatusToV2Status(jobStatusRecord.meta_value);
        
        if (newStatus !== job.status) {
          try {
            await prisma.job.update({
              where: { id: job.id },
              data: { status: newStatus }
            });
            
            console.log(`   ✅ Updated: ${job.title} (WP ID: ${job.wordpressId}) → ${job.status} → ${newStatus}`);
            updatedCount++;
            statusCounts[newStatus]++;
          } catch (error) {
            console.log(`   ❌ Failed to update job ${job.title}: ${error.message}`);
          }
        } else {
          console.log(`   ⚪ No change: ${job.title} already ${newStatus}`);
          statusCounts.unchanged++;
        }
      } else {
        // No job_status metadata found - probably defaults to OPEN
        if (job.status !== 'OPEN') {
          try {
            await prisma.job.update({
              where: { id: job.id },
              data: { status: 'OPEN' }
            });
            
            console.log(`   ✅ Defaulted: ${job.title} (WP ID: ${job.wordpressId}) → ${job.status} → OPEN`);
            updatedCount++;
            statusCounts.OPEN++;
          } catch (error) {
            console.log(`   ❌ Failed to update job ${job.title}: ${error.message}`);
          }
        } else {
          statusCounts.unchanged++;
        }
      }
    }
    
    console.log('\n📊 Job Status Import Summary:');
    console.log(`   ✅ Jobs updated: ${updatedCount}`);
    console.log(`   📈 Status distribution:`);
    console.log(`      - COMPLETED: ${statusCounts.COMPLETED}`);
    console.log(`      - ASSIGNED (booked): ${statusCounts.ASSIGNED}`);
    console.log(`      - OPEN: ${statusCounts.OPEN}`);
    console.log(`      - Unchanged: ${statusCounts.unchanged}`);
    
    // Verify the updates
    await verifyJobStatusUpdates();
    
  } catch (error) {
    console.error('❌ Error importing WordPress job status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Parse job_status metadata from WordPress SQL
 */
function parseJobStatusMeta(sqlContent) {
  const jobStatusMeta = [];
  
  // Find all lines containing job_status metadata
  const lines = sqlContent.split('\n');
  
  for (const line of lines) {
    // Look for job_status metadata entries
    const matches = line.match(/\((\d+), (\d+), 'job_status', '([^']*)'\)/g);
    
    if (matches) {
      for (const match of matches) {
        const parts = match.match(/\((\d+), (\d+), 'job_status', '([^']*)'\)/);
        
        if (parts) {
          jobStatusMeta.push({
            meta_id: parseInt(parts[1]),
            post_id: parseInt(parts[2]),
            meta_key: 'job_status',
            meta_value: parts[3]
          });
        }
      }
    }
  }
  
  return jobStatusMeta;
}

/**
 * Map WordPress job_status values to v2 JobStatus enum
 */
function mapWordPressStatusToV2Status(wordpressStatus) {
  switch (wordpressStatus) {
    case 'complete':
      return 'COMPLETED';
    case 'booked':
      return 'ASSIGNED';
    case 'publish':
    case '':
    case null:
    case undefined:
      return 'OPEN';
    default:
      console.log(`   ⚠️  Unknown WordPress status: "${wordpressStatus}" → defaulting to OPEN`);
      return 'OPEN';
  }
}

/**
 * Verify the job status updates
 */
async function verifyJobStatusUpdates() {
  console.log('\n🔍 Verifying job status updates...');
  
  const statusCounts = await prisma.job.groupBy({
    by: ['status'],
    _count: {
      status: true
    },
    where: {
      wordpressId: { not: null }
    }
  });
  
  console.log('📊 Current job status distribution:');
  for (const group of statusCounts) {
    console.log(`   - ${group.status}: ${group._count.status} jobs`);
  }
  
  // Show some examples of each status
  const examples = {
    COMPLETED: await prisma.job.findFirst({
      where: { 
        status: 'COMPLETED',
        wordpressId: { not: null }
      },
      select: { title: true, wordpressId: true }
    }),
    ASSIGNED: await prisma.job.findFirst({
      where: { 
        status: 'ASSIGNED',
        wordpressId: { not: null }
      },
      select: { title: true, wordpressId: true }
    }),
    OPEN: await prisma.job.findFirst({
      where: { 
        status: 'OPEN',
        wordpressId: { not: null }
      },
      select: { title: true, wordpressId: true }
    })
  };
  
  console.log('\n🎯 Example jobs by status:');
  for (const [status, job] of Object.entries(examples)) {
    if (job) {
      console.log(`   - ${status}: "${job.title}" (WP ID: ${job.wordpressId})`);
    }
  }
}

// Run the import
if (require.main === module) {
  importWordPressJobStatus()
    .then(() => {
      console.log('✅ WordPress job status import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ WordPress job status import failed:', error);
      process.exit(1);
    });
}

module.exports = { importWordPressJobStatus }; 