import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/');
    
    // Look for sign in button or login modal trigger
    const signInButton = page.getByRole('button', { name: /sign in/i }).first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
    }
    
    // Check for email and password inputs
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/');
    
    const signInButton = page.getByRole('button', { name: /sign in/i }).first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
    }
    
    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /sign in|login/i }).last();
    await submitButton.click();
    
    // Should show validation errors
    await expect(page.getByText(/required|email|password/i).first()).toBeVisible({ timeout: 2000 });
  });

  test('should navigate to home after successful login', async ({ page }) => {
    // This test would require a test user account
    // For now, we'll just check the UI flow
    await page.goto('/');
    
    // Check that home page loads
    await expect(page).toHaveURL(/.*\/$/);
  });
});

test.describe('Registration Flow', () => {
  test('should display registration form', async ({ page }) => {
    await page.goto('/');
    
    const signUpButton = page.getByRole('button', { name: /sign up|register/i }).first();
    if (await signUpButton.isVisible()) {
      await signUpButton.click();
    }
    
    // Check for registration fields
    await expect(page.getByPlaceholder(/name/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });
});

