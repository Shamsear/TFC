import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Checking Super Admin email...\n')
  
  // Find the super admin
  const superAdmin = await prisma.users.findFirst({
    where: { role: 'SUPER_ADMIN' }
  })
  
  if (!superAdmin) {
    console.log('❌ No super admin found!')
    return
  }
  
  console.log('Current Super Admin:')
  console.log(`   ID: ${superAdmin.id}`)
  console.log(`   Email: ${superAdmin.email}`)
  console.log(`   Name: ${superAdmin.name}`)
  
  if (superAdmin.email !== 'admin@tfc.com') {
    console.log('\n⚠️  Email is incorrect. Updating...')
    
    const updated = await prisma.users.update({
      where: { id: superAdmin.id },
      data: { email: 'admin@tfc.com' }
    })
    
    console.log('✅ Email updated to: admin@tfc.com')
  } else {
    console.log('\n✅ Email is correct!')
  }
  
  console.log('\n📝 Login credentials:')
  console.log('   Email: admin@tfc.com')
  console.log('   Password: admin123')
}

main()
  .catch((e) => {
    console.error('\n❌ Fatal Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
