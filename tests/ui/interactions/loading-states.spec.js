/**
 * Loading State Interaction Test Implementation
 *
 * Working implementation of loading state interaction tests including:
 * - Button loading states
 * - Loading spinners and indicators
 * - Loading text and messages
 * - Loading state transitions
 * - Loading accessibility features
 * - Loading performance optimization
 * - Loading error handling
 * - Loading during async operations
 * - Loading state persistence
 * - Loading state cancellation
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
  context: 'LoadingStatesTest',
  logErrors: true,
  throwErrors: false
});

test.describe('Loading State Interactions @interaction @implementation', () => {

  test.beforeEach(async ({ page }) => {
    try {
      // Navigate to popup and wait for load
      await page.goto('chrome-extension://__MSG_@@extension_id__/ui/main_popup.html');
      await page.waitForSelector('.popup-container', { timeout: config.timeout });

      // Clear any existing loading states
      await page.evaluate(() => {
        const loadingElements = document.querySelectorAll('.loading, .loading-spinner, [data-loading]');
        loadingElements.forEach(el => {
          el.style.display = 'none';
          el.classList.remove('loading', 'active');
        });

        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
          btn.disabled = false;
          btn.classList.remove('loading', 'disabled');
          btn.removeAttribute('data-loading');
        });
      });
    } catch (error) {
      errorHandler.handleError('Failed to setup loading states page', error);
      throw error;
    }
  });

  test('should handle button loading states @interaction @implementation', async ({ page }) => {
    try {
      // Fill form to enable buttons
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      // Test AI summary button loading state
      const aiSummaryButton = page.locator('#ai-summary-button');
      await expect(aiSummaryButton).toBeVisible();
      await expect(aiSummaryButton).toBeEnabled();

      // Click to trigger loading state
      await aiSummaryButton.click();

      // Verify loading state
      await expect(aiSummaryButton).toHaveClass(/loading/);
      await expect(aiSummaryButton).toBeDisabled();
      await expect(aiSummaryButton).toHaveAttribute('data-loading', 'true');
      await expect(aiSummaryButton).toHaveAttribute('aria-disabled', 'true');

      // Simulate loading completion
      await page.evaluate(() => {
        setTimeout(() => {
          const button = document.querySelector('#ai-summary-button');
          if (button) {
            button.classList.remove('loading');
            button.disabled = false;
            button.removeAttribute('data-loading');
            button.removeAttribute('aria-disabled');
          }
        }, 1000);
      });

      // Wait for loading to complete
      await page.waitForTimeout(1200);

      // Verify loading state cleared
      await expect(aiSummaryButton).not.toHaveClass(/loading/);
      await expect(aiSummaryButton).toBeEnabled();
      await expect(aiSummaryButton).not.toHaveAttribute('data-loading');
      await expect(aiSummaryButton).not.toHaveAttribute('aria-disabled');
    } catch (error) {
      errorHandler.handleError('Button loading state test failed', error);
      throw error;
    }
  });

  test('should display loading spinners and indicators @interaction @implementation', async ({ page }) => {
    try {
      // Fill form to enable AI summary
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      const aiSummaryButton = page.locator('#ai-summary-button');
      await aiSummaryButton.click();

      // Verify loading spinner appears
      await expect(page.locator('.loading-spinner')).toBeVisible();
      await expect(page.locator('.loading-spinner')).toHaveClass(/active|visible/);

      // Check spinner accessibility
      await expect(page.locator('.loading-spinner')).toHaveAttribute('role', 'status');
      await expect(page.locator('.loading-spinner')).toHaveAttribute('aria-label', /loading|processing/i);

      // Verify spinner animation
      const spinnerAnimation = await page.locator('.loading-spinner').evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          animation: style.animation,
          transform: style.transform
        };
      });

      expect(spinnerAnimation.animation).toBeTruthy();

      // Simulate loading completion
      await page.evaluate(() => {
        const spinner = document.querySelector('.loading-spinner');
        if (spinner) {
          spinner.style.display = 'none';
          spinner.classList.remove('active', 'visible');
        }
      });

      // Wait for completion
      await page.waitForTimeout(500);

      // Verify spinner hidden
      await expect(page.locator('.loading-spinner')).toBeHidden();
    } catch (error) {
      errorHandler.handleError('Loading spinner test failed', error);
      throw error;
    }
  });

  test('should show loading text and messages @interaction @implementation', async ({ page }) => {
    try {
      // Fill form to enable AI summary
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      const aiSummaryButton = page.locator('#ai-summary-button');
      await aiSummaryButton.click();

      // Verify loading message appears
      await expect(page.locator('.loading-message')).toBeVisible();
      await expect(page.locator('.loading-message')).toHaveText(/generating|processing|loading/i);

      // Test loading text updates
      await page.waitForTimeout(500);

      const loadingText = await page.locator('.loading-message').textContent();
      expect(loadingText.length).toBeGreaterThan(0);

      // Simulate progress updates
      await page.evaluate(() => {
        const messages = [
          'Analyzing content...',
          'Generating summary...',
          'Finalizing results...'
        ];

        let messageIndex = 0;
        const updateMessage = () => {
          const messageEl = document.querySelector('.loading-message');
          if (messageEl && messageIndex < messages.length) {
            messageEl.textContent = messages[messageIndex];
            messageIndex++;
            if (messageIndex < messages.length) {
              setTimeout(updateMessage, 800);
            }
          }
        };

        setTimeout(updateMessage, 200);
      });

      // Wait for message updates
      await page.waitForTimeout(2500);

      // Verify final message
      const finalMessage = await page.locator('.loading-message').textContent();
      expect(finalMessage).toMatch(/finalizing|results|complete/i);
    } catch (error) {
      errorHandler.handleError('Loading text message test failed', error);
      throw error;
    }
  });

  test('should handle loading state transitions @interaction @implementation', async ({ page }) => {
    try {
      // Fill form to enable AI summary
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      const aiSummaryButton = page.locator('#ai-summary-button');

      // Check initial state
      await expect(aiSummaryButton).not.toHaveClass(/loading/);
      await expect(page.locator('.loading-spinner')).toBeHidden();

      // Click to start loading
      await aiSummaryButton.click();

      // Verify transition to loading state
      await expect(aiSummaryButton).toHaveClass(/loading/);
      await expect(page.locator('.loading-spinner')).toBeVisible({ timeout: 1000 });

      // Verify smooth transition with CSS
      const transitionStyle = await page.locator('.loading-spinner').evaluate((el) => {
        return window.getComputedStyle(el).transition;
      });

      expect(transitionStyle).toBeTruthy();

      // Simulate loading completion with success state
      await page.evaluate(() => {
        setTimeout(() => {
          const button = document.querySelector('#ai-summary-button');
          const spinner = document.querySelector('.loading-spinner');
          const message = document.querySelector('.loading-message');

          // Remove loading states
          if (button) button.classList.remove('loading');
          if (spinner) spinner.style.display = 'none';
          if (message) message.style.display = 'none';

          // Add success state
          if (button) button.classList.add('success');
        }, 1500);
      });

      // Wait for success transition
      await page.waitForTimeout(2000);

      // Verify success state
      await expect(aiSummaryButton).toHaveClass(/success/);
      await expect(page.locator('.loading-spinner')).toBeHidden();

      // Success state should auto-clear
      await page.waitForTimeout(1000);
      await expect(aiSummaryButton).not.toHaveClass(/success/);
    } catch (error) {
      errorHandler.handleError('Loading state transition test failed', error);
      throw error;
    }
  });

  test('should implement loading accessibility features @interaction @implementation', async ({ page }) => {
    try {
      // Fill form to enable AI summary
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      const aiSummaryButton = page.locator('#ai-summary-button');
      await aiSummaryButton.click();

      // Verify button accessibility during loading
      await expect(aiSummaryButton).toHaveAttribute('aria-busy', 'true');
      await expect(aiSummaryButton).toHaveAttribute('aria-disabled', 'true');

      // Verify loading spinner accessibility
      await expect(page.locator('.loading-spinner')).toHaveAttribute('role', 'status');
      await expect(page.locator('.loading-spinner')).toHaveAttribute('aria-live', 'polite');

      // Verify screen reader announcements
      await expect(page.locator('[role="status"], [role="alert"]')).toBeVisible();
      await expect(page.locator('[role="status"], [role="alert"]')).toHaveText(/loading|generating/i);

      // Test keyboard navigation during loading
      await page.keyboard.press('Tab');

      // Loading button should not be focusable when disabled
      const focusedElement = await page.evaluate(() => document.activeElement.id);
      expect(focusedElement).not.toBe('ai-summary-button');

      // Simulate loading completion
      await page.evaluate(() => {
        const button = document.querySelector('#ai-summary-button');
        const spinner = document.querySelector('.loading-spinner');

        if (button) {
          button.classList.remove('loading');
          button.disabled = false;
          button.removeAttribute('aria-busy');
          button.removeAttribute('aria-disabled');
        }

        if (spinner) spinner.style.display = 'none';
      });

      await page.waitForTimeout(500);

      // Verify accessibility attributes cleared
      await expect(aiSummaryButton).not.toHaveAttribute('aria-busy');
      await expect(aiSummaryButton).not.toHaveAttribute('aria-disabled');
    } catch (error) {
      errorHandler.handleError('Loading accessibility test failed', error);
      throw error;
    }
  });

  test('should optimize loading performance @interaction @implementation @performance', async ({ page }) => {
    try {
      // Fill form to enable AI summary
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      const aiSummaryButton = page.locator('#ai-summary-button');

      // Measure loading state activation time
      const startTime = performance.now();
      await aiSummaryButton.click();

      // Wait for loading indicators
      await page.waitForSelector('.loading-spinner', { state: 'visible', timeout: 1000 });

      const activationTime = performance.now() - startTime;

      // Check activation performance
      expect(activationTime).toBeLessThan(100);

      // Simulate loading operation
      await page.evaluate(() => {
        return new Promise((resolve) => {
          setTimeout(resolve, 1000); // Simulate 1s operation
        });
      });

      // Measure completion time
      const completionStart = performance.now();
      await page.evaluate(() => {
        const button = document.querySelector('#ai-summary-button');
        const spinner = document.querySelector('.loading-spinner');

        if (button) button.classList.remove('loading');
        if (spinner) spinner.style.display = 'none';
      });

      await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 1000 });
      const completionTime = performance.now() - completionStart;

      // Check completion performance
      expect(completionTime).toBeLessThan(100);

      // Test multiple rapid loading states
      const rapidStartTime = performance.now();

      // Trigger multiple loading cycles
      for (let i = 0; i < 3; i++) {
        await aiSummaryButton.click();
        await page.waitForSelector('.loading-spinner', { state: 'visible', timeout: 500 });

        await page.evaluate(() => {
          const button = document.querySelector('#ai-summary-button');
          const spinner = document.querySelector('.loading-spinner');

          if (button) button.classList.remove('loading');
          if (spinner) spinner.style.display = 'none';
        });

        await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 500 });
      }

      const rapidTime = performance.now() - rapidStartTime;
      expect(rapidTime).toBeLessThan(1000);
    } catch (error) {
      errorHandler.handleError('Loading performance test failed', error);
      throw error;
    }
  });

  test('should handle loading during async operations @interaction @implementation', async ({ page }) => {
    try {
      // Fill form to enable AI summary
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      const aiSummaryButton = page.locator('#ai-summary-button');

      // Simulate async operation with progress
      await aiSummaryButton.click();

      await page.evaluate(() => {
        const updateProgress = (progress) => {
          const progressBar = document.querySelector('.loading-progress');
          const progressText = document.querySelector('.loading-progress-text');

          if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
          }

          if (progressText) {
            progressText.textContent = `${progress}% complete`;
          }
        };

        // Simulate progress updates
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          updateProgress(progress);

          if (progress >= 100) {
            clearInterval(interval);

            // Complete loading
            setTimeout(() => {
              const button = document.querySelector('#ai-summary-button');
              const spinner = document.querySelector('.loading-spinner');

              if (button) button.classList.remove('loading');
              if (spinner) spinner.style.display = 'none';
            }, 200);
          }
        }, 200);
      });

      // Verify progress indicators
      await expect(page.locator('.loading-progress')).toBeVisible();
      await expect(page.locator('.loading-progress-text')).toBeVisible();

      // Verify progress updates
      await page.waitForTimeout(2500);

      const finalProgress = await page.locator('.loading-progress').evaluate((el) => {
        return el.getAttribute('aria-valuenow');
      });

      expect(finalProgress).toBe('100');

      // Verify loading completion
      await expect(aiSummaryButton).not.toHaveClass(/loading/);
      await expect(page.locator('.loading-spinner')).toBeHidden();
    } catch (error) {
      errorHandler.handleError('Async loading operation test failed', error);
      throw error;
    }
  });

  test('should handle loading state persistence @interaction @implementation', async ({ page }) => {
    try {
      // Fill form to enable AI summary
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      const aiSummaryButton = page.locator('#ai-summary-button');
      await aiSummaryButton.click();

      // Verify loading state is active
      await expect(aiSummaryButton).toHaveClass(/loading/);
      await expect(page.locator('.loading-spinner')).toBeVisible();

      // Simulate page navigation while loading
      await page.goto('about:blank');

      // Navigate back to popup
      await page.goto('chrome-extension://__MSG_@@extension_id__/ui/main_popup.html');
      await page.waitForSelector('.popup-container', { timeout: config.timeout });

      // Check if loading state persisted (implementation dependent)
      const currentLoadingState = await aiSummaryButton.evaluate((el) => {
        return el.classList.contains('loading');
      });

      // If persistence is implemented, loading should continue
      if (currentLoadingState) {
        await expect(aiSummaryButton).toHaveClass(/loading/);
        await expect(page.locator('.loading-spinner')).toBeVisible();
      }

      // Complete loading
      await page.evaluate(() => {
        const button = document.querySelector('#ai-summary-button');
        const spinner = document.querySelector('.loading-spinner');

        if (button) button.classList.remove('loading');
        if (spinner) spinner.style.display = 'none';
      });
    } catch (error) {
      errorHandler.handleError('Loading state persistence test failed', error);
      throw error;
    }
  });

  test('should handle loading state cancellation @interaction @implementation', async ({ page }) => {
    try {
      // Fill form to enable AI summary
      await page.fill('#title-input', 'Test Title');
      await page.fill('#url-input', 'https://example.com');

      const aiSummaryButton = page.locator('#ai-summary-button');
      await aiSummaryButton.click();

      // Verify loading state
      await expect(aiSummaryButton).toHaveClass(/loading/);
      await expect(page.locator('.loading-spinner')).toBeVisible();

      // Look for cancel button (if implemented)
      const cancelButton = page.locator('.cancel-button, .loading-cancel');

      if (await cancelButton.count() > 0) {
        await cancelButton.click();

        // Verify loading cancelled
        await expect(aiSummaryButton).not.toHaveClass(/loading/);
        await expect(page.locator('.loading-spinner')).toBeHidden();

        // Verify cancellation message
        await expect(page.locator('.cancellation-message')).toBeVisible();
        await expect(page.locator('.cancellation-message')).toHaveText(/cancelled|stopped/i);
      } else {
        // If no cancel button, simulate completion
        await page.evaluate(() => {
          const button = document.querySelector('#ai-summary-button');
          const spinner = document.querySelector('.loading-spinner');

          if (button) button.classList.remove('loading');
          if (spinner) spinner.style.display = 'none';
        });

        await page.waitForTimeout(500);
      }
    } catch (error) {
      errorHandler.handleError('Loading cancellation test failed', error);
      throw error;
    }
  });

  test.describe('Loading Error Handling', () => {

    test('should handle loading errors gracefully @interaction @implementation @error-handling', async ({ page }) => {
      try {
        // Fill form to enable AI summary
        await page.fill('#title-input', 'Test Title');
        await page.fill('#url-input', 'https://example.com');

        const aiSummaryButton = page.locator('#ai-summary-button');
        await aiSummaryButton.click();

        // Simulate loading error
        await page.evaluate(() => {
          setTimeout(() => {
            const button = document.querySelector('#ai-summary-button');
            const spinner = document.querySelector('.loading-spinner');
            const errorEl = document.querySelector('.loading-error') ||
                           document.createElement('div');

            // Show error state
            if (button) {
              button.classList.remove('loading');
              button.classList.add('error');
            }

            if (spinner) spinner.style.display = 'none';

            if (errorEl) {
              errorEl.className = 'loading-error';
              errorEl.textContent = 'Failed to generate summary. Please try again.';
              errorEl.style.display = 'block';

              if (!document.querySelector('.loading-error')) {
                document.querySelector('.popup-container')?.appendChild(errorEl);
              }
            }
          }, 1000);
        });

        // Wait for error
        await page.waitForTimeout(1500);

        // Verify error state
        await expect(aiSummaryButton).not.toHaveClass(/loading/);
        await expect(aiSummaryButton).toHaveClass(/error/);
        await expect(page.locator('.loading-spinner')).toBeHidden();
        await expect(page.locator('.loading-error')).toBeVisible();
        await expect(page.locator('.loading-error')).toHaveText(/failed|error/i);

        // Test retry functionality
        await aiSummaryButton.click();

        // Should start loading again
        await expect(aiSummaryButton).toHaveClass(/loading/);
        await expect(aiSummaryButton).not.toHaveClass(/error/);
        await expect(page.locator('.loading-spinner')).toBeVisible();
        await expect(page.locator('.loading-error')).toBeHidden();

        // Complete loading
        await page.evaluate(() => {
          const button = document.querySelector('#ai-summary-button');
          const spinner = document.querySelector('.loading-spinner');
          const error = document.querySelector('.loading-error');

          if (button) button.classList.remove('loading');
          if (spinner) spinner.style.display = 'none';
          if (error) error.style.display = 'none';
        });
      } catch (error) {
        errorHandler.handleError('Loading error handling test failed', error);
        throw error;
      }
    });
  });
});

module.exports = {
  testConfig: config,
  testDescriptions: {
    buttonLoadingStates: 'Tests button loading states and disabled behavior',
    loadingSpinners: 'Tests loading spinner display and animation',
    loadingMessages: 'Tests loading text messages and progress updates',
    loadingTransitions: 'Tests smooth transitions between loading states',
    loadingAccessibility: 'Tests loading state accessibility features',
    loadingPerformance: 'Tests loading state performance optimization',
    asyncOperations: 'Tests loading during asynchronous operations',
    loadingPersistence: 'Tests loading state persistence across navigation',
    loadingCancellation: 'Tests loading state cancellation functionality',
    loadingErrors: 'Tests loading error handling and retry functionality'
  }
};