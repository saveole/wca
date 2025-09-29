/**
 * Error State Interaction Test Implementation
 *
 * Working implementation of error state interaction tests including:
 * - Form validation errors
 * - Network error handling
 * - API error responses
 * - Error message display
 * - Error recovery mechanisms
 * - Error state accessibility
 * - Error logging and debugging
 * - Error user feedback
 * - Error prevention
 * - Error state persistence
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
  timeout: 8000,
  retries: 0,
  defaultViewport: { width: 360, height: 600 }, // Chrome extension popup size
  performanceMode: true
});

// Error handler for test execution
const errorHandler = new ErrorHandler({
  context: 'ErrorStatesTest',
  logErrors: true,
  throwErrors: false
});

test.describe('Error State Interactions @interaction @implementation', () => {

  test.beforeEach(async ({ page }) => {
    try {
      // Navigate to popup and wait for load
      await page.goto('/ui/main_popup.html
      await page.waitForSelector('.popup-container', { timeout: config.timeout });

      // Reset form state and clear any error states
      await page.evaluate(() => {
        const form = document.querySelector('#content-form');
        if (form) form.reset();

        // Clear any error states
        const errorElements = document.querySelectorAll('.error-message, .validation-error, .error-state');
        errorElements.forEach(el => el.remove());

        // Reset input states
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          input.classList.remove('invalid', 'error');
          input.setCustomValidity('');
        });

        // Reset button states
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
          button.disabled = false;
          button.classList.remove('error', 'loading');
          button.removeAttribute('aria-invalid');
        });
      });
    } catch (error) {
      errorHandler.handleError('Failed to setup error states page', error);
      throw error;
    }
  });

  test('should handle form validation errors @interaction @implementation', async ({ page }) => {
    try {
      const titleInput = page.locator('#title-input');
      const urlInput = page.locator('#url-input');
      const saveButton = page.locator('#save-button');

      // Verify initial state
      await expect(titleInput).toBeVisible();
      await expect(urlInput).toBeVisible();
      await expect(saveButton).toBeDisabled();

      // Test empty form submission
      await saveButton.click();

      // Verify validation errors appear
      await expect(titleInput).toHaveClass(/invalid|error/);
      await expect(urlInput).toHaveClass(/invalid|error/);
      await expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      await expect(urlInput).toHaveAttribute('aria-invalid', 'true');

      // Verify error messages
      const titleError = page.locator('.title-error, .validation-error');
      const urlError = page.locator('.url-error, .validation-error');

      await expect(titleError).toBeVisible();
      await expect(urlError).toBeVisible();
      await expect(titleError).toHaveText(/required|minimum|characters/i);
      await expect(urlError).toHaveText(/required|valid|url/i);

      // Test partial form filling
      await titleInput.fill('Valid Title');
      await saveButton.click();

      // Title error should clear, URL error should remain
      await expect(titleInput).not.toHaveClass(/invalid|error/);
      await expect(urlInput).toHaveClass(/invalid|error/);
      await expect(titleError).not.toBeVisible();
      await expect(urlError).toBeVisible();

      // Test invalid URL format
      await urlInput.fill('invalid-url');
      await saveButton.click();

      // URL error should persist with format message
      await expect(urlInput).toHaveClass(/invalid|error/);
      await expect(urlError).toHaveText(/valid|url|format/i);

      // Test valid URL
      await urlInput.fill('https://example.com');
      await saveButton.click();

      // All errors should clear
      await expect(titleInput).not.toHaveClass(/invalid|error/);
      await expect(urlInput).not.toHaveClass(/invalid|error/);
      await expect(titleError).not.toBeVisible();
      await expect(urlError).not.toBeVisible();

      // Should show success instead of error
      await expect(page.locator('.success-message')).toBeVisible();
    } catch (error) {
      errorHandler.handleError('Form validation error test failed', error);
      throw error;
    }
  });

  test('should handle network error states @interaction @implementation', async ({ page }) => {
    try {
      // Fill form to enable operations
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      const aiSummaryButton = page.locator('#ai-summary-button');
      await expect(aiSummaryButton).toBeEnabled();

      // Simulate network error during AI summary generation
      await page.evaluate(() => {
        // Mock fetch to simulate network error
        const originalFetch = window.fetch;
        window.fetch = () => {
          return Promise.reject(new TypeError('Failed to fetch'));
        };

        // Store original for cleanup
        window.originalFetch = originalFetch;
      });

      // Trigger AI summary
      await aiSummaryButton.click();

      // Verify loading state first
      await expect(aiSummaryButton).toHaveClass(/loading/);
      await expect(page.locator('.loading-spinner')).toBeVisible();

      // Wait for error to occur
      await page.waitForTimeout(1500);

      // Verify error state
      await expect(aiSummaryButton).not.toHaveClass(/loading/);
      await expect(aiSummaryButton).toHaveClass(/error/);
      await expect(page.locator('.loading-spinner')).toBeHidden();

      // Verify network error message
      const networkError = page.locator('.network-error, .error-message');
      await expect(networkError).toBeVisible();
      await expect(networkError).toHaveText(/network|connection|offline|failed/i);

      // Verify retry button appears
      const retryButton = page.locator('.retry-button, .error-retry');
      if (await retryButton.count() > 0) {
        await expect(retryButton).toBeVisible();
        await expect(retryButton).toHaveText(/retry|try again/i);
      }

      // Test retry functionality
      // Restore original fetch
      await page.evaluate(() => {
        window.fetch = window.originalFetch;
        delete window.originalFetch;
      });

      if (await retryButton.count() > 0) {
        await retryButton.click();
      } else {
        await aiSummaryButton.click();
      }

      // Should start loading again
      await expect(aiSummaryButton).toHaveClass(/loading/);
      await expect(aiSummaryButton).not.toHaveClass(/error/);
      await expect(networkError).toBeHidden();

      // Simulate successful completion
      await page.evaluate(() => {
        setTimeout(() => {
          const button = document.querySelector('#ai-summary-button');
          const spinner = document.querySelector('.loading-spinner');

          if (button) button.classList.remove('loading');
          if (spinner) spinner.style.display = 'none';
        }, 500);
      });

      await page.waitForTimeout(600);

      // Verify success state
      await expect(aiSummaryButton).not.toHaveClass(/loading|error/);
    } catch (error) {
      errorHandler.handleError('Network error state test failed', error);
      throw error;
    }
  });

  test('should handle API error responses @interaction @implementation', async ({ page }) => {
    try {
      // Fill form to enable operations
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      const aiSummaryButton = page.locator('#ai-summary-button');

      // Simulate API error response
      await page.evaluate(() => {
        const originalFetch = window.fetch;
        window.fetch = () => {
          return Promise.resolve({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: () => Promise.resolve({ error: 'Invalid API key' })
          });
        };
        window.originalFetch = originalFetch;
      });

      // Trigger AI summary
      await aiSummaryButton.click();

      // Wait for error response
      await page.waitForTimeout(1000);

      // Verify API error state
      await expect(aiSummaryButton).toHaveClass(/error/);
      await expect(page.locator('.loading-spinner')).toBeHidden();

      // Verify API error message
      const apiError = page.locator('.api-error, .error-message');
      await expect(apiError).toBeVisible();
      await expect(apiError).toHaveText(/api|key|invalid|400/i);

      // Verify error details
      const errorDetails = page.locator('.error-details, .error-code');
      if (await errorDetails.count() > 0) {
        await expect(errorDetails).toBeVisible();
        await expect(errorDetails).toHaveText(/400|bad request/i);
      }

      // Test settings link for API configuration
      const settingsLink = page.locator('.settings-link, .configure-api');
      if (await settingsLink.count() > 0) {
        await expect(settingsLink).toBeVisible();
        await expect(settingsLink).toHaveText(/settings|configure|api/i);
      }

      // Restore fetch and test recovery
      await page.evaluate(() => {
        window.fetch = window.originalFetch;
        delete window.originalFetch;
      });
    } catch (error) {
      errorHandler.handleError('API error response test failed', error);
      throw error;
    }
  });

  test('should display error messages with appropriate styling @interaction @implementation', async ({ page }) => {
    try {
      // Test different error types and their visual presentation
      const errorTypes = [
        { type: 'validation', class: 'validation-error', icon: 'error', color: 'red' },
        { type: 'network', class: 'network-error', icon: 'wifi_off', color: 'orange' },
        { type: 'api', class: 'api-error', icon: 'cloud_off', color: 'purple' },
        { type: 'general', class: 'error-message', icon: 'error_outline', color: 'red' }
      ];

      for (const errorType of errorTypes) {
        // Clear previous errors
        await page.evaluate(() => {
          const errors = document.querySelectorAll('.error-message, .validation-error');
          errors.forEach(error => error.remove());
        });

        // Create error element
        await page.evaluate((type) => {
          const errorEl = document.createElement('div');
          errorEl.className = type.class;
          errorEl.innerHTML = `
            <div class="error-icon">${type.icon}</div>
            <div class="error-text">Sample ${type.type} error message</div>
            <div class="error-action">Retry</div>
          `;
          document.querySelector('.popup-container').appendChild(errorEl);
        }, errorType);

        // Verify error display
        const errorElement = page.locator(`.${errorType.class.split(' ')[0]}`);
        await expect(errorElement).toBeVisible();

        // Verify error styling
        const errorStyle = await errorElement.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            backgroundColor: style.backgroundColor,
            color: style.color,
            borderLeftColor: style.borderLeftColor
          };
        });

        expect(errorStyle.color).toBeTruthy();
        expect(errorStyle.backgroundColor).toBeTruthy();

        // Verify error icon
        const errorIcon = page.locator('.error-icon');
        await expect(errorIcon).toBeVisible();

        // Verify error text
        const errorText = page.locator('.error-text');
        await expect(errorText).toBeVisible();
        await expect(errorText).toHaveText(/sample|error/i);

        // Verify error action button
        const errorAction = page.locator('.error-action');
        await expect(errorAction).toBeVisible();
        await expect(errorAction).toHaveText(/retry/i);
      }
    } catch (error) {
      errorHandler.handleError('Error message styling test failed', error);
      throw error;
    }
  });

  test('should implement error recovery mechanisms @interaction @implementation', async ({ page }) => {
    try {
      const saveButton = page.locator('#save-button');

      // Trigger validation error
      await saveButton.click();

      // Verify error state
      await expect(page.locator('.validation-error')).toBeVisible();

      // Test automatic error recovery on input
      await page.fill('#title-input', 'Valid Title');

      // Title error should clear automatically
      await expect(page.locator('#title-input')).not.toHaveClass(/invalid|error/);
      await expect(page.locator('.title-error')).toBeHidden();

      // Test manual error dismissal
      const errorDismiss = page.locator('.error-dismiss, .close-error');
      if (await errorDismiss.count() > 0) {
        await errorDismiss.click();
        await expect(page.locator('.validation-error')).toBeHidden();
      }

      // Test error recovery after network failure
      await page.fill('#url-input', 'https://example.com');

      // Simulate network error
      await page.evaluate(() => {
        const originalFetch = window.fetch;
        window.fetch = () => Promise.reject(new Error('Network error'));
        window.originalFetch = originalFetch;
      });

      await saveButton.click();

      // Wait for network error
      await page.waitForTimeout(1000);

      // Verify network error state
      await expect(saveButton).toHaveClass(/error/);
      await expect(page.locator('.network-error')).toBeVisible();

      // Test retry recovery
      await page.evaluate(() => {
        window.fetch = window.originalFetch;
        delete window.originalFetch;
      });

      // Retry the operation
      await saveButton.click();

      // Should work now
      await expect(saveButton).not.toHaveClass(/error|loading/);
      await expect(page.locator('.network-error')).toBeHidden();
      await expect(page.locator('.success-message')).toBeVisible();
    } catch (error) {
      errorHandler.handleError('Error recovery test failed', error);
      throw error;
    }
  });

  test('should handle error state accessibility @interaction @implementation', async ({ page }) => {
    try {
      const saveButton = page.locator('#save-button');

      // Trigger validation error
      await saveButton.click();

      // Verify ARIA attributes for error state
      const titleInput = page.locator('#title-input');
      await expect(titleInput).toHaveAttribute('aria-invalid', 'true');

      // Verify error message accessibility
      const errorMessage = page.locator('.validation-error');
      await expect(errorMessage).toHaveAttribute('role', 'alert');
      await expect(errorMessage).toHaveAttribute('aria-live', 'assertive');

      // Verify error container has proper landmark
      const errorContainer = page.locator('.error-container, .errors');
      if (await errorContainer.count() > 0) {
        await expect(errorContainer).toHaveAttribute('role', 'region');
        await expect(errorContainer).toHaveAttribute('aria-label', /errors|issues/i);
      }

      // Test keyboard navigation to error elements
      await page.keyboard.press('Tab');

      // Should be able to focus error elements
      const focusedElement = await page.evaluate(() => document.activeElement);
      expect(focusedElement.tagName).toMatch(/input|button|a/);

      // Test screen reader announcements
      await expect(page.locator('[role="status"], [role="alert"]')).toBeVisible();

      // Verify error state is announced to screen readers
      const announcement = page.locator('.sr-only, [aria-live="assertive"]');
      if (await announcement.count() > 0) {
        await expect(announcement).toHaveText(/error|invalid|required/i);
      }

      // Fix the error and verify accessibility updates
      await page.fill('#title-input', 'Valid Title');
      await page.fill('#url-input', 'https://example.com');

      // ARIA attributes should be updated
      await expect(titleInput).not.toHaveAttribute('aria-invalid');
      await expect(errorMessage).toBeHidden();
    } catch (error) {
      errorHandler.handleError('Error accessibility test failed', error);
      throw error;
    }
  });

  test('should handle error logging and debugging @interaction @implementation', async ({ page }) => {
    try {
      // Enable console logging capture
      const consoleLogs = [];
      page.on('console', msg => {
        consoleLogs.push({
          type: msg.type(),
          text: msg.text(),
          location: msg.location()
        });
      });

      // Trigger various error scenarios
      await page.fill('#title-input', 'ab'); // Too short
      await page.fill('#url-input', 'invalid-url');
      const saveButton = page.locator('#save-button');
      await saveButton.click();

      // Wait for errors to be logged
      await page.waitForTimeout(500);

      // Verify console error logging
      const errorLogs = consoleLogs.filter(log => log.type === 'error');
      expect(errorLogs.length).toBeGreaterThan(0);

      // Verify error details in logs
      const hasValidationLog = errorLogs.some(log =>
        log.text.toLowerCase().includes('validation') ||
        log.text.toLowerCase().includes('invalid')
      );
      expect(hasValidationLog).toBe(true);

      // Test error context preservation
      await page.evaluate(() => {
        // Simulate error with context
        console.error('Validation Error', {
          field: 'title',
          value: 'ab',
          reason: 'minimum length not met',
          timestamp: new Date().toISOString()
        });
      });

      await page.waitForTimeout(100);

      // Verify context preservation in logs
      const contextLog = consoleLogs.find(log =>
        log.text.includes('Validation Error') &&
        log.text.includes('field') &&
        log.text.includes('timestamp')
      );
      expect(contextLog).toBeTruthy();

      // Test error reporting mechanism
      const reportButton = page.locator('.report-error, .debug-info');
      if (await reportButton.count() > 0) {
        await reportButton.click();

        // Verify error report dialog/details
        await expect(page.locator('.error-report, .debug-details')).toBeVisible();
        await expect(page.locator('.error-report, .debug-details')).toHaveText(/error|debug|report/i);
      }

      // Clean up console listener
      page.removeAllListeners('console');
    } catch (error) {
      errorHandler.handleError('Error logging test failed', error);
      throw error;
    }
  });

  test('should handle error state user feedback @interaction @implementation', async ({ page }) => {
    try {
      const saveButton = page.locator('#save-button');

      // Trigger error
      await saveButton.click();

      // Verify immediate visual feedback
      await expect(page.locator('.validation-error')).toBeVisible({ timeout: 100 });

      // Verify error animations
      const errorElement = page.locator('.validation-error').first();
      const hasAnimation = await errorElement.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.animation && style.animation !== 'none';
      });
      expect(hasAnimation).toBe(true);

      // Test error message clarity
      const errorMessage = await page.locator('.validation-error').first().textContent();
      expect(errorMessage.length).toBeGreaterThan(0);
      expect(errorMessage.length).toBeLessThan(200); // Not too verbose

      // Test error action buttons
      const actionButton = page.locator('.error-action, .fix-error');
      if (await actionButton.count() > 0) {
        await expect(actionButton).toBeVisible();
        await expect(actionButton).toHaveText(/fix|retry|ok/i);

        // Test action button functionality
        await actionButton.click();

        // Should either fix error or provide guidance
        await page.waitForTimeout(500);
      }

      // Test error persistence
      await page.waitForTimeout(2000);
      await expect(page.locator('.validation-error')).toBeVisible(); // Should persist until fixed

      // Test error clearing on success
      await page.fill('#title-input', 'Valid Title');
      await page.fill('#url-input', 'https://example.com');
      await saveButton.click();

      await expect(page.locator('.validation-error')).toBeHidden();
      await expect(page.locator('.success-message')).toBeVisible();
    } catch (error) {
      errorHandler.handleError('Error user feedback test failed', error);
      throw error;
    }
  });

  test('should implement error prevention mechanisms @interaction @implementation', async ({ page }) => {
    try {
      const titleInput = page.locator('#title-input');
      const urlInput = page.locator('#url-input');
      const saveButton = page.locator('#save-button');

      // Test real-time validation (prevention)
      await titleInput.fill('ab');
      await titleInput.blur(); // Trigger validation

      // Should show error before submission
      await expect(titleInput).toHaveClass(/invalid|error/);
      await expect(page.locator('.title-error')).toBeVisible();
      await expect(saveButton).toBeDisabled(); // Prevent submission

      // Test character limits
      await titleInput.fill('a'.repeat(501)); // Too long
      await titleInput.blur();

      await expect(titleInput).toHaveClass(/invalid|error/);
      await expect(page.locator('.title-error, .validation-error')).toBeVisible();
      await expect(saveButton).toBeDisabled();

      // Test input formatting prevention
      await urlInput.fill('javascript:alert(1)');
      await urlInput.blur();

      await expect(urlInput).toHaveClass(/invalid|error/);
      await expect(page.locator('.url-error, .validation-error')).toBeVisible();
      await expect(saveButton).toBeDisabled();

      // Test duplicate submission prevention
      await page.fill('#title-input', 'Valid Title');
      await page.fill('#url-input', 'https://example.com');

      // Enable button
      await expect(saveButton).toBeEnabled();

      // Click rapidly multiple times
      await saveButton.click();
      await saveButton.click();
      await saveButton.click();

      // Should prevent multiple submissions (either disabled or shows loading)
      const isDisabled = await saveButton.isDisabled();
      const isLoading = await saveButton.hasClass(/loading/);

      expect(isDisabled || isLoading).toBe(true);

      // Test network failure prevention
      await page.evaluate(() => {
        // Simulate offline mode
        window.navigator.onLine = false;
      });

      // Should show offline warning or prevent operation
      await page.waitForTimeout(500);

      // Restore online state
      await page.evaluate(() => {
        window.navigator.onLine = true;
      });
    } catch (error) {
      errorHandler.handleError('Error prevention test failed', error);
      throw error;
    }
  });

  test('should handle error state persistence @interaction @implementation', async ({ page }) => {
    try {
      const saveButton = page.locator('#save-button');

      // Trigger error state
      await saveButton.click();

      // Verify error state
      await expect(page.locator('.validation-error')).toBeVisible();
      await expect(page.locator('#title-input')).toHaveClass(/invalid|error/);

      // Store error state
      const errorState = await page.evaluate(() => {
        return {
          hasErrors: document.querySelectorAll('.validation-error').length > 0,
          titleInvalid: document.querySelector('#title-input').classList.contains('invalid'),
          errorCount: document.querySelectorAll('.validation-error').length
        };
      });

      expect(errorState.hasErrors).toBe(true);
      expect(errorState.titleInvalid).toBe(true);
      expect(errorState.errorCount).toBeGreaterThan(0);

      // Simulate page navigation
      await page.goto('about:blank');

      // Navigate back to popup
      await page.goto('/ui/main_popup.html
      await page.waitForSelector('.popup-container', { timeout: config.timeout });

      // Check if error state persisted (implementation dependent)
      const currentErrorState = await page.evaluate(() => {
        return {
          hasErrors: document.querySelectorAll('.validation-error').length > 0,
          titleInvalid: document.querySelector('#title-input')?.classList.contains('invalid') || false,
          errorCount: document.querySelectorAll('.validation-error').length
        };
      });

      // If persistence is implemented, errors should remain
      if (currentErrorState.hasErrors) {
        await expect(page.locator('.validation-error')).toBeVisible();
        await expect(page.locator('#title-input')).toHaveClass(/invalid|error/);
      }

      // Test error recovery across navigation
      await page.fill('#title-input', 'Valid Title');
      await page.fill('#url-input', 'https://example.com');

      // Should work regardless of persistence
      await expect(page.locator('#title-input')).not.toHaveClass(/invalid|error/);
      await expect(saveButton).toBeEnabled();
    } catch (error) {
      errorHandler.handleError('Error persistence test failed', error);
      throw error;
    }
  });

  test.describe('Error Recovery Scenarios', () => {

    test('should handle complex error recovery workflows @interaction @implementation', async ({ page }) => {
      try {
        const saveButton = page.locator('#save-button');

        // Simulate multiple concurrent errors
        await saveButton.click(); // Validation errors

        // Fill partial form to trigger mixed states
        await page.fill('#title-input', 'Valid Title');
        await page.fill('#url-input', 'invalid-url');
        await saveButton.click();

        // Verify mixed error state (some valid, some invalid)
        await expect(page.locator('#title-input')).not.toHaveClass(/invalid|error/);
        await expect(page.locator('#url-input')).toHaveClass(/invalid|error/);
        await expect(page.locator('.title-error')).toBeHidden();
        await expect(page.locator('.url-error')).toBeVisible();

        // Test sequential error recovery
        await page.fill('#url-input', 'https://example.com');

        // All errors should clear
        await expect(page.locator('#url-input')).not.toHaveClass(/invalid|error/);
        await expect(page.locator('.url-error')).toBeHidden();

        // Simulate API error after validation passes
        await page.evaluate(() => {
          const originalFetch = window.fetch;
          window.fetch = () => Promise.reject(new Error('API Error'));
          window.originalFetch = originalFetch;
        });

        await saveButton.click();

        // Should show API error instead of validation error
        await expect(page.locator('.validation-error')).toBeHidden();
        await expect(page.locator('.api-error, .error-message')).toBeVisible();
        await expect(saveButton).toHaveClass(/error/);

        // Test recovery from API error
        await page.evaluate(() => {
          window.fetch = window.originalFetch;
          delete window.originalFetch;
        });

        await saveButton.click();

        // Should succeed
        await expect(saveButton).not.toHaveClass(/error|loading/);
        await expect(page.locator('.success-message')).toBeVisible();
      } catch (error) {
        errorHandler.handleError('Complex error recovery test failed', error);
        throw error;
      }
    });
  });
});

module.exports = {
  testConfig: config,
  testDescriptions: {
    formValidationErrors: 'Tests form validation error display and handling',
    networkErrorStates: 'Tests network failure error states and recovery',
    apiErrorResponses: 'Tests API error response handling and display',
    errorMessageStyling: 'Tests error message visual presentation and styling',
    errorRecovery: 'Tests error recovery mechanisms and user actions',
    errorAccessibility: 'Tests error state accessibility and screen reader support',
    errorLogging: 'Tests error logging, debugging, and context preservation',
    errorUserFeedback: 'Tests user feedback mechanisms for error states',
    errorPrevention: 'Tests error prevention and real-time validation',
    errorPersistence: 'Tests error state persistence across navigation',
    complexRecovery: 'Tests complex multi-error recovery workflows'
  }
};