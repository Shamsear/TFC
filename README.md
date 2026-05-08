# Turf Cats Tournament Management Platform

A Next.js 15 application for managing multi-season eFootball tournaments with real-time auction capabilities, temporal player statistics tracking, and comprehensive historical views.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Authentication**: NextAuth.js v5
- **Database**: Neon PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Testing**: Vitest, fast-check, Playwright
- **Image Hosting**: ImageKit

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (Neon recommended)
- ImageKit account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your environment variables:
   ```bash
   cp .env.example .env
   ```

4. Set up the database:
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run unit tests with Vitest
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:e2e` - Run E2E tests with Playwright
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## Project Structure

```
├── app/                    # Next.js App Router pages
├── components/             # React components
├── lib/                    # Utility functions and services
├── prisma/                 # Prisma schema and migrations
├── tests/                  # Test files
│   ├── e2e/               # Playwright E2E tests
│   ├── integration/       # Integration tests
│   ├── properties/        # Property-based tests
│   └── helpers/           # Test utilities
└── public/                # Static assets
```

## License

ISC
