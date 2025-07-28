import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '../../../../../lib/prisma';
import { invokeBedrockWithRetry, createBedrockCommand } from '@/lib/bedrock-utils';


const INFERENCE_PROFILE_ID = process.env.BEDROCK_INFERENCE_PROFILE_ID;



const SYSTEM_PROMPT = `You are a supportive academic companion for a PhD student. Keep responses under 2-3 sentences. Be warm but brief. Ask one question at a time. Focus on the user's immediate concerns.`;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id: journalEntryId } = await params;
  
  try {
    // Return encrypted messages - client will decrypt them
    const messages = await prisma.companionMessage.findMany({
      where: { userId, journalEntryId },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching companion messages:', error);
    return NextResponse.json({ error: 'Failed to fetch companion messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user) || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id: journalEntryId } = await params;
  
  // UPDATED: Expect plaintext data from client for AI processing
  const { 
    message,              // New user message (plaintext)
    conversationHistory,  // Previous messages (plaintext, decrypted by client)
    encryptedMessages    // Optional: encrypted messages to store
  } = await req.json();
  
  if (!message) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 });
  }

  try {
    // Build context for AI using plaintext conversation from client
    const contextMessages = conversationHistory || [];
    
    // Note: Summaries are generated retrospectively, not during active conversations
    // This prevents excessive API calls and allows for better context when summarizing

    // Fetch user context (mood, summaries, goals)
    let moodSummary = '';
    let goalsSummary = '';
    
    try {
      const recentEntries = await prisma.journalEntry.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 7,
        select: { mood: true }
      });
      const moods = recentEntries.map(e => e.mood).filter(Boolean);
      const moodCounts: Record<string, number> = {};
      moods.forEach(m => { if (m) moodCounts[m] = (moodCounts[m] || 0) + 1; });
      moodSummary = Object.keys(moodCounts).length
        ? 'Mood: ' + Object.entries(moodCounts).map(([m, c]) => `${m} (${c})`).join(', ')
        : 'Mood: N/A';
    } catch {}
    
    try {
      const summaries: string[] = [];
      
      // Get hierarchical summaries (yearly, monthly, weekly, daily)
      const currentYear = new Date().getUTCFullYear();
      const yearlySummary = await prisma.yearlySummary.findFirst({
        where: { userId, visibleToAI: true, year: { lt: currentYear } },
        orderBy: { year: 'desc' }
      });
      if (yearlySummary) {
        summaries.push(`Yearly Summary ${yearlySummary.year}: ${yearlySummary.summary}`);
      }
      
      const currentMonth = new Date().getUTCMonth() + 1;
      const monthlySummary = await prisma.monthlySummary.findFirst({
        where: {
          userId, visibleToAI: true,
          OR: [{ year: { lt: currentYear } }, { year: currentYear, month: { lt: currentMonth } }]
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }]
      });
      if (monthlySummary && (!yearlySummary || yearlySummary.year !== monthlySummary.year)) {
        summaries.push(`Monthly Summary ${monthlySummary.year}-${monthlySummary.month}: ${monthlySummary.summary}`);
      }
      
      // Continue with weekly and daily summaries...
      // summariesSummary = summaries.length > 0 
      //   ? 'Recent summaries: ' + summaries.join(' | ')
      //   : 'Recent summaries: N/A';
    } catch {}
    
    try {
      const goals = await prisma.goal.findMany({
        where: { userId, status: 'active' },
        include: { milestones: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' }
      });
      if (goals.length) {
        goalsSummary = 'Active goals: ' + goals.map(g => {
          const milestones = g.milestones.map(m => `${m.title}${m.completed ? ' (done)' : ''}`).join('; ');
          return `${g.title}${milestones ? ' | Milestones: ' + milestones : ''}`;
        }).join(' | ');
      } else {
        goalsSummary = 'Active goals: N/A';
      }
    } catch {}
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        background: true,
        assistantTone: true
      }
    });
    // const background = user?.background || null;
    const assistantTone = user?.assistantTone || 'encouraging';
    
    // Build tone-specific system prompt
    let toneInstruction = '';
    switch (assistantTone) {
      case 'encouraging':
        toneInstruction = 'Be warm and supportive.';
        break;
      case 'inspirational':
        toneInstruction = 'Be uplifting and motivating.';
        break;
      case 'tough_love':
        toneInstruction = 'Be direct but constructive.';
        break;
      default:
        toneInstruction = 'Be warm and supportive.';
    }
    
    const dynamicSystemPrompt = `${SYSTEM_PROMPT} ${toneInstruction}`;
    
    const contextString = `[Context: ${moodSummary}. ${goalsSummary}.]`;

    // Build Bedrock chat message array using PLAINTEXT from client
    const recentMessages = contextMessages.slice(-10);
    const bedrockMessages = [
      { role: 'assistant', content: contextString },
      ...recentMessages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content // NOW THIS IS PLAINTEXT!
      })),
      { role: 'user', content: message }
    ];
    
    const modelInput = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 150,
      messages: bedrockMessages,
      system: dynamicSystemPrompt,
      temperature: 0.7,
      top_p: 0.9
    };
    
    const command = createBedrockCommand(INFERENCE_PROFILE_ID!, modelInput);
    
    const bedrockResponse = await invokeBedrockWithRetry(command, 3);
    
    let aiResponse = '';
    if (bedrockResponse.content && Array.isArray(bedrockResponse.content)) {
      aiResponse = bedrockResponse.content[0]?.text || '';
    }
    
    // Store encrypted messages if provided
    if (encryptedMessages && Array.isArray(encryptedMessages)) {
      try {
        await prisma.companionMessage.createMany({
          data: encryptedMessages.map((msg: any) => ({
            userId,
            journalEntryId,
            role: msg.role,
            content: msg.content,
            createdAt: new Date()
          }))
        });
      } catch (storageError) {
        console.error('Error storing encrypted messages:', storageError);
        // Don't fail the request if storage fails, just log it
      }
    }
    
    // Return the AI response in plaintext - client will handle encryption and storage
    return NextResponse.json({ 
      aiResponse: aiResponse.trim()
    });
    
  } catch (error: unknown) {
    console.error('Error generating companion reply:', error);
    
    // Check for throttling exception after all retries failed
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ThrottlingException') {
      return NextResponse.json({ 
        error: 'AI service is temporarily busy. Please try again in a few moments.',
        retryAfter: 60 
      }, { status: 429 });
    }
    
    // Check for other AWS errors
    if (error && typeof error === 'object' && '$metadata' in error) {
      const awsError = error as any;
      if (awsError.$metadata?.httpStatusCode === 429) {
        return NextResponse.json({ 
          error: 'AI service is temporarily busy. Please try again in a few moments.',
          retryAfter: 60 
        }, { status: 429 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to generate companion reply' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id: journalEntryId } = await params;
  
  try {
    const messages = await prisma.companionMessage.findMany({
      where: { userId, journalEntryId },
      orderBy: { createdAt: 'asc' }
    });
    
    if (!messages.length) {
      return NextResponse.json({ error: 'No conversation found' }, { status: 404 });
    }
    
    // Enforce 7-day cooling period
    const createdAt = new Date(messages[0].createdAt);
    const now = new Date();
    const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 7) {
      return NextResponse.json({ error: 'You can only delete this conversation after the 7-day cooling period.' }, { status: 403 });
    }
    
    await prisma.companionMessage.deleteMany({ where: { userId, journalEntryId } });
    await prisma.companionSummary.deleteMany({ where: { userId, journalEntryId } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting companion conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}