import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../../../lib/prisma';
import { invokeBedrockWithRetry, createBedrockCommand } from '@/lib/bedrock-utils';
import { fetchUpcomingEvents } from '../../../../../lib/google-calendar';
const INFERENCE_PROFILE_ID = process.env.BEDROCK_INFERENCE_PROFILE_ID;

// Request deduplication cache
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper: Get ISO week number
function getISOWeek(date: Date): number {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Add minimal types for event, entry, and goal
interface CalendarEvent {
  start?: { dateTime?: string | null; date?: string | null };
  summary?: string | null;
  [key: string]: unknown;
}

interface Goal {
  title: string;
  milestones: { completed: boolean; title: string; dueDate?: string | null }[];
  [key: string]: unknown;
}

function formatEvents(events: CalendarEvent[]): string {
  if (!events.length) return 'No upcoming calendar events.';
  return events.map((e: CalendarEvent) => {
    const start = e.start?.dateTime || e.start?.date;
    const summary = e.summary || 'Untitled Event';
    return `- ${summary} (${start})`;
  }).join('\n');
}



function formatGoals(goals: Goal[]): string {
  if (!goals.length) return 'No active goals.';
  return goals.map(g => {
    const milestones = g.milestones.map((m: { completed: boolean; title: string; dueDate?: string | null }) => {
      const status = m.completed ? '✔' : '✗';
      return `${status} ${m.title}${m.dueDate ? ` (due ${m.dueDate})` : ''}`;
    }).join('; ');
    return `- ${g.title}: ${milestones}`;
  }).join('\n');
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user) || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const userEmail = session.user.email as string;

  // Get user's time zone from query param, default to UTC
  const { searchParams } = new URL(req.url);
  const timeZone = searchParams.get('tz') || 'UTC';
  // Get user's local date string (YYYY-MM-DD) with 3 AM cutoff
  let localDate: string;
  try {
    const now = new Date();
    // Convert to user's local time in their time zone
    const tzNow = new Date(now.toLocaleString('en-US', { timeZone }));
    // Subtract 3 hours for 3 AM cutoff
    tzNow.setHours(tzNow.getHours() - 3);
    // Use toLocaleDateString with 'en-CA' for YYYY-MM-DD
    localDate = tzNow.toLocaleDateString('en-CA');
  } catch {
    // Fallback to UTC date
    localDate = new Date().toISOString().split('T')[0];
  }

  // Check cache for existing request for this user and local day
  const cacheKey = `prompt_${userId}_${localDate}`;
  const cached = requestCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.promise;
  }

  // Create new request promise
  const requestPromise = (async () => {
    // Calendar context
    let calendarContext = '';
    try {
      const events = await fetchUpcomingEvents(userEmail, 7);
      calendarContext = `Upcoming calendar events (next 7 days):\n${formatEvents(events as CalendarEvent[])}`;
    } catch {
      calendarContext = 'No calendar events found or calendar not connected.';
    }

    // Hierarchical summaries context
    let summariesContext = '';
    try {
      const summaries: string[] = [];
      
      // Get most recent yearly summary (not current year)
      const currentYear = new Date().getUTCFullYear();
      const yearlySummary = await prisma.yearlySummary.findFirst({
        where: {
          userId,
          visibleToAI: true,
          year: { lt: currentYear }
        },
        orderBy: { year: 'desc' }
      });
      if (yearlySummary) {
        summaries.push(`Yearly Summary ${yearlySummary.year}:\n${yearlySummary.summary}`);
      }
      
      // Get most recent monthly summary (not covered by yearly, not current month)
      const currentMonth = new Date().getUTCMonth() + 1;
      const monthlySummary = await prisma.monthlySummary.findFirst({
        where: {
          userId,
          visibleToAI: true,
          OR: [
            { year: { lt: currentYear } },
            { year: currentYear, month: { lt: currentMonth } }
          ]
        },
        orderBy: [ { year: 'desc' }, { month: 'desc' } ]
      });
      if (monthlySummary && (!yearlySummary || yearlySummary.year !== monthlySummary.year)) {
        summaries.push(`Monthly Summary ${monthlySummary.year}-${monthlySummary.month}:\n${monthlySummary.summary}`);
      }
      
      // Get most recent weekly summary (not covered by monthly/yearly, not current week)
      const weeklySummary = await prisma.weeklySummary.findFirst({
        where: {
          userId,
          visibleToAI: true,
          endDate: { lt: new Date() }
        },
        orderBy: { endDate: 'desc' }
      });
      if (weeklySummary) {
        const weekYear = weeklySummary.startDate.getUTCFullYear();
        const weekNum = getISOWeek(weeklySummary.startDate);
        if ((!yearlySummary || yearlySummary.year !== weekYear) && 
            (!monthlySummary || monthlySummary.year !== weekYear || monthlySummary.month !== weeklySummary.startDate.getUTCMonth() + 1)) {
          summaries.push(`Weekly Summary ${weekYear}-W${weekNum}:\n${weeklySummary.summary}`);
        }
      }
      
      // Get recent daily summaries (not covered by weekly/monthly/yearly)
      const dailySummaries = await prisma.companionSummary.findMany({
        where: {
          userId,
          visibleToAI: true,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        },
        orderBy: { createdAt: 'desc' },
        include: { journalEntry: true }
      });
      
      // Filter out daily summaries that are covered by higher-level summaries
      const uncoveredDailySummaries = dailySummaries.filter(daily => {
        const dailyDate = daily.createdAt;
        const dailyYear = dailyDate.getUTCFullYear();
        const dailyMonth = dailyDate.getUTCMonth() + 1;
        
        // Check if covered by yearly summary
        if (yearlySummary && yearlySummary.year === dailyYear) return false;
        // Check if covered by monthly summary
        if (monthlySummary && monthlySummary.year === dailyYear && monthlySummary.month === dailyMonth) return false;
        // Check if covered by weekly summary
        if (weeklySummary) {
          const weekStart = weeklySummary.startDate;
          const weekEnd = weeklySummary.endDate;
          if (dailyDate >= weekStart && dailyDate <= weekEnd) return false;
        }
        return true;
      });
      
      if (uncoveredDailySummaries.length > 0) {
        const dailySummaryTexts = uncoveredDailySummaries.map(daily => 
          `Daily Summary ${daily.createdAt.toISOString().split('T')[0]}:\n${daily.summary}`
        );
        summaries.push(...dailySummaryTexts);
      }
      
      summariesContext = summaries.length > 0 
        ? `Recent Activity Summaries:\n${summaries.join('\n\n')}`
        : 'No recent activity summaries.';
    } catch {
      summariesContext = 'No recent activity summaries.';
    }

    // 7-day mood summary
    let moodContext = '';
    try {
      const recentEntries = await prisma.journalEntry.findMany({
        where: {
          userId,
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        select: { mood: true }
      });
      const moods = recentEntries.map(e => e.mood).filter(Boolean);
      const moodCounts: Record<string, number> = {};
      moods.forEach(m => { if (m) moodCounts[m] = (moodCounts[m] || 0) + 1; });
      moodContext = Object.keys(moodCounts).length
        ? `Recent Mood Summary (7 days): ${Object.entries(moodCounts).map(([m, c]) => `${m} (${c})`).join(', ')}`
        : 'Recent Mood Summary (7 days): N/A';
    } catch {
      moodContext = 'Recent Mood Summary (7 days): N/A';
    }

    // Current goals
    let goalsContext = '';
    try {
      const goals = await prisma.goal.findMany({
        where: { userId, status: 'active' },
        include: { milestones: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' }
      });
      goalsContext = `Active goals and milestones:\n${formatGoals(goals as Goal[])}`;
    } catch {
      goalsContext = 'No active goals.';
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        background: true
      }
    });
    const background = user?.background || null;

    const context = `${calendarContext}\n\n${summariesContext}\n\n${moodContext}\n\n${goalsContext}${background ? `\n\nUser Background: ${background}` : ''}`;
    const prompt = `Based on the following context, generate three daily journal questions that encourage user self-reflection. Please be concise. \\n\\n Context:${context}`;
    const modelInput = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 256,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      top_p: 0.9
    };
    const command = createBedrockCommand(INFERENCE_PROFILE_ID!, modelInput);
    try {
      const bedrockResponse = await invokeBedrockWithRetry(command, 3);
      let content = '';
      if (bedrockResponse.content && Array.isArray(bedrockResponse.content)) {
        content = bedrockResponse.content[0]?.text || '';
      }
      return NextResponse.json({ prompt: content.trim() });
    } catch (error: unknown) {
      console.error('Error generating smart prompt:', error);
      
      // Handle throttling specifically
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ThrottlingException') {
        return NextResponse.json({ 
          error: 'AI service is temporarily busy. Please try again in a few moments.',
          retryAfter: 30 
        }, { status: 429 });
      }
      
      return NextResponse.json({ error: 'Failed to generate prompt' }, { status: 500 });
    }
  })();

  // Cache the request for this user and local day
  requestCache.set(cacheKey, { promise: requestPromise, timestamp: Date.now() });

  // Clean up old cache entries
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      requestCache.delete(key);
    }
  }

  return requestPromise;
} 