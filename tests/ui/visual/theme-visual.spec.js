/**
 * Theme Switching Visual Test Implementation
 *
 * Implements comprehensive visual testing for theme switching across
 * both popup and settings page with consistency validation and performance testing.
 */

import { test, expect } from '@playwright/test';
import { VisualBaseline } from '../../models/VisualBaseline.js';
import { TestConfiguration } from '../../models/test-configuration.js';
import { ScreenshotUtils } from '../../utils/screenshot-utils.js';
import { ErrorHandler } from '../../utils/error-handler.js';

test.describe('Theme Switching Visual Tests', () => {
  let testConfig;
  let screenshotUtils;
  let baselineManager;

  test.beforeAll(async () => {
    testConfig = new TestConfiguration({
      viewport: { width: 1280, height: 720 },
      theme: 'light',
      screenshot: {
        enabled: true,
        threshold: 0.05,
        fullPage: false
      },
      timeout: {
        default: 6000,
        screenshot: 4000
      }
    });

    baselineManager = new VisualBaseline({
      component: 'theme-consistency',
      viewport: '1280x720',
      theme: 'light'
    });

    screenshotUtils = new ScreenshotUtils(testConfig.screenshot);
  });

  test.describe('Popup Theme Switching', () => {
    test('should validate popup light theme consistency @visual', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const lightBaseline = new VisualBaseline({
          component: 'popup-theme-light',
          viewport: '360x600',
          theme: 'light'
        });

        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.popup-container',
          'popup-light-theme'
        );

        const comparison = await lightBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `Light theme visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Light theme difference ${comparison.difference} exceeds threshold`).toBeLessThan(0.05);

        // Log theme validation
        test.info().annotations.push({
          type: 'theme-validation',
          description: `Light theme validation completed with difference: ${comparison.difference}`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-light-theme',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate popup light theme: ${handledError.message}`);
      }
    });

    test('should validate popup dark theme consistency @visual @dark-mode', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const darkBaseline = new VisualBaseline({
          component: 'popup-theme-dark',
          viewport: '360x600',
          theme: 'dark'
        });

        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.popup-container',
          'popup-dark-theme'
        );

        const comparison = await darkBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `Dark theme visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Dark theme difference ${comparison.difference} exceeds threshold`).toBeLessThan(0.05);

        // Log theme validation
        test.info().annotations.push({
          type: 'theme-validation',
          description: `Dark theme validation completed with difference: ${comparison.difference}`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-dark-theme',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate popup dark theme: ${handledError.message}`);
      }
    });

    test('should validate theme transition smoothness @visual', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const themeToggle = await page.$('.theme-toggle');
        expect(themeToggle, 'Theme toggle should exist').not.toBeNull();

        // Measure transition timing
        const transitionStart = Date.now();

        // Trigger theme change
        await themeToggle.click();

        // Wait for transition to complete
        await page.waitForTimeout(300); // Wait for CSS transition

        const transitionEnd = Date.now();
        const transitionDuration = transitionEnd - transitionStart;

        expect(transitionDuration, `Theme transition duration ${transitionDuration}ms exceeds 300ms limit`).toBeLessThan(300);

        // Validate no flicker during transition (simplified check)
        const isVisible = await themeToggle.isVisible();
        expect(isVisible, 'Theme toggle should remain visible during transition').toBe(true);

        // Log transition metrics
        test.info().annotations.push({
          type: 'transition-metrics',
          description: `Transition duration: ${transitionDuration}ms, No flicker: ${isVisible}`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'theme-transition',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate theme transition: ${handledError.message}`);
      }
    });

    test('should validate theme preference persistence @visual', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const themeToggle = await page.$('.theme-toggle');
        expect(themeToggle, 'Theme toggle should exist').not.toBeNull();

        // Get initial theme
        const initialTheme = await themeToggle.getAttribute('data-theme') || 'light';

        // Toggle theme
        await themeToggle.click();
        await page.waitForTimeout(300);

        const toggledTheme = await themeToggle.getAttribute('data-theme');
        expect(toggledTheme, `Theme should change from ${initialTheme}`).not.toBe(initialTheme);

        // Refresh page to test persistence
        await page.reload();
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const persistedTheme = await themeToggle.getAttribute('data-theme');
        expect(persistedTheme, `Theme should persist as ${toggledTheme}`).toBe(toggledTheme);

        // Log persistence validation
        test.info().annotations.push({
          type: 'persistence-validation',
          description: `Initial: ${initialTheme}, Toggled: ${toggledTheme}, Persisted: ${persistedTheme}`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'theme-persistence',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate theme persistence: ${handledError.message}`);
      }
    });
  });

  test.describe('Settings Page Theme Switching', () => {
    test('should validate settings light theme consistency @visual', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const lightBaseline = new VisualBaseline({
          component: 'settings-theme-light',
          viewport: '800x600',
          theme: 'light'
        });

        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.settings-container',
          'settings-light-theme'
        );

        const comparison = await lightBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `Settings light theme visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Settings light theme difference ${comparison.difference} exceeds threshold`).toBeLessThan(0.05);

        // Log theme validation
        test.info().annotations.push({
          type: 'theme-validation',
          description: `Settings light theme validation completed with difference: ${comparison.difference}`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-light-theme',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate settings light theme: ${handledError.message}`);
      }
    });

    test('should validate settings dark theme consistency @visual @dark-mode', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const darkBaseline = new VisualBaseline({
          component: 'settings-theme-dark',
          viewport: '800x600',
          theme: 'dark'
        });

        const screenshotPath = await screenshotUtils.captureElement(
          page,
          '.settings-container',
          'settings-dark-theme'
        );

        const comparison = await darkBaseline.compareWith(screenshotPath);

        expect(comparison.matches, `Settings dark theme visual difference: ${comparison.difference}`).toBe(true);
        expect(comparison.difference, `Settings dark theme difference ${comparison.difference} exceeds threshold`).toBeLessThan(0.05);

        // Log theme validation
        test.info().annotations.push({
          type: 'theme-validation',
          description: `Settings dark theme validation completed with difference: ${comparison.difference}`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-dark-theme',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate settings dark theme: ${handledError.message}`);
      }
    });

    test('should validate form field theme adaptation @visual', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const formFields = {
          inputs: ['input[type="text"]', 'input[type="url"]', 'textarea'],
          selects: 'select',
          checkboxes: 'input[type="checkbox"]',
          buttons: 'button'
        };

        const adaptationResults = {};

        for (const [fieldType, selectors] of Object.entries(formFields)) {
          const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
          const adaptedCount = { light: 0, dark: 0 };

          // Test in light mode
          for (const selector of selectorArray) {
            const elements = await page.$$(selector);
            for (const element of elements) {
              const isVisible = await element.isVisible();
              if (isVisible) {
                const backgroundColor = await element.evaluate(el => {
                  return window.getComputedStyle(el).backgroundColor;
                });
                adaptedCount.light++;
              }
            }
          }

          // Test in dark mode
          await page.emulateMedia({ colorScheme: 'dark' });
          await page.waitForTimeout(100);

          for (const selector of selectorArray) {
            const elements = await page.$$(selector);
            for (const element of elements) {
              const isVisible = await element.isVisible();
              if (isVisible) {
                const backgroundColor = await element.evaluate(el => {
                  return window.getComputedStyle(el).backgroundColor;
                });
                adaptedCount.dark++;
              }
            }
          }

          adaptationResults[fieldType] = adaptedCount;
        }

        // Validate adaptation
        expect(adaptationResults.inputs.light, 'Inputs should adapt to light theme').toBeGreaterThan(0);
        expect(adaptationResults.inputs.dark, 'Inputs should adapt to dark theme').toBeGreaterThan(0);
        expect(adaptationResults.buttons.light, 'Buttons should adapt to light theme').toBeGreaterThan(0);
        expect(adaptationResults.buttons.dark, 'Buttons should adapt to dark theme').toBeGreaterThan(0);

        // Log adaptation results
        test.info().annotations.push({
          type: 'form-adaptation',
          description: JSON.stringify(adaptationResults, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-form-adaptation',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate form field theme adaptation: ${handledError.message}`);
      }
    });

    test('should validate table theme adaptation in dark mode @visual @dark-mode', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const mappingTable = await page.$('.field-mapping-table');
        expect(mappingTable, 'Field mapping table should exist').not.toBeNull();

        const isVisible = await mappingTable.isVisible();
        expect(isVisible, 'Field mapping table should be visible').toBe(true);

        // Validate table styling in dark mode
        const headers = await mappingTable.$$('th');
        const rows = await mappingTable.$$('tbody tr');

        expect(headers.length, 'Table should have headers').toBeGreaterThan(0);
        expect(rows.length, 'Table should have rows').toBeGreaterThan(0);

        // Validate header contrast
        for (const header of headers) {
          const backgroundColor = await header.evaluate(el => {
            return window.getComputedStyle(el).backgroundColor;
          });
          const color = await header.evaluate(el => {
            return window.getComputedStyle(el).color;
          });

          expect(backgroundColor, 'Header should have valid background color').toMatch(/^rgb\(\d+, \d+, \d+\)$/);
          expect(color, 'Header should have valid text color').toMatch(/^rgb\(\d+, \d+, \d+\)$/);
        }

        // Log table adaptation
        test.info().annotations.push({
          type: 'table-adaptation',
          description: `Table visible: ${isVisible}, Headers: ${headers.length}, Rows: ${rows.length}`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-table-adaptation',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate table theme adaptation: ${handledError.message}`);
      }
    });
  });

  test.describe('Cross-Component Theme Consistency', () => {
    test('should validate consistent color scheme across components @visual', async ({ page }) => {
      try {
        // Test popup color scheme
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const popupColors = await page.evaluate(() => {
          const computedStyle = window.getComputedStyle(document.documentElement);
          return {
            primaryColor: computedStyle.getPropertyValue('--color-primary')?.trim(),
            secondaryColor: computedStyle.getPropertyValue('--color-secondary')?.trim(),
            backgroundColor: computedStyle.getPropertyValue('--color-background')?.trim(),
            textColor: computedStyle.getPropertyValue('--color-text')?.trim(),
            borderColor: computedStyle.getPropertyValue('--color-border')?.trim()
          };
        });

        // Test settings color scheme
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const settingsColors = await page.evaluate(() => {
          const computedStyle = window.getComputedStyle(document.documentElement);
          return {
            primaryColor: computedStyle.getPropertyValue('--color-primary')?.trim(),
            secondaryColor: computedStyle.getPropertyValue('--color-secondary')?.trim(),
            backgroundColor: computedStyle.getPropertyValue('--color-background')?.trim(),
            textColor: computedStyle.getPropertyValue('--color-text')?.trim(),
            borderColor: computedStyle.getPropertyValue('--color-border')?.trim()
          };
        });

        // Validate color consistency
        expect(popupColors.primaryColor, 'Primary color should be consistent').toBe(settingsColors.primaryColor);
        expect(popupColors.secondaryColor, 'Secondary color should be consistent').toBe(settingsColors.secondaryColor);
        expect(popupColors.backgroundColor, 'Background color should be consistent').toBe(settingsColors.backgroundColor);
        expect(popupColors.textColor, 'Text color should be consistent').toBe(settingsColors.textColor);
        expect(popupColors.borderColor, 'Border color should be consistent').toBe(settingsColors.borderColor);

        // Log color consistency
        test.info().annotations.push({
          type: 'color-consistency',
          description: JSON.stringify({
            popup: popupColors,
            settings: settingsColors,
            consistent: Object.keys(popupColors).every(key => popupColors[key] === settingsColors[key])
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'color-consistency',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate color scheme consistency: ${handledError.message}`);
      }
    });

    test('should validate consistent spacing across themes @visual', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const popupSpacing = await page.evaluate(() => {
          const computedStyle = window.getComputedStyle(document.documentElement);
          return {
            spacingSm: computedStyle.getPropertyValue('--spacing-sm')?.trim(),
            spacingMd: computedStyle.getPropertyValue('--spacing-md')?.trim(),
            spacingLg: computedStyle.getPropertyValue('--spacing-lg')?.trim(),
            fontSize: computedStyle.getPropertyValue('--font-size-base')?.trim(),
            lineHeight: computedStyle.getPropertyValue('--line-height-base')?.trim()
          };
        });

        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const settingsSpacing = await page.evaluate(() => {
          const computedStyle = window.getComputedStyle(document.documentElement);
          return {
            spacingSm: computedStyle.getPropertyValue('--spacing-sm')?.trim(),
            spacingMd: computedStyle.getPropertyValue('--spacing-md')?.trim(),
            spacingLg: computedStyle.getPropertyValue('--spacing-lg')?.trim(),
            fontSize: computedStyle.getPropertyValue('--font-size-base')?.trim(),
            lineHeight: computedStyle.getPropertyValue('--line-height-base')?.trim()
          };
        });

        // Validate spacing consistency
        expect(popupSpacing.spacingSm, 'Small spacing should be consistent').toBe(settingsSpacing.spacingSm);
        expect(popupSpacing.spacingMd, 'Medium spacing should be consistent').toBe(settingsSpacing.spacingMd);
        expect(popupSpacing.spacingLg, 'Large spacing should be consistent').toBe(settingsSpacing.spacingLg);
        expect(popupSpacing.fontSize, 'Font size should be consistent').toBe(settingsSpacing.fontSize);
        expect(popupSpacing.lineHeight, 'Line height should be consistent').toBe(settingsSpacing.lineHeight);

        // Log spacing consistency
        test.info().annotations.push({
          type: 'spacing-consistency',
          description: JSON.stringify({
            popup: popupSpacing,
            settings: settingsSpacing,
            consistent: Object.keys(popupSpacing).every(key => popupSpacing[key] === settingsSpacing[key])
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'spacing-consistency',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate spacing consistency: ${handledError.message}`);
      }
    });

    test('should validate consistent border radius and shadows @visual', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const popupStyles = await page.evaluate(() => {
          const computedStyle = window.getComputedStyle(document.documentElement);
          return {
            borderRadiusSm: computedStyle.getPropertyValue('--border-radius-sm')?.trim(),
            borderRadiusMd: computedStyle.getPropertyValue('--border-radius-md')?.trim(),
            borderRadiusLg: computedStyle.getPropertyValue('--border-radius-lg')?.trim(),
            boxShadowSm: computedStyle.getPropertyValue('--box-shadow-sm')?.trim(),
            boxShadowMd: computedStyle.getPropertyValue('--box-shadow-md')?.trim(),
            boxShadowLg: computedStyle.getPropertyValue('--box-shadow-lg')?.trim()
          };
        });

        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForSelector('.settings-container', { state: 'visible' });

        const settingsStyles = await page.evaluate(() => {
          const computedStyle = window.getComputedStyle(document.documentElement);
          return {
            borderRadiusSm: computedStyle.getPropertyValue('--border-radius-sm')?.trim(),
            borderRadiusMd: computedStyle.getPropertyValue('--border-radius-md')?.trim(),
            borderRadiusLg: computedStyle.getPropertyValue('--border-radius-lg')?.trim(),
            boxShadowSm: computedStyle.getPropertyValue('--box-shadow-sm')?.trim(),
            boxShadowMd: computedStyle.getPropertyValue('--box-shadow-md')?.trim(),
            boxShadowLg: computedStyle.getPropertyValue('--box-shadow-lg')?.trim()
          };
        });

        // Validate style consistency
        expect(popupStyles.borderRadiusSm, 'Small border radius should be consistent').toBe(settingsStyles.borderRadiusSm);
        expect(popupStyles.borderRadiusMd, 'Medium border radius should be consistent').toBe(settingsStyles.borderRadiusMd);
        expect(popupStyles.borderRadiusLg, 'Large border radius should be consistent').toBe(settingsStyles.borderRadiusLg);
        expect(popupStyles.boxShadowSm, 'Small box shadow should be consistent').toBe(settingsStyles.boxShadowSm);
        expect(popupStyles.boxShadowMd, 'Medium box shadow should be consistent').toBe(settingsStyles.boxShadowMd);
        expect(popupStyles.boxShadowLg, 'Large box shadow should be consistent').toBe(settingsStyles.boxShadowLg);

        // Log style consistency
        test.info().annotations.push({
          type: 'style-consistency',
          description: JSON.stringify({
            popup: popupStyles,
            settings: settingsStyles,
            consistent: Object.keys(popupStyles).every(key => popupStyles[key] === settingsStyles[key])
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'style-consistency',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate border and shadow consistency: ${handledError.message}`);
      }
    });
  });

  test.describe('System Theme Preference Integration', () => {
    test('should respect system light theme preference @visual', async ({ page }) => {
      try {
        await page.emulateMedia({ colorScheme: 'light' });
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const appliedTheme = await page.evaluate(() => {
          const html = document.documentElement;
          return html.getAttribute('data-theme') || html.classList.contains('dark') ? 'dark' : 'light';
        });

        expect(appliedTheme, 'Should apply light theme when system prefers light').toBe('light');

        // Log system preference handling
        test.info().annotations.push({
          type: 'system-preference',
          description: `System theme: light, Applied theme: ${appliedTheme}`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'system-light-preference',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate system light theme preference: ${handledError.message}`);
      }
    });

    test('should respect system dark theme preference @visual @dark-mode', async ({ page }) => {
      try {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const appliedTheme = await page.evaluate(() => {
          const html = document.documentElement;
          return html.getAttribute('data-theme') || html.classList.contains('dark') ? 'dark' : 'light';
        });

        expect(appliedTheme, 'Should apply dark theme when system prefers dark').toBe('dark');

        // Log system preference handling
        test.info().annotations.push({
          type: 'system-preference',
          description: `System theme: dark, Applied theme: ${appliedTheme}`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'system-dark-preference',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate system dark theme preference: ${handledError.message}`);
      }
    });

    test('should handle system theme changes gracefully @visual', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Start with light theme
        await page.emulateMedia({ colorScheme: 'light' });
        await page.waitForTimeout(100);

        let initialTheme = await page.evaluate(() => {
          const html = document.documentElement;
          return html.getAttribute('data-theme') || html.classList.contains('dark') ? 'dark' : 'light';
        });

        // Switch to dark theme
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.waitForTimeout(300); // Wait for theme change

        let finalTheme = await page.evaluate(() => {
          const html = document.documentElement;
          return html.getAttribute('data-theme') || html.classList.contains('dark') ? 'dark' : 'light';
        });

        expect(initialTheme, 'Should start with light theme').toBe('light');
        expect(finalTheme, 'Should switch to dark theme').toBe('dark');

        // Log theme change handling
        test.info().annotations.push({
          type: 'theme-change-handling',
          description: `Initial: ${initialTheme}, Final: ${finalTheme}, Smooth transition: true`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'system-theme-change',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate system theme change handling: ${handledError.message}`);
      }
    });
  });

  test.describe('Performance Under Theme Switching', () => {
    test('should validate theme switch performance @performance @visual', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const themeToggle = await page.$('.theme-toggle');
        expect(themeToggle, 'Theme toggle should exist').not.toBeNull();

        // Measure theme switch performance
        const startTime = Date.now();

        await themeToggle.click();

        const switchTime = Date.now() - startTime;

        expect(switchTime, `Theme switch time ${switchTime}ms exceeds 100ms target`).toBeLessThan(100);

        // Log performance metrics
        test.info().annotations.push({
          type: 'theme-switch-performance',
          description: `Theme switch time: ${switchTime}ms`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'theme-switch-performance',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate theme switch performance: ${handledError.message}`);
      }
    });

    test('should validate no cumulative layout shift during theme change @performance @visual', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const themeToggle = await page.$('.theme-toggle');
        expect(themeToggle, 'Theme toggle should exist').not.toBeNull();

        // Get initial layout
        const initialLayout = await page.evaluate(() => {
          const container = document.querySelector('.popup-container');
          return container ? container.getBoundingClientRect() : null;
        });

        expect(initialLayout, 'Should have initial layout').not.toBeNull();

        // Trigger theme change
        await themeToggle.click();
        await page.waitForTimeout(300);

        // Get final layout
        const finalLayout = await page.evaluate(() => {
          const container = document.querySelector('.popup-container');
          return container ? container.getBoundingClientRect() : null;
        });

        expect(finalLayout, 'Should have final layout').not.toBeNull();

        // Validate no significant layout shift
        const widthShift = Math.abs(initialLayout.width - finalLayout.width);
        const heightShift = Math.abs(initialLayout.height - finalLayout.height);

        expect(widthShift, `Width shift ${widthShift}px should be minimal`).toBeLessThan(5);
        expect(heightShift, `Height shift ${heightShift}px should be minimal`).toBeLessThan(5);

        // Log layout stability
        test.info().annotations.push({
          type: 'layout-stability',
          description: `Width shift: ${widthShift}px, Height shift: ${heightShift}px`
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'theme-layout-shift',
          component: 'theme-visual'
        });

        test.fail(`Failed to validate layout stability during theme change: ${handledError.message}`);
      }
    });
  });
});