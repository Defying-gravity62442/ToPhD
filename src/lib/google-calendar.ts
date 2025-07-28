import { google } from 'googleapis';
import { prisma } from './prisma';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXTAUTH_URL + '/api/calendar/callback';

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

export async function getStoredTokens(userEmail: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { googleCalendarTokens: true }
    });
    if (!user?.googleCalendarTokens) return null;
    
    try {
      return JSON.parse(user.googleCalendarTokens);
    } catch (parseError) {
      console.error('Failed to parse stored Google Calendar tokens as JSON:', parseError);
      console.error('Raw tokens data:', user.googleCalendarTokens);
      return null;
    }
  } catch (error) {
    console.error('Error getting stored tokens:', error);
    return null;
  }
}

export async function getAuthenticatedClient(userEmail: string) {
  const tokens = await getStoredTokens(userEmail);
  if (!tokens || !tokens.access_token) {
    throw new Error('No tokens found');
  }
  oauth2Client.setCredentials(tokens);
  if (tokens.expiry_date && tokens.expiry_date <= Date.now() + 5 * 60 * 1000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await prisma.user.update({
        where: { email: userEmail },
        data: {
          googleCalendarTokens: JSON.stringify({
            access_token: credentials.access_token,
            refresh_token: credentials.refresh_token,
            expiry_date: credentials.expiry_date
          })
        }
      });
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw new Error('Failed to refresh access token');
    }
  }
  return oauth2Client;
}

export async function fetchUpcomingEvents(userEmail: string, days: number = 7) {
  const authClient = await getAuthenticatedClient(userEmail);
  const calendar = google.calendar({ version: 'v3', auth: authClient });
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const eventsRes = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20
  });
  return eventsRes.data.items || [];
} 