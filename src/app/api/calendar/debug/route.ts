import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ hasTokens: false }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { googleCalendarTokens: true }
    });

    const hasTokens = !!(user?.googleCalendarTokens);
    
    // If tokens exist, validate they have required fields
    if (hasTokens) {
      try {
        const tokens = JSON.parse(user.googleCalendarTokens!);
        const isValid = !!(tokens.access_token && tokens.refresh_token);
        return NextResponse.json({ hasTokens: isValid });
      } catch {
        return NextResponse.json({ hasTokens: false });
      }
    }

    return NextResponse.json({ hasTokens: false });
  } catch (error) {
    console.error('Error in calendar debug endpoint:', error);
    return NextResponse.json({ hasTokens: false }, { status: 200 });
  }
}