#!/bin/bash

# GCC Restore Procedure - Comprehensive Test Runner
set -e

echo "🧪 GCC Restore Procedure - Automated Testing Suite"
echo "=================================================="

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
    print_error "Node.js is required but not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed."
    exit 1
fi

print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Install Playwright browsers if needed
if [ ! -d "node_modules/@playwright/test" ]; then
    print_error "Playwright not installed. Installing..."
    npm install @playwright/test
fi

print_status "Installing/updating Playwright browsers..."
npx playwright install

# Run different test suites based on arguments
case "${1:-all}" in
    "auth")
        print_status "Running authentication flow tests..."
        npx playwright test tests/auth.spec.js --reporter=html
        ;;
    "operator")
        print_status "Running operator dashboard tests..."
        npx playwright test tests/operator.spec.js --reporter=html
        ;;
    "security")
        print_status "Running security boundary tests..."
        npx playwright test tests/security.spec.js --reporter=html
        ;;
    "quick")
        print_status "Running quick test suite (Chromium only)..."
        npx playwright test --project=chromium --reporter=line
        ;;
    "headed")
        print_status "Running tests in headed mode (visible browser)..."
        npx playwright test --headed --reporter=line
        ;;
    "debug")
        print_status "Running tests in debug mode..."
        npx playwright test --debug
        ;;
    "ui")
        print_status "Opening Playwright UI mode..."
        npx playwright test --ui
        ;;
    "github-pages")
        print_status "Testing against GitHub Pages deployment..."
        npx playwright test --config=playwright.github-pages.config.js --reporter=html
        ;;
    "all"|*)
        print_status "Running full test suite across all browsers..."
        npx playwright test --reporter=html
        
        # Generate summary
        echo ""
        print_status "Test Summary:"
        echo "=============="
        
        if [ -f "test-results.json" ]; then
            # Parse JSON results if available
            node -e "
                const results = require('./test-results.json');
                console.log('Total Tests: ' + results.stats.total);
                console.log('Passed: ' + results.stats.passed);
                console.log('Failed: ' + results.stats.failed);
                console.log('Skipped: ' + results.stats.skipped);
                if (results.stats.failed > 0) process.exit(1);
            " 2>/dev/null || echo "Results parsing unavailable"
        fi
        ;;
esac

# Check if tests passed
if [ $? -eq 0 ]; then
    print_success "All tests completed successfully! 🎉"
    echo ""
    print_status "View detailed results:"
    echo "  • HTML Report: playwright-report/index.html"
    echo "  • JSON Results: test-results.json"
    echo ""
    print_status "To run specific test suites:"
    echo "  ./run-tests.sh auth      - Authentication tests"
    echo "  ./run-tests.sh operator  - Operator dashboard tests"
    echo "  ./run-tests.sh security  - Security boundary tests"
    echo "  ./run-tests.sh quick     - Quick test run"
    echo "  ./run-tests.sh headed    - Visual browser testing"
    echo "  ./run-tests.sh ui        - Interactive UI mode"
else
    print_error "Some tests failed. Check the reports for details."
    exit 1
fi