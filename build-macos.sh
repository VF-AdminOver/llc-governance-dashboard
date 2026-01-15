#!/bin/bash

# LLC Governance Dashboard - macOS Build Script
# This script packages the app as a standalone macOS application

set -e

echo "🏠 Building LLC Governance Dashboard for macOS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}Error: This script must be run on macOS${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js first: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${BLUE}✓ Node.js and npm found${NC}"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

# Install Electron dependencies if not already installed
if ! npm list electron &> /dev/null; then
    echo -e "${YELLOW}Installing Electron...${NC}"
    npm install --save-dev electron electron-builder
fi

# Create build directory
mkdir -p build

# Generate icon if ImageMagick is available
if command -v convert &> /dev/null; then
    echo -e "${YELLOW}Generating app icon...${NC}"
    if [ -f "build/create-icon.sh" ]; then
        cd build && ./create-icon.sh && cd ..
    fi
else
    echo -e "${YELLOW}ImageMagick not found. Using placeholder icon.${NC}"
    echo "Install ImageMagick with: brew install imagemagick"
fi

# Check if icon exists
if [ ! -f "build/icon.icns" ]; then
    echo -e "${YELLOW}Creating simple placeholder icon...${NC}"
    # Create a simple text-based icon
    echo "🏠" > build/icon.txt
    echo "Icon file not found. Please create build/icon.icns manually."
    echo "You can use online converters or tools like Icon Composer."
fi

# Build the app
echo -e "${YELLOW}Building macOS application...${NC}"

# First, build the production version
echo -e "${BLUE}Building production bundle...${NC}"
npm run build

# Package with Electron
echo -e "${BLUE}Packaging with Electron...${NC}"
npm run dist:mac

echo -e "${GREEN}✓ Build completed successfully!${NC}"
echo ""
echo -e "${BLUE}Your macOS app is ready in the 'dist' directory:${NC}"
echo "  - .app file: dist/mac/LLC Governance Dashboard.app"
echo "  - .dmg file: dist/LLC Governance Dashboard-1.0.0.dmg"
echo "  - .zip file: dist/LLC Governance Dashboard-1.0.0-mac.zip"
echo ""
echo -e "${YELLOW}To install:${NC}"
echo "  1. Double-click the .dmg file"
echo "  2. Drag the app to your Applications folder"
echo "  3. Launch from Applications or Spotlight"
echo ""
echo -e "${YELLOW}To run in development mode:${NC}"
echo "  npm run electron-dev"
echo ""
echo -e "${GREEN}🎉 Your standalone macOS app is ready!${NC}"
