#!/bin/bash

# AGA Backend Installation Script
# This script automates the setup process

set -e  # Exit on error

echo "🚀 AI Growth Accelerator Backend - Installation Script"
echo "======================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo -e "${BLUE}Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher. Current: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v) detected${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo -e "${BLUE}Creating .env from template...${NC}"

    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file from template${NC}"
        echo -e "${YELLOW}📝 Please edit .env and add your API keys:${NC}"
        echo ""
        echo "   Required variables:"
        echo "   - SUPABASE_URL"
        echo "   - SUPABASE_SERVICE_ROLE_KEY"
        echo "   - PERPLEXITY_API_KEY"
        echo "   - OPENROUTER_API_KEY"
        echo ""
        echo -e "${YELLOW}After configuring .env, run: npm run dev${NC}"
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"

    # Validate required environment variables
    echo -e "${BLUE}Validating environment variables...${NC}"

    MISSING_VARS=()

    if ! grep -q "SUPABASE_URL=" .env || grep -q "SUPABASE_URL=your_" .env; then
        MISSING_VARS+=("SUPABASE_URL")
    fi

    if ! grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env || grep -q "SUPABASE_SERVICE_ROLE_KEY=your_" .env; then
        MISSING_VARS+=("SUPABASE_SERVICE_ROLE_KEY")
    fi

    if ! grep -q "PERPLEXITY_API_KEY=" .env || grep -q "PERPLEXITY_API_KEY=your_" .env; then
        MISSING_VARS+=("PERPLEXITY_API_KEY")
    fi

    if ! grep -q "OPENROUTER_API_KEY=" .env || grep -q "OPENROUTER_API_KEY=your_" .env; then
        MISSING_VARS+=("OPENROUTER_API_KEY")
    fi

    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Missing or incomplete environment variables:${NC}"
        for var in "${MISSING_VARS[@]}"; do
            echo "   - $var"
        done
        echo ""
        echo -e "${YELLOW}Please edit .env and add these variables before starting the server.${NC}"
    else
        echo -e "${GREEN}✓ All required environment variables configured${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Configure your .env file (if not done)"
echo "2. Run: ${GREEN}npm run dev${NC} to start the development server"
echo "3. Test: ${GREEN}curl http://localhost:3001/api/health${NC}"
echo ""
echo "📚 Documentation:"
echo "   - Setup Guide: ../SETUP_GUIDE.md"
echo "   - API Docs: ./README.md"
echo "   - Quick Start: ../QUICK_START.md"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"
