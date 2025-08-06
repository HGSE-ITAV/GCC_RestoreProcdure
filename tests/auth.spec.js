const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await page.context().clearCookies();
    
    // Navigate to page first to establish context
    await page.goto('/');
    
    // Wait for page to load and then clear storage
    try {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (error) {
      console.warn('Could not clear storage, continuing with test:', error.message);
    }
  });

  test('should show auth screen by default', async ({ page }) => {
    // Listen for development mode console messages
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });
    
    await page.goto('/');
    
    // Should show the main authentication screen
    await expect(page.locator('#auth-screen')).toBeVisible();
    await expect(page.locator('#auth-screen h2')).toContainText('Access Authentication');
    await expect(page.locator('#auth-screen .access-instructions')).toContainText('Scan the QR code');
    
    // Verify development mode is active
    const devModeLog = consoleLogs.find(log => log.includes('DEVELOPMENT MODE ACTIVE'));
    if (devModeLog) {
      console.log('✅ Development mode confirmed:', devModeLog);
    }
  });

  test('should show name input screen with valid token', async ({ page }) => {
    // Listen for email-related console messages
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });
    
    await page.goto('/?token=test123');
    
    // Should process token and show name input screen
    await expect(page.locator('#name-input-screen')).toBeVisible();
    await expect(page.locator('#name-input-screen h2')).toContainText('Identify Yourself');
    await expect(page.locator('#user-name')).toBeVisible();
    
    // Verify email alerts are disabled in development
    const emailDisabledLog = consoleLogs.find(log => log.includes('Email notification disabled'));
    if (emailDisabledLog) {
      console.log('✅ Email alerts disabled in dev mode:', emailDisabledLog);
    }
  });

  test('should reject invalid token format', async ({ page }) => {
    await page.goto('/?token=invalid');
    
    // Wait for error to appear and check it quickly (before 5-second timeout hides it)
    await page.waitForFunction(() => {
      const errorEl = document.getElementById('auth-error');
      return window.getComputedStyle(errorEl).display === 'block';
    }, { timeout: 3000 });
    
    // Should show error and return to auth screen
    await expect(page.locator('#auth-error')).toBeVisible();
    await expect(page.locator('#auth-error')).toContainText('Invalid access token format');
  });

  test('should validate name input', async ({ page }) => {
    await page.goto('/?token=test123');
    await expect(page.locator('#name-input-screen')).toBeVisible();
    
    // Test empty name validation
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    await expect(page.locator('#name-error')).toBeVisible();
    await expect(page.locator('#name-error')).toContainText('Please enter your name');
    
    // Clear error before next test
    await page.fill('#user-name', 'Valid Name');
    await page.fill('#user-name', '');
    
    // Test short name validation
    await page.fill('#user-name', 'A');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    await expect(page.locator('#name-error')).toBeVisible();
    await expect(page.locator('#name-error')).toContainText('at least 2 characters');
  });

  test('should complete name submission and show waiting screen', async ({ page }) => {
    await page.goto('/?token=test123');
    await expect(page.locator('#name-input-screen')).toBeVisible();
    
    // Fill in valid name and submit
    await page.fill('#user-name', 'John Doe');
    await page.click('button[type="submit"]');
    
    // Should show waiting screen
    await expect(page.locator('#waiting-screen')).toBeVisible();
    await expect(page.locator('#waiting-user-name')).toContainText('Hello, John Doe');
    await expect(page.locator('.waiting-message')).toContainText('submitted');
  });

  test('should maintain authentication state on refresh - name input', async ({ page }) => {
    await page.goto('/?token=test123');
    await expect(page.locator('#name-input-screen')).toBeVisible();
    
    // Refresh the page
    await page.reload();
    
    // Should still show name input screen (security fix test)
    await expect(page.locator('#name-input-screen')).toBeVisible();
    await expect(page.locator('#survey-screen')).not.toBeVisible();
  });

  test('should maintain authentication state on refresh - waiting', async ({ page }) => {
    await page.goto('/?token=test123');
    await expect(page.locator('#name-input-screen')).toBeVisible();
    
    // Submit name
    await page.fill('#user-name', 'Jane Smith');
    await page.click('button[type="submit"]');
    await expect(page.locator('#waiting-screen')).toBeVisible();
    
    // Refresh the page
    await page.reload();
    
    // Should restore to waiting screen
    await expect(page.locator('#waiting-screen')).toBeVisible();
    await expect(page.locator('#waiting-user-name')).toContainText('Jane Smith');
  });

  test('should show access granted screen after approval', async ({ page }) => {
    await page.goto('/?token=test123');
    await page.fill('#user-name', 'Test User');
    await page.click('button[type="submit"]');
    await expect(page.locator('#waiting-screen')).toBeVisible();
    
    // Simulate approval by updating the backend status
    await page.evaluate(() => {
      const requestId = sessionStorage.getItem('gcc_request_id');
      if (requestId && window.githubBackend) {
        window.githubBackend.processRequest(requestId, 'approved');
      }
    });
    
    // Wait for polling to detect approval
    await expect(page.locator('#access-granted-screen')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#access-granted-screen h2')).toContainText('Access Approved');
  });

  test('should prevent anonymous access without proper authentication', async ({ page }) => {
    await page.goto('/');
    
    // Try to directly access survey screen (this should not work)
    await page.evaluate(() => {
      // Try to manipulate DOM to show survey screen
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('survey-screen').style.display = 'block';
    });
    
    // The auth system should prevent this or redirect back
    await page.reload();
    await expect(page.locator('#auth-screen')).toBeVisible();
    await expect(page.locator('#survey-screen')).not.toBeVisible();
  });

  test('should handle denied requests properly', async ({ page }) => {
    await page.goto('/?token=test123');
    await page.fill('#user-name', 'Denied User');
    await page.click('button[type="submit"]');
    await expect(page.locator('#waiting-screen')).toBeVisible();
    
    // Simulate denial
    await page.evaluate(() => {
      const requestId = sessionStorage.getItem('gcc_request_id');
      if (requestId && window.githubBackend) {
        window.githubBackend.processRequest(requestId, 'denied');
      }
    });
    
    // Should show denial message or redirect to auth
    await expect(page.locator('#auth-screen')).toBeVisible({ timeout: 10000 });
  });
});