const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient();

async function seedTestData() {
  try {
    console.log('🌱 Starting test data seeding...');
    
    const sqlFile = fs.readFileSync(
      path.join(__dirname, 'prisma', 'seed-test-data.sql'),
      'utf8'
    );

    // Execute raw SQL
    await prisma.$executeRawUnsafe(sqlFile);

    console.log('✅ Test data seeded successfully!');
    console.log('\n📊 Created:');
    console.log('   - 6 Teams');
    console.log('   - 1 Active Season (Season 2026)');
    console.log('   - 30 Players (5 GK, 5 DEF, 10 MID, 10 FWD)');
    console.log('   - All players linked to Season 2026');
    console.log('\n🎯 You can now test Sub Admin features!');
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();
