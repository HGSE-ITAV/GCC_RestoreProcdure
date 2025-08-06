const { test, expect } = require('@playwright/test');

test.describe('Operator Dashboard', () => {
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

  test('should require operator authentication', async ({ page }) => {
    await page.goto('/operator.html');
    
    // Should show operator auth screen
    await expect(page.locator('#operator-auth')).toBeVisible();
    await expect(page.locator('#operator-auth h2')).toContainText('Operator Authentication');
    await expect(page.locator('#operator-dashboard')).not.toBeVisible();
  });

  test('should reject invalid operator codes', async ({ page }) => {
    await page.goto('/operator.html');
    
    await page.fill('#operator-code', 'wrongcode');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('#operator-auth-error')).toBeVisible();
    await expect(page.locator('#operator-auth-error')).toContainText('Invalid operator code');
    await expect(page.locator('#operator-dashboard')).not.toBeVisible();
  });

  test('should accept valid operator codes', async ({ page }) => {
    await page.goto('/operator.html');
    
    await page.fill('#operator-code', 'gcc2024');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('#operator-dashboard')).toBeVisible();
    await expect(page.locator('#operator-auth')).not.toBeVisible();
    await expect(page.locator('#operator-dashboard h2')).toContainText('Pending Access Requests');
  });

  test('should display pending requests', async ({ page }) => {
    // Login as operator
    await page.goto('/operator.html');
    await page.fill('#operator-code', 'operator123');
    await page.click('button[type="submit"]');
    await expect(page.locator('#operator-dashboard')).toBeVisible();
    
    // Generate test request
    await page.click('#test-mode-btn');
    
    // Should show request in the list
    await expect(page.locator('.request-card')).toBeVisible();
    await expect(page.locator('.approve-btn')).toBeVisible();
    await expect(page.locator('.deny-btn')).toBeVisible();
  });

  test('should handle request approval workflow', async ({ page }) => {
    // Login as operator
    await page.goto('/operator.html');
    await page.fill('#operator-code', 'gcc2024');
    await page.click('button[type="submit"]');
    
    // Generate test request
    await page.click('#test-mode-btn');
    await expect(page.locator('.request-card')).toBeVisible();
    
    // Get the request ID and approve it
    const requestCard = page.locator('.request-card').first();
    await expect(requestCard.locator('.status-pending')).toBeVisible();
    
    await requestCard.locator('.approve-btn').click();
    
    // Request should now show as approved with grant access button
    await expect(requestCard.locator('.grant-access-btn')).toBeVisible({ timeout: 5000 });
    await expect(requestCard.locator('.status-approved')).toBeVisible();
  });

  test('should handle procedure access grant workflow', async ({ page }) => {
    // Login as operator
    await page.goto('/operator.html');
    await page.fill('#operator-code', 'operator123');
    await page.click('button[type="submit"]');
    
    // Generate and approve test request
    await page.click('#test-mode-btn');
    const requestCard = page.locator('.request-card').first();
    await requestCard.locator('.approve-btn').click();
    await expect(requestCard.locator('.grant-access-btn')).toBeVisible();
    
    // Listen for grant access confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Grant this user access');
      await dialog.accept();
    });
    
    // Grant access to procedure
    await requestCard.locator('.grant-access-btn').click();
    
    // Request should show as granted
    await expect(requestCard.locator('.status-granted')).toBeVisible({ timeout: 5000 });
    await expect(requestCard.locator('.status-message')).toContainText('Access Granted');
  });

  test('should handle request denial', async ({ page }) => {
    // Login as operator
    await page.goto('/operator.html');
    await page.fill('#operator-code', 'gcc2024');
    await page.click('button[type="submit"]');
    
    // Generate test request
    await page.click('#test-mode-btn');
    const requestCard = page.locator('.request-card').first();
    
    // Deny the request
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('sure you want to deny');
      await dialog.accept();
    });
    await requestCard.locator('.deny-btn').click();
    
    // Request should show as denied
    await expect(requestCard.locator('.status-denied')).toBeVisible({ timeout: 5000 });
    await expect(requestCard.locator('.status-message.denied')).toContainText('Request Denied');
  });

  test('should allow revoking access', async ({ page }) => {
    // Login as operator
    await page.goto('/operator.html');
    await page.fill('#operator-code', 'operator123');
    await page.click('button[type="submit"]');
    
    // Generate, approve, and grant test request
    await page.click('#test-mode-btn');
    const requestCard = page.locator('.request-card').first();
    await requestCard.locator('.approve-btn').click();
    await expect(requestCard.locator('.grant-access-btn')).toBeVisible();
    
    // Handle grant access confirmation dialog
    page.on('dialog', async dialog => {
      if (dialog.message().includes('Grant this user access')) {
        await dialog.accept();
      } else if (dialog.message().includes('revoke access')) {
        await dialog.accept();
      }
    });
    
    await requestCard.locator('.grant-access-btn').click();
    await expect(requestCard.locator('.status-granted')).toBeVisible();
    
    // Revoke access (dialog already handled above)
    await requestCard.locator('.revoke-btn').click();
    
    // Should show as denied
    await expect(requestCard.locator('.status-denied')).toBeVisible({ timeout: 5000 });
  });

  test('should handle share code import', async ({ page }) => {
    // Login as operator
    await page.goto('/operator.html');
    await page.fill('#operator-code', 'gcc2024');
    await page.click('button[type="submit"]');
    
    // Create a mock share code (base64 encoded request data)
    const mockRequest = {
      id: 'test_import_123',
      userName: 'Imported User',
      timestamp: Date.now()
    };
    const shareCode = btoa(JSON.stringify(mockRequest)).substring(0, 12);
    
    // Import the share code
    await page.fill('#share-code-input', shareCode);
    await page.click('#import-btn');
    
    // Should show imported request
    await expect(page.locator('.request-card')).toBeVisible();
    await expect(page.locator('.request-card h3')).toContainText('Imported User');
  });

  test('should handle clear all requests', async ({ page }) => {
    // Login as operator
    await page.goto('/operator.html');
    await page.fill('#operator-code', 'operator123');
    await page.click('button[type="submit"]');
    
    // Generate test requests
    await page.click('#test-mode-btn');
    await page.click('#test-mode-btn');
    await expect(page.locator('.request-card')).toHaveCount(2);
    
    // Clear all requests
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('clear all requests');
      await dialog.accept();
    });
    await page.click('#clear-all-btn');
    
    // Should show no requests
    await expect(page.locator('#no-requests')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.request-card')).toHaveCount(0);
  });

  test('should auto-refresh requests', async ({ page }) => {
    // Login as operator
    await page.goto('/operator.html');
    await page.fill('#operator-code', 'gcc2024');
    await page.click('button[type="submit"]');
    
    // Generate initial request
    await page.click('#test-mode-btn');
    await expect(page.locator('.request-card')).toHaveCount(1);
    
    // Add another request via backend simulation
    await page.evaluate(() => {
      const newRequest = {
        id: 'auto_refresh_test_' + Date.now(),
        userName: 'Auto Refresh User',
        timestamp: Date.now(),
        userAgent: 'Test Browser',
        browserInfo: 'Test Platform',
        status: 'pending'
      };
      window.githubBackend.submitRequest(newRequest);
    });
    
    // Should auto-refresh and show new request (within 5 seconds)
    await expect(page.locator('.request-card')).toHaveCount(2, { timeout: 6000 });
  });

  test('should logout and return to auth screen', async ({ page }) => {
    // Login as operator
    await page.goto('/operator.html');
    await page.fill('#operator-code', 'operator123');
    await page.click('button[type="submit"]');
    await expect(page.locator('#operator-dashboard')).toBeVisible();
    
    // Logout
    await page.click('#operator-logout');
    
    // Should return to auth screen
    await expect(page.locator('#operator-auth')).toBeVisible();
    await expect(page.locator('#operator-dashboard')).not.toBeVisible();
    await expect(page.locator('#operator-code')).toHaveValue('');
  });
});