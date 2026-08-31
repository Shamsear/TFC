import dotenv from 'dotenv'
import path from 'path'

// Load from project root .env explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

console.log('Available Env Keys:', Object.keys(process.env).filter(k => k.includes('GIT') || k.includes('TOKEN') || k.includes('PAT')))
