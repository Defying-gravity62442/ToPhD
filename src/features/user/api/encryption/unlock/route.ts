import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../../../lib/prisma';
import { deriveKey, unwrapDEK } from '../../../../../lib/letter-encryption';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { password } = await req.json();
  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }
  // Fetch encryptedDEK_password and dekSalt
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { encryptedDEK_password: true, dekSalt: true },
  });
  if (!user || !user.encryptedDEK_password || !user.dekSalt) {
    return NextResponse.json({ error: 'Encryption not set up' }, { status: 400 });
  }
  try {
    const passwordKey = await deriveKey(password, user.dekSalt);
    const dek = unwrapDEK(user.encryptedDEK_password, passwordKey);
    return NextResponse.json({ dek });
  } catch {
    return NextResponse.json({ error: 'Incorrect password or corrupted data' }, { status: 403 });
  }
} 