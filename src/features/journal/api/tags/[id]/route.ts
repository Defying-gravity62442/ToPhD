import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../../../lib/prisma';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;
  try {
    const tag = await prisma.journalTag.findUnique({ where: { id } });
    if (!tag || tag.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await prisma.journalTag.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting user tag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 