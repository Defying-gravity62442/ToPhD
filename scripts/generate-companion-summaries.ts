import { prisma } from '../src/lib/prisma';
import { invokeBedrockWithRetry, createBedrockCommand } from '../src/lib/bedrock-utils';
import { getJournalDate, getUserTimeZone } from '../src/lib/date-utils';

const INFERENCE_PROFILE_ID = process.env.BEDROCK_INFERENCE_PROFILE_ID;

async function generateCompanionSummaries() {
  console.log('Starting companion summary generation...');

  try {
    // Find all users
    const users = await prisma.user.findMany({ select: { id: true } });
    
    let totalProcessed = 0;
    let totalGenerated = 0;

    for (const user of users) {
      console.log(`Processing user ${user.id}...`);

      // Find journal entries with companion messages but no summary
      const entriesWithConversations = await prisma.journalEntry.findMany({
        where: {
          userId: user.id,
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

      console.log(`Found ${entriesWithConversations.length} entries with conversations for user ${user.id}`);

      for (const entry of entriesWithConversations) {
        if (entry.companionMessages.length === 0) continue;

        totalProcessed++;

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
                  userId: user.id,
                  journalEntryId: entry.id,
                  summary: summaryText.trim(),
                  visibleToAI: true
                }
              });
              
              totalGenerated++;
              const journalDate = getJournalDate(getUserTimeZone(), entry.date);
              console.log(`Generated summary for entry ${entry.id} (journal date: ${journalDate})`);
            }
          }
        } catch (error) {
          console.error(`Error generating summary for entry ${entry.id}:`, error);
          // Continue with other entries even if one fails
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Summary generation complete!`);
    console.log(`Total entries processed: ${totalProcessed}`);
    console.log(`Total summaries generated: ${totalGenerated}`);

  } catch (error) {
    console.error('Error in companion summary generation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  generateCompanionSummaries()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { generateCompanionSummaries }; 