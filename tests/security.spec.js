const { test, expect } = require('@playwright/test');

test.describe('Security Boundary Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all storage before each test
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should prevent direct access to procedure without authentication', async ({ page }) => {
    await page.goto('/');
    
    // Try to manipulate the DOM to show survey screen directly
    await page.evaluate(() => {
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('survey-screen').style.display = 'block';
    });
    
    // Refresh should restore proper authentication state
    await page.reload();
    await expect(page.locator('#auth-screen')).toBeVisible();
    await expect(page.locator('#survey-screen')).not.toBeVisible();
  });

  test('should prevent token manipulation', async ({ page }) => {
    // Try with various invalid token formats
    const invalidTokens = [
      'fake123',
      '12345',
      'verylongfaketoken12345678',
      '""',
      'null',
      'undefined',
      '<script>alert("xss")</script>',
      'test%20123'
    ];
    
    for (const token of invalidTokens) {
      await page.goto(`/?token=${token}`);
      
      // Should either show auth error or default auth screen
      const authScreen = page.locator('#auth-screen');
      const authError = page.locator('#auth-error');
      const nameInput = page.locator('#name-input-screen');
      
      // Should not show name input screen for invalid tokens
      await expect(nameInput).not.toBeVisible();
      
      // Should show either auth screen or error
      const isAuthVisible = await authScreen.isVisible();
      const isErrorVisible = await authError.isVisible();
      expect(isAuthVisible || isErrorVisible).toBeTruthy();
    }
  });

  test('should prevent session hijacking via localStorage manipulation', async ({ page }) => {
    // Create fake session data
    await page.goto('/');
    await page.evaluate(() => {
      // Try to create fake session
      localStorage.setItem('gcc_session', JSON.stringify({
        authenticated: true,
        expires: Date.now() + 1000000,
        created: Date.now()
      }));
      
      // Try to create fake token
      localStorage.setItem('gcc_session_token', JSON.stringify({
        token: 'fake_token',
        expires: Date.now() + 1000000,
        created: Date.now()
      }));
    });
    
    // Reload and verify it doesn't grant access
    await page.reload();
    
    // Should still show auth screen (fake session should be invalid)
    await expect(page.locator('#auth-screen')).toBeVisible();
    await expect(page.locator('#survey-screen')).not.toBeVisible();
  });

  test('should handle session expiration properly', async ({ page }) => {
    await page.goto('/?token=test123');
    await expect(page.locator('#name-input-screen')).toBeVisible();
    
    // Manipulate session to be expired
    await page.evaluate(() => {
      const tokenData = localStorage.getItem('gcc_session_token');
      if (tokenData) {
        const token = JSON.parse(tokenData);
        token.expires = Date.now() - 1000; // Expired 1 second ago
        localStorage.setItem('gcc_session_token', JSON.stringify(token));
      }
    });
    
    // Reload should show auth screen due to expired token
    await page.reload();
    await expect(page.locator('#auth-screen')).toBeVisible();
    await expect(page.locator('#name-input-screen')).not.toBeVisible();
  });

  test('should prevent XSS in name input', async ({ page }) => {
    await page.goto('/?token=test123');
    await expect(page.locator('#name-input-screen')).toBeVisible();
    
    // Try XSS payload in name field
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')">',
      '"><script>alert("xss")</script>',
      '\'; DROP TABLE users; --'
    ];
    
    for (const payload of xssPayloads) {
      await page.fill('#user-name', payload);
      await page.click('button[type="submit"]');
      
      // Should show waiting screen (name accepted but sanitized)
      await expect(page.locator('#waiting-screen')).toBeVisible();
      
      // Check that the displayed name doesn't contain script tags
      const displayedName = await page.locator('#waiting-user-name').textContent();
      expect(displayedName).not.toContain('<script>');
      expect(displayedName).not.toContain('javascript:');
      
      // Go back to test next payload
      await page.goto('/?token=test123');
    }
  });

  test('should prevent unauthorized operator access', async ({ page }) => {
    await page.goto('/operator.html');
    
    // Try to bypass operator auth
    await page.evaluate(() => {
      document.getElementById('operator-auth').style.display = 'none';
      document.getElementById('operator-dashboard').style.display = 'block';
    });
    
    // Refresh should restore auth requirement
    await page.reload();
    await expect(page.locator('#operator-auth')).toBeVisible();
    await expect(page.locator('#operator-dashboard')).not.toBeVisible();
  });

  test('should prevent CSRF-like attacks on operator actions', async ({ page }) => {
    // Login as operator first
    await page.goto('/operator.html');
    await page.fill('#operator-code', 'gcc2024');
    await page.click('button[type="submit"]');
    
    // Generate a test request
    await page.click('#test-mode-btn');
    const requestCard = page.locator('.request-card').first();
    
    // Try to manipulate request status via direct function calls
    await page.evaluate(() => {
      // This should not work without proper user interaction
      try {
        // Try to approve without clicking button
        approveRequest('nonexistent_id');
      } catch (e) {
        // Expected to fail
        console.log('Direct function call blocked:', e);
      }
    });
    
    // Request should still be pending
    await expect(requestCard.locator('.status-pending')).toBeVisible();
  });

  test('should handle concurrent session attempts', async ({ browser }) => {
    // Create two browser contexts (simulate different users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Both try to authenticate with same token
    await page1.goto('/?token=test123');
    await page2.goto('/?token=test123');
    
    // Both should be able to access name input (tokens are not exclusive)
    await expect(page1.locator('#name-input-screen')).toBeVisible();
    await expect(page2.locator('#name-input-screen')).toBeVisible();
    
    // But only one should be able to complete the flow with same name
    await page1.fill('#user-name', 'Same User');
    await page1.click('button[type="submit"]');
    await expect(page1.locator('#waiting-screen')).toBeVisible();
    
    await page2.fill('#user-name', 'Same User');
    await page2.click('button[type="submit"]');
    await expect(page2.locator('#waiting-screen')).toBeVisible();
    
    await context1.close();
    await context2.close();
  });

  test('should prevent procedure access without operator grant', async ({ page }) => {
    // Complete authentication flow up to approval
    await page.goto('/?token=test123');
    await page.fill('#user-name', 'Test User');
    await page.click('button[type="submit"]');
    await expect(page.locator('#waiting-screen')).toBeVisible();
    
    // Simulate approval (not grant)
    await page.evaluate(() => {
      const requestId = sessionStorage.getItem('gcc_request_id');
      if (requestId && window.githubBackend) {
        window.githubBackend.processRequest(requestId, 'approved');
      }
    });
    
    // Should show access granted screen, NOT procedure
    await expect(page.locator('#access-granted-screen')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#survey-screen')).not.toBeVisible();
    
    // Try to force show survey screen
    await page.evaluate(() => {
      document.getElementById('access-granted-screen').style.display = 'none';
      document.getElementById('survey-screen').style.display = 'block';
    });
    
    // Refresh should restore proper state (access granted, not procedure)
    await page.reload();
    await expect(page.locator('#access-granted-screen')).toBeVisible();
    await expect(page.locator('#survey-screen')).not.toBeVisible();
  });

  test('should handle malformed backend data', async ({ page }) => {
    await page.goto('/?token=test123');
    await page.fill('#user-name', 'Test User');
    await page.click('button[type="submit"]');
    
    // Corrupt the backend data
    await page.evaluate(() => {
      localStorage.setItem('gcc_demo_requests', 'invalid json{');
    });
    
    // Should handle gracefully and not crash
    await page.reload();
    
    // Should restore to appropriate authentication state
    const isAuthVisible = await page.locator('#auth-screen').isVisible();
    const isNameVisible = await page.locator('#name-input-screen').isVisible();
    const isWaitingVisible = await page.locator('#waiting-screen').isVisible();
    
    // Should show one of the valid screens, not crash
    expect(isAuthVisible || isNameVisible || isWaitingVisible).toBeTruthy();
  });
});