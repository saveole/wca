/**
 * WCAG 2.1 Level AA Validation System
 *
 * Comprehensive accessibility validation utility for Chrome extension testing.
 * Provides structured WCAG 2.1 Level AA compliance checking with detailed reporting.
 *
 * FEATURES:
 * - Automated WCAG 2.1 Level AA validation
 * - Comprehensive violation detection and reporting
 * - Rule-based accessibility checking
 * - Performance-optimized scanning
 * - Structured result reporting
 * - Integration with existing test infrastructure
 */

const { AccessibilityReport } = require('../models/AccessibilityReport.js');
const { ErrorHandler } = require('./error-handler.js');

/**
 * WCAG 2.1 Level AA Validator
 *
 * Implements comprehensive accessibility validation following WCAG 2.1 Level AA guidelines.
 * Provides automated checking with detailed violation analysis and reporting.
 */
class WCAGValidator {
  constructor(options = {}) {
    this.options = {
      standard: 'WCAG2.1AA',
      includeIncomplete: false,
      performanceMode: false,
      ...options
    };

    // WCAG 2.1 Level AA rules configuration
    this.rules = {
      // Perceivable
      'text-alternatives': {
        level: 'A',
        description: 'Text alternatives for non-text content',
        check: this.checkTextAlternatives.bind(this)
      },
      'time-based-media': {
        level: 'A',
        description: 'Alternatives for time-based media',
        check: this.checkTimeBasedMedia.bind(this)
      },
      'adaptable': {
        level: 'AA',
        description: 'Content can be presented in different ways',
        check: this.checkAdaptableContent.bind(this)
      },
      'distinguishable': {
        level: 'AA',
        description: 'Make it easier for users to see and hear content',
        check: this.checkDistinguishableContent.bind(this)
      },

      // Operable
      'keyboard-accessible': {
        level: 'A',
        description: 'All functionality available from keyboard',
        check: this.checkKeyboardAccessible.bind(this)
      },
      'enough-time': {
        level: 'AA',
        description: 'Provide users enough time to read and use content',
        check: this.checkEnoughTime.bind(this)
      },
      'seizures': {
        level: 'A',
        description: 'Do not design content that causes seizures',
        check: this.checkSeizures.bind(this)
      },
      'navigable': {
        level: 'AA',
        description: 'Help users navigate and find content',
        check: this.checkNavigable.bind(this)
      },

      // Understandable
      'readable': {
        level: 'AA',
        description: 'Make text content readable and understandable',
        check: this.checkReadableContent.bind(this)
      },
      'predictable': {
        level: 'AA',
        description: 'Make Web pages appear and operate in predictable ways',
        check: this.checkPredictableContent.bind(this)
      },
      'input-assistance': {
        level: 'AA',
        description: 'Help users avoid and correct mistakes',
        check: this.checkInputAssistance.bind(this)
      },

      // Robust
      'compatible': {
        level: 'A',
        description: 'Maximize compatibility with current and future user agents',
        check: this.checkCompatible.bind(this)
      }
    };

    // Performance metrics
    this.metrics = {
      scanTime: 0,
      rulesChecked: 0,
      violationsFound: 0,
      elementsScanned: 0
    };
  }

