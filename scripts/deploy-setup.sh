#!/bin/bash

# Deploy setup script for Vercel
# This script ensures Prisma Client is properly generated

echo "Setting up Prisma for deployment..."

# Generate Prisma Client
npx prisma generate

# Verify the client was generated
if [ -d "node_modules/.prisma" ]; then
    echo "✅ Prisma Client generated successfully"
else
    echo "❌ Prisma Client generation failed"
    exit 1
fi

echo "Deployment setup complete!" 