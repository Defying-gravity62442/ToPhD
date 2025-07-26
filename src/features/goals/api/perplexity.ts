import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions';
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SearchResult {
  title: string
  url: string
  snippet: string
}

interface ToolCall {
  function?: {
    name: string
    arguments: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's academic background
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        currentInstitution: true,
        currentDepartment: true
      }
    })

    const { goal } = await request.json()
    
    if (!goal) {
      return NextResponse.json({ error: 'Goal is required' }, { status: 400 })
    }

    const perplexityApiKey = process.env.PERPLEXITY_API_KEY
    if (!perplexityApiKey) {
      return NextResponse.json({ error: 'Perplexity API key not configured' }, { status: 500 })
    }

    const currentDepartment = user?.currentDepartment || 'an unspecified field'
    const currentInstitution = user?.currentInstitution || 'an unspecified institution'
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const prompt = `You are tasked with gathering accurate, up-to-date academic information to support a user's educational and research ambitions.

User Goal: ${goal}.
User Background: A student studying ${currentDepartment} at ${currentInstitution}.

Here are some example user goals and information you might want to gather:
- Applying to PhD programs (deadlines, requirements, expectations, program details)
- Exploring research labs (focus areas, team members, outreach protocols, ongoing projects)
- Learning about professors (research interests, publication history, student supervision preferences, contact info)
- Reviewing academic materials (content summaries, reviews, availability, editions)
- Developing new skills (learning roadmaps, resource recommendations, realistic timelines)

Please:
- Prioritize official sources (university websites, publisher sites, institutional pages);
- Ensure information is up-to-date as of ${currentDate}.
- Include specific dates, deadlines, and contact details when available;
- Flag any outdated or uncertain information;
- Do not fabricate details or make assumptions.`

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2048,
        temperature: 0.1,
        search_domain_filter: [],
        search_recency_filter: 'month',
        return_citations: true
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Perplexity API error:', errorData)
      return NextResponse.json({ error: 'Failed to fetch from Perplexity API' }, { status: 500 })
    }

    const data = await response.json()
    const searchResults = data.choices[0]?.message?.content || ''
    
    // Extract search sources from tool_calls or search_results
    let searchSources: SearchResult[] = []
    
    // Check for search_results in the response
    if (data.choices[0]?.message?.search_results) {
      searchSources = data.choices[0].message.search_results.map((result: SearchResult) => ({
        title: result.title || '',
        url: result.url || '',
        snippet: result.snippet || ''
      }))
    }
    
    // Alternative: check for tool_calls if search_results is not available
    if (data.choices[0]?.message?.tool_calls && searchSources.length === 0) {
      const toolCalls = data.choices[0].message.tool_calls as ToolCall[]
      for (const toolCall of toolCalls) {
        if (toolCall.function?.name === 'search' && toolCall.function?.arguments) {
          try {
            const args = JSON.parse(toolCall.function.arguments)
            if (args.search_results) {
              searchSources = args.search_results.map((result: SearchResult) => ({
                title: result.title || '',
                url: result.url || '',
                snippet: result.snippet || ''
              }))
            }
          } catch (e) {
            console.error('Failed to parse tool call arguments:', e)
          }
        }
      }
    }

    return NextResponse.json({ 
      searchResults,
      searchSources 
    })
  } catch (error) {
    console.error('Error in Perplexity API route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 