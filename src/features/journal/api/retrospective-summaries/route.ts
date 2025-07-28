import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import { invokeBedrockWithRetry, createBedrockCommand } from '@/lib/bedrock-utils';
import { getJournalDate, getUserTimeZone } from '@/lib/date-utils';

const INFERENCE_PROFILE_ID = process.env.BEDROCK_INFERENCE_PROFILE_ID;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !('id' in session.user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  try {
    // Find journal entries with companion messages but no summary
    const entriesWithConversations = await prisma.journalEntry.findMany({
      where: {
        userId,
        companionMessages: { some: {} }, // Has companion messages
        companionSummaries: { none: {} }  // No summary yet
      },
      include: {
        companionMessages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { date: 'asc' }
    });

    const generatedSummaries = [];

    for (const entry of entriesWithConversations) {
      if (entry.companionMessages.length === 0) continue;

      // Create conversation text for summarization
      const conversationText = entry.companionMessages
        .map(msg => `[${msg.role === 'user' ? 'User' : 'Companion'}] ${msg.content}`)
        .join('\n');

      const summaryPrompt = `Summarize the following conversation between a user and their academic journey companion in 2-3 sentences, focusing on the user's mood, main topics, and any actionable points.\n\nConversation:\n${conversationText}\n\nSummary:`;

      const summaryInput = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 128,
        messages: [{ role: 'user', content: summaryPrompt }],
        temperature: 0.3,
        top_p: 0.9
      };

      const summaryCommand = createBedrockCommand(INFERENCE_PROFILE_ID!, summaryInput);

      try {
        const summaryResult = await invokeBedrockWithRetry(summaryCommand, 2);
        if (summaryResult.content && Array.isArray(summaryResult.content)) {
          const summaryText = summaryResult.content[0]?.text || '';
          
          if (summaryText.trim()) {
            await prisma.companionSummary.create({
              data: {
                userId,
                journalEntryId: entry.id,
                summary: summaryText.trim(),
                visibleToAI: true
              }
            });
            
            // Use the journal date (with 3 AM cutoff) for the summary
            const journalDate = getJournalDate(getUserTimeZone(), entry.date);
            
            generatedSummaries.push({
              journalEntryId: entry.id,
              date: entry.date,
              journalDate: journalDate, // Include the proper journal date
              summary: summaryText.trim()
            });
          }
        }
      } catch (error) {
        console.error(`Error generating summary for entry ${entry.id}:`, error);
        // Continue with other entries even if one fails
      }
    }

    return NextResponse.json({ 
      success: true,
      generatedSummaries,
      totalProcessed: entriesWithConversations.length,
      totalGenerated: generatedSummaries.length
    });

  } catch (error) {
    console.error('Error in retrospective summary generation:', error);
    return NextResponse.json({ error: 'Failed to generate retrospective summaries' }, { status: 500 });
  }
} 