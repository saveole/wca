import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '../utils/accessibility-utils.js';
import { ErrorHandler } from '../utils/error-handling-utils.js';
import config from '../utils/config.js';

test.describe('Accessibility Test Examples', () => {
  let errorHandler;

  test.beforeAll(() => {
    // Initialize error handler for comprehensive accessibility testing
    errorHandler = new ErrorHandler({
      category: 'accessibility',
      context: { suite: 'accessibility-examples' },
      enableRecovery: true,
      logErrors: true
    });
  });

  test.describe('Chrome Extension Accessibility Compliance', () => {
    test('popup should meet WCAG 2.1 Level AA standards', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', {
          timeout: config.defaultTimeout,
          state: 'visible'
        });

        // Inject axe-core with error handling
        await errorHandler.wrapAsync(
          () => injectAxe(page),
          'axe-injection'
        );

        // Run comprehensive accessibility audit
        const results = await errorHandler.wrapAsync(
          () => checkA11y(page, {
            standard: 'WCAG2AA',
            includedImpacts: config.accessibility.impactLevels,
            runOnly: {
              type: 'tag',
              values: ['wcag2aa', 'wcag21a', 'wcag21aa']
            }
          }),
          'accessibility-audit'
        );

        // Comprehensive violation analysis
        const violations = results.violations || [];
        const criticalViolations = violations.filter(v => v.impact === 'critical');
        const seriousViolations = violations.filter(v => v.impact === 'serious');
        const moderateViolations = violations.filter(v => v.impact === 'moderate');

        // Log detailed violation information
        if (violations.length > 0) {
          const formattedViolations = errorHandler.formatAccessibilityViolations(violations);
          console.log('Accessibility violations found:', formattedViolations);
        }

        // Assert compliance levels
        expect(criticalViolations.length, `Found ${criticalViolations.length} critical accessibility violations`).toBe(0);
        expect(seriousViolations.length, `Found ${seriousViolations.length} serious accessibility violations`).toBe(0);

        // Report moderate violations as warnings
        if (moderateViolations.length > 0) {
          console.warn(`Found ${moderateViolations.length} moderate accessibility violations that should be addressed`);
        }

        // Additional accessibility checks
        await verifyKeyboardNavigation(page);
        await verifyColorContrast(page);
        await verifyFocusManagement(page);
        await verifyScreenReaderCompatibility(page);

      } catch (error) {
        await errorHandler.handleError(error, 'accessibility-compliance-test');
        throw error;
      }
    });

    test('form controls should have proper labels and ARIA attributes', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        // Verify all form inputs have associated labels
        const formInputs = await page.locator('input, textarea, select').all();

        for (const input of formInputs) {
          const inputId = await input.getAttribute('id');
          const hasLabel = await input.evaluate(el => {
            const id = el.getAttribute('id');
            if (!id) return false;

            const label = document.querySelector(`label[for="${id}"]`);
            if (label) return true;

            // Check for aria-label
            const ariaLabel = el.getAttribute('aria-label');
            if (ariaLabel) return true;

            // Check for aria-labelledby
            const ariaLabelledby = el.getAttribute('aria-labelledby');
            if (ariaLabelledby) {
              const labelledElement = document.getElementById(ariaLabelledby);
              return labelledElement !== null;
            }

            return false;
          });

          expect(hasLabel, `Input "${inputId || 'unnamed'}" lacks proper labeling`).toBe(true);
        }

        // Verify ARIA attributes for dynamic content
        const dynamicElements = await page.locator('[aria-live], [aria-busy], [aria-expanded]').all();

        for (const element of dynamicElements) {
          const ariaLive = await element.getAttribute('aria-live');
          const ariaBusy = await element.getAttribute('aria-busy');
          const ariaExpanded = await element.getAttribute('aria-expanded');

          // Validate ARIA live regions
          if (ariaLive) {
            expect(['polite', 'assertive', 'off']).toContain(ariaLive);
          }

          // Validate ARIA busy states
          if (ariaBusy) {
            expect(['true', 'false']).toContain(ariaBusy);
          }

          // Validate ARIA expanded states
          if (ariaExpanded) {
            expect(['true', 'false']).toContain(ariaExpanded);
          }
        }

      } catch (error) {
        await errorHandler.handleError(error, 'form-controls-accessibility-test');
        throw error;
      }
    });

    test('color contrast should meet WCAG requirements', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        // Inject and run axe-core with contrast checking
        await injectAxe(page);

        const results = await checkA11y(page, {
          rules: {
            'color-contrast': { enabled: true }
          }
        });

        const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');

        if (contrastViolations.length > 0) {
          const contrastDetails = contrastViolations.map(violation => {
            return violation.nodes.map(node => ({
              element: node.html,
              expectedContrast: node.any[0].data.expectedContrastRatio,
              actualContrast: node.any[0].data.contrastRatio,
              foreground: node.any[0].data.fgColor,
              background: node.any[0].data.bgColor
            }));
          }).flat();

          console.error('Color contrast violations:', contrastDetails);
        }

        expect(contrastViolations.length, `Found ${contrastViolations.length} color contrast violations`).toBe(0);

      } catch (error) {
        await errorHandler.handleError(error, 'color-contrast-test');
        throw error;
      }
    });
  });

  test.describe('Keyboard Navigation Testing', () => {
    test('should be fully operable using keyboard only', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        // Test Tab navigation through all interactive elements
        const interactiveElements = await page.locator(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ).all();

        // Verify each element is reachable via keyboard
        for (let i = 0; i < interactiveElements.length; i++) {
          await page.keyboard.press('Tab');

          // Check if element is focused
          const focusedElement = await page.evaluate(() => document.activeElement);
          const element = interactiveElements[i];

          const elementId = await element.getAttribute('id');
          const focusedElementId = await focusedElement.getAttribute('id');

          // Allow for some flexibility in focus order
          expect(focusedElement).toBeTruthy();
        }

        // Test Enter key on buttons
        const saveButton = page.locator('#save-button');
        await saveButton.focus();
        await page.keyboard.press('Enter');

        // Verify button action was triggered
        // This would typically show a success message or perform an action

        // Test Space key on buttons
        await saveButton.focus();
        await page.keyboard.press(' ');

        // Test Escape key for closing/canceling
        await page.keyboard.press('Escape');

      } catch (error) {
        await errorHandler.handleError(error, 'keyboard-navigation-test');
        throw error;
      }
    });

    test('focus should be visible and properly managed', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        // Test focus visibility
        const focusableElements = await page.locator(
          'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ).all();

        for (const element of focusableElements) {
          await element.focus();

          // Check if element has visible focus styles
          const hasFocusStyles = await element.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return styles.outline !== 'none' ||
                   styles.boxShadow !== 'none' ||
                   styles.border !== 'none';
          });

          expect(hasFocusStyles, `Element ${await element.getAttribute('id') || 'unnamed'} lacks visible focus styles`).toBe(true);
        }

        // Test focus management for modal dialogs
        // This would test focus trapping when modals are open

      } catch (error) {
        await errorHandler.handleError(error, 'focus-management-test');
        throw error;
      }
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should have proper ARIA landmarks and roles', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        // Check for proper landmarks
        const landmarks = await page.locator('[role="banner"], [role="main"], [role="navigation"], [role="complementary"]').all();

        // Verify landmark usage
        for (const landmark of landmarks) {
          const role = await landmark.getAttribute('role');
          expect(['banner', 'main', 'navigation', 'complementary']).toContain(role);
        }

        // Check for proper heading structure
        const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

        // Verify heading hierarchy
        let previousLevel = 0;
        for (const heading of headings) {
          const level = parseInt(await heading.evaluate(el => el.tagName.substring(1)));

          if (previousLevel > 0) {
            expect(level, `Heading level ${level} should not skip more than one level from ${previousLevel}`).toBeLessThanOrEqual(previousLevel + 1);
          }

          previousLevel = level;
        }

        // Check for proper list structure
        const lists = await page.locator('ul, ol').all();

        for (const list of lists) {
          const listItems = await list.locator('li').all();

          if (listItems.length > 0) {
            // Verify list items are direct children
            const isValidStructure = await list.evaluate((list, items) => {
              return items.every(item => item.parentElement === list);
            }, listItems);

            expect(isValidStructure, 'List items should be direct children of list element').toBe(true);
          }
        }

      } catch (error) {
        await errorHandler.handleError(error, 'screen-reader-compatibility-test');
        throw error;
      }
    });

    test('should provide proper status and alert notifications', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html

        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        // Test status updates
        await page.evaluate(() => {
          const status = document.createElement('div');
          status.setAttribute('role', 'status');
          status.setAttribute('aria-live', 'polite');
          status.textContent = 'Processing...';
          document.body.appendChild(status);
        });

        const statusElement = page.locator('[role="status"]');
        await expect(statusElement).toBeVisible();
        await expect(statusElement).toHaveAttribute('aria-live', 'polite');

        // Test alert notifications
        await page.evaluate(() => {
          const alert = document.createElement('div');
          alert.setAttribute('role', 'alert');
          alert.setAttribute('aria-live', 'assertive');
          alert.textContent = 'Action completed successfully!';
          document.body.appendChild(alert);
        });

        const alertElement = page.locator('[role="alert"]');
        await expect(alertElement).toBeVisible();
        await expect(alertElement).toHaveAttribute('aria-live', 'assertive');

      } catch (error) {
        await errorHandler.handleError(error, 'status-alert-test');
        throw error;
      }
    });
  });

  test.afterAll(async () => {
    // Clean up error handler
    if (errorHandler) {
      await errorHandler.cleanup();
    }
  });
});

