import { NextResponse } from 'next/server';

// This endpoint is deprecated: user now sets their own recovery code during E2EE setup.
export async function POST() {
  return NextResponse.json({ error: 'Recovery code request endpoint is deprecated. User sets their own recovery code during E2EE setup.' }, { status: 410 });
} 