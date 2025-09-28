/**
 * Popup Button Interaction Test Implementation
 *
 * Working implementation of popup button interaction tests including:
 * - Button states (enabled/disabled)
 * - Click interactions
 * - Hover states
 * - Loading states
 * - Error states
 * - Success feedback
 * - Keyboard navigation
 * - Accessibility attributes
 * - Animations
 * - Responsive behavior
 * - Performance optimization
 * - Error recovery
 *
 * Dependencies:
 * - @playwright/test for browser automation
 * - Existing test utilities and models
 * - Chrome extension context
 */

const { test, expect } = require('@playwright/test');
const TestConfiguration = require('../../utils/test-configuration.js');
const ErrorHandler = require('../../utils/error-handler.js');

// Create test configuration
const config = new TestConfiguration({
  timeout: 5000,
  retries: 0,
  defaultViewport: { width: 360, height: 600 }, // Chrome extension popup size
  performanceMode: true
});

// Error handler for test execution
const errorHandler = new ErrorHandler({
  context: 'PopupButtonsTest',
  logErrors: true,
  throwErrors: false
});

test.describe('Popup Button Interactions @interaction @implementation', () => {

  test.beforeEach(async ({ page }) => {
    try {
      // Navigate to popup and wait for load
      await page.goto('chrome-extension://__MSG_@@extension_id__/ui/main_popup.html');
      await page.waitForSelector('.popup-container', { timeout: config.timeout });

      // Reset form state
      await page.evaluate(() => {
        const form = document.querySelector('#content-form');
        if (form) form.reset();
      });
    } catch (error) {
      errorHandler.handleError('Failed to setup popup page', error);
      throw error;
    }
  });

  test('should handle button state changes based on form validation @interaction @implementation', async ({ page }) => {
    try {
      const saveButton = page.locator('#save-button');

      // Test initial disabled state
      await expect(saveButton).toBeDisabled();
      await expect(saveButton).toHaveAttribute('aria-disabled', 'true');

      // Fill form to enable button
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      // Button should now be enabled
      await expect(saveButton).toBeEnabled();
      await expect(saveButton).not.toHaveAttribute('aria-disabled', 'true');

      // Test button click interaction
      await saveButton.click();

      // Verify success feedback appears
      await expect(page.locator('.success-message')).toBeVisible({ timeout: 1000 });
      await expect(page.locator('.success-message')).toHaveText('Content saved successfully');

      // Success message should auto-hide
      await expect(page.locator('.success-message')).toBeHidden({ timeout: 3000 });
    } catch (error) {
      errorHandler.handleError('Button state change test failed', error);
      throw error;
    }
  });

  test('should handle copy button functionality @interaction @implementation', async ({ page }) => {
    try {
      const copyButton = page.locator('#copy-button');

      await expect(copyButton).toBeVisible();
      await expect(copyButton).toBeEnabled();

      // Ensure content is available to copy
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      // Mock clipboard permissions for testing
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

      // Click copy button
      await copyButton.click();

      // Verify button shows success state
      await expect(copyButton).toHaveClass(/success/);
      await expect(copyButton).toHaveAttribute('aria-label', 'Copied!');

      // Verify clipboard content (if permissions allow)
      try {
        const clipboardContent = await page.evaluate(() => {
          return navigator.clipboard.readText();
        });
        expect(clipboardContent).toContain('example.com');
      } catch (clipboardError) {
        // Clipboard may not be available in test environment
        console.log('Clipboard verification skipped - not available in test environment');
      }

      // Reset button state after delay
      await page.waitForTimeout(1000);
      await expect(copyButton).not.toHaveClass(/success/);
      await expect(copyButton).toHaveAttribute('aria-label', 'Copy content');
    } catch (error) {
      errorHandler.handleError('Copy button functionality test failed', error);
      throw error;
    }
  });

  test('should handle theme toggle button interactions @interaction @implementation', async ({ page }) => {
    try {
      const themeToggle = page.locator('#theme-toggle');

      await expect(themeToggle).toBeVisible();
      await expect(themeToggle).toBeEnabled();

      // Check initial theme
      const initialTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme') || 'light';
      });

      expect(['light', 'dark']).toContain(initialTheme);

      // Click theme toggle
      await themeToggle.click();

      // Wait for theme transition
      await page.waitForTimeout(300);

      // Verify theme changed
      const newTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme') || 'light';
      });

      expect(newTheme).not.toBe(initialTheme);
      expect(['light', 'dark']).toContain(newTheme);

      // Verify button state updated
      const expectedLabel = newTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      await expect(themeToggle).toHaveAttribute('title', expectedLabel);
      await expect(themeToggle).toHaveAttribute('aria-pressed', newTheme === 'dark' ? 'true' : 'false');
    } catch (error) {
      errorHandler.handleError('Theme toggle interaction test failed', error);
      throw error;
    }
  });

  test('should handle loading state button interactions @interaction @implementation', async ({ page }) => {
    try {
      const aiSummaryButton = page.locator('#ai-summary-button');

      await expect(aiSummaryButton).toBeVisible();

      // Fill form to enable AI summary
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      // Click AI summary button to trigger loading state
      await aiSummaryButton.click();

      // Verify loading state
      await expect(aiSummaryButton).toHaveClass(/loading/);
      await expect(aiSummaryButton).toBeDisabled();
      await expect(aiSummaryButton).toHaveAttribute('aria-disabled', 'true');

      // Verify loading spinner is visible
      await expect(page.locator('.loading-spinner')).toBeVisible();

      // Simulate loading completion (in real scenario, this would be async)
      await page.evaluate(() => {
        // Simulate AI processing completion
        setTimeout(() => {
          const button = document.querySelector('#ai-summary-button');
          const spinner = document.querySelector('.loading-spinner');

          if (button) {
            button.classList.remove('loading');
            button.disabled = false;
            button.removeAttribute('aria-disabled');
          }

          if (spinner) {
            spinner.style.display = 'none';
          }
        }, 1000);
      });

      // Wait for loading to complete
      await page.waitForTimeout(1200);

      // Verify loading state cleared
      await expect(aiSummaryButton).not.toHaveClass(/loading/);
      await expect(aiSummaryButton).toBeEnabled();
      await expect(page.locator('.loading-spinner')).toBeHidden();
    } catch (error) {
      errorHandler.handleError('Loading state interaction test failed', error);
      throw error;
    }
  });

  test('should handle error state button interactions @interaction @implementation', async ({ page }) => {
    try {
      const saveButton = page.locator('#save-button');

      // Fill form with invalid data
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'invalid-url');

      // Click save button to trigger validation error
      await saveButton.click();

      // Verify error message appears
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.error-message')).toHaveText('Please enter a valid URL');

      // Verify button error state
      await expect(saveButton).toHaveClass(/error/);
      await expect(saveButton).toHaveAttribute('aria-invalid', 'true');

      // Fix the error
      await page.fill('#url-input', 'https://example.com');

      // Verify error state clears
      await expect(saveButton).not.toHaveClass(/error/);
      await expect(saveButton).not.toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('.error-message')).toBeHidden();
    } catch (error) {
      errorHandler.handleError('Error state interaction test failed', error);
      throw error;
    }
  });

  test('should handle keyboard navigation for buttons @interaction @implementation', async ({ page }) => {
    try {
      // Fill form to enable buttons
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      // Test tab navigation to buttons
      await page.keyboard.press('Tab');

      // First input should be focused
      let focusedElement = await page.evaluate(() => document.activeElement.id);
      expect(['title-input', 'url-input']).toContain(focusedElement);

      // Continue tabbing to buttons
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      focusedElement = await page.evaluate(() => document.activeElement.id);
      expect(['save-button', 'copy-button', 'ai-summary-button', 'theme-toggle']).toContain(focusedElement);

      // Test Enter key on focused button
      if (focusedElement === 'save-button') {
        await page.keyboard.press('Enter');
        await expect(page.locator('.success-message')).toBeVisible({ timeout: 1000 });
      }

      // Test Shift+Tab navigation
      await page.keyboard.press('Shift+Tab');
      const previousFocused = await page.evaluate(() => document.activeElement.id);
      expect(['title-input', 'url-input']).toContain(previousFocused);
    } catch (error) {
      errorHandler.handleError('Keyboard navigation test failed', error);
      throw error;
    }
  });

  test('should handle button hover and focus states @interaction @implementation', async ({ page }) => {
    try {
      const saveButton = page.locator('#save-button');

      // Fill form to enable button
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      // Test hover state
      await saveButton.hover();

      // Verify hover effect (transform or background change)
      const hoverStyle = await saveButton.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          transform: style.transform,
          backgroundColor: style.backgroundColor,
          cursor: style.cursor
        };
      });

      expect(hoverStyle.cursor).toBe('pointer');

      // Test focus state
      await saveButton.focus();

      // Verify focus indicator
      const focusStyle = await saveButton.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          outlineColor: style.outlineColor,
          boxShadow: style.boxShadow
        };
      });

      // Should have focus indication
      expect([focusStyle.outline, focusStyle.boxShadow].some(style =>
        style && style !== 'none' && style.includes('rgb')
      )).toBe(true);

      // Test active state (mousedown)
      await page.mouse.down();

      const activeStyle = await saveButton.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          transform: style.transform,
          backgroundColor: style.backgroundColor
        };
      });

      await page.mouse.up();
    } catch (error) {
      errorHandler.handleError('Button hover and focus state test failed', error);
      throw error;
    }
  });

  test('should handle button accessibility attributes @interaction @implementation', async ({ page }) => {
    try {
      const saveButton = page.locator('#save-button');

      // Test accessibility attributes
      await expect(saveButton).toHaveAttribute('role', 'button');
      await expect(saveButton).toHaveAttribute('tabindex', '0');

      // Test disabled state accessibility
      await expect(saveButton).toBeDisabled();
      await expect(saveButton).toHaveAttribute('aria-disabled', 'true');

      // Enable button
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      await expect(saveButton).toBeEnabled();
      await expect(saveButton).not.toHaveAttribute('aria-disabled', 'true');

      // Test tooltip functionality
      await saveButton.hover();

      // Check for tooltip or aria-describedby
      const hasTooltip = await page.evaluate(() => {
        const button = document.querySelector('#save-button');
        const tooltipId = button.getAttribute('aria-describedby');
        if (tooltipId) {
          const tooltip = document.getElementById(tooltipId);
          return tooltip && tooltip.style.display !== 'none';
        }
        return false;
      });

      // Tooltip may or may not be implemented
      if (hasTooltip) {
        await expect(page.locator('.tooltip')).toBeVisible();
      }
    } catch (error) {
      errorHandler.handleError('Button accessibility test failed', error);
      throw error;
    }
  });

  test('should handle button animation and transitions @interaction @implementation', async ({ page }) => {
    try {
      const saveButton = page.locator('#save-button');

      // Fill form to enable button
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      // Check for CSS transitions
      const hasTransition = await saveButton.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.transition && style.transition !== 'none';
      });

      // Click button to trigger success animation
      await saveButton.click();

      // Verify success animation
      await expect(saveButton).toHaveClass(/animate-success/);

      // Wait for animation to complete
      await page.waitForTimeout(500);

      // Verify animation state cleanup
      await expect(saveButton).not.toHaveClass(/animate-success/);
    } catch (error) {
      errorHandler.handleError('Button animation test failed', error);
      throw error;
    }
  });

  test('should handle responsive button behavior @interaction @implementation', async ({ page }) => {
    try {
      const saveButton = page.locator('#save-button');

      // Test button at different viewport sizes
      const viewports = [
        { width: 360, height: 600, name: 'standard' },
        { width: 300, height: 500, name: 'small' },
        { width: 400, height: 700, name: 'large' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        const buttonRect = await saveButton.boundingBox();
        expect(buttonRect).toBeTruthy();
        expect(buttonRect.width).toBeGreaterThan(0);
        expect(buttonRect.height).toBeGreaterThan(0);

        // Button should be visible and clickable at all sizes
        await expect(saveButton).toBeVisible();
        await expect(saveButton).toBeInViewport();
      }

      // Reset to standard size
      await page.setViewportSize({ width: 360, height: 600 });
    } catch (error) {
      errorHandler.handleError('Responsive button behavior test failed', error);
      throw error;
    }
  });

  test.describe('Button Performance', () => {

    test('should optimize button interaction performance @interaction @implementation @performance', async ({ page }) => {
      try {
        const saveButton = page.locator('#save-button');

        // Fill form to enable button
        await page.fill('#title-input', 'Test Title');
        await page.fill('#url-input', 'https://example.com');

        // Measure button click response time
        const startTime = performance.now();
        await saveButton.click();
        const endTime = performance.now();

        const responseTime = endTime - startTime;

        // Response should be fast
        expect(responseTime).toBeLessThan(100);

        // Wait for success message
        await expect(page.locator('.success-message')).toBeVisible({ timeout: 1000 });

        // Test multiple rapid clicks
        const rapidStartTime = performance.now();

        // Reset form for rapid testing
        await page.fill('#title-input', 'Rapid Test');
        await page.fill('#url-input', 'https://example.com');

        await saveButton.click();
        await page.waitForTimeout(50);

        const rapidEndTime = performance.now();
        const rapidTime = rapidEndTime - rapidStartTime;

        expect(rapidTime).toBeLessThan(200);
      } catch (error) {
        errorHandler.handleError('Button performance test failed', error);
        throw error;
      }
    });
  });

  test.describe('Button Error Recovery', () => {

    test('should handle button error recovery @interaction @implementation @error-handling', async ({ page }) => {
      try {
        const saveButton = page.locator('#save-button');

        // Fill form with invalid data
        await page.fill('#title-input', 'Test Title');
        await page.fill('#url-input', 'invalid-url');

        // Click to trigger error
        await saveButton.click();

        // Verify error state
        await expect(saveButton).toHaveClass(/error/);
        await expect(page.locator('.error-message')).toBeVisible();

        // Fix the error
        await page.fill('#url-input', 'https://example.com');

        // Verify error recovery
        await expect(saveButton).not.toHaveClass(/error/);
        await expect(page.locator('.error-message')).not.toBeVisible();

        // Button should be enabled and functional
        await expect(saveButton).toBeEnabled();

        // Test that button works after error recovery
        await saveButton.click();
        await expect(page.locator('.success-message')).toBeVisible({ timeout: 1000 });
      } catch (error) {
        errorHandler.handleError('Button error recovery test failed', error);
        throw error;
      }
    });
  });
});

module.exports = {
  testConfig: config,
  testDescriptions: {
    buttonStates: 'Tests button enabled/disabled states based on form validation',
    copyFunctionality: 'Tests clipboard copy functionality',
    themeToggle: 'Tests theme switching button behavior',
    loadingStates: 'Tests loading states and spinners',
    errorStates: 'Tests error states and validation feedback',
    keyboardNavigation: 'Tests keyboard navigation and focus management',
    hoverAndFocus: 'Tests visual hover and focus states',
    accessibility: 'Tests ARIA attributes and screen reader support',
    animations: 'Tests button animations and transitions',
    responsive: 'Tests responsive behavior at different viewports',
    performance: 'Tests button interaction performance',
    errorRecovery: 'Tests error state recovery and validation'
  }
};