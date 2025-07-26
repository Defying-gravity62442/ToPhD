import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../../../../lib/prisma';
import crypto from 'crypto';
import { deriveKey, unwrapDEK, wrapDEK, generateSalt } from '../../../../../../lib/letter-encryption';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { code, newPassword } = await req.json();
  if (!code || !newPassword) {
    return NextResponse.json({ error: 'Code and new password are required' }, { status: 400 });
  }
  // Fetch user recovery info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      recoveryCodeHash: true,
      recoveryCodeExpiry: true,
      encryptedDEK_recovery: true,
      recoverySalt: true,
    },
  });
  if (!user || !user.recoveryCodeHash || !user.recoveryCodeExpiry || !user.encryptedDEK_recovery || !user.recoverySalt) {
    return NextResponse.json({ error: 'No recovery in progress' }, { status: 400 });
  }
  // Check code and expiry
  const now = new Date();
  if (now > user.recoveryCodeExpiry) {
    return NextResponse.json({ error: 'Recovery code expired' }, { status: 403 });
  }
  if (hashCode(code) !== user.recoveryCodeHash) {
    return NextResponse.json({ error: 'Invalid recovery code' }, { status: 403 });
  }
  // Derive recovery key and unwrap DEK
  try {
    const recoveryKey = await deriveKey(code, user.recoverySalt);
    const dek = unwrapDEK(user.encryptedDEK_recovery, recoveryKey);
    // Generate new dekSalt and wrap DEK with new password
    const dekSalt = generateSalt();
    const passwordKey = await deriveKey(newPassword, dekSalt);
    const encryptedDEK_password = wrapDEK(dek, passwordKey);
    // Update user record
    await prisma.user.update({
      where: { id: userId },
      data: {
        encryptedDEK_password,
        dekSalt,
        recoveryCodeHash: null,
        recoveryCodeExpiry: null,
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
} 