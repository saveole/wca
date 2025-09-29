/**
 * Settings Page Visual Regression Test Implementation
 *
 * Implements visual regression testing for Chrome extension settings page
 * with screenshot capture, baseline comparison, and comprehensive validation.
 */

import { test, expect } from '@playwright/test';
import { VisualBaseline } from '../../models/VisualBaseline.js';
import { TestConfiguration } from '../../models/test-configuration.js';
import { ScreenshotUtils } from '../../utils/screenshot-utils.js';
import { ErrorHandler } from '../../utils/error-handler.js';

test.describe('Settings Page Visual Regression Tests', () => {
  let testConfig;
  let screenshotUtils;
  let baselineManager;

  test.beforeAll(async () => {
    testConfig = new TestConfiguration({
      viewport: { width: 800, height: 600 },
      theme: 'light',
      screenshot: {
        enabled: true,
        threshold: 0.1,
        fullPage: true
      },
      timeout: {
        default: 8000,
        screenshot: 5000
      }
    });

    baselineManager = new VisualBaseline({
      component: 'settings',
      viewport: '800x600',
      theme: 'light'
    });

    screenshotUtils = new ScreenshotUtils(testConfig.screenshot);
  });

  test.describe('Initial Settings Page Rendering', () => {
    test('should capture settings page initial state screenshot @visual', async ({ page }) => {
      try {
        // Navigate to extension settings
        await page.goto('http://localhost:8080/ui/settings.html');

        // Wait for settings page to load
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Capture full page screenshot
        const screenshotPath = await screenshotUtils.captureFullPage(
          page,
          'settings-initial-state'
        );

        // Compare with baseline
        const comparison = await baselineManager.compareWith(screenshotPath);

        // Assert visual match
        expect(comparison.matches, `Visual difference detected: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Difference ${comparison.difference} exceeds threshold 0.05`).toBeLessThan(0.05);

        // Log performance metrics
        test.info().annotations.push({
          type: 'performance',
          description: `Screenshot capture time: ${comparison.captureTime}ms`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-initial-screenshot',
          component: 'settings-visual'
        });

        test.fail(`Failed to capture initial settings screenshot: ${handledError.message}`);
      }
    });

    test('should validate all settings sections are visible @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const sections = {
          apiConfiguration: '.api-config-section',
          notionIntegration: '.notion-integration-section',
          themeSettings: '.theme-settings-section',
          advancedSettings: '.advanced-settings-section'
        };

        // Validate each section is visible
        const sectionResults = {};

        for (const [sectionName, selector] of Object.entries(sections)) {
          const section = await page.$(selector);
          const isVisible = section ? await section.isVisible() : false;
          const boundingBox = section ? await section.boundingBox() : null;

          sectionResults[sectionName] = {
            visible: isVisible,
            boundingBox: boundingBox,
            selector: selector
          };

          expect(isVisible, `${sectionName} section should be visible`).toBe(true);
          expect(boundingBox, `${sectionName} section should have bounding box`).not.toBeNull();
        }

        // Log section positions for debugging
        test.info().annotations.push({
          type: 'section-positions',
          description: JSON.stringify(sectionResults, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-section-visibility',
          component: 'settings-visual'
        });

        test.fail(`Failed to validate settings sections: ${handledError.message}`);
      }
    });

    test('should validate form field consistency @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const fieldTypes = {
          textInputs: ['input[type="text"]', 'input[type="url"]', 'textarea'],
          selectFields: 'select',
          checkboxes: 'input[type="checkbox"]',
          buttons: 'button'
        };

        const formResults = {};

        for (const [fieldType, selectors] of Object.entries(fieldTypes)) {
          const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
          const fieldCount = {};

          for (const selector of selectorArray) {
            const elements = await page.$$(selector);
            const visibleElements = [];

            for (const element of elements) {
              const isVisible = await element.isVisible();
              if (isVisible) {
                const boundingBox = await element.boundingBox();
                visibleElements.push({
                  selector: selector,
                  boundingBox: boundingBox
                });
              }
            }

            fieldCount[selector] = visibleElements.length;
          }

          formResults[fieldType] = fieldCount;
        }

        // Validate form field presence
        expect(formResults.textInputs['input[type="text"]'], 'Text inputs should be present').toBeGreaterThan(0);
        expect(formResults.selectFields['select'], 'Select fields should be present').toBeGreaterThan(0);
        expect(formResults.checkboxes['input[type="checkbox"]'], 'Checkboxes should be present').toBeGreaterThan(0);
        expect(formResults.buttons['button'], 'Buttons should be present').toBeGreaterThan(0);

        // Log form field details
        test.info().annotations.push({
          type: 'form-field-details',
          description: JSON.stringify(formResults, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-form-consistency',
          component: 'settings-visual'
        });

        test.fail(`Failed to validate form field consistency: ${handledError.message}`);
      }
    });
  });

  test.describe('API Configuration Section', () => {
    test('should capture API configuration section screenshot @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const apiBaseline = new VisualBaseline({
          component: 'settings-api',
          viewport: '800x600',
          theme: 'light'
        });

        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.api-config-section',
          'api-config-section'
        );

        const comparison = await apiBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `API section visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `API section difference ${comparison.difference} exceeds threshold`).toBeLessThan(0.05);

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-api-section',
          component: 'settings-visual'
        });

        test.fail(`Failed to capture API configuration screenshot: ${handledError.message}`);
      }
    });

    test('should validate API provider dropdown states @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const dropdownSelector = '#api-provider-select';
        const dropdown = await page.$(dropdownSelector);

        expect(dropdown, 'API provider dropdown should exist').not.toBeNull();

        const isVisible = await dropdown.isVisible();
        const isEnabled = await dropdown.isEnabled();
        const isRequired = await dropdown.getAttribute('required');

        expect(isVisible, 'API provider dropdown should be visible').toBe(true);
        expect(isEnabled, 'API provider dropdown should be enabled').toBe(true);
        expect(isRequired, 'API provider dropdown should be required').toBe('');

        // Get available options
        const options = await dropdown.$$eval('option', options =>
          options.map(option => option.textContent)
        );

        expect(options, 'OpenAI should be available').toContain('OpenAI');
        expect(options, 'Anthropic should be available').toContain('Anthropic');
        expect(options, 'Custom should be available').toContain('Custom');

        // Log dropdown state
        test.info().annotations.push({
          type: 'dropdown-state',
          description: JSON.stringify({
            visible: isVisible,
            enabled: isEnabled,
            required: !!isRequired,
            options: options
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-api-dropdown',
          component: 'settings-visual'
        });

        test.fail(`Failed to validate API provider dropdown: ${handledError.message}`);
      }
    });

    test('should validate conditional field display @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Test custom API endpoint field appears when Custom is selected
        await page.selectOption('#api-provider-select', 'Custom');

        // Wait for conditional field to appear
        await page.waitForSelector('#custom-endpoint-input', { state: 'visible', timeout: 2000 });

        const customEndpointField = await page.$('#custom-endpoint-input');
        expect(customEndpointField, 'Custom endpoint field should exist').not.toBeNull();

        const isVisible = await customEndpointField.isVisible();
        const boundingBox = await customEndpointField.boundingBox();

        expect(isVisible, 'Custom endpoint field should be visible').toBe(true);
        expect(boundingBox, 'Custom endpoint field should have bounding box').not.toBeNull();

        // Log conditional field state
        test.info().annotations.push({
          type: 'conditional-field',
          description: JSON.stringify({
            visible: isVisible,
            boundingBox: boundingBox
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-conditional-field',
          component: 'settings-visual'
        });

        test.fail(`Failed to validate conditional field display: ${handledError.message}`);
      }
    });
  });

  test.describe('Notion Integration Section', () => {
    test('should capture Notion integration section screenshot @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const notionBaseline = new VisualBaseline({
          component: 'settings-notion',
          viewport: '800x600',
          theme: 'light'
        });

        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.notion-integration-section',
          'notion-integration-section'
        );

        const comparison = await notionBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `Notion section visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Notion section difference ${comparison.difference} exceeds threshold`).toBeLessThan(0.05);

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-notion-section',
          component: 'settings-visual'
        });

        test.fail(`Failed to capture Notion integration screenshot: ${handledError.message}`);
      }
    });

    test('should validate connection test button states @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const testButton = await page.$('.test-connection-btn');
        expect(testButton, 'Test connection button should exist').not.toBeNull();

        const isVisible = await testButton.isVisible();
        const isEnabled = await testButton.isEnabled();
        const boundingBox = await testButton.boundingBox();

        expect(isVisible, 'Test connection button should be visible').toBe(true);
        expect(isEnabled, 'Test connection button should be enabled').toBe(true);
        expect(boundingBox, 'Test connection button should have bounding box').not.toBeNull();

        // Validate button styling
        const backgroundColor = await testButton.evaluate(el => {
          return window.getComputedStyle(el).backgroundColor;
        });

        expect(backgroundColor, 'Button should have valid background color').toMatch(/^rgb\(\d+, \d+, \d+\)$/);

        // Log button state
        test.info().annotations.push({
          type: 'button-state',
          description: JSON.stringify({
            visible: isVisible,
            enabled: isEnabled,
            boundingBox: boundingBox,
            backgroundColor: backgroundColor
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-connection-button',
          component: 'settings-visual'
        });

        test.fail(`Failed to validate connection test button: ${handledError.message}`);
      }
    });

    test('should validate field mapping table display @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const mappingTable = await page.$('.field-mapping-table');
        expect(mappingTable, 'Field mapping table should exist').not.toBeNull();

        const isVisible = await mappingTable.isVisible();
        expect(isVisible, 'Field mapping table should be visible').toBe(true);

        // Validate table structure
        const headers = await mappingTable.$$eval('th', headers =>
          headers.map(header => header.textContent)
        );

        const rows = await mappingTable.$$('tbody tr');

        expect(headers.length, 'Table should have headers').toBeGreaterThan(0);
        expect(rows.length, 'Table should have rows').toBeGreaterThan(0);

        // Log table structure
        test.info().annotations.push({
          type: 'table-structure',
          description: JSON.stringify({
            headers: headers,
            rowCount: rows.length,
            visible: isVisible
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-field-mapping',
          component: 'settings-visual'
        });

        test.fail(`Failed to validate field mapping table: ${handledError.message}`);
      }
    });
  });

  test.describe('Theme Settings Section', () => {
    test('should capture theme settings section screenshot @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const themeBaseline = new VisualBaseline({
          component: 'settings-theme',
          viewport: '800x600',
          theme: 'light'
        });

        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.theme-settings-section',
          'theme-settings-section'
        );

        const comparison = await themeBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `Theme section visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Theme section difference ${comparison.difference} exceeds threshold`).toBeLessThan(0.05);

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-theme-section',
          component: 'settings-visual'
        });

        test.fail(`Failed to capture theme settings screenshot: ${handledError.message}`);
      }
    });

    test('should validate theme toggle functionality @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const themeToggle = await page.$('.theme-toggle');
        expect(themeToggle, 'Theme toggle should exist').not.toBeNull();

        const isVisible = await themeToggle.isVisible();
        const isEnabled = await themeToggle.isEnabled();
        const boundingBox = await themeToggle.boundingBox();

        expect(isVisible, 'Theme toggle should be visible').toBe(true);
        expect(isEnabled, 'Theme toggle should be enabled').toBe(true);
        expect(boundingBox, 'Theme toggle should have bounding box').not.toBeNull();

        // Get initial state
        const initialState = await themeToggle.getAttribute('data-theme') || 'light';

        // Log theme toggle state
        test.info().annotations.push({
          type: 'theme-toggle-state',
          description: JSON.stringify({
            visible: isVisible,
            enabled: isEnabled,
            boundingBox: boundingBox,
            initialState: initialState
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-theme-toggle',
          component: 'settings-visual'
        });

        test.fail(`Failed to validate theme toggle: ${handledError.message}`);
      }
    });
  });

  test.describe('Form Validation States', () => {
    test('should capture validation error states screenshot @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Trigger validation error
        await page.fill('#api-key-input', '');
        await page.click('#save-settings-btn');

        // Wait for validation errors to appear
        await page.waitForSelector('.validation-errors', { state: 'visible', timeout: 2000 });

        const validationBaseline = new VisualBaseline({
          component: 'settings-validation',
          viewport: '800x600',
          theme: 'light'
        });

        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.validation-errors',
          'validation-errors'
        );

        const comparison = await validationBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `Validation error visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Validation error difference ${comparison.difference} exceeds threshold`).toBeLessThan(0.05);

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-validation-state',
          component: 'settings-visual'
        });

        test.fail(`Failed to capture validation error screenshot: ${handledError.message}`);
      }
    });

    test('should validate error message display and positioning @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Trigger validation error
        await page.fill('#api-key-input', '');
        await page.click('#save-settings-btn');

        await page.waitForSelector('.validation-errors', { state: 'visible', timeout: 2000 });

        const errorMessages = await page.$$('.validation-errors .error-message');
        expect(errorMessages.length, 'Error messages should be visible').toBeGreaterThan(0);

        // Validate error message styling
        for (const errorMessage of errorMessages) {
          const isVisible = await errorMessage.isVisible();
          const boundingBox = await errorMessage.boundingBox();
          const color = await errorMessage.evaluate(el => {
            return window.getComputedStyle(el).color;
          });

          expect(isVisible, 'Error message should be visible').toBe(true);
          expect(boundingBox, 'Error message should have bounding box').not.toBeNull();
          expect(color, 'Error message should have valid color').toMatch(/^rgb\(\d+, \d+, \d+\)$/);
        }

        // Log error message details
        test.info().annotations.push({
          type: 'error-message-details',
          description: `Number of error messages: ${errorMessages.length}`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-error-display',
          component: 'settings-visual'
        });

        test.fail(`Failed to validate error message display: ${handledError.message}`);
      }
    });

    test('should capture success state screenshot @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Simulate successful save
        await page.fill('#api-key-input', 'test-api-key');
        await page.click('#save-settings-btn');

        // Wait for success message to appear
        await page.waitForSelector('.success-message', { state: 'visible', timeout: 2000 });

        const successBaseline = new VisualBaseline({
          component: 'settings-success',
          viewport: '800x600',
          theme: 'light'
        });

        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.success-message',
          'success-message'
        );

        const comparison = await successBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `Success state visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Success state difference ${comparison.difference} exceeds threshold`).toBeLessThan(0.05);

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-success-state',
          component: 'settings-visual'
        });

        test.fail(`Failed to capture success state screenshot: ${handledError.message}`);
      }
    });
  });

  test.describe('Dark Mode Settings', () => {
    test('should capture settings page dark mode screenshot @visual @dark-mode', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Enable dark mode
        await page.emulateMedia({ colorScheme: 'dark' });

        const darkBaseline = new VisualBaseline({
          component: 'settings-dark',
          viewport: '800x600',
          theme: 'dark'
        });

        const screenshotPath = await screenshotUtils.captureFullPage(
          page,
          'settings-dark-mode'
        );

        const comparison = await darkBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `Dark mode visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Dark mode difference ${comparison.difference} exceeds threshold`).toBeLessThan(0.05);

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-dark-mode',
          component: 'settings-visual'
        });

        test.fail(`Failed to capture dark mode screenshot: ${handledError.message}`);
      }
    });

    test('should validate form field contrast in dark mode @accessibility @dark-mode', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.emulateMedia({ colorScheme: 'dark' });

        const contrastValidation = await screenshotUtils.validateTextContrast(
          page,
          '.settings-form'
        );

        expect(contrastValidation.passed, 'Text contrast should meet WCAG standards').toBe(true);
        expect(contrastValidation.minimumRatio, `Minimum contrast ratio ${contrastValidation.minimumRatio} below WCAG AA requirement`).toBeGreaterThanOrEqual(4.5);

        // Log contrast details for debugging
        test.info().annotations.push({
          type: 'contrast-details',
          description: JSON.stringify(contrastValidation.details, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-dark-mode-contrast',
          component: 'settings-visual'
        });

        test.fail(`Failed to validate dark mode contrast: ${handledError.message}`);
      }
    });
  });

  test.describe('Performance Benchmarks', () => {
    test('should meet screenshot capture performance target @performance @visual', async ({ page }) => {
      try {
        await page.goto('http://localhost:8080/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const startTime = Date.now();

        await screenshotUtils.captureFullPage(page, 'performance-test');

        const captureTime = Date.now() - startTime;

        expect(captureTime, `Screenshot capture time ${captureTime}ms exceeds 500ms target`).toBeLessThan(500);

        // Log performance metric
        test.info().annotations.push({
          type: 'performance-metric',
          description: `Screenshot capture time: ${captureTime}ms`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-performance',
          component: 'settings-visual'
        });

        test.fail(`Failed to measure screenshot performance: ${handledError.message}`);
      }
    });
  });
});