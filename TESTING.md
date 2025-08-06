# Testing Documentation

This document describes the comprehensive automated testing setup for the GCC Restore Procedure application.

## Overview

The testing framework uses **Playwright** for end-to-end testing, providing:
- Cross-browser testing (Chromium, Firefox, Safari)
- Mobile device testing
- Security boundary testing
- Authentication flow validation
- Operator dashboard testing
- CI/CD integration

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
```bash
npm install
npx playwright install
```

### Running Tests
```bash
# Run all tests
./run-tests.sh

# Run specific test suites
./run-tests.sh auth      # Authentication tests
./run-tests.sh operator  # Operator dashboard tests
./run-tests.sh security  # Security tests

# Interactive modes
./run-tests.sh ui        # Visual test runner
./run-tests.sh headed    # See browser actions
./run-tests.sh debug     # Debug mode
```

## Test Suites

### 1. Authentication Flow Tests (`tests/auth.spec.js`)

Tests the complete user authentication workflow:
- ✅ QR code token validation
- ✅ Name input and validation
- ✅ Waiting screen behavior
- ✅ Approval/denial handling
- ✅ Browser refresh security (critical)
- ✅ Session state management
- ✅ Invalid token handling

**Key Security Test**: Ensures users cannot bypass authentication by refreshing the browser.

### 2. Operator Dashboard Tests (`tests/operator.spec.js`)

Tests operator authentication and request management:
- ✅ Operator login/logout
- ✅ Request approval workflow
- ✅ Two-step access granting
- ✅ Request denial handling
- ✅ Share code import
- ✅ Auto-refresh functionality
- ✅ Access revocation

### 3. Security Boundary Tests (`tests/security.spec.js`)

Comprehensive security testing:
- ✅ Prevents anonymous procedure access
- ✅ Token manipulation protection
- ✅ Session hijacking prevention
- ✅ XSS protection in forms
- ✅ CSRF-like attack prevention
- ✅ Session expiration handling
- ✅ Malformed data handling
- ✅ Concurrent session management

## Test Execution

### Local Testing
```bash
# Full test suite
npm test

# Quick test (Chromium only)
npm run test:quick

# Specific browser
npx playwright test --project=firefox

# Mobile testing
npx playwright test --project="Mobile Chrome"
```

### GitHub Pages Testing
```bash
./run-tests.sh github-pages
```

### CI/CD Testing
Tests automatically run on:
- Push to master/main branch
- Pull requests
- GitHub Pages deployments

## Test Reports

After running tests, view results:
- **HTML Report**: `playwright-report/index.html`
- **JSON Results**: `test-results.json`
- **JUnit XML**: `test-results.xml`

## Critical Security Tests

### Authentication Bypass Prevention
- **Test**: User refreshes browser during authentication flow
- **Expected**: User returns to appropriate authentication screen
- **Prevents**: Anonymous access to restoration procedure

### Token Validation
- **Test**: Various invalid token formats and XSS attempts
- **Expected**: Proper validation and sanitization
- **Prevents**: Token manipulation attacks

### Session Security
- **Test**: LocalStorage manipulation attempts
- **Expected**: Invalid sessions rejected
- **Prevents**: Session hijacking

## Browser Coverage

Tests run across:
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Mobile Chrome, Mobile Safari
- **Viewports**: Various screen sizes

## Continuous Integration

GitHub Actions automatically:
1. Runs tests on all browsers
2. Performs security audits
3. Tests GitHub Pages deployment
4. Generates test reports
5. Fails builds on test failures

## Writing New Tests

### Test Structure
```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should do something specific', async ({ page }) => {
    await page.goto('/');
    // Test implementation
    await expect(page.locator('#element')).toBeVisible();
  });
});
```

### Best Practices
1. **Clear state** before each test
2. **Use specific selectors** (IDs over classes)
3. **Test user workflows** end-to-end
4. **Include error scenarios**
5. **Test security boundaries**
6. **Use meaningful test names**

## Common Issues

### Test Failures
- Check browser console for JavaScript errors
- Verify server is running on port 8000
- Ensure clean state between tests

### Flaky Tests
- Add appropriate waits (`expect().toBeVisible({ timeout: 5000 })`)
- Use stable selectors
- Handle async operations properly

### Security Test Failures
- Usually indicate actual security vulnerabilities
- Review authentication logic carefully
- Verify session management implementation

## Performance Testing

Consider adding:
- Page load time tests
- Memory usage monitoring
- Network request optimization
- Lighthouse audits

## Maintenance

### Regular Tasks
- Update Playwright version monthly
- Review and update test scenarios
- Add tests for new features
- Monitor CI/CD pipeline health
- Review security test coverage

### Updating Tests
When modifying the application:
1. Update relevant test files
2. Run tests locally
3. Commit test changes with code changes
4. Verify CI/CD pipeline passes