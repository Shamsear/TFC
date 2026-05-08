// Vitest setup file
// Add global test setup here

import { config } from 'dotenv'

// Load environment variables from .env file
config()

// Ensure DATABASE_URL is set for tests
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL not set, using default test database URL')
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/tfc_test'
}