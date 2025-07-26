import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma'; // Using singleton pattern

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXTAUTH_URL + '/api/calendar/callback';

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

export async function GET(request: NextRequest) {
  console.log('OAuth callback called');
  
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    console.log('No session found, redirecting to dashboard');
    return NextResponse.redirect(new URL('/dashboard', process.env.NEXTAUTH_URL!));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  console.log('OAuth callback params:', { code: !!code, error });

  if (error) {
    console.log('OAuth error:', error);
    return NextResponse.redirect(new URL(`/dashboard?error=oauth_${error}`, process.env.NEXTAUTH_URL!));
  }

  if (!code) {
    console.log('No authorization code received');
    return NextResponse.redirect(new URL('/dashboard?error=no_code', process.env.NEXTAUTH_URL!));
  }

  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Received tokens from Google:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date
    });
    
    // Store tokens in database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (user) {
      const tokenData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      };
      
      console.log('Storing tokens for user:', session.user.email);
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          googleCalendarTokens: JSON.stringify(tokenData)
        }
      });
      
      console.log('Tokens stored successfully');
    } else {
      console.log('User not found for email:', session.user.email);
      return NextResponse.redirect(new URL('/dashboard?error=user_not_found', process.env.NEXTAUTH_URL!));
    }
    
    // Redirect back to settings with success
    return NextResponse.redirect(new URL('/settings?calendar=connected&success=true', process.env.NEXTAUTH_URL!));
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return NextResponse.redirect(new URL('/dashboard?error=token_exchange_failed', process.env.NEXTAUTH_URL!));
  }
}