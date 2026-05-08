/**
 * Fix Photo URLs Migration Script
 * Updates all player photo URLs from .jpg to .webp format
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixPhotoUrls() {
  console.log('🔄 Starting photo URL migration...\n')
  
  try {
    // Step 1: Count before migration
    console.log('📊 Checking current state...')
    const beforeJpg = await prisma.base_players.count({
      where: {
        photoUrl: {
          contains: '.jpg'
        }
      }
    })
    
    const beforeWebp = await prisma.base_players.count({
      where: {
        photoUrl: {
          contains: '.webp'
        }
      }
    })
    
    const total = await prisma.base_players.count()
    
    console.log(`   Total players: ${total}`)
    console.log(`   Players with .jpg URLs: ${beforeJpg}`)
    console.log(`   Players with .webp URLs: ${beforeWebp}\n`)
    
    if (beforeJpg === 0) {
      console.log('✅ All photo URLs are already using .webp format!')
      console.log('   No migration needed.\n')
      return
    }
    
    // Step 2: Update .jpg to .webp
    console.log('🔧 Updating .jpg URLs to .webp...')
    const resultJpg = await prisma.$executeRaw`
      UPDATE base_players 
      SET "photoUrl" = REPLACE("photoUrl", '.jpg', '.webp'),
          "updatedAt" = NOW()
      WHERE "photoUrl" LIKE '%.jpg'
    `
    console.log(`   Updated ${resultJpg} records from .jpg\n`)
    
    // Step 3: Update .JPG (uppercase) to .webp
    console.log('🔧 Checking for uppercase .JPG URLs...')
    const resultJPG = await prisma.$executeRaw`
      UPDATE base_players 
      SET "photoUrl" = REPLACE("photoUrl", '.JPG', '.webp'),
          "updatedAt" = NOW()
      WHERE "photoUrl" LIKE '%.JPG'
    `
    if (resultJPG > 0) {
      console.log(`   Updated ${resultJPG} records from .JPG\n`)
    } else {
      console.log(`   No uppercase .JPG URLs found\n`)
    }
    
    // Step 4: Update .jpeg to .webp
    console.log('🔧 Checking for .jpeg URLs...')
    const resultJpeg = await prisma.$executeRaw`
      UPDATE base_players 
      SET "photoUrl" = REPLACE("photoUrl", '.jpeg', '.webp'),
          "updatedAt" = NOW()
      WHERE "photoUrl" LIKE '%.jpeg'
    `
    if (resultJpeg > 0) {
      console.log(`   Updated ${resultJpeg} records from .jpeg\n`)
    } else {
      console.log(`   No .jpeg URLs found\n`)
    }
    
    // Step 5: Count after migration
    console.log('📊 Verifying results...')
    const afterJpg = await prisma.base_players.count({
      where: {
        photoUrl: {
          contains: '.jpg'
        }
      }
    })
    
    const afterWebp = await prisma.base_players.count({
      where: {
        photoUrl: {
          contains: '.webp'
        }
      }
    })
    
    console.log(`   Total players: ${total}`)
    console.log(`   Players with .jpg URLs: ${afterJpg}`)
    console.log(`   Players with .webp URLs: ${afterWebp}\n`)
    
    // Step 6: Show sample of updated records
    console.log('📋 Sample of updated records:')
    const samples = await prisma.base_players.findMany({
      select: {
        id: true,
        name: true,
        photoUrl: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5
    })
    
    samples.forEach((player, index) => {
      console.log(`   ${index + 1}. ${player.name}`)
      console.log(`      URL: ${player.photoUrl}`)
      console.log(`      Updated: ${player.updatedAt.toISOString()}\n`)
    })
    
    // Step 7: Final summary
    console.log('✅ Migration completed successfully!\n')
    console.log('📝 Next steps:')
    console.log('   1. Rename physical photo files in public/players/ from .jpg to .webp')
    console.log('   2. Clear Next.js cache: rm -rf .next/cache/images')
    console.log('   3. Restart dev server: npm run dev\n')
    console.log('   See FIX-PHOTO-URLS.md for detailed instructions.\n')
    
  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  }
}

// Run the migration
fixPhotoUrls()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
