import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Fixing Super Admin password...')
  
  // Hash the password properly
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  console.log('Generated hash:', hashedPassword)
  
  try {
    // Update the super admin password
    const updatedUser = await prisma.users.update({
      where: {
        email: 'admin@tfc.com'
      },
      data: {
        passwordHash: hashedPassword
      }
    })

    console.log('✅ Super Admin password updated successfully!')
    console.log('   Email: admin@tfc.com')
    console.log('   Password: admin123')
    console.log('   User ID:', updatedUser.id)
    
    // Verify the password works
    const isValid = await bcrypt.compare('admin123', updatedUser.passwordHash)
    console.log('\n🔍 Password verification:', isValid ? '✅ Valid' : '❌ Invalid')
    
  } catch (error) {
    console.error('❌ Error updating password:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('\n❌ Fatal Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
