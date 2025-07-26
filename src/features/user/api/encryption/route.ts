import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../../lib/prisma';
import {
  generateDEK,
  generateSalt,
  deriveKey,
  wrapDEK
} from '../../../../lib/letter-encryption';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { password, recoveryCode } = await req.json();
  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }
  if (!recoveryCode || recoveryCode.length < 6) {
    return NextResponse.json({ error: 'Recovery code must be at least 6 characters.' }, { status: 400 });
  }
  // Generate DEK and salts
  const dek = generateDEK();
  const dekSalt = generateSalt();
  const recoverySalt = generateSalt();
  // Derive password key
  const passwordKey = await deriveKey(password, dekSalt);
  // Hash and use user-supplied recovery code
  const recoveryCodeHash = crypto.createHash('sha256').update(recoveryCode).digest('hex');
  // Derive recovery key
  const recoveryKey = await deriveKey(recoveryCode, recoverySalt);
  // Wrap DEK
  const encryptedDEK_password = wrapDEK(dek, passwordKey);
  const encryptedDEK_recovery = wrapDEK(dek, recoveryKey);
  // Store in user record
  await prisma.user.update({
    where: { id: userId },
    data: {
      encryptedDEK_password,
      encryptedDEK_recovery,
      dekSalt,
      recoverySalt,
      recoveryCodeHash,
    },
  });
  // No email or code generation needed
  return NextResponse.json({ success: true });
} 