import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../../../lib/prisma';
import { invokeBedrockWithRetry, createBedrockCommand } from '@/lib/bedrock-utils';
const INFERENCE_PROFILE_ID = process.env.BEDROCK_INFERENCE_PROFILE_ID;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { content } = await req.json();
  if (!content) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  }
  // Get predefined tag names
  const predefinedTags = await prisma.predefinedTag.findMany({ select: { name: true } });
  const tagList = predefinedTags.map(t => t.name).join(', ');
  const prompt = `You are an AI assistant. Given the following journal entry, suggest up to 5 relevant tags from this list: [${tagList}]. Only use tags from the list.\n\nEntry: ${content}\n\nTags (comma-separated):`;
  const modelInput = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 64,
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    top_p: 0.9
  };
  const command = createBedrockCommand(INFERENCE_PROFILE_ID!, modelInput);
  try {
    const bedrockResponse = await invokeBedrockWithRetry(command, 3);
    let content = '';
    if (bedrockResponse.content && Array.isArray(bedrockResponse.content)) {
      content = bedrockResponse.content[0]?.text || '';
    }
    // Parse comma-separated tags
    const tags = content.split(',').map(t => t.trim()).filter(Boolean);
    return NextResponse.json({ tags });
  } catch (error: unknown) {
    console.error('Error suggesting tags:', error);
    return NextResponse.json({ error: 'Failed to suggest tags' }, { status: 500 });
  }
} 