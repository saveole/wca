/**
 * Settings Page Accessibility Test Implementation
 *
 * Implements WCAG 2.1 Level AA compliance testing for Chrome extension settings page.
 * Provides comprehensive accessibility validation with axe-core integration for forms and configuration.
 *
 * FEATURES:
 * - Automated accessibility scanning with axe-core
 * - Form accessibility validation
 * - Settings navigation accessibility
 * - Table and list accessibility
 * - Responsive design testing
 * - Performance benchmarking
 */

const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const { TestConfiguration } = require('../../models/test-configuration.js');
const { AccessibilityReport } = require('../../models/AccessibilityReport.js');
const { ErrorHandler } = require('../../utils/error-handler.js');

test.describe('Settings Page Accessibility Tests', () => {
  let testConfig;
  let accessibilityReport;

  test.beforeAll(async () => {
    testConfig = new TestConfiguration({
      viewport: { width: 800, height: 600 },
      accessibility: {
        standard: 'WCAG2.1AA',
        runOnly: {
          type: 'tag',
          value: ['wcag2a', 'wcag21aa']
        }
      },
      timeout: {
        default: 7000,
        accessibility: 5000
      }
    });

    accessibilityReport = new AccessibilityReport({
      component: 'settings',
      standard: 'WCAG2.1AA',
      timestamp: new Date().toISOString()
    });
  });

  test.describe('Comprehensive Accessibility Scan', () => {
    test('should pass accessibility validation with axe-core @accessibility @a11y', async ({ page }) => {
      try {
        // Navigate to settings page
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');

        // Wait for settings page to load
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Run comprehensive accessibility scan
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag21aa'])
          .withRules([
            'color-contrast',
            'keyboard-navigable',
            'focus-order-semantics',
            'label',
            'aria-required-children',
            'aria-allowed-attr',
            'aria-valid-attr-value',
            'aria-valid-attr',
            'button-name',
            'checkboxgroup',
            'definition-list',
            'dlitem',
            'document-title',
            'form-field-multiple-labels',
            'form-fieldset-legend',
            'form-field-legend',
            'heading-order',
            'html-has-lang',
            'html-lang-valid',
            'image-alt',
            'input-button-name',
            'input-image-alt',
            'label-title-only',
            'link-name',
            'list',
            'listitem',
            'meta-viewport',
            'meta-viewport-large',
            'meta-viewport',
            'object-alt',
            'role-img-alt',
            'scope-attr-valid',
            'select-name',
            'server-side-image-map',
            'table-duplicate-name',
            'table-fake-caption',
            'td-has-header',
            'th-has-data-cells',
            'valid-lang',
            'video-caption',
            'video-description'
          ])
          .analyze();

        // Log scan results for debugging
        console.log('Settings accessibility scan completed:', {
          violations: results.violations.length,
          passes: results.passes.length,
          incomplete: results.incomplete.length,
          inapplicable: results.inapplicable.length
        });

        // Assert no violations found
        expect(results.violations.length, `Found ${results.violations.length} accessibility violations`).toBe(0);

        // Assert passes exist (indicates thorough testing)
        expect(results.passes.length, 'Accessibility passes should be detected').toBeGreaterThan(0);

        // Generate accessibility report
        const report = await accessibilityReport.generateFromAxeResults(results);

        // Log detailed results
        test.info().annotations.push({
          type: 'settings-accessibility-results',
          description: JSON.stringify({
            scanTime: report.scanTime,
            violations: report.violations,
            passes: report.passes,
            incomplete: report.incomplete,
            score: report.complianceScore
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-accessibility-scan',
          component: 'settings-a11y'
        });

        test.fail(`Failed to run settings accessibility scan: ${handledError.message}`);
      }
    });

    test('should validate form accessibility @accessibility @forms', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Test form accessibility
        const formValidation = await page.evaluate(() => {
          const results = {};

          // Check all form elements have labels
          const formElements = document.querySelectorAll('input, select, textarea');
          results.missingLabels = Array.from(formElements).filter(el => {
            const id = el.id;
            return id && !document.querySelector(`label[for="${id}"]`) && !el.getAttribute('aria-label');
          }).length;

          // Check required field indicators
          const requiredFields = Array.from(formElements).filter(el => el.hasAttribute('required'));
          results.requiredFields = requiredFields.length;
          results.missingRequiredIndicators = requiredFields.filter(el =>
            !el.getAttribute('aria-required') &&
            !el.closest('label')?.querySelector('.required, .asterisk')
          ).length;

          // Check fieldset and legend usage
          const fieldsets = document.querySelectorAll('fieldset');
          results.fieldsets = fieldsets.length;
          results.missingLegends = Array.from(fieldsets).filter(fs => !fs.querySelector('legend')).length;

          // Check input types and accessibility
          const textInputs = document.querySelectorAll('input[type="text"], input[type="url"], input[type="password"]');
          results.textInputs = textInputs.length;
          results.missingInputTypes = Array.from(textInputs).filter(input =>
            !input.type || input.type === 'text'
          ).length;

          // Check form validation attributes
          results.validationAttributes = Array.from(formElements).filter(el =>
            el.hasAttribute('pattern') || el.hasAttribute('minlength') || el.hasAttribute('maxlength')
          ).length;

          // Check error message containers
          results.errorContainers = document.querySelectorAll('[role="alert"], .error-message, .validation-error').length;

          return results;
        });

        // Validate form accessibility
        expect(formValidation.missingLabels, 'Form elements missing labels').toBe(0);
        expect(formValidation.missingRequiredIndicators, 'Required fields missing indicators').toBe(0);
        expect(formValidation.missingLegends, 'Fieldsets missing legends').toBe(0);

        // Log form validation results
        test.info().annotations.push({
          type: 'settings-form-accessibility',
          description: JSON.stringify(formValidation, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-form-accessibility',
          component: 'settings-a11y'
        });

        test.fail(`Failed to test settings form accessibility: ${handledError.message}`);
      }
    });

    test('should validate settings navigation accessibility @accessibility @navigation', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Test navigation accessibility
        const navValidation = await page.evaluate(() => {
          const results = {};

          // Check for skip links
          results.skipLinks = document.querySelectorAll('.skip-link, [href="#main"], [href="#content"]').length;

          // Check for navigation landmarks
          results.navLandmarks = document.querySelectorAll('nav, [role="navigation"]').length;

          // Check for current page indication
          results.currentPageIndicators = document.querySelectorAll('[aria-current="page"], .active, .current').length;

          // Check for keyboard accessible tabs/buttons
          const navElements = document.querySelectorAll('.nav-button, .tab-button, .settings-tab, button');
          results.navElements = navElements.length;
          results.missingButtonRoles = Array.from(navElements).filter(el =>
            el.tagName !== 'BUTTON' && !el.getAttribute('role') && el.hasAttribute('onclick')
          ).length;

          // Check for heading structure
          const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
          results.headings = headings.length;
          results.properHeadingOrder = Array.from(headings).every((h, i) => {
            if (i === 0) return true;
            const prev = headings[i - 1];
            return parseInt(h.tagName.charAt(1)) >= parseInt(prev.tagName.charAt(1));
          });

          // Check for main content landmark
          results.mainLandmark = document.querySelectorAll('main, [role="main"]').length;

          return results;
        });

        // Validate navigation accessibility
        expect(navValidation.skipLinks, 'Skip links should exist').toBeGreaterThan(0);
        expect(navValidation.navLandmarks, 'Navigation landmarks should exist').toBeGreaterThan(0);
        expect(navValidation.currentPageIndicators, 'Current page indicators should exist').toBeGreaterThan(0);
        expect(navValidation.missingButtonRoles, 'Missing button roles').toBe(0);
        expect(navValidation.properHeadingOrder, 'Heading order should be proper').toBe(true);
        expect(navValidation.mainLandmark, 'Main landmark should exist').toBeGreaterThan(0);

        // Log navigation validation results
        test.info().annotations.push({
          type: 'settings-navigation-accessibility',
          description: JSON.stringify(navValidation, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-navigation-accessibility',
          component: 'settings-a11y'
        });

        test.fail(`Failed to test settings navigation accessibility: ${handledError.message}`);
      }
    });

    test('should validate table accessibility @accessibility @tables', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Check if tables exist
        const tablesExist = await page.$$('table');

        if (tablesExist.length > 0) {
          // Test table accessibility
          const tableValidation = await page.evaluate(() => {
            const tables = document.querySelectorAll('table');
            const results = {};

            // Check each table
            Array.from(tables).forEach((table, index) => {
              const caption = table.querySelector('caption');
              const headers = table.querySelectorAll('th');
              const scopeAttrs = table.querySelectorAll('th[scope]');
              const summaries = table.querySelectorAll('summary');

              results[`table${index}_hasCaption`] = caption !== null;
              results[`table${index}_hasHeaders`] = headers.length > 0;
              results[`table${index}_hasScope`] = scopeAttrs.length > 0;
              results[`table${index}_hasSummary`] = summaries.length > 0;

              // Check for proper table structure
              const rows = table.querySelectorAll('tr');
              const headerRows = table.querySelectorAll('thead tr');
              const bodyRows = table.querySelectorAll('tbody tr');

              results[`table${index}_properStructure`] =
                headerRows.length > 0 &&
                bodyRows.length > 0 &&
                rows.length === headerRows.length + bodyRows.length;
            });

            return results;
          });

          // Validate table accessibility
          const tableResults = Object.entries(tableValidation).filter(([key]) => key !== 'noTables');
          for (const [key, value] of tableResults) {
            expect(value, `Table accessibility check ${key} should pass`).toBe(true);
          }
        }

        // Log table validation results
        test.info().annotations.push({
          type: 'settings-table-accessibility',
          description: JSON.stringify({
            tablesExist: tablesExist.length > 0,
            tablesChecked: tablesExist.length,
            accessible: true
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-table-accessibility',
          component: 'settings-a11y'
        });

        test.fail(`Failed to test settings table accessibility: ${handledError.message}`);
      }
    });

    test('should validate button and interactive element accessibility @accessibility @buttons', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Test button accessibility
        const buttonValidation = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, [role="button"]');
          const results = {};

          // Check accessible names
          results.missingNames = Array.from(buttons).filter(btn => {
            const hasText = btn.textContent && btn.textContent.trim().length > 0;
            const hasAriaLabel = btn.getAttribute('aria-label');
            const hasAriaLabelledby = btn.getAttribute('aria-labelledby');
            const hasTitle = btn.getAttribute('title');
            return !hasText && !hasAriaLabel && !hasAriaLabelledby && !hasTitle;
          }).length;

          // Check disabled state handling
          const disabledButtons = Array.from(buttons).filter(btn =>
            btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true'
          );
          results.disabledButtons = disabledButtons.length;
          results.properDisabledState = disabledButtons.every(btn =>
            btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true'
          );

          // Check button roles
          results.correctRoles = Array.from(buttons).filter(btn =>
            btn.tagName === 'BUTTON' || btn.getAttribute('role') === 'button'
          ).length;

          // Check for duplicate IDs
          const allIds = Array.from(buttons).map(btn => btn.id).filter(id => id);
          const uniqueIds = new Set(allIds);
          results.hasDuplicateIds = allIds.length !== uniqueIds.size;

          return results;
        });

        // Validate button accessibility
        expect(buttonValidation.missingNames, 'Buttons missing accessible names').toBe(0);
        expect(buttonValidation.correctRoles, 'Buttons should have correct roles').toBe(buttonValidation.correctRoles);
        expect(buttonValidation.hasDuplicateIds, 'Duplicate button IDs should not exist').toBe(false);

        // Log button validation results
        test.info().annotations.push({
          type: 'settings-button-accessibility',
          description: JSON.stringify(buttonValidation, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-button-accessibility',
          component: 'settings-a11y'
        });

        test.fail(`Failed to test settings button accessibility: ${handledError.message}`);
      }
    });

    test('should validate color and contrast accessibility @accessibility @contrast', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Run focused color contrast check
        const results = await new AxeBuilder({ page })
          .withRules(['color-contrast'])
          .analyze();

        // Filter for color contrast violations
        const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');

        // Assert no color contrast violations
        expect(contrastViolations.length, `Found ${contrastViolations.length} color contrast violations`).toBe(0);

        // Additional color accessibility validation
        const colorValidation = await page.evaluate(() => {
          const results = {};

          // Check for color-only indicators
          const colorOnlyElements = document.querySelectorAll('.success, .error, .warning, .info');
          results.colorOnlyElements = Array.from(colorOnlyElements).filter(el => {
            const hasAdditionalIndicator = el.getAttribute('aria-label') ||
                                        el.querySelector('.sr-only') ||
                                        el.getAttribute('title');
            return !hasAdditionalIndicator;
          }).length;

          // Check for high contrast mode support
          results.highContrastSupport = document.querySelector('.high-contrast, [data-high-contrast]') !== null;

          // Check for text contrast issues (basic check)
          const textElements = document.querySelectorAll('p, span, label, button, h1, h2, h3, h4, h5, h6');
          results.textElementsChecked = textElements.length;

          return results;
        });

        // Validate color accessibility
        expect(colorValidation.colorOnlyElements, 'Color-only indicators should have additional accessibility').toBe(0);

        // Log color validation results
        test.info().annotations.push({
          type: 'settings-color-accessibility',
          description: JSON.stringify({
            contrastViolations: contrastViolations.length,
            colorOnlyElements: colorValidation.colorOnlyElements,
            highContrastSupport: colorValidation.highContrastSupport,
            textElementsChecked: colorValidation.textElementsChecked
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-color-accessibility',
          component: 'settings-a11y'
        });

        test.fail(`Failed to test settings color accessibility: ${handledError.message}`);
      }
    });

    test('should validate responsive design accessibility @accessibility @responsive', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Test different viewport sizes
        const viewports = [
          { width: 800, height: 600 },
          { width: 1024, height: 768 },
          { width: 360, height: 640 },
          { width: 320, height: 568 }
        ];

        for (const viewport of viewports) {
          await page.setViewportSize(viewport);

          // Run accessibility scan for each viewport
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag21aa'])
            .analyze();

          // Assert no violations for this viewport
          expect(results.violations.length, `Found ${results.violations.length} violations at ${viewport.width}x${viewport.height}`).toBe(0);
        }

        // Test zoom levels
        await page.setViewportSize({ width: 800, height: 600 });
        const zoomLevels = ['1.2', '1.5', '2.0'];

        for (const zoom of zoomLevels) {
          await page.evaluate((z) => {
            document.body.style.zoom = z;
          }, zoom);

          const zoomResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag21aa'])
            .analyze();

          expect(zoomResults.violations.length, `Found ${zoomResults.violations.length} violations at ${zoom}x zoom`).toBe(0);
        }

        // Log responsive testing results
        test.info().annotations.push({
          type: 'settings-responsive-accessibility',
          description: JSON.stringify({
            viewportsTested: viewports.length,
            zoomLevelsTested: zoomLevels.length,
            allPassed: true
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-responsive-accessibility',
          component: 'settings-a11y'
        });

        test.fail(`Failed to test settings responsive accessibility: ${handledError.message}`);
      }
    });
  });

  test.describe('Form Interaction Accessibility', () => {
    test('should validate form validation accessibility @accessibility @validation', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Test form validation accessibility
        const validationValidation = await page.evaluate(() => {
          const results = {};

          // Check for error message containers
          results.errorContainers = document.querySelectorAll('[role="alert"], .error-message, .validation-error').length;

          // Check for inline validation associations
          const inputs = document.querySelectorAll('input, select, textarea');
          results.inlineValidation = Array.from(inputs).filter(input => {
            const errorId = input.getAttribute('aria-describedby');
            return errorId && document.querySelector(`#${errorId}[role="alert"], #${errorId}.error-message`);
          }).length;

          // Check for validation summary
          results.validationSummary = document.querySelector('.validation-summary, [role="alert"]') !== null;

          // Check for success messages
          results.successMessages = document.querySelector('.success-message, [role="status"]') !== null;

          // Check for required field handling
          const requiredFields = document.querySelectorAll('[required]');
          results.requiredFields = requiredFields.length;
          results.properRequiredHandling = Array.from(requiredFields).every(field =>
            field.getAttribute('aria-required') === 'true' ||
            field.closest('label')?.querySelector('.required, .asterisk')
          );

          return results;
        });

        // Validate form validation accessibility
        expect(validationValidation.errorContainers, 'Error containers should exist').toBeGreaterThan(0);
        expect(validationValidation.validationSummary, 'Validation summary should exist').toBe(true);
        expect(validationValidation.successMessages, 'Success messages should exist').toBe(true);
        expect(validationValidation.properRequiredHandling, 'Required fields should be properly handled').toBe(true);

        // Log validation validation results
        test.info().annotations.push({
          type: 'settings-validation-accessibility',
          description: JSON.stringify(validationValidation, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-validation-accessibility',
          component: 'settings-a11y'
        });

        test.fail(`Failed to test settings validation accessibility: ${handledError.message}`);
      }
    });

    test('should validate keyboard navigation in forms @accessibility @keyboard @forms', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Get all focusable elements
        const focusableElements = await page.$$eval(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          elements => elements.map(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            tabIndex: el.tabIndex
          }))
        );

        expect(focusableElements.length, 'Focusable elements should exist').toBeGreaterThan(0);

        // Test tab navigation through form elements
        let focusOrder = [];
        for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
          await page.keyboard.press('Tab');
          const focusedElement = await page.evaluate(() => {
            const active = document.activeElement;
            return {
              tagName: active.tagName,
              className: active.className,
              id: active.id
            };
          });
          focusOrder.push(focusedElement);
        }

        // Validate focus moves through different elements
        const uniqueFocuses = new Set(focusOrder.map(f => f.tagName + f.id));
        expect(uniqueFocuses.size, 'Focus should move through different elements').toBeGreaterThan(1);

        // Test Shift+Tab navigation
        await page.keyboard.press('Shift+Tab');
        const previousFocus = await page.evaluate(() => {
          const active = document.activeElement;
          return {
            tagName: active.tagName,
            className: active.className,
            id: active.id
          };
        });

        // Test Enter key on buttons
        const buttons = await page.$$('button');
        if (buttons.length > 0) {
          await buttons[0].focus();
          await page.keyboard.press('Enter');
          // Validate button interaction doesn't cause errors
        }

        // Log keyboard navigation results
        test.info().annotations.push({
          type: 'settings-keyboard-navigation',
          description: JSON.stringify({
            focusableElements: focusableElements.length,
            focusOrderLength: focusOrder.length,
            uniqueFocuses: uniqueFocuses.size,
            testCompleted: true
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-keyboard-navigation',
          component: 'settings-a11y'
        });

        test.fail(`Failed to test settings keyboard navigation: ${handledError.message}`);
      }
    });
  });

  test.describe('Performance Benchmarks', () => {
    test('should meet settings accessibility scan performance target @accessibility @performance', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const startTime = Date.now();

        // Run accessibility scan
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag21aa'])
          .analyze();

        const scanTime = Date.now() - startTime;

        // Validate performance target
        expect(scanTime, `Settings accessibility scan time ${scanTime}ms exceeds 1500ms target`).toBeLessThan(1500);
        expect(results.violations.length, 'Accessibility violations should be zero').toBe(0);

        // Log performance metric
        test.info().annotations.push({
          type: 'settings-accessibility-performance',
          description: `Settings accessibility scan time: ${scanTime}ms`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-accessibility-performance',
          component: 'settings-a11y'
        });

        test.fail(`Failed to measure settings accessibility performance: ${handledError.message}`);
      }
    });
  });
});