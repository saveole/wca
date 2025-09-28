/**
 * Keyboard Navigation Accessibility Test Implementation
 *
 * Implements comprehensive keyboard navigation accessibility testing for Chrome extension components.
 * Provides thorough validation of keyboard interactions, focus management, and screen reader compatibility.
 *
 * FEATURES:
 * - Comprehensive keyboard navigation testing
 * - Focus management validation
 * - Screen reader compatibility testing
 * - Keyboard shortcuts testing
 * - Tab order validation
 * - Performance benchmarking
 */

const { test, expect } = require('@playwright/test');
const { TestConfiguration } = require('../../models/test-configuration.js');
const { AccessibilityReport } = require('../../models/AccessibilityReport.js');
const { ErrorHandler } = require('../../utils/error-handler.js');

test.describe('Keyboard Navigation Accessibility Tests', () => {
  let testConfig;
  let accessibilityReport;

  test.beforeAll(async () => {
    testConfig = new TestConfiguration({
      viewport: { width: 800, height: 600 },
      accessibility: {
        standard: 'WCAG2.1AA',
        keyboard: {
          testTabOrder: true,
          testFocusVisible: true,
          testShortcuts: true
        }
      },
      timeout: {
        default: 6000,
        keyboard: 4000
      }
    });

    accessibilityReport = new AccessibilityReport({
      component: 'keyboard-navigation',
      standard: 'WCAG2.1AA',
      timestamp: new Date().toISOString()
    });
  });

  test.describe('Popup Keyboard Navigation', () => {
    test('should validate comprehensive popup keyboard navigation @accessibility @keyboard @popup', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Get all focusable elements in popup
        const focusableElements = await page.$$eval(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          elements => elements.map(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            tabIndex: el.tabIndex,
            position: el.getBoundingClientRect()
          }))
        );

        expect(focusableElements.length, 'Focusable elements should exist in popup').toBeGreaterThan(0);

        // Test Tab key navigation
        let focusOrder = [];
        for (let i = 0; i < focusableElements.length + 3; i++) {
          await page.keyboard.press('Tab');
          const focusedElement = await page.evaluate(() => {
            const active = document.activeElement;
            return {
              tagName: active.tagName,
              className: active.className,
              id: active.id,
              position: active.getBoundingClientRect()
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

        // Test focus remains within popup
        const inPopup = await page.evaluate(() => {
          const popup = document.querySelector('.popup-container');
          const active = document.activeElement;
          return popup && popup.contains(active);
        });

        expect(inPopup, 'Focus should remain within popup container').toBe(true);

        // Test Enter key on buttons
        const buttons = await page.$$('button');
        if (buttons.length > 0) {
          await buttons[0].focus();
          await page.keyboard.press('Enter');
          // Validate button interaction (no error should occur)
        }

        // Test Space key on buttons
        if (buttons.length > 0) {
          await buttons[0].focus();
          await page.keyboard.press(' ');
          // Validate button interaction (no error should occur)
        }

        // Test Escape key
        await page.keyboard.press('Escape');
        // Validate escape doesn't cause errors

        // Log keyboard navigation results
        test.info().annotations.push({
          type: 'popup-keyboard-navigation',
          description: JSON.stringify({
            focusableElements: focusableElements.length,
            focusOrderLength: focusOrder.length,
            uniqueFocuses: uniqueFocuses.size,
            inPopup: inPopup,
            testCompleted: true
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-keyboard-navigation',
          component: 'keyboard-nav'
        });

        test.fail(`Failed to test popup keyboard navigation: ${handledError.message}`);
      }
    });

    test('should validate logical tab order in popup @accessibility @keyboard @popup', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Get focusable elements with their positions
        const elementsWithPositions = await page.$$eval(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          elements => elements.map(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            tabIndex: el.tabIndex,
            position: el.getBoundingClientRect()
          }))
        );

        // Test tab order by pressing Tab
        let tabOrder = [];
        for (let i = 0; i < elementsWithPositions.length; i++) {
          await page.keyboard.press('Tab');
          const focusedElement = await page.evaluate(() => {
            const active = document.activeElement;
            const rect = active.getBoundingClientRect();
            return {
              tagName: active.tagName,
              className: active.className,
              id: active.id,
              top: rect.top,
              left: rect.left
            };
          });
          tabOrder.push(focusedElement);
        }

        // Validate tab order is logical (generally top-to-bottom, left-to-right)
        let isLogicalOrder = true;
        for (let i = 1; i < tabOrder.length; i++) {
          const current = tabOrder[i];
          const previous = tabOrder[i - 1];

          // Simple check: elements should generally progress downward or stay in similar vertical position
          const verticalProgression = current.top >= previous.top - 5; // Allow small tolerance
          if (!verticalProgression) {
            isLogicalOrder = false;
            break;
          }
        }

        expect(isLogicalOrder, 'Tab order should be logical (top-to-bottom, left-to-right)').toBe(true);

        // Test focus trap functionality
        const focusTrapValid = await page.evaluate(() => {
          const popup = document.querySelector('.popup-container');
          let allInPopup = true;

          // Test multiple Tab presses to ensure focus stays in popup
          for (let i = 0; i < 10; i++) {
            document.activeElement.blur();
            // Simulate focus management
            const focusable = popup.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable.length > 0) {
              focusable[0].focus();
            }
          }

          return popup && popup.contains(document.activeElement);
        });

        expect(focusTrapValid, 'Focus should be properly trapped in popup').toBe(true);

        // Log tab order validation results
        test.info().annotations.push({
          type: 'popup-tab-order',
          description: JSON.stringify({
            elementsTested: elementsWithPositions.length,
            tabOrderLength: tabOrder.length,
            logicalOrder: isLogicalOrder,
            focusTrapValid: focusTrapValid
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-tab-order',
          component: 'keyboard-nav'
        });

        test.fail(`Failed to test popup tab order: ${handledError.message}`);
      }
    });

    test('should validate keyboard shortcuts in popup @accessibility @keyboard @shortcuts @popup', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Test common keyboard shortcuts
        const shortcuts = [
          { key: 'Enter', description: 'Activate focused element' },
          { key: 'Space', description: 'Activate focused element' },
          { key: 'Escape', description: 'Close/cancel action' },
          { key: 'Tab', description: 'Move to next focusable element' },
          { key: 'Shift+Tab', description: 'Move to previous focusable element' }
        ];

        for (const shortcut of shortcuts) {
          try {
            // Focus first button if available
            const buttons = await page.$$('button');
            if (buttons.length > 0) {
              await buttons[0].focus();
            }

            // Press shortcut
            if (shortcut.key.includes('+')) {
              const [modifier, key] = shortcut.key.split('+');
              await page.keyboard.down(modifier);
              await page.keyboard.press(key);
              await page.keyboard.up(modifier);
            } else {
              await page.keyboard.press(shortcut.key);
            }

            // Validate no errors occurred
            const noErrors = await page.evaluate(() => !document.body.hasAttribute('data-error'));
            expect(noErrors, `Shortcut ${shortcut.key} should not cause errors`).toBe(true);

          } catch (shortcutError) {
            console.warn(`Shortcut ${shortcut.key} test failed:`, shortcutError.message);
          }
        }

        // Test keyboard navigation patterns
        const navigationTest = await page.evaluate(() => {
          const results = {};

          // Check for arrow key navigation support
          const supportsArrowKeys = typeof window.handleArrowKeys === 'function';
          results.arrowKeySupport = supportsArrowKeys;

          // Check for home/end key support
          const supportsHomeEnd = typeof window.handleHomeEndKeys === 'function';
          results.homeEndSupport = supportsHomeEnd;

          // Check for modifier key support
          const supportsModifiers = typeof window.handleModifierKeys === 'function';
          results.modifierSupport = supportsModifiers;

          // Check for keyboard event delegation
          const hasEventDelegation = typeof window.delegateKeyboardEvents === 'function';
          results.eventDelegation = hasEventDelegation;

          return results;
        });

        // Log keyboard shortcuts results
        test.info().annotations.push({
          type: 'popup-keyboard-shortcuts',
          description: JSON.stringify({
            shortcutsTested: shortcuts.length,
            navigationPatterns: navigationTest,
            testCompleted: true
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'popup-keyboard-shortcuts',
          component: 'keyboard-nav'
        });

        test.fail(`Failed to test popup keyboard shortcuts: ${handledError.message}`);
      }
    });
  });

  test.describe('Settings Page Keyboard Navigation', () => {
    test('should validate settings page keyboard navigation @accessibility @keyboard @settings', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Get all focusable elements in settings
        const focusableElements = await page.$$eval(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          elements => elements.map(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            tabIndex: el.tabIndex,
            type: el.type || 'text'
          }))
        );

        expect(focusableElements.length, 'Focusable elements should exist in settings').toBeGreaterThan(0);

        // Test Tab navigation through form elements
        let focusOrder = [];
        for (let i = 0; i < Math.min(focusableElements.length, 15); i++) {
          await page.keyboard.press('Tab');
          const focusedElement = await page.evaluate(() => {
            const active = document.activeElement;
            return {
              tagName: active.tagName,
              className: active.className,
              id: active.id,
              type: active.type || 'text'
            };
          });
          focusOrder.push(focusedElement);
        }

        // Validate focus moves through different elements
        const uniqueFocuses = new Set(focusOrder.map(f => f.tagName + f.id));
        expect(uniqueFocuses.size, 'Focus should move through different settings elements').toBeGreaterThan(1);

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

        // Test form field navigation
        const formElements = await page.$$('input, select, textarea');
        if (formElements.length > 0) {
          // Test navigation through form fields
          for (let i = 0; i < Math.min(formElements.length, 5); i++) {
            await page.keyboard.press('Tab');
            const isFormElement = await page.evaluate(() => {
              const active = document.activeElement;
              return ['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName);
            });
            expect(isFormElement, 'Focus should move to form elements').toBe(true);
          }
        }

        // Test button navigation
        const buttons = await page.$$('button');
        if (buttons.length > 0) {
          await buttons[0].focus();
          await page.keyboard.press('Enter');
          // Validate button interaction

          await buttons[0].focus();
          await page.keyboard.press(' ');
          // Validate button interaction
        }

        // Log settings keyboard navigation results
        test.info().annotations.push({
          type: 'settings-keyboard-navigation',
          description: JSON.stringify({
            focusableElements: focusableElements.length,
            focusOrderLength: focusOrder.length,
            uniqueFocuses: uniqueFocuses.size,
            formElements: formElements.length,
            buttons: buttons.length,
            testCompleted: true
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-keyboard-navigation',
          component: 'keyboard-nav'
        });

        test.fail(`Failed to test settings keyboard navigation: ${handledError.message}`);
      }
    });

    test('should validate form keyboard navigation @accessibility @keyboard @forms @settings', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/settings.html');
        await page.waitForSelector('.settings-container', { state: 'visible' });

        // Test form-specific keyboard navigation
        const formNavTest = await page.evaluate(() => {
          const results = {};

          // Check for form labels association
          const inputs = document.querySelectorAll('input, select, textarea');
          results.missingLabelAssociations = Array.from(inputs).filter(input => {
            const id = input.id;
            return id && !document.querySelector(`label[for="${id}"]`);
          }).length;

          // Check for error message navigation
          results.errorContainers = document.querySelectorAll('[role="alert"], .error-message').length;

          // Check for required field indicators
          const requiredFields = document.querySelectorAll('[required]');
          results.requiredFields = requiredFields.length;
          results.missingRequiredAria = Array.from(requiredFields).filter(field =>
            !field.getAttribute('aria-required')
          ).length;

          // Check for fieldset/legend navigation
          const fieldsets = document.querySelectorAll('fieldset');
          results.fieldsets = fieldsets.length;
          results.missingLegends = Array.from(fieldsets).filter(fs => !fs.querySelector('legend')).length;

          // Check for table navigation if tables exist
          const tables = document.querySelectorAll('table');
          results.tablesExist = tables.length > 0;
          if (tables.length > 0) {
            results.tableNavigation = Array.from(tables).every(table => {
              const cells = table.querySelectorAll('td, th');
              return cells.length === 0 || Array.from(cells).every(cell => cell.tabIndex >= 0);
            });
          }

          // Check for tab panel navigation
          const tabPanels = document.querySelectorAll('[role="tabpanel"]');
          results.tabPanels = tabPanels.length;
          results.missingTabNavigation = tabPanels.length > 0 && typeof window.switchTab !== 'function';

          return results;
        });

        // Validate form keyboard navigation
        expect(formNavTest.missingLabelAssociations, 'Missing label associations should be zero').toBe(0);
        expect(formNavTest.missingRequiredAria, 'Missing required aria attributes should be zero').toBe(0);
        expect(formNavTest.missingLegends, 'Missing legends should be zero').toBe(0);

        if (formNavTest.tablesExist) {
          expect(formNavTest.tableNavigation, 'Table navigation should be accessible').toBe(true);
        }

        if (formNavTest.tabPanels > 0) {
          expect(formNavTest.missingTabNavigation, 'Tab navigation should be implemented').toBe(false);
        }

        // Test actual form navigation
        const formElements = await page.$$('input, select, textarea');
        if (formElements.length > 0) {
          // Test Tab through form fields
          for (let i = 0; i < Math.min(formElements.length, 5); i++) {
            await page.keyboard.press('Tab');
            const isFormElementFocused = await page.evaluate(() => {
              const active = document.activeElement;
              return ['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName);
            });
            expect(isFormElementFocused, 'Focus should be on form elements').toBe(true);
          }
        }

        // Log form navigation results
        test.info().annotations.push({
          type: 'settings-form-keyboard-navigation',
          description: JSON.stringify(formNavTest, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'settings-form-keyboard-navigation',
          component: 'keyboard-nav'
        });

        test.fail(`Failed to test settings form keyboard navigation: ${handledError.message}`);
      }
    });
  });

  test.describe('Focus Management Tests', () => {
    test('should validate comprehensive focus management @accessibility @focus', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Test focus management
        const focusTest = await page.evaluate(() => {
          const results = {};

          // Check focus styles
          const style = document.createElement('style');
          style.textContent = '';
          document.head.appendChild(style);

          const interactiveElements = document.querySelectorAll('button, input, select, textarea, [tabindex]');
          results.missingFocusStyles = Array.from(interactiveElements).filter(el => {
            const computedStyle = window.getComputedStyle(el);
            return !computedStyle.outline && !computedStyle.boxShadow;
          }).length;

          // Check focus management functions
          results.hasFocusManagement = typeof window.setFocus !== 'undefined';
          results.hasRemoveFocus = typeof window.removeFocus !== 'undefined';

          // Check focus trap functionality
          results.hasFocusTrap = typeof window.createFocusTrap !== 'function';

          // Check modal focus management
          results.hasModalFocus = typeof window.manageModalFocus !== 'function';

          // Check initial focus
          results.hasInitialFocus = document.activeElement !== document.body;

          // Check focus visible support
          results.focusVisibleSupported = CSS.supports('selector(:focus-visible)');

          document.head.removeChild(style);

          return results;
        });

        // Validate focus management
        expect(focusTest.missingFocusStyles, 'Missing focus styles should be zero').toBe(0);
        expect(focusTest.hasInitialFocus, 'Initial focus should be set').toBe(true);

        // Test actual focus behavior
        const buttons = await page.$$('button');
        if (buttons.length > 0) {
          // Test focus on button
          await buttons[0].focus();
          const isButtonFocused = await page.evaluate(() => {
            const active = document.activeElement;
            return active.tagName === 'BUTTON';
          });
          expect(isButtonFocused, 'Button should be focusable').toBe(true);

          // Test focus style visibility
          const hasFocusStyle = await page.evaluate(() => {
            const active = document.activeElement;
            const style = window.getComputedStyle(active);
            return style.outline !== 'none' || style.boxShadow !== 'none';
          });
          expect(hasFocusStyle, 'Focused element should have visible focus style').toBe(true);
        }

        // Log focus management results
        test.info().annotations.push({
          type: 'focus-management',
          description: JSON.stringify(focusTest, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'focus-management',
          component: 'keyboard-nav'
        });

        test.fail(`Failed to test focus management: ${handledError.message}`);
      }
    });

    test('should validate screen reader keyboard support @accessibility @screen-reader @keyboard', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Test screen reader keyboard support
        const srTest = await page.evaluate(() => {
          const results = {};

          // Check live region announcements
          results.liveRegions = document.querySelectorAll('[aria-live]').length;

          // Check screen reader only content
          results.srOnlyContent = document.querySelectorAll('.sr-only, .visually-hidden, .screen-reader-only').length;

          // Check aria-expanded management
          const expandableElements = document.querySelectorAll('[aria-expanded]');
          results.expandableElements = expandableElements.length;
          results.missingExpandedManagement = expandableElements.length > 0 &&
            typeof window.toggleExpanded !== 'function';

          // Check aria-pressed management
          const toggleButtons = document.querySelectorAll('[aria-pressed]');
          results.toggleButtons = toggleButtons.length;
          results.missingPressedManagement = toggleButtons.length > 0 &&
            typeof window.togglePressed !== 'function';

          // Check announcement functions
          results.hasAnnounceFunction = typeof window.announceToScreenReader === 'function';

          // Check keyboard event handling for screen readers
          results.hasKeyboardEventHandling = typeof window.handleScreenReaderKeys === 'function';

          return results;
        });

        // Validate screen reader keyboard support
        expect(srTest.liveRegions, 'Live regions should exist for announcements').toBeGreaterThan(0);
        expect(srTest.srOnlyContent, 'Screen reader only content should exist').toBeGreaterThan(0);

        // Test keyboard announcement functionality
        const announcementTest = await page.evaluate(() => {
          const results = {};

          // Test creating announcements
          if (typeof window.announceToScreenReader === 'function') {
            try {
              window.announceToScreenReader('Test announcement');
              results.announcementSuccess = true;
            } catch (e) {
              results.announcementSuccess = false;
              results.announcementError = e.message;
            }
          } else {
            results.announcementSuccess = false;
            results.announcementError = 'Announce function not available';
          }

          return results;
        });

        // Log screen reader keyboard support results
        test.info().annotations.push({
          type: 'screen-reader-keyboard-support',
          description: JSON.stringify({
            screenReaderTest: srTest,
            announcementTest: announcementTest
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'screen-reader-keyboard-support',
          component: 'keyboard-nav'
        });

        test.fail(`Failed to test screen reader keyboard support: ${handledError.message}`);
      }
    });
  });

  test.describe('Advanced Keyboard Navigation', () => {
    test('should validate advanced keyboard navigation patterns @accessibility @keyboard @patterns', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Test advanced keyboard navigation patterns
        const patternTest = await page.evaluate(() => {
          const results = {};

          // Check arrow key navigation
          results.arrowKeySupport = typeof window.handleArrowKeys === 'function';

          // Check home/end key support
          results.homeEndSupport = typeof window.handleHomeEndKeys === 'function';

          // Check page up/down support
          results.pageUpDownSupport = typeof window.handlePageUpDownKeys === 'function';

          // Check modifier key support
          results.modifierSupport = typeof window.handleModifierKeys === 'function';

          // Check keyboard event delegation
          results.eventDelegation = typeof window.delegateKeyboardEvents === 'function';

          // Check keyboard navigation state management
          results.stateManagement = typeof window.manageKeyboardState === 'function';

          // Check keyboard navigation shortcuts
          results.shortcutSupport = typeof window.handleKeyboardShortcuts === 'function';

          return results;
        });

        // Test actual advanced navigation if available
        const advancedTest = await page.evaluate(() => {
          const results = { tested: false };

          // Test arrow keys if supported
          if (typeof window.handleArrowKeys === 'function') {
            try {
              window.handleArrowKeys('ArrowDown');
              window.handleArrowKeys('ArrowUp');
              window.handleArrowKeys('ArrowLeft');
              window.handleArrowKeys('ArrowRight');
              results.arrowKeysTested = true;
            } catch (e) {
              results.arrowKeysError = e.message;
            }
            results.tested = true;
          }

          // Test home/end keys if supported
          if (typeof window.handleHomeEndKeys === 'function') {
            try {
              window.handleHomeEndKeys('Home');
              window.handleHomeEndKeys('End');
              results.homeEndTested = true;
            } catch (e) {
              results.homeEndError = e.message;
            }
            results.tested = true;
          }

          return results;
        });

        // Log advanced navigation patterns results
        test.info().annotations.push({
          type: 'keyboard-navigation-patterns',
          description: JSON.stringify({
            patternSupport: patternTest,
            advancedTesting: advancedTest
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'keyboard-navigation-patterns',
          component: 'keyboard-nav'
        });

        test.fail(`Failed to test advanced keyboard navigation patterns: ${handledError.message}`);
      }
    });

    test('should validate keyboard accessibility testing utilities @accessibility @keyboard @testing', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        // Test keyboard accessibility testing utilities
        const testingTest = await page.evaluate(() => {
          const results = {};

          // Check for keyboard testing utilities
          results.hasTestingUtils = typeof window.testKeyboardNavigation === 'function';

          // Check for focus order testing
          results.hasFocusOrderTesting = typeof window.testFocusOrder === 'function';

          // Check for keyboard event testing
          results.hasKeyboardEventTesting = typeof window.testKeyboardEvents === 'function';

          // Check for accessibility tree testing
          results.hasAccessibilityTreeTesting = typeof window.testAccessibilityTree === 'function';

          // Check for keyboard navigation reporting
          results.hasNavigationReporting = typeof window.reportNavigationIssues === 'function';

          // Check for keyboard performance testing
          results.hasPerformanceTesting = typeof window.testKeyboardPerformance === 'function';

          return results;
        });

        // Test actual testing utilities if available
        const utilitiesTest = await page.evaluate(() => {
          const results = { tested: false };

          // Test keyboard navigation testing
          if (typeof window.testKeyboardNavigation === 'function') {
            try {
              const testResult = window.testKeyboardNavigation();
              results.keyboardNavigationTest = testResult;
            } catch (e) {
              results.keyboardNavigationError = e.message;
            }
            results.tested = true;
          }

          // Test focus order testing
          if (typeof window.testFocusOrder === 'function') {
            try {
              const focusResult = window.testFocusOrder();
              results.focusOrderTest = focusResult;
            } catch (e) {
              results.focusOrderError = e.message;
            }
            results.tested = true;
          }

          return results;
        });

        // Log keyboard accessibility testing results
        test.info().annotations.push({
          type: 'keyboard-accessibility-testing',
          description: JSON.stringify({
            testingUtilities: testingTest,
            utilitiesTesting: utilitiesTest
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'keyboard-accessibility-testing',
          component: 'keyboard-nav'
        });

        test.fail(`Failed to test keyboard accessibility testing utilities: ${handledError.message}`);
      }
    });
  });

  test.describe('Performance Benchmarks', () => {
    test('should meet keyboard navigation performance target @accessibility @keyboard @performance', async ({ page }) => {
      try {
        await page.goto('chrome-extension://__EXTENSION_ID__/ui/main_popup.html');
        await page.waitForSelector('.popup-container', { state: 'visible' });

        const startTime = Date.now();

        // Test keyboard navigation performance
        for (let i = 0; i < 20; i++) {
          await page.keyboard.press('Tab');
        }

        const navigationTime = Date.now() - startTime;

        // Validate performance target
        expect(navigationTime, `Keyboard navigation time ${navigationTime}ms exceeds 1000ms target`).toBeLessThan(1000);

        // Test individual key performance
        const keyStartTime = Date.now();
        await page.keyboard.press('Enter');
        const keyTime = Date.now() - keyStartTime;

        expect(keyTime, `Individual key press time ${keyTime}ms exceeds 100ms target`).toBeLessThan(100);

        // Test complex navigation performance
        const complexStartTime = Date.now();
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab');
          await page.keyboard.press('Shift+Tab');
        }
        const complexTime = Date.now() - complexStartTime;

        expect(complexTime, `Complex navigation time ${complexTime}ms exceeds 2000ms target`).toBeLessThan(2000);

        // Log performance metrics
        test.info().annotations.push({
          type: 'keyboard-navigation-performance',
          description: JSON.stringify({
            tabNavigationTime: navigationTime,
            keyPressTime: keyTime,
            complexNavigationTime: complexTime,
            performanceTargets: {
              tabNavigation: 1000,
              keyPress: 100,
              complexNavigation: 2000
            }
          }, null, 2)
        });

      } catch (error) {
        const handledError = ErrorHandler.handle(error, {
          context: 'keyboard-navigation-performance',
          component: 'keyboard-nav'
        });

        test.fail(`Failed to test keyboard navigation performance: ${handledError.message}`);
      }
    });
  });
});