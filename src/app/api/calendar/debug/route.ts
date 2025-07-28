import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const debugInfo: {
    hasNextAuthUrl: boolean;
    nextAuthUrl: string | null;
    hasGoogleClientId: boolean;
    hasGoogleClientSecret: boolean;
    userEmail: string;
    hasDatabaseConnection: boolean;
    hasStoredTokens: boolean;
    tokenInfo: null | {
      hasAccessToken: boolean;
      hasRefreshToken: boolean;
      expiryDate: any;
      isExpired: boolean | null;
      parseError?: string;
    };
    redirectUri: string | null;
  } = {
    // Environment variables
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL || null,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    
    // User info
    userEmail: session.user.email,
    
    // Database connection
    hasDatabaseConnection: false,
    
    // Stored tokens
    hasStoredTokens: false,
    tokenInfo: null,
    
    // Redirect URI
    redirectUri: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/calendar/callback` : null,
  };

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    debugInfo.hasDatabaseConnection = true;
    
    // Check for stored tokens
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { googleCalendarTokens: true }
    });
    
    if (user?.googleCalendarTokens) {
      debugInfo.hasStoredTokens = true;
      try {
        const tokens = JSON.parse(user.googleCalendarTokens);
        debugInfo.tokenInfo = {
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          expiryDate: tokens.expiry_date,
          isExpired: tokens.expiry_date ? tokens.expiry_date <= Date.now() : null
        };
      } catch (parseError) {
        console.error('Failed to parse stored tokens as JSON:', parseError);
        debugInfo.tokenInfo = {
          hasAccessToken: false,
          hasRefreshToken: false,
          expiryDate: null,
          isExpired: null,
          parseError: 'Invalid JSON format'
        };
      }
    }
  } catch (error) {
    debugInfo.hasDatabaseConnection = false;
    console.error('Debug endpoint error:', error);
  }

  return NextResponse.json(debugInfo);
}