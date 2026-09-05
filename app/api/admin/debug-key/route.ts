import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    AUCTION_ENCRYPTION_KEY: process.env.AUCTION_ENCRYPTION_KEY || null,
    ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET || null,
    DB_ENCRYPTION_KEY: process.env.DB_ENCRYPTION_KEY || null,
    NODE_ENV: process.env.NODE_ENV
  });
}
