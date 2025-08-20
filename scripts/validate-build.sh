#!/bin/bash

# KontainMonitor Build Validation Script
# This script validates the build process and ensures production readiness

set -e  # Exit on any error

echo "🔍 KontainMonitor Build Validation"
echo "================================="

# Check Node.js version
echo "📦 Checking Node.js version..."
node --version
npm --version

# Install dependencies
echo "🔧 Installing dependencies..."
npm ci

# Run TypeScript check
echo "🔍 Running TypeScript checks..."
npm run typecheck

# Run ESLint
echo "🔍 Running ESLint..."
npm run lint

# Build the application
echo "🏗️  Building application..."
npm run build

# Check if build artifacts exist
echo "🔍 Validating build artifacts..."
if [ ! -d ".next" ]; then
    echo "❌ Build failed: .next directory not found"
    exit 1
fi

if [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ Build failed: BUILD_ID not found"
    exit 1
fi

echo "✅ Build validation completed successfully!"

# Optional: Test Docker build if Docker is available
if command -v docker &> /dev/null; then
    echo "🐳 Testing Docker build..."
    docker build -t kontain-monitor-test .
    echo "✅ Docker build completed successfully!"
    
    # Cleanup test image
    docker rmi kontain-monitor-test || true
else
    echo "⚠️  Docker not available - skipping Docker build test"
fi

echo ""
echo "🎉 All validations passed! The application is ready for production deployment."
echo ""
echo "Next steps:"
echo "1. Deploy with: docker-compose up -d"
echo "2. Or build Docker image: npm run docker:build"
echo "3. Check health: curl http://localhost:3000/api/health"