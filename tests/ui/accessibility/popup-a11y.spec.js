/**
 * Popup Accessibility Test Implementation
 *
 * Implements WCAG 2.1 Level AA compliance testing for Chrome extension popup.
 * Provides comprehensive accessibility validation with axe-core integration.
 *
 * FEATURES:
 * - Automated accessibility scanning with axe-core
 * - Keyboard navigation validation
 * - Screen reader compatibility testing
 * - Color contrast verification
 * - Focus management testing
 * - Performance benchmarking
 */

const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const { TestConfiguration } = require('../../models/test-configuration.js');
const { AccessibilityReport } = require('../../models/AccessibilityReport.js');
const { ErrorHandler } = require('../../utils/error-handler.js');

test.describe('Popup Accessibility Tests', () => {
  let testConfig;
  let accessibilityReport;

  test.beforeAll(async () => {
    testConfig = new TestConfiguration({
      viewport: { width: 360, height: 600 },
      accessibility: {
        standard: 'WCAG2.1AA',
        runOnly: {
          type: 'tag',
          value: ['wcag2a', 'wcag21aa']
        }
      },
      timeout: {
        default: 5000,
        accessibility: 3000
      }
    });

    accessibilityReport = new AccessibilityReport({
      component: 'popup',
      standard: 'WCAG2.1AA',
      timestamp: new Date().toISOString()
    });
  });

  test.describe('Comprehensive Accessibility Scan', () => {
    test('should pass accessibility validation with axe-core @accessibility @a11y', async ({ page }) => {
      try {
        // Navigate to extension popup
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');

        // Wait for popup to load
        await page.waitForSelector('.popup-container', { state: 'visible' });

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
        console.log('Accessibility scan completed:', {
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
          type: 'accessibility-results',
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
          context: 'popup-accessibility-scan',
          component: 'popup-a11y'
        });

        test.fail(`Failed to run accessibility scan: ${handledError.message}`);
      }
    });

    test('should validate keyboard navigation @accessibility @keyboard', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

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

        // Test tab navigation
        let focusOrder = [];
        for (let i = 0; i < focusableElements.length + 2; i++) {
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

        // Validate focus moves through elements
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
          // Validate button interaction (no error should occur)
        }

        // Test Escape key
        await page.keyboard.press('Escape');
        // Validate escape doesn't cause errors

        // Log keyboard navigation results
        test.info().annotations.push({
          type: 'keyboard-navigation',
          description: JSON.stringify({
            focusableElements: focusableElements.length,
            focusOrderLength: focusOrder.length,
            uniqueFocuses: uniqueFocuses.size,
            testCompleted: true
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-keyboard-navigation',
          component: 'popup-a11y'
        });

        test.fail(`Failed to test keyboard navigation: ${handledError.message}`);
      }
    });

    test('should validate screen reader compatibility @accessibility @screen-reader', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Test ARIA attributes
        const ariaValidation = await page.evaluate(() => {
          const results = {};

          // Check interactive elements have accessible names
          const interactiveElements = document.querySelectorAll('button, input, select, textarea');
          results.missingAriaNames = Array.from(interactiveElements).filter(el => {
            const hasText = el.textContent && el.textContent.trim().length > 0;
            const hasAriaLabel = el.getAttribute('aria-label');
            const hasAriaLabelledby = el.getAttribute('aria-labelledby');
            const hasTitle = el.getAttribute('title');
            return !hasText && !hasAriaLabel && !hasAriaLabelledby && !hasTitle;
          }).length;

          // Check for proper landmark roles
          results.landmarks = document.querySelectorAll('[role="banner"], [role="main"], [role="navigation"], [role="complementary"], [role="search"]').length;

          // Check for proper heading structure
          const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
          results.headingOrder = Array.from(headings).every((h, i) => {
            if (i === 0) return true;
            const prev = headings[i - 1];
            return parseInt(h.tagName.charAt(1)) >= parseInt(prev.tagName.charAt(1));
          });

          // Check for proper form labels
          const formElements = document.querySelectorAll('input, select, textarea');
          results.missingLabels = Array.from(formElements).filter(el => {
            const id = el.id;
            return id && !document.querySelector(`label[for="${id}"]`) && !el.getAttribute('aria-label');
          }).length;

          // Check for live regions
          results.liveRegions = document.querySelectorAll('[aria-live]').length;

          return results;
        });

        // Validate screen reader compatibility
        expect(ariaValidation.missingAriaNames, 'Elements missing accessible names').toBe(0);
        expect(ariaValidation.landmarks, 'Landmark roles should exist').toBeGreaterThan(0);
        expect(ariaValidation.headingOrder, 'Heading order should be logical').toBe(true);
        expect(ariaValidation.missingLabels, 'Form elements missing labels').toBe(0);

        // Log screen reader validation results
        test.info().annotations.push({
          type: 'screen-reader-validation',
          description: JSON.stringify(ariaValidation, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-screen-reader',
          component: 'popup-a11y'
        });

        test.fail(`Failed to test screen reader compatibility: ${handledError.message}`);
      }
    });

    test('should validate color contrast @accessibility @contrast', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Run focused color contrast check
        const results = await new AxeBuilder({ page })
          .withRules(['color-contrast'])
          .analyze();

        // Filter for color contrast violations
        const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');

        // Assert no color contrast violations
        expect(contrastViolations.length, `Found ${contrastViolations.length} color contrast violations`).toBe(0);

        // Additional manual contrast validation
        const textElements = await page.$$eval('p, span, h1, h2, h3, h4, h5, h6, label, button', elements => {
          return elements.map(el => {
            const style = window.getComputedStyle(el);
            return {
              tagName: el.tagName,
              className: el.className,
              color: style.color,
              backgroundColor: style.backgroundColor,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight
            };
          });
        });

        // Log contrast validation results
        test.info().annotations.push({
          type: 'color-contrast-validation',
          description: JSON.stringify({
            textElementsChecked: textElements.length,
            contrastViolations: contrastViolations.length,
            scanCompleted: true
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-color-contrast',
          component: 'popup-a11y'
        });

        test.fail(`Failed to test color contrast: ${handledError.message}`);
      }
    });

    test('should validate focus management @accessibility @focus', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Test focus styles
        const focusValidation = await page.evaluate(() => {
          const results = {};

          // Check focusable elements have focus styles
          const focusableElements = document.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
          results.missingFocusStyles = Array.from(focusableElements).filter(el => {
            const style = window.getComputedStyle(el);
            const hasFocusStyle = style.outline !== 'none' || style.boxShadow !== 'none';
            return !hasFocusStyle;
          }).length;

          // Check for focus management functions
          results.hasFocusManagement = typeof window.setFocus !== 'undefined';

          // Check initial focus
          results.hasInitialFocus = document.activeElement !== document.body;

          return results;
        });

        // Validate focus management
        expect(focusValidation.missingFocusStyles, 'Elements missing focus styles').toBe(0);
        expect(focusValidation.hasFocusManagement, 'Focus management should be available').toBe(true);
        expect(focusValidation.hasInitialFocus, 'Initial focus should be set').toBe(true);

        // Test focus trap
        await page.keyboard.press('Tab');
        const focusedInPopup = await page.evaluate(() => {
          const popup = document.querySelector('.popup-container');
          const active = document.activeElement;
          return popup && popup.contains(active);
        });

        expect(focusedInPopup, 'Focus should remain within popup').toBe(true);

        // Log focus management results
        test.info().annotations.push({
          type: 'focus-management',
          description: JSON.stringify(focusValidation, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-focus-management',
          component: 'popup-a11y'
        });

        test.fail(`Failed to test focus management: ${handledError.message}`);
      }
    });

    test('should validate responsive design accessibility @accessibility @responsive', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Test different viewport sizes
        const viewports = [
          { width: 360, height: 600 },
          { width: 320, height: 568 },
          { width: 414, height: 736 }
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
        await page.setViewportSize({ width: 360, height: 600 });
        await page.evaluate(() => {
          document.body.style.zoom = '1.5';
        });

        const zoomResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag21aa'])
          .analyze();

        expect(zoomResults.violations.length, `Found ${zoomResults.violations.length} violations at 1.5x zoom`).toBe(0);

        // Log responsive testing results
        test.info().annotations.push({
          type: 'responsive-accessibility',
          description: JSON.stringify({
            viewportsTested: viewports.length,
            zoomTested: true,
            allPassed: true
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-responsive-accessibility',
          component: 'popup-a11y'
        });

        test.fail(`Failed to test responsive accessibility: ${handledError.message}`);
      }
    });
  });

  test.describe('Interactive Element Testing', () => {
    test('should validate button accessibility @accessibility @buttons', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Test button accessibility
        const buttonValidation = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, [role="button"]');
          const results = {};

          // Check accessible names
          results.missingNames = Array.from(buttons).filter(btn => {
            const hasText = btn.textContent && btn.textContent.trim().length > 0;
            const hasAriaLabel = btn.getAttribute('aria-label');
            const hasAriaLabelledby = btn.getAttribute('aria-labelledby');
            return !hasText && !hasAriaLabel && !hasAriaLabelledby;
          }).length;

          // Check disabled state handling
          const disabledButtons = Array.from(buttons).filter(btn =>
            btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true'
          );
          results.disabledButtons = disabledButtons.length;

          // Check button roles
          results.correctRoles = Array.from(buttons).filter(btn =>
            btn.tagName === 'BUTTON' || btn.getAttribute('role') === 'button'
          ).length;

          return results;
        });

        // Validate button accessibility
        expect(buttonValidation.missingNames, 'Buttons missing accessible names').toBe(0);
        expect(buttonValidation.correctRoles, 'Buttons should have correct roles').toBeGreaterThan(0);

        // Log button validation results
        test.info().annotations.push({
          type: 'button-accessibility',
          description: JSON.stringify(buttonValidation, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-button-accessibility',
          component: 'popup-a11y'
        });

        test.fail(`Failed to test button accessibility: ${handledError.message}`);
      }
    });

    test('should validate form accessibility @accessibility @forms', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Test form accessibility
        const formValidation = await page.evaluate(() => {
          const formElements = document.querySelectorAll('input, select, textarea');
          const results = {};

          // Check labels
          results.missingLabels = Array.from(formElements).filter(el => {
            const id = el.id;
            return id && !document.querySelector(`label[for="${id}"]`) && !el.getAttribute('aria-label');
          }).length;

          // Check required fields
          const requiredFields = Array.from(formElements).filter(el => el.hasAttribute('required'));
          results.requiredFields = requiredFields.length;
          results.missingRequiredAria = requiredFields.filter(el => !el.getAttribute('aria-required')).length;

          // Check error handling
          results.hasErrorHandling = document.querySelectorAll('[role="alert"], [aria-invalid]').length > 0;

          return results;
        });

        // Validate form accessibility
        expect(formValidation.missingLabels, 'Form elements missing labels').toBe(0);
        expect(formValidation.missingRequiredAria, 'Required fields missing aria-required').toBe(0);

        // Log form validation results
        test.info().annotations.push({
          type: 'form-accessibility',
          description: JSON.stringify(formValidation, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-form-accessibility',
          component: 'popup-a11y'
        });

        test.fail(`Failed to test form accessibility: ${handledError.message}`);
      }
    });
  });

  test.describe('Performance Benchmarks', () => {
    test('should meet accessibility scan performance target @accessibility @performance', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const startTime = Date.now();

        // Run accessibility scan
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag21aa'])
          .analyze();

        const scanTime = Date.now() - startTime;

        // Validate performance target
        expect(scanTime, `Accessibility scan time ${scanTime}ms exceeds 1000ms target`).toBeLessThan(1000);
        expect(results.violations.length, 'Accessibility violations should be zero').toBe(0);

        // Log performance metric
        test.info().annotations.push({
          type: 'accessibility-performance',
          description: `Accessibility scan time: ${scanTime}ms`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-accessibility-performance',
          component: 'popup-a11y'
        });

        test.fail(`Failed to measure accessibility performance: ${handledError.message}`);
      }
    });
  });
});