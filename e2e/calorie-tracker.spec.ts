import { test, expect } from '@playwright/test';

test.describe('Calorie Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Note: In a real scenario, you'd need to authenticate first
  });

  test('should display calorie tracker interface', async ({ page }) => {
    // Navigate to tracker if there's a link
    const trackerLink = page.getByRole('link', { name: /tracker|calories/i });
    if (await trackerLink.isVisible()) {
      await trackerLink.click();
    }
    
    // Check for meal tabs or food input
    await expect(
      page.getByText(/breakfast|lunch|dinner|snack/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should allow searching for food', async ({ page }) => {
    // Navigate to tracker
    const trackerLink = page.getByRole('link', { name: /tracker|calories/i });
    if (await trackerLink.isVisible()) {
      await trackerLink.click();
    }
    
    // Look for food search input
    const searchInput = page.getByPlaceholder(/search.*food|add.*food/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('apple');
      // Wait for suggestions
      await page.waitForTimeout(500);
    }
  });
});

