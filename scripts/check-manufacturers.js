#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkManufacturers() {
  try {
    console.log('🏭 **CHECKING CURRENT MANUFACTURERS**\n');
    
    const manufacturers = await prisma.manufacturer.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`📊 **TOTAL MANUFACTURERS:** ${manufacturers.length}\n`);
    
    if (manufacturers.length > 0) {
      console.log('📝 **MANUFACTURER LIST:**');
      manufacturers.forEach(m => {
        console.log(`   • ${m.name} (WP ID: ${m.wordpressId || 'N/A'})`);
      });
    } else {
      console.log('   ❌ No manufacturers found in database');
    }
    
  } catch (error) {
    console.error('❌ **ERROR:**', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkManufacturers(); 