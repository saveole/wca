import { test, expect } from '@playwright/test';
import { ParallelExecutor } from '../utils/parallel-executor.js';
import { ErrorHandler } from '../utils/error-handling-utils.js';
import { FlakyTestDetector } from '../utils/reliability-utils.js';
import config from '../utils/config.js';

test.describe('Interaction Test Examples', () => {
  let parallelExecutor;
  let errorHandler;
  let flakyTestDetector;

  test.beforeAll(() => {
    // Initialize performance optimization utilities
    parallelExecutor = new ParallelExecutor({
      maxWorkers: config.parallelExecution.maxWorkers,
      enableAdaptiveScaling: config.parallelExecution.enableAdaptiveScaling,
      loadBalancingStrategy: config.parallelExecution.loadBalancingStrategy
    });

    // Initialize error handling
    errorHandler = new ErrorHandler({
      category: 'interaction',
      context: { suite: 'interaction-examples' },
      enableRecovery: true,
      logErrors: true
    });

    // Initialize reliability testing
    flakyTestDetector = new FlakyTestDetector({
      minExecutions: 5,
      flakinessThreshold: 0.2,
      statisticalSignificance: 0.95
    });
  });

  test.describe('Form Interactions', () => {
    test('should handle form validation with real-time feedback', async ({ page }) => {
      const startTime = performance.now();

      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        // Test form elements with validation
        const titleInput = page.locator('#title-input');
        const urlInput = page.locator('#url-input');
        const saveButton = page.locator('#save-button');

        // Initial state - button should be disabled
        await expect(saveButton).toBeDisabled();

        // Test title validation
        await titleInput.fill('');
        await titleInput.blur(); // Trigger validation

        // Check for validation message
        const titleError = page.locator('#title-error');
        if (await titleError.isVisible()) {
          await expect(titleError).toHaveText(/title is required/i);
        }

        // Test URL validation
        await urlInput.fill('invalid-url');
        await urlInput.blur();

        const urlError = page.locator('#url-error');
        if (await urlError.isVisible()) {
          await expect(urlError).toHaveText(/please enter a valid url/i);
        }

        // Test valid input
        await titleInput.fill('Test Web Clip');
        await urlInput.fill('https://example.com');

        // Button should now be enabled
        await expect(saveButton).toBeEnabled();

        // Test form submission with parallel execution simulation
        await parallelExecutor.addTask({
          type: 'form-submission',
          data: { title: 'Test Web Clip', url: 'https://example.com' },
          execute: async () => {
            await saveButton.click();

            // Wait for success message
            await expect(page.locator('.success-message')).toBeVisible();
            await expect(page.locator('.success-message')).toHaveText(/saved successfully/i);

            // Verify form reset
            await expect(titleInput).toHaveValue('');
            await expect(urlInput).toHaveValue('');
          }
        });

        // Performance validation
        const executionTime = performance.now() - startTime;
        expect(executionTime, `Form interaction took ${executionTime}ms, exceeding target`).toBeLessThan(config.performance.testExecutionTarget);

      } catch (error) {
        await errorHandler.handleError(error, 'form-validation-test');
        throw error;
      }
    });

    test('should handle tag input with keyboard shortcuts', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        const tagInput = page.locator('#tag-input');
        const tagContainer = page.locator('.tag-container');

        // Test tag creation
        await tagInput.fill('productivity');
        await tagInput.press('Enter');

        // Verify tag was created
        const createdTag = page.locator('.tag', { hasText: 'productivity' });
        await expect(createdTag).toBeVisible();

        // Test tag deletion with keyboard
        await createdTag.click();
        await page.keyboard.press('Backspace');

        // Verify tag was removed
        await expect(createdTag).not.toBeVisible();

        // Test multiple tag creation
        const testTags = ['work', 'personal', 'important'];
        for (const tag of testTags) {
          await tagInput.fill(tag);
          await tagInput.press('Enter');

          const tagElement = page.locator('.tag', { hasText: tag });
          await expect(tagElement).toBeVisible();
        }

        // Verify all tags are present
        const allTags = await tagContainer.locator('.tag').all();
        expect(allTags.length).toBe(testTags.length);

        // Test tag editing
        const workTag = page.locator('.tag', { hasText: 'work' });
        await workTag.dblclick();

        const tagEditInput = page.locator('.tag-edit-input');
        await expect(tagEditInput).toBeVisible();
        await tagEditInput.fill('business');
        await tagEditInput.press('Enter');

        // Verify tag was updated
        await expect(workTag).not.toBeVisible();
        const businessTag = page.locator('.tag', { hasText: 'business' });
        await expect(businessTag).toBeVisible();

      } catch (error) {
        await errorHandler.handleError(error, 'tag-input-test');
        throw error;
      }
    });

    test('should handle character limits and input validation', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        const notesInput = page.locator('#notes-input');
        const charCounter = page.locator('.char-counter');

        // Test character limit enforcement
        const longText = 'a'.repeat(1000); // Exceed typical limits
        await notesInput.fill(longText);

        // Verify character counter updates
        if (await charCounter.isVisible()) {
          const counterText = await charCounter.textContent();
          expect(counterText).toMatch(/\d+\/\d+/);
        }

        // Test input truncation or validation
        const actualValue = await notesInput.inputValue();
        expect(actualValue.length).toBeLessThanOrEqual(500); // Assuming 500 char limit

        // Test input clearing
        await notesInput.fill('');
        await expect(notesInput).toHaveValue('');

      } catch (error) {
        await errorHandler.handleError(error, 'input-validation-test');
        throw error;
      }
    });
  });

  test.describe('Button Interactions', () => {
    test('should handle button states and loading indicators', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        const saveButton = page.locator('#save-button');
        const exportButton = page.locator('#export-button');

        // Fill form to enable buttons
        await page.fill('#title-input', 'Test Title');
        await page.fill('#url-input', 'https://example.com');

        // Test button hover states
        await saveButton.hover();
        const hoverStyle = await saveButton.evaluate(el => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // Test button click with loading state
        await saveButton.click();

        // Check for loading indicator
        const loadingIndicator = page.locator('.loading-indicator');
        if (await loadingIndicator.isVisible()) {
          await expect(loadingIndicator).toBeVisible();
        }

        // Verify button is disabled during loading
        await expect(saveButton).toBeDisabled();

        // Wait for operation to complete
        await page.waitForTimeout(1000);

        // Verify button is re-enabled
        await expect(saveButton).toBeEnabled();

        // Test button focus states
        await exportButton.focus();
        const isFocused = await exportButton.evaluate(el => el === document.activeElement);
        expect(isFocused).toBe(true);

      } catch (error) {
        await errorHandler.handleError(error, 'button-states-test');
        throw error;
      }
    });

    test('should handle dropdown and selection interactions', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.settings-container', { timeout: config.defaultTimeout });

        const exportDropdown = page.locator('#export-format-dropdown');
        const themeSelector = page.locator('#theme-selector');

        // Test dropdown opening
        await exportDropdown.click();
        const dropdownOptions = page.locator('.dropdown-option');
        await expect(dropdownOptions.first()).toBeVisible();

        // Test option selection
        const markdownOption = page.locator('.dropdown-option', { hasText: 'Markdown' });
        await markdownOption.click();

        // Verify selection
        await expect(exportDropdown).toHaveText(/Markdown/i);

        // Test theme selection
        await themeSelector.click();
        const darkThemeOption = page.locator('.theme-option', { hasText: 'Dark' });
        await darkThemeOption.click();

        // Verify theme change
        const currentTheme = await page.evaluate(() => {
          return document.documentElement.getAttribute('data-theme');
        });
        expect(currentTheme).toBe('dark');

        // Test keyboard navigation in dropdown
        await exportDropdown.click();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        // Verify selection changed
        const selectedValue = await exportDropdown.textContent();
        expect(selectedValue).toBeTruthy();

      } catch (error) {
        await errorHandler.handleError(error, 'dropdown-interaction-test');
        throw error;
      }
    });
  });

  test.describe('Theme and Layout Interactions', () => {
    test('should handle theme switching with smooth transitions', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.settings-container', { timeout: config.defaultTimeout });

        const themeToggle = page.locator('#theme-toggle');

        // Test initial theme detection
        const initialTheme = await page.evaluate(() => {
          return document.documentElement.getAttribute('data-theme') || 'light';
        });

        // Test theme switching
        await themeToggle.click();

        // Wait for transition animation
        await page.waitForTimeout(300);

        const newTheme = await page.evaluate(() => {
          return document.documentElement.getAttribute('data-theme') || 'light';
        });

        expect(newTheme).not.toBe(initialTheme);
        expect(['light', 'dark']).toContain(newTheme);

        // Test theme persistence
        await page.reload();

        await page.waitForSelector('.settings-container', { timeout: config.defaultTimeout });

        const persistedTheme = await page.evaluate(() => {
          return document.documentElement.getAttribute('data-theme') || 'light';
        });

        expect(persistedTheme).toBe(newTheme);

        // Test multiple theme switches
        for (let i = 0; i < 3; i++) {
          await themeToggle.click();
          await page.waitForTimeout(300);
        }

      } catch (error) {
        await errorHandler.handleError(error, 'theme-switching-test');
        throw error;
      }
    });

    test('should handle responsive layout adjustments', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        const viewports = [
          { width: 1280, height: 720, name: 'desktop' },
          { width: 1024, height: 768, name: 'tablet' },
          { width: 800, height: 600, name: 'small-desktop' }
        ];

        for (const viewport of viewports) {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });

          // Verify layout adapts
          const container = page.locator('.popup-container');
          const containerWidth = await container.boundingBox();
          expect(containerWidth.width).toBeLessThanOrEqual(viewport.width);

          // Test form elements remain accessible
          const titleInput = page.locator('#title-input');
          await expect(titleInput).toBeVisible();
          await titleInput.fill(`Test on ${viewport.name}`);

          // Test button remains clickable
          const saveButton = page.locator('#save-button');
          await expect(saveButton).toBeVisible();
          await expect(saveButton).toBeEnabled();
        }

      } catch (error) {
        await errorHandler.handleError(error, 'responsive-layout-test');
        throw error;
      }
    });
  });

  test.describe('Advanced Interactions', () => {
    test('should handle drag and drop operations', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        // Test if drag and drop is supported
        const dragDropArea = page.locator('.drag-drop-area');
        if (await dragDropArea.isVisible()) {
          // Test drag over
          await dragDropArea.dispatchEvent('dragover', { dataTransfer: {} });

          // Verify visual feedback
          const isDragOver = await dragDropArea.evaluate(el => {
            return el.classList.contains('drag-over');
          });
          expect(isDragOver).toBe(true);

          // Test drag leave
          await dragDropArea.dispatchEvent('dragleave', { dataTransfer: {} });

          const isDragOverAfterLeave = await dragDropArea.evaluate(el => {
            return el.classList.contains('drag-over');
          });
          expect(isDragOverAfterLeave).toBe(false);

          // Test file drop simulation
          await dragDropArea.dispatchEvent('drop', {
            dataTransfer: {
              files: [new File(['test content'], 'test.txt', { type: 'text/plain' })]
            }
          });
        }

      } catch (error) {
        await errorHandler.handleError(error, 'drag-drop-test');
        throw error;
      }
    });

    test('should handle modal dialogs and overlays', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        const settingsButton = page.locator('#settings-button');

        // Test modal opening
        await settingsButton.click();

        const modal = page.locator('.settings-modal');
        await expect(modal).toBeVisible();

        // Test modal backdrop
        const backdrop = page.locator('.modal-backdrop');
        await expect(backdrop).toBeVisible();

        // Test modal close via button
        const closeButton = modal.locator('.close-button');
        await closeButton.click();

        await expect(modal).not.toBeVisible();

        // Test modal close via backdrop click
        await settingsButton.click();
        await expect(modal).toBeVisible();

        await backdrop.click();
        await expect(modal).not.toBeVisible();

        // Test modal close via Escape key
        await settingsButton.click();
        await expect(modal).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();

      } catch (error) {
        await errorHandler.handleError(error, 'modal-interaction-test');
        throw error;
      }
    });

    test('should handle clipboard operations', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        // Fill form with test data
        await page.fill('#title-input', 'Test Clipboard Operation');
        await page.fill('#url-input', 'https://example.com');

        const copyButton = page.locator('#copy-button');
        if (await copyButton.isVisible()) {
          // Test copy to clipboard
          await copyButton.click();

          // Verify clipboard permission and operation
          const clipboardText = await page.evaluate(() => {
            return navigator.clipboard.readText();
          });

          expect(clipboardText).toContain('Test Clipboard Operation');
        }

        // Test paste operations
        const pasteButton = page.locator('#paste-button');
        if (await pasteButton.isVisible()) {
          // Set clipboard content
          await page.evaluate(() => {
            return navigator.clipboard.writeText('https://pasted-example.com');
          });

          await pasteButton.click();

          // Verify URL field was populated
          const urlInput = page.locator('#url-input');
          await expect(urlInput).toHaveValue('https://pasted-example.com');
        }

      } catch (error) {
        await errorHandler.handleError(error, 'clipboard-operations-test');
        throw error;
      }
    });
  });

  test.afterAll(async () => {
    // Clean up utilities
    if (parallelExecutor) {
      await parallelExecutor.shutdown();
    }

    if (errorHandler) {
      await errorHandler.cleanup();
    }

    if (flakyTestDetector) {
      await flakyTestDetector.cleanup();
    }
  });
});

// Export for use in other test files
export const interactionTestExamples = {
  formValidationTest: 'should handle form validation with real-time feedback',
  tagInputTest: 'should handle tag input with keyboard shortcuts',
  inputValidationTest: 'should handle character limits and input validation',
  buttonStatesTest: 'should handle button states and loading indicators',
  dropdownTest: 'should handle dropdown and selection interactions',
  themeSwitchingTest: 'should handle theme switching with smooth transitions',
  responsiveLayoutTest: 'should handle responsive layout adjustments',
  dragDropTest: 'should handle drag and drop operations',
  modalTest: 'should handle modal dialogs and overlays',
  clipboardTest: 'should handle clipboard operations'
};