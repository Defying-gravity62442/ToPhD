import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma'; // Using singleton pattern
import type { Session } from 'next-auth';

// Fallback type if google-auth-library is not available
// Remove this if you add the real type from google-auth-library
type GoogleOAuthTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
};

// Google Calendar API configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXTAUTH_URL + '/api/calendar/callback';

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// Standardized error response
function errorResponse(message: string, status: number, code?: string): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}

// Helper function to get stored tokens for a user
async function getStoredTokens(userEmail: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { googleCalendarTokens: true }
    });

    if (!user?.googleCalendarTokens) {
      return null;
    }

    return JSON.parse(user.googleCalendarTokens);
  } catch (error) {
    console.error('Error getting stored tokens:', error);
    return null;
  }
}

// Helper function to update stored tokens
async function updateStoredTokens(userEmail: string, tokens: GoogleOAuthTokens) {
  try {
    await prisma.user.update({
      where: { email: userEmail },
      data: {
        googleCalendarTokens: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date
        })
      }
    });
  } catch (error: unknown) {
    console.error('Error updating stored tokens:', error);
    throw error;
  }
}

// Get authenticated OAuth client with token refresh
async function getAuthenticatedClient(userEmail: string) {
  const tokens = await getStoredTokens(userEmail);
  
  if (!tokens || !tokens.access_token) {
    throw new Error('No tokens found');
  }

  oauth2Client.setCredentials(tokens);
  
  // Check if token is expired or about to expire (within 5 minutes)
  if (tokens.expiry_date && tokens.expiry_date <= Date.now() + 5 * 60 * 1000) {
    try {
      console.log('Refreshing expired token');
      const { credentials } = await oauth2Client.refreshAccessToken();
      await updateStoredTokens(userEmail, credentials);
      oauth2Client.setCredentials(credentials);
    } catch (error: unknown) {
      console.error('Failed to refresh token:', error);
      throw new Error('Failed to refresh access token');
    }
  }
  
  return oauth2Client;
}

