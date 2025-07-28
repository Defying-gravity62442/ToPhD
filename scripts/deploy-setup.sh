#!/bin/bash

# ToPhD Vercel Deployment Setup Script
# This script prepares the application for deployment on Vercel

set -e

echo "🚀 Setting up ToPhD for Vercel deployment..."

# Check if we're in a Vercel environment
if [ -n "$VERCEL" ]; then
    echo "✅ Running in Vercel environment"
else
    echo "⚠️  Not running in Vercel environment"
fi

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Check if database URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL in your Vercel environment variables"
    exit 1
else
    echo "✅ DATABASE_URL is configured"
fi

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma db push

# Check required environment variables
echo "🔍 Checking required environment variables..."

required_vars=(
    "NEXTAUTH_URL"
    "NEXTAUTH_SECRET"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "PERPLEXITY_API_KEY"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_REGION"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "⚠️  Missing environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please set these variables in your Vercel project settings:"
    echo "1. Go to your Vercel project dashboard"
    echo "2. Navigate to Settings > Environment Variables"
    echo "3. Add the missing variables"
    echo ""
    echo "Required variables:"
    echo "- NEXTAUTH_URL: Your app's URL (e.g., https://your-app.vercel.app)"
    echo "- NEXTAUTH_SECRET: A secure random string for NextAuth"
    echo "- GOOGLE_CLIENT_ID: Google OAuth client ID"
    echo "- GOOGLE_CLIENT_SECRET: Google OAuth client secret"
    echo "- PERPLEXITY_API_KEY: Perplexity API key for research features"
    echo "- AWS_ACCESS_KEY_ID: AWS access key for Bedrock"
    echo "- AWS_SECRET_ACCESS_KEY: AWS secret key for Bedrock"
    echo "- AWS_REGION: AWS region (e.g., us-east-1)"
else
    echo "✅ All required environment variables are set"
fi

# Build the application
echo "🏗️  Building the application..."
npm run build

echo "✅ ToPhD deployment setup complete!"
echo ""
echo "Next steps:"
echo "1. Deploy to Vercel: vercel --prod"
echo "2. Set up your domain (optional)"
echo "3. Configure Google OAuth redirect URLs"
echo "4. Test the application" 