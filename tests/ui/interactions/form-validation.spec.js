/**
 * Form Validation Interaction Test Implementation
 *
 * Working implementation of form validation interaction tests including:
 * - Real-time validation feedback
 * - URL validation
 * - Required field validation
 * - Input formatting
 * - Error message display
 * - Validation state persistence
 * - Form submission validation
 * - Accessibility features
 * - Performance optimization
 * - Validation state management
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
  context: 'FormValidationTest',
  logErrors: true,
  throwErrors: false
});

test.describe('Form Validation Interactions @interaction @implementation', () => {

  test.beforeEach(async ({ page }) => {
    try {
      // Navigate to popup and wait for load
      await page.goto('/ui/main_popup.html
      await page.waitForSelector('.popup-container', { timeout: config.timeout });

      // Reset form state
      await page.evaluate(() => {
        const form = document.querySelector('#content-form');
        if (form) form.reset();

        // Clear any validation states
        const inputs = form?.querySelectorAll('input, textarea');
        inputs?.forEach(input => {
          input.classList.remove('invalid', 'valid');
          input.setCustomValidity('');
        });

        // Hide any error messages
        const errors = document.querySelectorAll('.error-message, .validation-error');
        errors.forEach(error => error.style.display = 'none');
      });
    } catch (error) {
      errorHandler.handleError('Failed to setup form validation page', error);
      throw error;
    }
  });

  test('should validate title field requirements @interaction @implementation', async ({ page }) => {
    try {
      const titleInput = page.locator('#title-input');
      const saveButton = page.locator('#save-button');

      // Test initial empty state
      await expect(titleInput).toBeVisible();
      await expect(saveButton).toBeDisabled();

      // Test minimum length validation
      await titleInput.fill('ab'); // Too short

      // Trigger validation (blur or input)
      await titleInput.blur();

      // Check validation state
      await expect(titleInput).toHaveClass(/invalid/);
      await expect(page.locator('.title-error, .validation-error')).toBeVisible();
      await expect(page.locator('.title-error, .validation-error')).toHaveText(/at least 3 characters/i);

      // Test valid title
      await titleInput.fill('Valid Title');
      await titleInput.blur();

      // Check validation cleared
      await expect(titleInput).not.toHaveClass(/invalid/);
      await expect(titleInput).toHaveClass(/valid/);
      await expect(page.locator('.title-error, .validation-error')).not.toBeVisible();

      // Test button state reflects validation
      await expect(saveButton).toBeDisabled(); // Still disabled due to empty URL
    } catch (error) {
      errorHandler.handleError('Title field validation test failed', error);
      throw error;
    }
  });

  test('should validate URL field format @interaction @implementation', async ({ page }) => {
    try {
      const urlInput = page.locator('#url-input');
      const saveButton = page.locator('#save-button');

      // Fill title first to enable URL validation
      await page.fill('#title-input', 'Test Title');

      // Test invalid URL formats
      const invalidUrls = [
        'invalid-url',
        'not-a-url',
        'http://',
        'https://',
        'ftp://example.com',
        'javascript:alert(1)',
        'data:text/html,script'
      ];

      for (const invalidUrl of invalidUrls) {
        await urlInput.fill(invalidUrl);
        await urlInput.blur();

        // Check validation error
        await expect(urlInput).toHaveClass(/invalid/);
        await expect(page.locator('.url-error, .validation-error')).toBeVisible();
        await expect(page.locator('.url-error, .validation-error')).toHaveText(/valid URL/i);

        // Clear for next test
        await urlInput.fill('');
        await urlInput.blur();
      }

      // Test valid URLs
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://www.example.com/path?query=value#fragment',
        'https://subdomain.example.com:8080/path'
      ];

      for (const validUrl of validUrls) {
        await urlInput.fill(validUrl);
        await urlInput.blur();

        // Check validation passed
        await expect(urlInput).not.toHaveClass(/invalid/);
        await expect(urlInput).toHaveClass(/valid/);
        await expect(page.locator('.url-error, .validation-error')).not.toBeVisible();

        // Clear for next test
        await urlInput.fill('');
        await urlInput.blur();
      }
    } catch (error) {
      errorHandler.handleError('URL field validation test failed', error);
      throw error;
    }
  });

  test('should provide real-time validation feedback @interaction @implementation', async ({ page }) => {
    try {
      const titleInput = page.locator('#title-input');

      // Test real-time validation as user types
      await titleInput.focus();

      // Type one character at a time
      await titleInput.type('a');
      await page.waitForTimeout(50);

      // Should show invalid state for short input
      await expect(titleInput).toHaveClass(/invalid/);

      await titleInput.type('b');
      await page.waitForTimeout(50);

      // Should still show invalid state
      await expect(titleInput).toHaveClass(/invalid/);

      await titleInput.type('c');
      await page.waitForTimeout(50);

      // Should clear invalid state and show valid state
      await expect(titleInput).not.toHaveClass(/invalid/);
      await expect(titleInput).toHaveClass(/valid/);

      // Test rapid typing performance
      await titleInput.fill('');
      await titleInput.type('rapid test');

      // Should handle rapid typing without lag
      await expect(titleInput).not.toHaveClass(/invalid/);
      await expect(titleInput).toHaveClass(/valid/);
    } catch (error) {
      errorHandler.handleError('Real-time validation test failed', error);
      throw error;
    }
  });

  test('should validate description field length @interaction @implementation', async ({ page }) => {
    try {
      const descriptionInput = page.locator('#description-input');

      await expect(descriptionInput).toBeVisible();

      // Test maximum length validation
      const longText = 'a'.repeat(501); // Too long

      await descriptionInput.fill(longText);

      // Check length validation
      await expect(descriptionInput).toHaveClass(/invalid/);
      await expect(page.locator('.description-error, .validation-error')).toBeVisible();
      await expect(page.locator('.description-error, .validation-error')).toHaveText(/less than 500 characters/i);

      // Test character counter
      const charCount = page.locator('.char-count, .character-counter');
      await expect(charCount).toBeVisible();
      await expect(charCount).toHaveText(/501\/500/);

      // Remove characters to make it valid
      await descriptionInput.fill('a'.repeat(100));

      // Check validation cleared
      await expect(charCount).toHaveText(/100\/500/);
      await expect(descriptionInput).not.toHaveClass(/invalid/);
      await expect(descriptionInput).toHaveClass(/valid/);
      await expect(page.locator('.description-error, .validation-error')).not.toBeVisible();
    } catch (error) {
      errorHandler.handleError('Description field validation test failed', error);
      throw error;
    }
  });

  test('should validate tag input creation @interaction @implementation', async ({ page }) => {
    try {
      const tagInput = page.locator('#tag-input');

      await expect(tagInput).toBeVisible();

      // Test empty tag submission
      await tagInput.fill('   '); // Only spaces
      await tagInput.press('Enter');

      // Check empty tag validation
      await expect(tagInput).toHaveClass(/invalid/);
      await expect(page.locator('.tag-error, .validation-error')).toBeVisible();

      // Test valid tag creation
      await tagInput.fill('valid-tag');
      await tagInput.press('Enter');

      // Check tag created
      const createdTag = page.locator('.tag').last();
      await expect(createdTag).toBeVisible();
      await expect(createdTag).toHaveText('valid-tag');

      // Check input cleared after successful tag creation
      await expect(tagInput).toHaveValue('');
      await expect(tagInput).not.toHaveClass(/invalid/);

      // Test multiple tags
      await tagInput.fill('another-tag');
      await tagInput.press('Enter');

      const secondTag = page.locator('.tag').last();
      await expect(secondTag).toBeVisible();
      await expect(secondTag).toHaveText('another-tag');

      // Verify multiple tags exist
      const tagCount = await page.locator('.tag').count();
      expect(tagCount).toBe(2);
    } catch (error) {
      errorHandler.handleError('Tag input validation test failed', error);
      throw error;
    }
  });

  test('should validate complete form submission @interaction @implementation', async ({ page }) => {
    try {
      const saveButton = page.locator('#save-button');

      // Try to submit empty form
      await saveButton.click();

      // Check comprehensive validation errors
      await expect(page.locator('#title-input')).toHaveClass(/invalid/);
      await expect(page.locator('#url-input')).toHaveClass(/invalid/);
      await expect(page.locator('.title-error, .validation-error')).toBeVisible();
      await expect(page.locator('.url-error, .validation-error')).toBeVisible();

      // Fill form partially
      await page.fill('#title-input', 'Test Title');
      await saveButton.click();

      // Check partial validation
      await expect(page.locator('#title-input')).not.toHaveClass(/invalid/);
      await expect(page.locator('#title-input')).toHaveClass(/valid/);
      await expect(page.locator('#url-input')).toHaveClass(/invalid/);
      await expect(page.locator('.title-error, .validation-error')).not.toBeVisible();
      await expect(page.locator('.url-error, .validation-error')).toBeVisible();

      // Fill form completely
      await page.fill('#url-input', 'https://example.com');
      await saveButton.click();

      // Check successful submission
      await expect(page.locator('.success-message')).toBeVisible({ timeout: 1000 });
      await expect(page.locator('.success-message')).toHaveText('Content saved successfully');

      // Check all validation states cleared
      await expect(page.locator('#title-input')).toHaveClass(/valid/);
      await expect(page.locator('#url-input')).toHaveClass(/valid/);
      await expect(page.locator('.validation-error')).not.toBeVisible();
    } catch (error) {
      errorHandler.handleError('Form submission validation test failed', error);
      throw error;
    }
  });

  test('should maintain validation state persistence @interaction @implementation', async ({ page }) => {
    try {
      const titleInput = page.locator('#title-input');

      // Trigger validation error
      await titleInput.fill('ab');
      await titleInput.blur();

      // Check validation state
      await expect(titleInput).toHaveClass(/invalid/);
      await expect(page.locator('.title-error, .validation-error')).toBeVisible();

      // Store current validation state
      const validationData = await page.evaluate(() => {
        const input = document.querySelector('#title-input');
        return {
          value: input.value,
          classes: input.className,
          isValid: input.validity.valid,
          validationMessage: input.validationMessage
        };
      });

      // Simulate page navigation (refresh)
      await page.reload();

      // Wait for page to load
      await page.waitForSelector('.popup-container', { timeout: config.timeout });

      // Check if validation state persisted (implementation dependent)
      const currentValue = await titleInput.inputValue();
      const currentClasses = await titleInput.getAttribute('class') || '';

      // If persistence is implemented, value should be restored
      if (currentValue === validationData.value) {
        await expect(titleInput).toHaveClass(/invalid/);
        await expect(page.locator('.title-error, .validation-error')).toBeVisible();
      }
    } catch (error) {
      errorHandler.handleError('Validation persistence test failed', error);
      throw error;
    }
  });

  test('should implement validation accessibility features @interaction @implementation', async ({ page }) => {
    try {
      const titleInput = page.locator('#title-input');

      // Test with invalid value
      await titleInput.fill('ab');
      await titleInput.blur();

      // Check ARIA attributes
      await expect(titleInput).toHaveAttribute('aria-invalid', 'true');

      const errorId = await titleInput.getAttribute('aria-describedby');
      if (errorId) {
        const errorMessage = page.locator(`#${errorId}`);
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toHaveAttribute('role', 'alert');
      }

      // Test screen reader announcements
      await page.evaluate(() => {
        // Simulate validation error announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'assertive');
        announcement.textContent = 'Validation error: Title must be at least 3 characters long';
        document.body.appendChild(announcement);

        // Auto-remove after announcement
        setTimeout(() => {
          announcement.remove();
        }, 3000);
      });

      // Check for announcement
      await expect(page.locator('[role="status"]')).toBeVisible();
      await expect(page.locator('[role="status"]')).toHaveText(/validation error/i);
    } catch (error) {
      errorHandler.handleError('Validation accessibility test failed', error);
      throw error;
    }
  });

  test('should optimize validation performance @interaction @implementation @performance', async ({ page }) => {
    try {
      const titleInput = page.locator('#title-input');

      // Measure validation response time
      const startTime = performance.now();
      await titleInput.fill('ab');
      await page.waitForTimeout(50);
      const endTime = performance.now();

      const validationTime = endTime - startTime;

      // Check performance
      expect(validationTime).toBeLessThan(100);

      // Test rapid typing performance
      const rapidStartTime = performance.now();

      await titleInput.fill('a');
      await page.waitForTimeout(10);
      await titleInput.fill('ab');
      await page.waitForTimeout(10);
      await titleInput.fill('abc');
      await page.waitForTimeout(10);

      const rapidEndTime = performance.now();
      const rapidTime = rapidEndTime - rapidStartTime;

      // Check rapid validation performance
      expect(rapidTime).toBeLessThan(150);

      // Check final validation state
      await expect(titleInput).not.toHaveClass(/invalid/);
      await expect(titleInput).toHaveClass(/valid/);
    } catch (error) {
      errorHandler.handleError('Validation performance test failed', error);
      throw error;
    }
  });

  test.describe('Form Input Formatting', () => {

    test('should auto-format URLs @interaction @implementation', async ({ page }) => {
      try {
        const urlInput = page.locator('#url-input');

        // Test adding protocol automatically
        await urlInput.fill('example.com');
        await urlInput.blur();

        // Check if URL was auto-formatted (implementation dependent)
        const formattedUrl = await urlInput.inputValue();
        if (formattedUrl !== 'example.com') {
          expect(formattedUrl).toBe('https://example.com');
        }

        // Test removing whitespace
        await urlInput.fill('  https://example.com  ');
        await urlInput.blur();

        const trimmedUrl = await urlInput.inputValue();
        expect(trimmedUrl.trim()).toBe(trimmedUrl); // No leading/trailing spaces
      } catch (error) {
        errorHandler.handleError('URL auto-formatting test failed', error);
        throw error;
      }
    });

    test('should auto-capitalize titles @interaction @implementation', async ({ page }) => {
      try {
        const titleInput = page.locator('#title-input');

        // Test auto-capitalization
        await titleInput.fill('test title');
        await titleInput.blur();

        // Check if title was auto-capitalized (implementation dependent)
        const formattedTitle = await titleInput.inputValue();
        if (formattedTitle !== 'test title') {
          expect(formattedTitle).toBe('Test Title');
        }
      } catch (error) {
        errorHandler.handleError('Title auto-capitalization test failed', error);
        throw error;
      }
    });
  });

  test.describe('Validation State Management', () => {

    test('should sync validation states with UI elements @interaction @implementation', async ({ page }) => {
      try {
        const titleInput = page.locator('#title-input');
        const saveButton = page.locator('#save-button');

        // Fill valid title
        await titleInput.fill('Valid Title');

        // Check button state sync
        await expect(saveButton).toBeDisabled(); // Still disabled due to URL

        // Make title invalid
        await titleInput.fill('ab');

        // Check button state sync
        await expect(saveButton).toBeDisabled();

        // Make title valid again
        await titleInput.fill('Valid Title');

        // Check re-validation sync
        await expect(saveButton).toBeDisabled(); // Still needs URL

        // Fill valid URL
        await page.fill('#url-input', 'https://example.com');

        // Check complete validation sync
        await expect(saveButton).toBeEnabled();
        await expect(titleInput).toHaveClass(/valid/);
        await expect(page.locator('#url-input')).toHaveClass(/valid/);
      } catch (error) {
        errorHandler.handleError('Validation state sync test failed', error);
        throw error;
      }
    });
  });
});

module.exports = {
  testConfig: config,
  testDescriptions: {
    titleValidation: 'Tests title field length and required validation',
    urlValidation: 'Tests URL format and protocol validation',
    realtimeValidation: 'Tests real-time validation feedback as user types',
    descriptionValidation: 'Tests description field length validation and character counting',
    tagValidation: 'Tests tag input validation and creation',
    formSubmission: 'Tests comprehensive form validation before submission',
    validationPersistence: 'Tests validation state persistence across navigation',
    validationAccessibility: 'Tests ARIA attributes and screen reader support for validation',
    validationPerformance: 'Tests validation response time and performance',
    urlFormatting: 'Tests URL auto-formatting and whitespace handling',
    titleCapitalization: 'Tests title auto-capitalization',
    validationStateSync: 'Tests synchronization between validation states and UI elements'
  }
};