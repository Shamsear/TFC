const { PrismaClient } = require('@prisma/client')

// Use DIRECT_URL if available to avoid connection pooler issues during DDL queries
const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
console.log('🔗 Connecting to database...')
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
})

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrate() {
  let retries = 5;
  while (retries > 0) {
    try {
      console.log('🔍 Checking database columns on users table...')

      // Check if column must_change_password exists on users table
      const columns = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'must_change_password'
      `

      if (columns.length === 0) {
        console.log('📝 Adding must_change_password column to users table...')
        await prisma.$executeRaw`
          ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE
        `
        console.log('✅ must_change_password column added successfully')
      } else {
        console.log('✅ must_change_password column already exists')
      }

      console.log('🔍 Checking password_reset_requests table...')
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'password_reset_requests'
      `

      if (tables.length === 0) {
        console.log('📝 Creating password_reset_requests table...')
        await prisma.$executeRaw`
          CREATE TABLE password_reset_requests (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            team_name VARCHAR(255) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            reviewed_by VARCHAR(255),
            reviewed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
          )
        `
        console.log('✅ password_reset_requests table created successfully')

        console.log('📝 Creating indexes for password_reset_requests...')
        await prisma.$executeRaw`
          CREATE INDEX idx_prr_user_id ON password_reset_requests(user_id)
        `
        await prisma.$executeRaw`
          CREATE INDEX idx_prr_status ON password_reset_requests(status)
        `
        console.log('✅ Indexes created successfully')
      } else {
        console.log('✅ password_reset_requests table already exists')
      }

      console.log('🎉 Database migration completed successfully!')
      break; // Success, exit loop
    } catch (error) {
      console.warn(`⚠️ Connection attempt failed. Retries left: ${retries - 1}. Error: ${error.message}`)
      retries--;
      if (retries === 0) {
        console.error('❌ Migration failed after multiple attempts:', error)
        process.exit(1)
      }
      console.log('⏳ Waiting 3 seconds before retrying...')
      await delay(3000);
    } finally {
      await prisma.$disconnect()
    }
  }
}

migrate()