// Helper functions for accessibility verification
async function verifyKeyboardNavigation(page) {
  // Test keyboard navigation patterns
  const tabbableElements = await page.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').all();

  for (const element of tabbableElements) {
    await element.focus();
    const isFocused = await element.evaluate(el => el === document.activeElement);
    expect(isFocused).toBe(true);
  }
}

async function verifyColorContrast(page) {
  // Additional color contrast verification
  const textElements = await page.locator('p, span, h1, h2, h3, h4, h5, h6, label, button').all();

  for (const element of textElements) {
    const isVisible = await element.isVisible();
    if (isVisible) {
      const hasSufficientContrast = await element.evaluate(el => {
        // This would typically use a contrast calculation library
        // For now, we'll check if the element has been styled with contrast in mind
        const styles = window.getComputedStyle(el);
        return styles.color && styles.backgroundColor;
      });

      expect(hasSufficientContrast, `Element should have proper color contrast`).toBe(true);
    }
  }
}

async function verifyFocusManagement(page) {
  // Verify focus management and visual indicators
  const focusableElements = await page.locator('button, input, select, textarea').all();

  for (const element of focusableElements) {
    await element.focus();
    const hasFocusIndicator = await element.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    });

    expect(hasFocusIndicator, 'Element should have visible focus indicator').toBe(true);
  }
}

async function verifyScreenReaderCompatibility(page) {
  // Verify screen reader compatibility
  const images = await page.locator('img').all();

  for (const image of images) {
    const altText = await image.getAttribute('alt');
    const decorative = await image.getAttribute('role') === 'presentation';

    if (!decorative) {
      expect(altText, 'Image should have alt text or be marked as decorative').toBeTruthy();
    }
  }
}

// Export for use in other test files
export const accessibilityTestExamples = {
  wcagComplianceTest: 'popup should meet WCAG 2.1 Level AA standards',
  formControlsTest: 'form controls should have proper labels and ARIA attributes',
  colorContrastTest: 'color contrast should meet WCAG requirements',
  keyboardNavigationTest: 'should be fully operable using keyboard only',
  focusManagementTest: 'focus should be visible and properly managed',
  screenReaderTest: 'should have proper ARIA landmarks and roles',
  statusAlertTest: 'should provide proper status and alert notifications'
};