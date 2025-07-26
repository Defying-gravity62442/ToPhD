import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const tags = await prisma.predefinedTag.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json({ tags });
  } catch (error: unknown) {
    console.error('Error fetching predefined tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 