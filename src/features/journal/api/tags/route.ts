import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../../lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const predefinedTagId = searchParams.get('predefinedTagId');
  try {
    const where: Record<string, unknown> = { userId };
    if (predefinedTagId) {
      where.predefinedTagId = predefinedTagId;
    }
    const tags = await prisma.journalTag.findMany({
      where,
      include: { predefinedTag: true }
    });
    return NextResponse.json({ tags });
  } catch (error: unknown) {
    console.error('Error fetching user tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { name, predefinedTagId } = await req.json();
  if (!name) {
    return NextResponse.json({ error: 'Missing tag name' }, { status: 400 });
  }
  try {
    const tag = await prisma.journalTag.create({
      data: {
        userId,
        name,
        predefinedTagId: predefinedTagId || undefined
      },
      include: { predefinedTag: true }
    });
    return NextResponse.json({ tag });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Tag name already exists' }, { status: 409 });
    }
    console.error('Error creating user tag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 