import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../../lib/prisma';

/**
 * Get the "journal date" for a given timestamp, accounting for 3 AM cutoff
 * Times before 3 AM are considered part of the previous day
 * @param timeZone - User's timezone (e.g., 'America/Los_Angeles')
 * @param timestamp - Optional timestamp, defaults to now
 * @returns Date string in YYYY-MM-DD format
 */
function getJournalDate(timeZone: string = 'UTC', timestamp?: Date): string {
  try {
    const now = timestamp || new Date();
    // Convert to user's local time in their time zone
    const tzNow = new Date(now.toLocaleString('en-US', { timeZone }));
    // Subtract 3 hours for 3 AM cutoff
    tzNow.setHours(tzNow.getHours() - 3);
    // Use toLocaleDateString with 'en-CA' for YYYY-MM-DD format
    return tzNow.toLocaleDateString('en-CA');
  } catch {
    // Fallback to UTC date with 3 AM cutoff
    const fallback = timestamp || new Date();
    fallback.setHours(fallback.getHours() - 3);
    return fallback.toISOString().split('T')[0];
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;
  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } }
      }
    });
    if (!entry || entry.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;
  const body = await req.json();
  const { encryptedData, dekId, date, mood, tagIds } = body;
  
  try {
    // Ensure entry belongs to user
    const entry = await prisma.journalEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Get user's timezone from request headers or default to UTC
    const timeZone = req.headers.get('x-timezone') || 'UTC';
    
    // Check if this is a same-day edit (allow same journal day edits)
    const entryJournalDate = getJournalDate(timeZone, entry.createdAt);
    const currentJournalDate = getJournalDate(timeZone);
    const isSameDayEdit = entryJournalDate === currentJournalDate;
    
    if (!isSameDayEdit) {
      // Enforce 7-day cooling period for edits to previous days
      const createdAt = new Date(entry.createdAt);
      const now = new Date();
      const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 7) {
        return NextResponse.json({ 
          error: 'You can only edit this entry after the 7-day cooling period to encourage authentic reflection.' 
        }, { status: 403 });
      }
    }

    // Update entry and tags (replace all tags)
    const updated = await prisma.journalEntry.update({
      where: { id },
      data: {
        encryptedData,
        dekId,
        date: date ? new Date(date) : undefined,
        mood,
        tags: tagIds && Array.isArray(tagIds)
          ? {
              deleteMany: {}, // Remove all existing tags
              create: tagIds.map((tagId: string) => ({ tagId }))
            }
          : undefined,
      },
      include: {
        tags: { include: { tag: true } }
      }
    });
    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('Error updating journal entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;
  
  try {
    // Ensure entry belongs to user
    const entry = await prisma.journalEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Get user's timezone from request headers or default to UTC
    const timeZone = req.headers.get('x-timezone') || 'UTC';
    
    // Check if this is a same-day delete (allow same journal day deletes)
    const entryJournalDate = getJournalDate(timeZone, entry.createdAt);
    const currentJournalDate = getJournalDate(timeZone);
    const isSameDayDelete = entryJournalDate === currentJournalDate;
    
    if (!isSameDayDelete) {
      // Enforce 7-day cooling period for deletes of previous days
      const createdAt = new Date(entry.createdAt);
      const now = new Date();
      const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 7) {
        return NextResponse.json({ 
          error: 'You can only delete this entry after the 7-day cooling period to encourage authentic reflection.' 
        }, { status: 403 });
      }
    }

    await prisma.journalEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}