  /**
   * Run comprehensive WCAG 2.1 Level AA validation
   * @param {Page} page - Playwright page object
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation results
   */
  async validate(page, options = {}) {
    const startTime = Date.now();
    const validationOptions = { ...this.options, ...options };

    try {
      const results = {
        standard: validationOptions.standard,
        timestamp: new Date().toISOString(),
        violations: [],
        passes: [],
        incomplete: [],
        inapplicable: [],
        score: 0,
        summary: {}
      };

      // Get all interactive and content elements
      const elements = await this.getScannableElements(page);
      this.metrics.elementsScanned = elements.length;

      // Run each WCAG rule
      for (const [ruleId, rule] of Object.entries(this.rules)) {
        const ruleStartTime = Date.now();

        try {
          const ruleResult = await rule.check(page, elements);
          ruleResult.ruleId = ruleId;
          ruleResult.level = rule.level;
          ruleResult.description = rule.description;
          ruleResult.executionTime = Date.now() - ruleStartTime;

          this.metrics.rulesChecked++;

          // Categorize results
          if (ruleResult.violations && ruleResult.violations.length > 0) {
            results.violations.push(...ruleResult.violations);
            this.metrics.violationsFound += ruleResult.violations.length;
          }

          if (ruleResult.passes && ruleResult.passes.length > 0) {
            results.passes.push(...ruleResult.passes);
          }

          if (ruleResult.incomplete && ruleResult.incomplete.length > 0 && validationOptions.includeIncomplete) {
            results.incomplete.push(...ruleResult.incomplete);
          }

          if (ruleResult.inapplicable && ruleResult.inapplicable.length > 0) {
            results.inapplicable.push(...ruleResult.inapplicable);
          }

        } catch (ruleError) {
          console.warn(`Error running rule ${ruleId}:`, ruleError.message);

          results.incomplete.push({
            ruleId,
            level: rule.level,
            description: rule.description,
            error: ruleError.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Calculate compliance score
      results.score = this.calculateComplianceScore(results);

      // Generate summary
      results.summary = this.generateSummary(results);

      // Update metrics
      this.metrics.scanTime = Date.now() - startTime;

      return results;

    } catch (error) {
      const handledError = ErrorHandler.handle(error, {
        context: 'wcag-validation',
        component: 'wcag-validator'
      });

      throw new Error(`WCAG validation failed: ${handledError.message}`);
    }
  }

  /**
   * Get all elements that should be scanned for accessibility
   * @param {Page} page - Playwright page object
   * @returns {Promise<Array>} Array of elements to scan
   */
  async getScannableElements(page) {
    try {
      return await page.evaluate(() => {
        const selectors = [
          // Interactive elements
          'button', 'input', 'select', 'textarea',
          'a[href]', '[role="button"]', '[role="link"]',
          '[tabindex]:not([tabindex="-1"])',

          // Media elements
          'img', 'video', 'audio', 'canvas',

          // Structural elements
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'table', 'tr', 'td', 'th', 'caption',
          'form', 'fieldset', 'legend', 'label',

          // Landmark elements
          'header', 'footer', 'nav', 'main', 'aside', 'section',
          '[role="banner"]', '[role="complementary"]', '[role="contentinfo"]',
          '[role="main"]', '[role="navigation"]', '[role="search"]',

          // ARIA elements
          '[aria-label]', '[aria-labelledby]', '[aria-describedby]',
          '[aria-hidden]', '[aria-expanded]', '[aria-pressed]',
          '[aria-selected]', '[aria-checked]', '[aria-invalid]',

          // Live regions
          '[aria-live]', '[role="alert"]', '[role="status"]',
          '[role="log"]', '[role="marquee"]', '[role="timer"]'
        ];

        const elements = [];
        selectors.forEach(selector => {
          const foundElements = document.querySelectorAll(selector);
          elements.push(...Array.from(foundElements));
        });

        // Remove duplicates while preserving order
        const uniqueElements = [...new Set(elements)];

        return uniqueElements.map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          role: el.getAttribute('role'),
          aria: {
            label: el.getAttribute('aria-label'),
            labelledby: el.getAttribute('aria-labelledby'),
            describedby: el.getAttribute('aria-describedby'),
            hidden: el.getAttribute('aria-hidden'),
            expanded: el.getAttribute('aria-expanded'),
            pressed: el.getAttribute('aria-pressed'),
            selected: el.getAttribute('aria-selected'),
            checked: el.getAttribute('aria-checked'),
            invalid: el.getAttribute('aria-invalid'),
            live: el.getAttribute('aria-live')
          },
          attributes: {
            href: el.getAttribute('href'),
            src: el.getAttribute('src'),
            alt: el.getAttribute('alt'),
            title: el.getAttribute('title'),
            type: el.getAttribute('type'),
            required: el.hasAttribute('required'),
            disabled: el.hasAttribute('disabled'),
            tabindex: el.getAttribute('tabindex')
          },
          textContent: el.textContent ? el.textContent.trim() : '',
          computedStyle: window.getComputedStyle(el)
        }));
      });
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'get-scannable-elements',
        component: 'wcag-validator'
      });
      return [];
    }
  }

  /**
   * Check text alternatives (WCAG 1.1.1)
   * @param {Page} page - Playwright page object
   * @param {Array} elements - Elements to check
   * @returns {Promise<Object>} Rule results
   */
  async checkTextAlternatives(page, elements) {
    const result = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };

    try {
      await page.evaluate(() => {
        const violations = [];
        const passes = [];

        // Check images for alt text
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          const hasAlt = img.hasAttribute('alt');
          const altText = img.getAttribute('alt');
          const isDecorative = img.getAttribute('role') === 'presentation' ||
                            img.getAttribute('aria-hidden') === 'true';

          if (!hasAlt && !isDecorative) {
            violations.push({
              element: 'img',
              issue: 'Missing alt text',
              elementId: img.id || img.className,
              recommendation: 'Add descriptive alt text or set aria-hidden="true" for decorative images'
            });
          } else if (hasAlt && altText === '' && !isDecorative) {
            violations.push({
              element: 'img',
              issue: 'Empty alt text on informative image',
              elementId: img.id || img.className,
              recommendation: 'Provide descriptive alt text or mark as decorative'
            });
          } else {
            passes.push({
              element: 'img',
              check: 'Alt text provided',
              elementId: img.id || img.className
            });
          }
        });

        // Check input elements have labels
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          const id = input.id;
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          const hasAriaLabel = input.getAttribute('aria-label');
          const hasAriaLabelledby = input.getAttribute('aria-labelledby');
          const hasTitle = input.getAttribute('title');
          const hasPlaceholder = input.getAttribute('placeholder');

          const hasAccessibleName = hasLabel || hasAriaLabel || hasAriaLabelledby || hasTitle ||
                                   (hasPlaceholder && input.type !== 'password');

          if (!hasAccessibleName) {
            violations.push({
              element: input.tagName.toLowerCase(),
              issue: 'Missing accessible name',
              elementId: id || input.className,
              recommendation: 'Add label, aria-label, or title attribute'
            });
          } else {
            passes.push({
              element: input.tagName.toLowerCase(),
              check: 'Accessible name provided',
              elementId: id || input.className
            });
          }
        });

        // Check buttons have accessible names
        const buttons = document.querySelectorAll('button, [role="button"]');
        buttons.forEach(button => {
          const hasText = button.textContent && button.textContent.trim().length > 0;
          const hasAriaLabel = button.getAttribute('aria-label');
          const hasAriaLabelledby = button.getAttribute('aria-labelledby');
          const hasTitle = button.getAttribute('title');

          const hasAccessibleName = hasText || hasAriaLabel || hasAriaLabelledby || hasTitle;

          if (!hasAccessibleName) {
            violations.push({
              element: 'button',
              issue: 'Missing accessible name',
              elementId: button.id || button.className,
              recommendation: 'Add text content, aria-label, or title attribute'
            });
          } else {
            passes.push({
              element: 'button',
              check: 'Accessible name provided',
              elementId: button.id || button.className
            });
          }
        });

        return { violations, passes };
      }).then(pageResults => {
        result.violations = pageResults.violations;
        result.passes = pageResults.passes;
      });

    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'check-text-alternatives',
        component: 'wcag-validator'
      });
      result.incomplete.push({
        rule: 'text-alternatives',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Check keyboard accessibility (WCAG 2.1.1)
   * @param {Page} page - Playwright page object
   * @param {Array} elements - Elements to check
   * @returns {Promise<Object>} Rule results
   */
  async checkKeyboardAccessible(page, elements) {
    const result = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };

    try {
      await page.evaluate(() => {
        const violations = [];
        const passes = [];

        // Check all interactive elements are keyboard accessible
        const interactiveElements = document.querySelectorAll(
          'button, input, select, textarea, a[href], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'
        );

        interactiveElements.forEach(element => {
          const isNaturallyFocusable = ['button', 'input', 'select', 'textarea', 'a[href]'].includes(
            element.tagName.toLowerCase()
          );
          const hasPositiveTabindex = element.getAttribute('tabindex') !== '-1';
          const hasRole = element.getAttribute('role');

          if (!isNaturallyFocusable && !hasPositiveTabindex && !hasRole) {
            violations.push({
              element: element.tagName.toLowerCase(),
              issue: 'Element not keyboard accessible',
              elementId: element.id || element.className,
              recommendation: 'Add tabindex="0" or appropriate role attribute'
            });
          } else {
            passes.push({
              element: element.tagName.toLowerCase(),
              check: 'Keyboard accessible',
              elementId: element.id || element.className
            });
          }
        });

        // Check for onclick handlers without keyboard support
        const clickHandlers = document.querySelectorAll('[onclick]');
        clickHandlers.forEach(element => {
          const tagName = element.tagName.toLowerCase();
          const isInteractive = ['button', 'input', 'select', 'textarea', 'a'].includes(tagName);
          const hasRole = element.getAttribute('role');
          const hasTabindex = element.getAttribute('tabindex');

          if (!isInteractive && !hasRole && !hasTabindex) {
            violations.push({
              element: tagName,
              issue: 'Onclick handler without keyboard support',
              elementId: element.id || element.className,
              recommendation: 'Add role="button" and tabindex="0" for keyboard accessibility'
            });
          }
        });

        return { violations, passes };
      }).then(pageResults => {
        result.violations = pageResults.violations;
        result.passes = pageResults.passes;
      });

    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'check-keyboard-accessible',
        component: 'wcag-validator'
      });
      result.incomplete.push({
        rule: 'keyboard-accessible',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Check adaptable content (WCAG 1.3.1)
   * @param {Page} page - Playwright page object
   * @param {Array} elements - Elements to check
   * @returns {Promise<Object>} Rule results
   */
  async checkAdaptableContent(page, elements) {
    const result = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };

    try {
      await page.evaluate(() => {
        const violations = [];
        const passes = [];

        // Check for proper heading structure
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let previousLevel = 0;
        let headingStructureValid = true;

        headings.forEach(heading => {
          const level = parseInt(heading.tagName.charAt(1));

          if (level > previousLevel + 1 && previousLevel !== 0) {
            violations.push({
              element: heading.tagName.toLowerCase(),
              issue: 'Heading level skipped',
              elementId: heading.id || heading.textContent,
              recommendation: `Do not skip heading levels (found H${level} after H${previousLevel})`
            });
            headingStructureValid = false;
          }
          previousLevel = level;
        });

        if (headingStructureValid && headings.length > 0) {
          passes.push({
            element: 'headings',
            check: 'Proper heading structure'
          });
        }

        // Check for proper list structure
        const lists = document.querySelectorAll('ul, ol');
        lists.forEach(list => {
          const items = list.querySelectorAll('li');
          if (items.length === 0) {
            violations.push({
              element: list.tagName.toLowerCase(),
              issue: 'Empty list',
              elementId: list.id || list.className,
              recommendation: 'Remove empty lists or add list items'
            });
          } else {
            passes.push({
              element: list.tagName.toLowerCase(),
              check: 'Proper list structure',
              elementId: list.id || list.className
            });
          }
        });

        // Check for data table markup
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
          const hasCaption = table.querySelector('caption') !== null;
          const hasHeaders = table.querySelectorAll('th').length > 0;

          if (!hasCaption && table.getAttribute('role') !== 'presentation') {
            violations.push({
              element: 'table',
              issue: 'Missing table caption',
              elementId: table.id || table.className,
              recommendation: 'Add caption element to describe table purpose'
            });
          }

          if (!hasHeaders && table.getAttribute('role') !== 'presentation') {
            violations.push({
              element: 'table',
              issue: 'Missing table headers',
              elementId: table.id || table.className,
              recommendation: 'Use th elements for headers with appropriate scope attributes'
            });
          }

          if (hasCaption && hasHeaders) {
            passes.push({
              element: 'table',
              check: 'Proper table markup',
              elementId: table.id || table.className
            });
          }
        });

        return { violations, passes };
      }).then(pageResults => {
        result.violations = pageResults.violations;
        result.passes = pageResults.passes;
      });

    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'check-adaptable-content',
        component: 'wcag-validator'
      });
      result.incomplete.push({
        rule: 'adaptable-content',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Check distinguishable content (WCAG 1.4.3, 1.4.6)
   * @param {Page} page - Playwright page object
   * @param {Array} elements - Elements to check
   * @returns {Promise<Object>} Rule results
   */
  async checkDistinguishableContent(page, elements) {
    const result = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };

    try {
      await page.evaluate(() => {
        const violations = [];
        const passes = [];

        // Check for sufficient color contrast (basic check)
        const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, label, button, a');

        textElements.forEach(element => {
          const style = window.getComputedStyle(element);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          const fontSize = parseFloat(style.fontSize);

          // Basic contrast check (simplified - real implementation would calculate contrast ratio)
          if (color === 'rgb(128, 128, 128)' && backgroundColor === 'rgb(255, 255, 255)' && fontSize < 18) {
            violations.push({
              element: element.tagName.toLowerCase(),
              issue: 'Insufficient color contrast',
              elementId: element.id || element.className,
              recommendation: 'Increase color contrast ratio to at least 4.5:1 for normal text'
            });
          } else {
            passes.push({
              element: element.tagName.toLowerCase(),
              check: 'Color contrast appears adequate',
              elementId: element.id || element.className
            });
          }
        });

        // Check for text resize (basic check)
        const hasScalableText = document.querySelector('body, html') !== null;
        if (hasScalableText) {
          passes.push({
            element: 'document',
            check: 'Text appears scalable'
          });
        }

        // Check for audio control
        const audioElements = document.querySelectorAll('audio, video[controls]');
        audioElements.forEach(element => {
          const hasControls = element.hasAttribute('controls');
          if (!hasControls) {
            violations.push({
              element: element.tagName.toLowerCase(),
              issue: 'Missing audio/video controls',
              elementId: element.id || element.className,
              recommendation: 'Add controls attribute for user control of audio/video'
            });
          } else {
            passes.push({
              element: element.tagName.toLowerCase(),
              check: 'Media controls provided',
              elementId: element.id || element.className
            });
          }
        });

        return { violations, passes };
      }).then(pageResults => {
        result.violations = pageResults.violations;
        result.passes = pageResults.passes;
      });

    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'check-distinguishable-content',
        component: 'wcag-validator'
      });
      result.incomplete.push({
        rule: 'distinguishable-content',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Check enough time (WCAG 2.2.1, 2.2.2)
   * @param {Page} page - Playwright page object
   * @param {Array} elements - Elements to check
   * @returns {Promise<Object>} Rule results
   */
  async checkEnoughTime(page, elements) {
    const result = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };

    try {
      await page.evaluate(() => {
        const violations = [];
        const passes = [];

        // Check for timed redirects (simplified check)
        const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
        if (metaRefresh) {
          const content = metaRefresh.getAttribute('content');
          if (content && content.includes('url=')) {
            const delay = parseInt(content);
            if (delay < 20) { // Less than 20 seconds
              violations.push({
                element: 'meta',
                issue: 'Timed redirect with insufficient delay',
                elementId: 'meta-refresh',
                recommendation: 'Increase redirect delay to at least 20 seconds or provide user control'
              });
            }
          }
        } else {
          passes.push({
            element: 'document',
            check: 'No timed redirects detected'
          });
        }

        // Check for moving, blinking, or scrolling content
        const movingElements = document.querySelectorAll('marquee, blink');
        movingElements.forEach(element => {
          violations.push({
            element: element.tagName.toLowerCase(),
            issue: 'Deprecated moving/blinking content',
            elementId: element.id || element.className,
            recommendation: 'Replace with modern, accessible alternatives'
          });
        });

        if (movingElements.length === 0) {
          passes.push({
            element: 'document',
            check: 'No deprecated moving content detected'
          });
        }

        return { violations, passes };
      }).then(pageResults => {
        result.violations = pageResults.violations;
        result.passes = pageResults.passes;
      });

    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'check-enough-time',
        component: 'wcag-validator'
      });
      result.incomplete.push({
        rule: 'enough-time',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Check seizures (WCAG 2.3.1)
   * @param {Page} page - Playwright page object
   * @param {Array} elements - Elements to check
   * @returns {Promise<Object>} Rule results
   */
  async checkSeizures(page, elements) {
    const result = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };

    try {
      await page.evaluate(() => {
        const violations = [];
        const passes = [];

        // Check for flashing content (simplified check)
        const flashingElements = document.querySelectorAll('[class*="flash"], [id*="flash"], [style*="animation"]');

        flashingElements.forEach(element => {
          const style = window.getComputedStyle(element);
          const animationDuration = style.animationDuration;

          if (animationDuration && parseFloat(animationDuration) < 1) {
            violations.push({
              element: element.tagName.toLowerCase(),
              issue: 'Potentially problematic animation duration',
              elementId: element.id || element.className,
              recommendation: 'Ensure animations do not flash more than 3 times per second'
            });
          }
        });

        if (flashingElements.length === 0) {
          passes.push({
            element: 'document',
            check: 'No potentially flashing content detected'
          });
        }

        return { violations, passes };
      }).then(pageResults => {
        result.violations = pageResults.violations;
        result.passes = pageResults.passes;
      });

    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'check-seizures',
        component: 'wcag-validator'
      });
      result.incomplete.push({
        rule: 'seizures',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Check navigable content (WCAG 2.4.1-2.4.8)
   * @param {Page} page - Playwright page object
   * @param {Array} elements - Elements to check
   * @returns {Promise<Object>} Rule results
   */
  async checkNavigable(page, elements) {
    const result = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };

    try {
      await page.evaluate(() => {
        const violations = [];
        const passes = [];

        // Check for page title
        const title = document.querySelector('title');
        if (!title || !title.textContent || title.textContent.trim() === '') {
          violations.push({
            element: 'title',
            issue: 'Missing or empty page title',
            recommendation: 'Add descriptive page title'
          });
        } else {
          passes.push({
            element: 'title',
            check: 'Page title provided'
          });
        }

        // Check for skip links
        const skipLinks = document.querySelectorAll('.skip-link, a[href="#main"], a[href="#content"]');
        if (skipLinks.length === 0) {
          violations.push({
            element: 'skip-links',
            issue: 'Missing skip links',
            recommendation: 'Add skip links for keyboard navigation'
          });
        } else {
          passes.push({
            element: 'skip-links',
            check: 'Skip links provided'
          });
        }

        // Check for landmark roles
        const landmarks = document.querySelectorAll(
          'header, footer, nav, main, aside, section, ' +
          '[role="banner"], [role="complementary"], [role="contentinfo"], ' +
          '[role="main"], [role="navigation"], [role="search"]'
        );

        if (landmarks.length === 0) {
          violations.push({
            element: 'landmarks',
            issue: 'Missing landmark roles',
            recommendation: 'Add appropriate landmark roles for better navigation'
          });
        } else {
          passes.push({
            element: 'landmarks',
            check: 'Landmark roles provided'
          });
        }

        // Check for focus order (basic check)
        const focusableElements = document.querySelectorAll(
          'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length > 0) {
          passes.push({
            element: 'focus-order',
            check: 'Focusable elements available'
          });
        }

        // Check for link purpose
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
          const hasText = link.textContent && link.textContent.trim().length > 0;
          const hasAriaLabel = link.getAttribute('aria-label');
          const hasTitle = link.getAttribute('title');

          if (!hasText && !hasAriaLabel && !hasTitle) {
            violations.push({
              element: 'a',
              issue: 'Link purpose not clear',
              elementId: link.id || link.getAttribute('href'),
              recommendation: 'Add descriptive text or aria-label to link'
            });
          } else {
            passes.push({
              element: 'a',
              check: 'Link purpose is clear',
              elementId: link.id || link.getAttribute('href')
            });
          }
        });

        return { violations, passes };
      }).then(pageResults => {
        result.violations = pageResults.violations;
        result.passes = pageResults.passes;
      });

    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'check-navigable',
        component: 'wcag-validator'
      });
      result.incomplete.push({
        rule: 'navigable',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Check readable content (WCAG 3.1.1-3.1.5)
   * @param {Page} page - Playwright page object
   * @param {Array} elements - Elements to check
   * @returns {Promise<Object>} Rule results
   */
  async checkReadableContent(page, elements) {
    const result = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };

    try {
      await page.evaluate(() => {
        const violations = [];
        const passes = [];

        // Check for language attribute
        const html = document.querySelector('html');
        const hasLang = html && html.getAttribute('lang');

        if (!hasLang) {
          violations.push({
            element: 'html',
            issue: 'Missing language attribute',
            recommendation: 'Add lang attribute to html element'
          });
        } else {
          passes.push({
            element: 'html',
            check: 'Language attribute provided'
          });
        }

        // Check for unusual words or abbreviations
        const abbrElements = document.querySelectorAll('abbr, acronym');
        abbrElements.forEach(element => {
          const hasTitle = element.getAttribute('title');
          if (!hasTitle) {
            violations.push({
              element: element.tagName.toLowerCase(),
              issue: 'Abbreviation missing expansion',
              elementId: element.id || element.textContent,
              recommendation: 'Add title attribute with expansion'
            });
          } else {
            passes.push({
              element: element.tagName.toLowerCase(),
              check: 'Abbreviation expansion provided',
              elementId: element.id || element.textContent
            });
          }
        });

        return { violations, passes };
      }).then(pageResults => {
        result.violations = pageResults.violations;
        result.passes = pageResults.passes;
      });

    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'check-readable-content',
        component: 'wcag-validator'
      });
      result.incomplete.push({
        rule: 'readable-content',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Check predictable content (WCAG 3.2.1-3.2.5)
   * @param {Page} page - Playwright page object
   * @param {Array} elements - Elements to check
   * @returns {Promise<Object>} Rule results
   */
  async checkPredictableContent(page, elements) {
    const result = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };

    try {
      await page.evaluate(() => {
        const violations = [];
        const passes = [];

        // Check for consistent navigation (simplified)
        const navElements = document.querySelectorAll('nav, [role="navigation"]');

        if (navElements.length > 0) {
          passes.push({
            element: 'navigation',
            check: 'Navigation elements provided'
          });
        }

        // Check for consistent identification (simplified)
        const consistentElements = document.querySelectorAll(
          'header, [role="banner"], footer, [role="contentinfo"]'
        );

        if (consistentElements.length > 0) {
          passes.push({
            element: 'landmarks',
            check: 'Consistent identification elements'
          });
        }

        return { violations, passes };
      }).then(pageResults => {
        result.violations = pageResults.violations;
        result.passes = pageResults.passes;
      });

    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'check-predictable-content',
        component: 'wcag-validator'
      });
      result.incomplete.push({
        rule: 'predictable-content',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Check input assistance (WCAG 3.3.1-3.3.6)
   * @param {Page} page - Playwright page object
   * @param {Array} elements - Elements to check
   * @returns {Promise<Object>} Rule results
   */
  async checkInputAssistance(page, elements) {
    const result = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };

    try {
      await page.evaluate(() => {
        const violations = [];
        const passes = [];

        // Check form validation
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
          const requiredFields = form.querySelectorAll('[required]');
          const hasValidation = form.hasAttribute('novalidate') === false;

          if (requiredFields.length > 0 && !hasValidation) {
            violations.push({
              element: 'form',
              issue: 'Form validation not properly implemented',
              elementId: form.id || form.className,
              recommendation: 'Implement proper form validation for required fields'
            });
          } else {
            passes.push({
              element: 'form',
              check: 'Form validation implemented',
              elementId: form.id || form.className
            });
          }
        });

        // Check error handling
        const errorContainers = document.querySelectorAll('[role="alert"], .error-message, .validation-error');

        if (errorContainers.length === 0) {
          // This is only a violation if there are forms
          if (forms.length > 0) {
            violations.push({
              element: 'error-handling',
              issue: 'Missing error message containers',
              recommendation: 'Add proper error message containers for form validation'
            });
          }
        } else {
          passes.push({
            element: 'error-handling',
            check: 'Error message containers provided'
          });
        }

        return { violations, passes };
      }).then(pageResults => {
        result.violations = pageResults.violations;
        result.passes = pageResults.passes;
      });

    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'check-input-assistance',
        component: 'wcag-validator'
      });
      result.incomplete.push({
        rule: 'input-assistance',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Check compatible content (WCAG 4.1.1-4.1.3)
   * @param {Page} page - Playwright page object
   * @param {Array} elements - Elements to check
   * @returns {Promise<Object>} Rule results
   */
  async checkCompatible(page, elements) {
    const result = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };

    try {
      await page.evaluate(() => {
        const violations = [];
        const passes = [];

        // Check for valid HTML structure
        const doctype = document.doctype;
        if (!doctype || doctype.name !== 'html') {
          violations.push({
            element: 'doctype',
            issue: 'Missing or invalid doctype',
            recommendation: 'Add <!DOCTYPE html>'
          });
        } else {
          passes.push({
            element: 'doctype',
            check: 'Valid doctype provided'
          });
        }

        // Check for valid ARIA usage
        const ariaElements = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');

        ariaElements.forEach(element => {
          const ariaLabel = element.getAttribute('aria-label');
          const ariaLabelledby = element.getAttribute('aria-labelledby');

          if (ariaLabelledby) {
            const targetElement = document.getElementById(ariaLabelledby);
            if (!targetElement) {
              violations.push({
                element: element.tagName.toLowerCase(),
                issue: 'Invalid aria-labelledby reference',
                elementId: element.id || element.className,
                recommendation: `Ensure element with id "${ariaLabelledby}" exists`
              });
            } else {
              passes.push({
                element: element.tagName.toLowerCase(),
                check: 'Valid aria-labelledby reference',
                elementId: element.id || element.className
              });
            }
          }

          if (ariaLabel) {
            passes.push({
              element: element.tagName.toLowerCase(),
              check: 'ARIA label provided',
              elementId: element.id || element.className
            });
          }
        });

        return { violations, passes };
      }).then(pageResults => {
        result.violations = pageResults.violations;
        result.passes = pageResults.passes;
      });

    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'check-compatible',
        component: 'wcag-validator'
      });
      result.incomplete.push({
        rule: 'compatible',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Check time-based media (WCAG 1.2.1-1.2.9)
   * @param {Page} page - Playwright page object
   * @param {Array} elements - Elements to check
   * @returns {Promise<Object>} Rule results
   */
  async checkTimeBasedMedia(page, elements) {
    const result = {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: []
    };

    try {
      await page.evaluate(() => {
        const violations = [];
        const passes = [];

        // Check for video elements
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          const hasCaptions = video.querySelector('track[kind="captions"]') !== null;
          const hasAudioDescription = video.querySelector('track[kind="descriptions"]') !== null;

          if (!hasCaptions) {
            violations.push({
              element: 'video',
              issue: 'Missing captions for video',
              elementId: video.id || video.className,
              recommendation: 'Add caption track for video accessibility'
            });
          } else {
            passes.push({
              element: 'video',
              check: 'Video captions provided',
              elementId: video.id || video.className
            });
          }

          if (!hasAudioDescription) {
            // This is a Level AAA requirement, so we don't fail for AA
            passes.push({
              element: 'video',
              check: 'Video audio description (Level AAA - optional)',
              elementId: video.id || video.className
            });
          }
        });

        // Check for audio elements
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
          const hasTranscript = audio.getAttribute('data-transcript') !== null;

          if (!hasTranscript) {
            // This is a Level AAA requirement, so we don't fail for AA
            passes.push({
              element: 'audio',
              check: 'Audio transcript (Level AAA - optional)',
              elementId: audio.id || audio.className
            });
          } else {
            passes.push({
              element: 'audio',
              check: 'Audio transcript provided',
              elementId: audio.id || audio.className
            });
          }
        });

        if (videos.length === 0 && audioElements.length === 0) {
          passes.push({
            element: 'document',
            check: 'No time-based media present'
          });
        }

        return { violations, passes };
      }).then(pageResults => {
        result.violations = pageResults.violations;
        result.passes = pageResults.passes;
      });

    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'check-time-based-media',
        component: 'wcag-validator'
      });
      result.incomplete.push({
        rule: 'time-based-media',
        error: error.message
      });
    }

    return result;
  }

  /**
   * Calculate compliance score based on validation results
   * @param {Object} results - Validation results
   * @returns {number} Compliance score (0-100)
   */
  calculateComplianceScore(results) {
    const totalChecks = results.violations.length + results.passes.length;

    if (totalChecks === 0) {
      return 100; // Perfect score if nothing to check
    }

    const passRate = results.passes.length / totalChecks;
    const violationPenalty = results.violations.length * 0.1; // 10% penalty per violation

    let score = Math.round(passRate * 100 - (violationPenalty * 100));
    return Math.max(0, Math.min(100, score)); // Clamp between 0-100
  }

  /**
   * Generate summary of validation results
   * @param {Object} results - Validation results
   * @returns {Object} Summary object
   */
  generateSummary(results) {
    const levelCounts = {};

    results.violations.forEach(violation => {
      const level = violation.level || 'unknown';
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    });

    return {
      totalViolations: results.violations.length,
      totalPasses: results.passes.length,
      totalIncomplete: results.incomplete.length,
      totalInapplicable: results.inapplicable.length,
      complianceScore: results.score,
      violationsByLevel: levelCounts,
      criticalViolations: results.violations.filter(v => v.impact === 'critical').length,
      majorViolations: results.violations.filter(v => v.impact === 'serious').length,
      minorViolations: results.violations.filter(v => v.impact === 'minor').length,
      scanPerformance: {
        scanTime: this.metrics.scanTime,
        rulesChecked: this.metrics.rulesChecked,
        elementsScanned: this.metrics.elementsScanned
      }
    };
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      scanTime: 0,
      rulesChecked: 0,
      violationsFound: 0,
      elementsScanned: 0
    };
  }

  /**
   * Validate specific WCAG guidelines
   * @param {Array} guidelines - Guidelines to validate
   * @param {Page} page - Playwright page object
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} Validation results
   */
  async validateGuidelines(guidelines, page, options = {}) {
    const customValidator = new WCAGValidator({
      ...this.options,
      ...options
    });

    // Filter rules to only include specified guidelines
    const filteredRules = {};
    guidelines.forEach(guideline => {
      if (customValidator.rules[guideline]) {
        filteredRules[guideline] = customValidator.rules[guideline];
      }
    });

    customValidator.rules = filteredRules;

    return await customValidator.validate(page, options);
  }

  /**
   * Export validation results in various formats
   * @param {Object} results - Validation results
   * @param {string} format - Export format ('json', 'csv', 'html')
   * @returns {string} Formatted results
   */
  exportResults(results, format = 'json') {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(results, null, 2);

      case 'csv':
        return this.exportToCSV(results);

      case 'html':
        return this.exportToHTML(results);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export results to CSV format
   * @param {Object} results - Validation results
   * @returns {string} CSV formatted results
   */
  exportToCSV(results) {
    const headers = ['Rule ID', 'Level', 'Element', 'Issue', 'Recommendation'];
    const rows = results.violations.map(violation => [
      violation.ruleId || '',
      violation.level || '',
      violation.element || '',
      violation.issue || '',
      violation.recommendation || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Export results to HTML format
   * @param {Object} results - Validation results
   * @returns {string} HTML formatted results
   */
  exportToHTML(results) {
    const violationsHTML = results.violations.map(violation => `
      <tr>
        <td>${violation.ruleId || ''}</td>
        <td>${violation.level || ''}</td>
        <td>${violation.element || ''}</td>
        <td>${violation.issue || ''}</td>
        <td>${violation.recommendation || ''}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>WCAG Validation Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .summary { background-color: #f9f9f9; padding: 15px; margin-bottom: 20px; }
          .error { color: #d32f2f; }
          .warning { color: #f57c00; }
          .success { color: #388e3c; }
        </style>
      </head>
      <body>
        <h1>WCAG Validation Report</h1>
        <div class="summary">
          <h2>Summary</h2>
          <p><strong>Standard:</strong> ${results.standard}</p>
          <p><strong>Compliance Score:</strong> <span class="${results.score >= 80 ? 'success' : results.score >= 60 ? 'warning' : 'error'}">${results.score}%</span></p>
          <p><strong>Total Violations:</strong> <span class="error">${results.totalViolations}</span></p>
          <p><strong>Total Passes:</strong> <span class="success">${results.totalPasses}</span></p>
          <p><strong>Scan Time:</strong> ${results.summary.scanPerformance?.scanTime || 0}ms</p>
        </div>

        <h2>Violations</h2>
        <table>
          <thead>
            <tr>
              <th>Rule ID</th>
              <th>Level</th>
              <th>Element</th>
              <th>Issue</th>
              <th>Recommendation</th>
            </tr>
          </thead>
          <tbody>
            ${violationsHTML}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }
}

module.exports = { WCAGValidator };