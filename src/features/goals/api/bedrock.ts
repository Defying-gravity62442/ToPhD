import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client'
import { invokeBedrockWithRetry, createBedrockCommand } from '@/lib/bedrock-utils'

const prisma = new PrismaClient()

// Model ID Configuration
// Claude Sonnet 4 requires using inference profile IDs, not direct model IDs
// Choose the appropriate inference profile based on your region:
// - US: 'us.anthropic.claude-sonnet-4-20250514-v1:0'
// - EU: 'eu.anthropic.claude-sonnet-4-20250514-v1:0'
// - APAC: 'apac.anthropic.claude-sonnet-4-20250514-v1:0'
const INFERENCE_PROFILE_ID = process.env.BEDROCK_INFERENCE_PROFILE_ID

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        assistantName: true,
        assistantTone: true,
        currentInstitution: true,
        currentDepartment: true,
        background: true
      }
    })

    const { searchResults, searchSources } = await request.json()
    
    if (!searchResults) {
      return NextResponse.json({ error: 'Search results are required' }, { status: 400 })
    }

    // Create a formatted list of search sources for the prompt
    let sourcesText = ''
    if (searchSources && Array.isArray(searchSources) && searchSources.length > 0) {
      sourcesText = '\n\nSearch Sources:\n' + searchSources.map((source, index) => 
        `${index + 1}. ${source.title}\n   URL: ${source.url}\n   Snippet: ${source.snippet}`
      ).join('\n\n')
    }

    // Build personalized prompt based on user preferences
    const assistantName = user?.assistantName || 'your AI assistant'
    const assistantTone = user?.assistantTone || 'encouraging'
    const currentInstitution = user?.currentInstitution || null
    const currentDepartment = user?.currentDepartment || null
    const userName = session.user.name?.split(' ')[0] || 'a student'
    const background = user?.background || null
    
    let toneInstruction = ''
    switch (assistantTone) {
      case 'encouraging':
        toneInstruction = 'Be supportive and motivating, offering gentle encouragement and positive reinforcement.'
        break
      case 'inspirational':
        toneInstruction = 'Be uplifting and inspiring, using motivational language and emphasizing the user\'s potential.'
        break
      case 'tough_love':
        toneInstruction = 'Be direct and challenging, pushing the user to take action while still being constructive.'
        break
      default:
        toneInstruction = 'Be supportive and motivating, offering gentle encouragement and positive reinforcement.'
    }

    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

    const prompt = `You are ${assistantName}, an AI assistant specializing in helping PhD aspirants transform ambitious academic goals into structured, actionable strategies. You are currently assisting ${userName}, a student in ${currentDepartment || 'an unspecified field'} at ${currentInstitution || 'an unspecified institution'}.${background ? `\n\nUser Background: ${background}` : ''}

You will receive web search results containing information about academic programs, professors, research papers, application requirements, deadlines, and related academic content from reputable sources.

Your task is to analyze this information and create a comprehensive action plan in JSON format. The information you receive should be your primary source of inference.

Return ONLY a valid JSON object with these exact fields:

- text (string): A clear, concise summary of the user's goal and key requirements. ${toneInstruction}
- title (string): A short, meaningful title for the roadmap (max 8 words).
- roadmap (array of objects): A step-by-step action plan. Each item must contain:
    - action (string): A brief, imperative instruction, ideally no more than 12-15 words.
    - deadline (string): Realistic completion date based on today's date (${currentDate}) in the format YYYY-MM-DD.
    - notes (string): Any helpful context or advice.
- resources (array of objects): A list of referenced links from search sources that were passed to you. (Only include links that are from the search sources. Don't make up links.) Each must include:
    - title (string), url (string), type (string: one of "official", "blog", "forum", "video", etc.)

Search results: ${searchResults}${sourcesText}`

    // Prepare the request payload for Claude
    const modelInput = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      // Optional: Add temperature and other parameters for better JSON generation
      temperature: 0.3, // Lower temperature for more consistent JSON output
      top_p: 0.9
    }

    // Create the command
    // For Claude Sonnet 4, we must use the inference profile ID, not the direct model ID
    const command = createBedrockCommand(INFERENCE_PROFILE_ID!, modelInput)

    try {
      // Send the request to Bedrock with retry mechanism
      const bedrockResponse = await invokeBedrockWithRetry(command, 3)
      
      // Extract the content from Claude's response
      let content = ''
      if (bedrockResponse.content && Array.isArray(bedrockResponse.content)) {
        content = bedrockResponse.content[0]?.text || ''
      } else {
        console.error('Unexpected response structure:', bedrockResponse)
        return NextResponse.json({ 
          error: 'Unexpected response structure from Bedrock',
          responseBody: bedrockResponse 
        }, { status: 500 })
      }

      // Try to parse the JSON response from Claude
      try {
        // Remove any potential markdown code blocks
        const cleanedContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        
        const parsedContent = JSON.parse(cleanedContent)
        return NextResponse.json(parsedContent)
      } catch (parseError) {
        console.error('Failed to parse Claude response as JSON:', parseError)
        console.error('Raw content:', content)
        return NextResponse.json({ 
          error: 'Failed to parse AI response as JSON',
          rawContent: content 
        }, { status: 500 })
      }
    } catch (bedrockError: unknown) {
      console.error('Bedrock API error:', bedrockError)
      
      // Handle specific Bedrock errors
      if (bedrockError && typeof bedrockError === 'object' && 'name' in bedrockError) {
        const error = bedrockError as { name: string; message: string }
        
        if (error.name === 'ResourceNotFoundException') {
          return NextResponse.json({ 
            error: 'Model not found. Please check the model ID and ensure you have access.',
            details: error.message 
          }, { status: 404 })
        } else if (error.name === 'AccessDeniedException') {
          return NextResponse.json({ 
            error: 'Access denied. Please check your AWS credentials and permissions.',
            details: error.message 
          }, { status: 403 })
        } else if (error.name === 'ThrottlingException') {
          return NextResponse.json({ 
            error: 'Rate limit exceeded. Please try again later.',
            details: error.message 
          }, { status: 429 })
        }
      }
      
      return NextResponse.json({ 
        error: 'Failed to invoke Bedrock model',
        details: bedrockError instanceof Error ? bedrockError.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in Bedrock API route:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 