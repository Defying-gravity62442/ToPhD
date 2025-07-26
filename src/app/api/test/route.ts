import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    environment: {
      hasPerplexityKey: !!process.env.PERPLEXITY_API_KEY,
      hasBedrockKey: !!process.env.AWS_BEARER_TOKEN_BEDROCK,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    }
  })
} 