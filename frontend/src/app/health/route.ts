import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'frontend',
    environment: process.env.NODE_ENV || 'development'
  });
}
