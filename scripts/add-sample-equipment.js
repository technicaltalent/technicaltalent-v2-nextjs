const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSampleEquipment() {
  console.log('🔧 Adding sample equipment associations...');
  
  // Get some users and manufacturers
  const users = await prisma.user.findMany({
    where: { 
      role: 'TALENT',
      id: { in: ['user_266', 'user_276', 'user_293', 'user_135'] }
    },
    take: 4
  });
  
  const manufacturers = await prisma.manufacturer.findMany({
    where: { 
      category: { in: ['audio', 'lighting', 'video', 'etc'] }
    },
    take: 20
  });
  
  console.log(`👥 Found ${users.length} users`);
  console.log(`🏭 Found ${manufacturers.length} manufacturers`);
  
  // Add equipment associations
  const associations = [
    // Luke Hart - Audio equipment
    { userId: 'user_266', manufacturerIds: ['manufacturer_14', 'manufacturer_19', 'manufacturer_21'] }, // Digico S Series, Midas M32, Allen & Heath iLive
    // Ali Smith - Audio + Lighting
    { userId: 'user_276', manufacturerIds: ['manufacturer_16', 'manufacturer_100', 'manufacturer_113'] }, // Digico SD Series, ETC, Martin M1
    // Luke Smith - Lighting
    { userId: 'user_293', manufacturerIds: ['manufacturer_100', 'manufacturer_104', 'manufacturer_113'] }, // ETC, LSC maXim, Martin M1
    // Tye Pennington - Audio + Video
    { userId: 'user_135', manufacturerIds: ['manufacturer_20', 'manufacturer_106', 'manufacturer_107'] } // Midas Pro Series, Pixera, vMix
  ];
  
  let addedCount = 0;
  
  for (const { userId, manufacturerIds } of associations) {
    const user = users.find(u => u.id === userId);
    if (!user) {
      console.log(`❌ User ${userId} not found`);
      continue;
    }
    
    for (const manufacturerId of manufacturerIds) {
      const manufacturer = manufacturers.find(m => m.id === manufacturerId);
      if (!manufacturer) {
        console.log(`❌ Manufacturer ${manufacturerId} not found`);
        continue;
      }
      
      try {
        // Check if association already exists
        const existing = await prisma.userManufacturer.findUnique({
          where: {
            userId_manufacturerId: {
              userId: userId,
              manufacturerId: manufacturerId
            }
          }
        });
        
        if (!existing) {
          await prisma.userManufacturer.create({
            data: {
              userId: userId,
              manufacturerId: manufacturerId
            }
          });
          addedCount++;
          console.log(`✅ Added ${manufacturer.name} to ${user.firstName} ${user.lastName}`);
        } else {
          console.log(`⚠️ ${manufacturer.name} already associated with ${user.firstName} ${user.lastName}`);
        }
      } catch (error) {
        console.error(`❌ Error adding ${manufacturer.name} to ${user.firstName} ${user.lastName}:`, error.message);
      }
    }
  }
  
  console.log(`\n📊 Added ${addedCount} equipment associations`);
  
  // Show users with equipment
  console.log('\n📋 Users with equipment:');
  const usersWithEquipment = await prisma.user.findMany({
    where: {
      manufacturers: { some: {} }
    },
    include: {
      manufacturers: {
        include: { manufacturer: true }
      }
    },
    take: 10
  });
  
  usersWithEquipment.forEach(user => {
    console.log(`🔧 ${user.firstName} ${user.lastName}:`);
    user.manufacturers.forEach(um => {
      console.log(`   - ${um.manufacturer.name} (${um.manufacturer.category})`);
    });
  });
  
  await prisma.$disconnect();
}

addSampleEquipment().catch(console.error); 