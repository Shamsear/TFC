import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { config } from 'dotenv'
import { generateUserId } from '../lib/id-generator'

// Load environment variables
config()

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create Super Admin user
  const superAdminPassword = await hash('superadmin123', 12)
  const superAdminId = await generateUserId()
  const superAdmin = await prisma.users.upsert({
    where: { email: 'superadmin@turfcats.com' },
    update: {},
    create: {
      id: superAdminId,
      email: 'superadmin@turfcats.com',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      passwordHash: superAdminPassword,
      updatedAt: new Date()
    },
  })
  console.log('✓ Created Super Admin:', superAdmin.email)

  // Create Sub Admin user
  const subAdminPassword = await hash('subadmin123', 12)
  const subAdminId = await generateUserId()
  const subAdmin = await prisma.users.upsert({
    where: { email: 'subadmin@turfcats.com' },
    update: {},
    create: {
      id: subAdminId,
      email: 'subadmin@turfcats.com',
      name: 'Sub Admin',
      role: 'SUB_ADMIN',
      passwordHash: subAdminPassword,
      updatedAt: new Date()
    },
  })
  console.log('✓ Created Sub Admin:', subAdmin.email)

  console.log('\nSeeding completed!')
  console.log('\nTest Credentials:')
  console.log('─────────────────────────────────────')
  console.log('Super Admin:')
  console.log('  Email: superadmin@turfcats.com')
  console.log('  Password: superadmin123')
  console.log('\nSub Admin:')
  console.log('  Email: subadmin@turfcats.com')
  console.log('  Password: subadmin123')
  console.log('─────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
