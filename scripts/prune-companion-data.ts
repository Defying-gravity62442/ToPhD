import { prisma } from '../src/lib/prisma';
import { invokeBedrockWithRetry, createBedrockCommand } from '../src/lib/bedrock-utils';
const INFERENCE_PROFILE_ID = process.env.BEDROCK_INFERENCE_PROFILE_ID;

async function summarizePeriod(summaries: string[], periodLabel: string): Promise<string> {
  if (summaries.length === 0) return '';
  const prompt = `Summarize the following ${periodLabel} summaries into a concise, user-friendly reflection, highlighting key events, progress, and emotional trends.\n\nSummaries:\n${summaries.join('\n')}\n\nSummary:`;
  const modelInput = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 256,
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.5,
    top_p: 0.9
  };
  const command = createBedrockCommand(INFERENCE_PROFILE_ID!, modelInput);
  const result = await invokeBedrockWithRetry(command, 3);
  return (result.content && Array.isArray(result.content)) ? (result.content[0]?.text || '') : '';
}

async function summarizeJournalEntry(entry: any): Promise<string> {
  // TODO: Decrypt entry.encryptedData if E2EE is required
  const prompt = `Summarize the following journal entry in 2-3 sentences, focusing on the user's mood, main topics, and any actionable points.\n\nEntry:\n${entry.encryptedData}\n\nSummary:`;
  const modelInput = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 128,
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    top_p: 0.9
  };
  const command = createBedrockCommand(INFERENCE_PROFILE_ID!, modelInput);
  const result = await invokeBedrockWithRetry(command, 3);
  return (result.content && Array.isArray(result.content)) ? (result.content[0]?.text || '') : '';
}

async function generateDailySummaries() {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    // Find all journal entries for the user that do not have a CompanionSummary
    const entries = await prisma.journalEntry.findMany({
      where: {
        userId: user.id,
        companionSummaries: { none: {} },
      },
      orderBy: { date: 'asc' },
    });
    for (const entry of entries) {
      // Only summarize if there are no companion messages (no conversation)
      const messages = await prisma.companionMessage.findMany({
        where: { userId: user.id, journalEntryId: entry.id },
      });
      if (messages.length > 0) continue;
      // Summarize the journal entry
      const summaryText = await summarizeJournalEntry(entry);
      await prisma.companionSummary.create({
        data: {
          userId: user.id,
          journalEntryId: entry.id,
          summary: summaryText,
          visibleToAI: true,
        }
      });
    }
  }
}

async function aggregateWeeklySummaries() {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    // Find all daily summaries not yet aggregated into a weekly summary
    const dailySummaries = await prisma.companionSummary.findMany({
      where: {
        userId: user.id,
        visibleToAI: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (dailySummaries.length === 0) continue;
    // Group by week (ISO week)
    const weeks: Record<string, typeof dailySummaries> = {};
    for (const summary of dailySummaries) {
      const date = summary.createdAt;
      const year = date.getUTCFullYear();
      const week = getISOWeek(date);
      const key = `${year}-W${week}`;
      if (!weeks[key]) weeks[key] = [];
      weeks[key].push(summary);
    }
    for (const [weekKey, summaries] of Object.entries(weeks)) {
      // Only aggregate if all 7 days are present or the week is in the past
      if (summaries.length < 7 && !isPastWeek(summaries[0].createdAt)) continue;
      const summaryTexts = summaries.map(s => s.summary);
      const [year, weekStr] = weekKey.split('-W');
      const weekNum = parseInt(weekStr, 10);
      const { start, end } = getWeekStartEnd(parseInt(year, 10), weekNum);
      const summaryText = await summarizePeriod(summaryTexts, `week (${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]})`);
      await prisma.weeklySummary.create({
        data: {
          userId: user.id,
          startDate: start,
          endDate: end,
          summary: summaryText,
          visibleToAI: true,
        }
      });
      // Delete the daily summaries for this week
      await prisma.companionSummary.deleteMany({
        where: {
          userId: user.id,
          id: { in: summaries.map(s => s.id) },
        }
      });
    }
  }
}

// Helper: Get ISO week number
function getISOWeek(date: Date): number {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
// Helper: Get start and end of ISO week
function getWeekStartEnd(year: number, week: number) {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay() || 7;
  const start = new Date(simple);
  start.setUTCDate(simple.getUTCDate() - dayOfWeek + 1);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}
// Stub for monthly/yearly aggregation
async function aggregateMonthlySummaries() {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    // Find all weekly summaries for the user
    const weeklySummaries = await prisma.weeklySummary.findMany({
      where: {
        userId: user.id,
        visibleToAI: true,
      },
      orderBy: { startDate: 'asc' },
    });
    if (weeklySummaries.length === 0) continue;
    // Group by month/year
    const months: Record<string, typeof weeklySummaries> = {};
    for (const summary of weeklySummaries) {
      const date = summary.startDate;
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1; // 1-12
      const key = `${year}-${month}`;
      if (!months[key]) months[key] = [];
      months[key].push(summary);
    }
    for (const [monthKey, summaries] of Object.entries(months)) {
      // Only aggregate if all weeks are present or the month is in the past
      const [year, month] = monthKey.split('-').map(Number);
      const isCurrentMonth = (new Date().getUTCFullYear() === year && new Date().getUTCMonth() + 1 === month);
      if (isCurrentMonth) continue;
      // 4 or 5 weeks per month, but aggregate if month is in the past
      const summaryTexts = summaries.map(s => s.summary);
      const summaryText = await summarizePeriod(summaryTexts, `month (${year}-${month})`);
      await prisma.monthlySummary.create({
        data: {
          userId: user.id,
          month,
          year,
          summary: summaryText,
          visibleToAI: true,
        }
      });
      // Delete the weekly summaries for this month
      await prisma.weeklySummary.deleteMany({
        where: {
          userId: user.id,
          id: { in: summaries.map(s => s.id) },
        }
      });
    }
  }
}

async function aggregateYearlySummaries() {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    // Find all monthly summaries for the user
    const monthlySummaries = await prisma.monthlySummary.findMany({
      where: {
        userId: user.id,
        visibleToAI: true,
      },
      orderBy: { year: 'asc', month: 'asc' },
    });
    if (monthlySummaries.length === 0) continue;
    // Group by year
    const years: Record<string, typeof monthlySummaries> = {};
    for (const summary of monthlySummaries) {
      const year = summary.year;
      const key = `${year}`;
      if (!years[key]) years[key] = [];
      years[key].push(summary);
    }
    for (const [yearKey, summaries] of Object.entries(years)) {
      const year = Number(yearKey);
      const isCurrentYear = (new Date().getUTCFullYear() === year);
      if (isCurrentYear) continue;
      // 12 months per year, but aggregate if year is in the past
      const summaryTexts = summaries.map(s => s.summary);
      const summaryText = await summarizePeriod(summaryTexts, `year (${year})`);
      await prisma.yearlySummary.create({
        data: {
          userId: user.id,
          year,
          summary: summaryText,
          visibleToAI: true,
        }
      });
      // Delete the monthly summaries for this year
      await prisma.monthlySummary.deleteMany({
        where: {
          userId: user.id,
          id: { in: summaries.map(s => s.id) },
        }
      });
    }
  }
}

function isPastWeek(date: Date): boolean {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentWeek = getISOWeek(now);
  const year = date.getUTCFullYear();
  const week = getISOWeek(date);
  return year < currentYear || (year === currentYear && week < currentWeek);
}

async function main() {
  await generateDailySummaries();
  await aggregateWeeklySummaries();
  await aggregateMonthlySummaries();
  await aggregateYearlySummaries();
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 