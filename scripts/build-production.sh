#!/bin/bash

# Production Build Script for OADRO Radio
# This script prepares the application for production deployment

set -e  # Exit on any error

echo "🚀 Starting production build for OADRO Radio..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed."
    exit 1
fi

print_success "npm version: $(npm -v)"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf .next
rm -rf out
rm -rf dist

# Install dependencies
print_status "Installing production dependencies..."
npm ci --only=production

# Run code review to check for issues
print_status "Running code quality check..."
if [ -f "scripts/code-review.js" ]; then
    node scripts/code-review.js > code-review-report.txt 2>&1 || true
    print_success "Code review completed. Report saved to code-review-report.txt"
else
    print_warning "Code review script not found, skipping..."
fi

# Set production environment
export NODE_ENV=production

# Build the application
print_status "Building Next.js application for production..."
npm run build

# Check if build was successful
if [ ! -d ".next" ]; then
    print_error "Build failed! .next directory not found."
    exit 1
fi

print_success "Production build completed successfully!"

# Display build information
print_status "Build Information:"
echo "  - Build directory: .next"
echo "  - Static files: .next/static"
echo "  - Server files: .next/server"

# Check build size
if command -v du &> /dev/null; then
    BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1)
    echo "  - Build size: $BUILD_SIZE"
fi

print_success "🎉 Production build ready for deployment!"

echo ""
echo "Next steps:"
echo "1. Copy .env.production to .env.local on your server"
echo "2. Update NEXTAUTH_URL and Discord callback URL for your domain"
echo "3. Run 'npm start' to start the production server"
echo "4. Set up reverse proxy (nginx) and SSL certificate"

exit 0