// Improved date handling using UTC
function getNextDay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z'); // Force UTC
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  const session: Session | null = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return errorResponse('Unauthorized', 401);
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'auth') {
    // Check if user already has tokens
    const tokens = await getStoredTokens(session.user.email);
    
    // Generate OAuth URL for Google Calendar
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: tokens ? 'none' : 'consent' // Only prompt for consent if no tokens exist
    });

    console.log('OAuth Redirect URI:', REDIRECT_URI);
    console.log('Generated Auth URL:', authUrl);

    return NextResponse.json({ authUrl });
  }

  if (action === 'sync') {
    const milestoneId = searchParams.get('milestoneId');
    const goalId = searchParams.get('goalId');
    const goalTitle = searchParams.get('goalTitle'); // NEW
    const milestoneTitle = searchParams.get('milestoneTitle');
    const milestoneDescription = searchParams.get('milestoneDescription');
    const dueDate = searchParams.get('dueDate');
    
    if (!milestoneId || !goalId) {
      return errorResponse('Missing milestoneId or goalId', 400);
    }

    // Since these should always be provided, validate them
    if (!milestoneTitle || !dueDate) {
      return errorResponse('Missing milestoneTitle or dueDate', 400);
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return errorResponse('Invalid date format. Expected YYYY-MM-DD', 400);
    }

    try {
      // Get authenticated client with automatic token refresh
      const authClient = await getAuthenticatedClient(session.user.email);
      
      // Use milestoneDescription and goalTitle for event description
      const event = {
        summary: milestoneTitle,
        description: (milestoneDescription ? `${milestoneDescription}\n\nGoal: ${goalTitle}` : `Goal: ${goalTitle}\nMilestone ID: ${milestoneId}`),
        start: {
          date: dueDate
        },
        end: {
          date: getNextDay(dueDate)
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      console.log('Creating calendar event with data:', JSON.stringify(event, null, 2));
      
      const calendar = google.calendar({ version: 'v3', auth: authClient });
      
      const calendarResponse = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      console.log('Calendar API response:', {
        success: calendarResponse.status === 200,
        eventId: calendarResponse.data.id,
        eventUrl: calendarResponse.data.htmlLink
      });

      return NextResponse.json({ 
        success: true, 
        eventId: calendarResponse.data.id,
        eventUrl: calendarResponse.data.htmlLink 
      });

    } catch (error: unknown) {
      console.error('Error syncing with Google Calendar:', error);
      
      if (error instanceof Error && error.message === 'No tokens found') {
        return errorResponse('Not connected to Google Calendar', 401, 'NOT_CONNECTED');
      }
      
      if (error instanceof Error && error.message === 'Failed to refresh access token') {
        return errorResponse('Authentication expired. Please reconnect to Google Calendar', 401, 'AUTH_EXPIRED');
      }
      
      return errorResponse('Failed to sync with Google Calendar', 500);
    }
  }

  if (action === 'check') {
    // Check if user has valid tokens
    try {
      const tokens = await getStoredTokens(session.user.email);
      if (tokens && tokens.access_token) {
        return NextResponse.json({ connected: true });
      }
      return NextResponse.json({ connected: false });
    } catch (error) {
      console.error('Error checking tokens:', error);
      return NextResponse.json({ connected: false });
    }
  }

  if (action === 'test') {
    // Test calendar connection
    try {
      const authClient = await getAuthenticatedClient(session.user.email);
      const calendar = google.calendar({ version: 'v3', auth: authClient });
      
      // Try to list calendars to test connection
      const calendarList = await calendar.calendarList.list();
      
      return NextResponse.json({ 
        success: true, 
        calendars: calendarList.data.items?.map(cal => ({ id: cal.id, summary: cal.summary })) || []
      });
    } catch (error: unknown) {
      console.error('Error testing calendar connection:', error);
      
      if (error instanceof Error && error.message === 'No tokens found') {
        return errorResponse('Not connected to Google Calendar', 401, 'NOT_CONNECTED');
      }
      
      return errorResponse('Failed to test calendar connection', 500);
    }
  }

  return errorResponse('Invalid action', 400);
}

export async function POST(request: NextRequest) {
  const session: Session | null = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    console.log('Calendar POST request body:', body);
    
    const { action } = body;

    if (!action) {
      return errorResponse('Action is required', 400);
    }

    if (action === 'sync-milestone') {
      const { milestoneId, goalId, goalTitle, milestoneTitle, milestoneDescription, dueDate } = body;
      
      if (!milestoneId || !goalId || !milestoneTitle || !dueDate) {
        return errorResponse('milestoneId, goalId, milestoneTitle, and dueDate are required', 400);
      }
      // Pass all fields through to GET handler via query param
      const url = new URL(request.url);
      url.searchParams.set('action', 'sync');
      url.searchParams.set('milestoneId', milestoneId);
      url.searchParams.set('goalId', goalId);
      url.searchParams.set('goalTitle', goalTitle || ''); // <-- FIXED
      url.searchParams.set('milestoneTitle', milestoneTitle);
      url.searchParams.set('milestoneDescription', milestoneDescription || '');
      url.searchParams.set('dueDate', dueDate);
      return GET(new NextRequest(url.toString()));
    }

    if (action === 'sync-all') {
      // For E2EE users, sync-all must be performed client-side with decrypted data
      return errorResponse('Client-side sync-all required for encrypted data. Please use the updated app.', 400);
    }

    if (action === 'save-preferences') {
      const { preferences } = body;
      
      if (!preferences) {
        return errorResponse('Preferences are required', 400);
      }
      
      try {
        // Update user preferences in database
        await prisma.user.update({
          where: { email: session.user.email },
          data: {
            calendarSyncPreferences: JSON.stringify(preferences)
          }
        });
        
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Error saving preferences:', error);
        return errorResponse('Failed to save preferences', 500);
      }
    }

    if (action === 'disconnect') {
      try {
        await prisma.user.update({
          where: { email: session.user.email },
          data: {
            googleCalendarTokens: null
          }
        });
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Error disconnecting:', error);
        return errorResponse('Failed to disconnect', 500);
      }
    }

    return errorResponse(`Invalid action: ${action}`, 400);
  } catch (error) {
    console.error('Error in calendar POST:', error);
    return errorResponse('Internal server error', 500);
  }
}