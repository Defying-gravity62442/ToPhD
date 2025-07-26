import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  // Gather all user data
  const [user, journalEntries, futureLetters, goals, milestones, companionSummaries, companionMessages, weeklySummaries, monthlySummaries, yearlySummaries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        encryptedDEK_password: true,
        encryptedDEK_recovery: true,
        dekSalt: true,
        recoverySalt: true,
        recoveryCodeHash: true,
        recoveryCodeExpiry: true,
        createdAt: true,
        background: true,
        assistantName: true,
        assistantTone: true,
        currentInstitution: true,
        currentDepartment: true,
      },
    }),
    prisma.journalEntry.findMany({
      where: { userId },
      select: {
        id: true,
        date: true,
        encryptedData: true,
        dekId: true,
        mood: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.futureLetter.findMany({
      where: { userId },
      select: {
        id: true,
        content: true,
        unlockDate: true,
        createdAt: true,
        delivered: true,
        emailSent: true,
        title: true,
      },
    }),
    prisma.goal.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.milestone.findMany({
      where: { goal: { userId } },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        completed: true,
        createdAt: true,
        goalId: true,
      },
    }),
    prisma.companionSummary.findMany({
      where: { userId },
      select: {
        id: true,
        journalEntryId: true,
        summary: true,
        createdAt: true,
        visibleToAI: true,
      },
    }),
    prisma.companionMessage.findMany({
      where: { userId },
      select: {
        id: true,
        journalEntryId: true,
        role: true,
        content: true,
        createdAt: true,
      },
    }),
    prisma.weeklySummary.findMany({
      where: { userId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        summary: true,
        visibleToAI: true,
        createdAt: true,
      },
    }),
    prisma.monthlySummary.findMany({
      where: { userId },
      select: {
        id: true,
        month: true,
        year: true,
        summary: true,
        visibleToAI: true,
        createdAt: true,
      },
    }),
    prisma.yearlySummary.findMany({
      where: { userId },
      select: {
        id: true,
        year: true,
        summary: true,
        visibleToAI: true,
        createdAt: true,
      },
    }),
  ]);

  const exportData = {
    user,
    journalEntries,
    futureLetters,
    goals,
    milestones,
    companionSummaries,
    companionMessages,
    weeklySummaries,
    monthlySummaries,
    yearlySummaries,
    exportedAt: new Date().toISOString(),
    note: 'All data is encrypted. Only you can decrypt it with your key.',
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="my_encrypted_data.json"',
    },
  });
} 