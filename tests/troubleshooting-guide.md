# UI Testing Troubleshooting Guide

This guide provides comprehensive troubleshooting solutions for common issues encountered with the UI testing workflow for Chrome extensions.

## Table of Contents

1. [Installation and Setup Issues](#installation-and-setup-issues)
2. [Test Execution Problems](#test-execution-problems)
3. [Performance Issues](#performance-issues)
4. [Visual Regression Testing Issues](#visual-regression-testing-issues)
5. [Accessibility Testing Problems](#accessibility-testing-problems)
6. [Memory and Resource Issues](#memory-and-resource-issues)
7. [Parallel Execution Issues](#parallel-execution-issues)
8. [Chrome Extension Specific Issues](#chrome-extension-specific-issues)
9. [AI Integration Problems](#ai-integration-problems)
10. [Debugging Strategies](#debugging-strategies)
11. [Common Error Messages and Solutions](#common-error-messages-and-solutions)

## Installation and Setup Issues

### Problem: Dependencies Not Installing

**Error Message**: `npm install fails with package conflicts`

**Solution**:
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Install specific versions if needed
npm install @playwright/test@latest axe-core@latest pixelmatch@latest

# Install Playwright browsers separately
npx playwright install chrome
```

**Prevention**:
- Always use `npm ci` in CI/CD pipelines
- Pin specific versions in package.json
- Use Node.js version 18 or higher

### Problem: Playwright Browser Installation Fails

**Error Message**: `Failed to download browser`

**Solution**:
```bash
# Install with specific configuration
npx playwright install chrome --with-deps

# Manual installation
PLAYWRIGHT_DOWNLOAD_HOST=https://playwright.azureedge.net npx playwright install chrome

# Set environment variables for corporate networks
export PLAYWRIGHT_DOWNLOAD_HOST=https://playwright.azureedge.net
export PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=60000
npx playwright install chrome
```

### Problem: Chrome Extension Not Loading

**Error Message**: `Cannot load extension` or `Extension manifest error`

**Solution**:
1. Verify manifest.json structure:
```json
{
  "manifest_version": 3,
  "name": "WebClip Assistant",
  "version": "1.0.0",
  "permissions": ["activeTab", "storage", "downloads", "scripting"],
  "host_permissions": [
    "https://api.openai.com/*",
    "https://api.anthropic.com/*",
    "https://api.notion.com/*"
  ]
}
```

2. Check file paths in manifest
3. Ensure all referenced files exist
4. Validate JSON syntax

## Test Execution Problems

### Problem: Tests Timeout Frequently

**Error Message**: `Test timeout of 5000ms exceeded`

**Solutions**:

**Increase timeout in configuration** (`tests/utils/config.js`):
```javascript
const config = {
  defaultTimeout: 15000, // Increased from 5000ms
  retries: 2,
  // ... other config
};
```

**Use dynamic waits instead of fixed timeouts**:
```javascript
// Bad: Fixed timeout
await page.waitForTimeout(5000);

// Good: Dynamic wait for element
await page.waitForSelector('.popup-container', {
  timeout: 10000,
  state: 'visible'
});
```

**Implement retry mechanisms**:
```javascript
import { ErrorHandler } from '../utils/error-handling-utils.js';

const errorHandler = new ErrorHandler({
  enableRecovery: true,
  maxRetries: 3
});

await errorHandler.wrapAsync(async () => {
  await page.waitForSelector('.dynamic-element', { timeout: 5000 });
}, 'element-wait');
```

### Problem: Tests Fail Intermittently (Flaky Tests)

**Symptoms**: Tests pass sometimes but fail others without code changes

**Solutions**:

**Use reliability utilities**:
```javascript
import { FlakyTestDetector } from '../utils/reliability-utils.js';

const flakyDetector = new FlakyTestDetector({
  minExecutions: 5,
  flakinessThreshold: 0.3
});

// Add statistical analysis to your test
await flakyDetector.recordExecution(testName, result);
const flakinessReport = await flakyDetector.analyzeTestFlakiness(executionHistory);
```

**Implement proper waits and conditions**:
```javascript
// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for specific conditions
await page.waitForFunction(() => {
  return document.querySelector('.save-button').disabled === false;
});

// Use custom conditions
await page.waitForSelector('.loading-spinner', { state: 'hidden' });
```

**Add test isolation**:
```javascript
test.beforeEach(async ({ page }) => {
  // Clear storage and state
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Navigate to fresh state
  await page.goto('chrome-extension://YOUR_EXTENSION_ID/ui/main_popup.html');
});
```

### Problem: Element Not Found or Not Interactable

**Error Message**: `Element not found` or `Element is not visible`

**Solutions**:

**Use robust selectors**:
```javascript
// Bad: Brittle selector
await page.click('button:nth-child(3)');

// Good: Semantic selector
await page.click('#save-button');

// Best: Multiple fallback selectors
const saveButton = page.locator(
  'button[type="submit"], #save-button, [data-testid="save-button"]'
).first();
```

**Implement element existence checks**:
```javascript
const elementExists = await page.locator('.dynamic-element').count() > 0;
if (elementExists) {
  await page.locator('.dynamic-element').click();
} else {
  console.log('Element not found, using fallback logic');
}
```

**Wait for element readiness**:
```javascript
await page.waitForSelector('.save-button', {
  timeout: 10000,
  state: 'attached' // or 'visible', 'enabled', 'hidden'
});

await page.waitForFunction(() => {
  const button = document.querySelector('.save-button');
  return button && !button.disabled && button.offsetParent !== null;
});
```

## Performance Issues

### Problem: Tests Running Slowly

**Symptoms**: Test execution exceeds 2-second target per component

**Solutions**:

**Enable performance monitoring**:
```javascript
const startTime = performance.now();

// Your test code here

const executionTime = performance.now() - startTime;
console.log(`Test execution time: ${executionTime}ms`);
expect(executionTime).toBeLessThan(2000);
```

**Use caching for repeated operations**:
```javascript
import { ScreenshotCache } from '../utils/screenshot-cache.js';

const cache = new ScreenshotCache({
  maxMemorySize: 100 * 1024 * 1024, // 100MB
  defaultTTL: 3600000 // 1 hour
});

// Cache screenshots
const cacheKey = `screenshot-${testName}-${viewport}`;
const cached = await cache.getCachedScreenshot(cacheKey);

if (cached) {
  screenshot = cached;
} else {
  screenshot = await page.screenshot();
  await cache.cacheScreenshot(cacheKey, screenshot);
}
```

**Implement parallel execution**:
```javascript
import { ParallelExecutor } from '../utils/parallel-executor.js';

const executor = new ParallelExecutor({
  maxWorkers: 4,
  enableAdaptiveScaling: true
});

// Run tests in parallel
const results = await Promise.all([
  executor.addTask(test1),
  executor.addTask(test2),
  executor.addTask(test3)
]);
```

### Problem: Memory Usage Too High

**Symptoms**: Tests cause memory leaks or exceed memory limits

**Solutions**:

**Enable memory management**:
```javascript
import { MemoryManager } from '../utils/memory-manager.js';

const memoryManager = new MemoryManager({
  memoryLimit: 500 * 1024 * 1024, // 500MB
  enableGarbageCollection: true
});

// Monitor memory usage
const memoryUsage = await memoryManager.getMemoryUsage();
console.log(`Memory usage: ${memoryUsage.usedHeapSize / 1024 / 1024}MB`);

// Force garbage collection if needed
if (memoryUsage.usedHeapSize > memoryManager.memoryLimit) {
  await memoryManager.forceGarbageCollection();
}
```

**Clean up resources in tests**:
```javascript
test.afterEach(async () => {
  // Clear caches
  if (screenshotCache) {
    await screenshotCache.clear();
  }

  // Close pages
  await page.close();

  // Force garbage collection in Node.js
  if (global.gc) {
    global.gc();
  }
});
```

## Visual Regression Testing Issues

### Problem: Baseline Images Don't Match

**Error Message**: `Screenshots don't match baseline`

**Solutions**:

**Update baselines intentionally**:
```bash
# Update all baselines
npm run test:update-baselines

# Update specific baseline
npm run test:update-baseline -- --test=popup-visual
```

**Check for dynamic content**:
```javascript
// Hide dynamic elements before screenshot
await page.evaluate(() => {
  const dynamicElements = document.querySelectorAll('.timestamp, .loading-spinner');
  dynamicElements.forEach(el => el.style.visibility = 'hidden');
});

// Use consistent test data
await page.fill('#title-input', 'Test Title (Fixed)');
await page.fill('#url-input', 'https://example.com');
```

**Implement image comparison with tolerance**:
```javascript
const result = await compareScreenshots({
  screenshot,
  baselinePath: 'baseline.png',
  testName: 'comparison-test',
  tolerance: 0.1, // 10% tolerance
  ignoreAntialiasing: true,
  ignoreRegions: [
    { x: 0, y: 0, width: 100, height: 20 } // Ignore timestamp area
  ]
});
```

### Problem: Screenshots Capture Wrong Content

**Solutions**:

**Wait for stable state**:
```javascript
// Wait for animations to complete
await page.waitForTimeout(500);

// Wait for specific elements to be stable
await page.waitForFunction(() => {
  const element = document.querySelector('.dynamic-content');
  return element && element.textContent.length > 0;
});
```

**Use specific screenshot options**:
```javascript
const screenshot = await page.screenshot({
  fullPage: false, // Capture only viewport
  clip: { x: 0, y: 0, width: 800, height: 600 }, // Specific area
  animations: 'disabled',
  caret: 'hide' // Hide text cursor
});
```

## Accessibility Testing Problems

### Problem: Axe-Core Not Injecting

**Error Message**: `axe is not defined`

**Solution**:
```javascript
// Proper axe injection
import { injectAxe } from '../utils/accessibility-utils.js';

// Wait for page to be ready
await page.goto('your-url.html');
await page.waitForLoadState('domcontentloaded');

// Inject axe-core properly
try {
  await injectAxe(page);
} catch (error) {
  console.error('Failed to inject axe:', error);
  // Fallback: manual injection
  await page.addScriptTag({
    path: 'node_modules/axe-core/axe.min.js'
  });
}
```

### Problem: Too Many Accessibility Violations

**Solutions**:

**Filter by impact level**:
```javascript
const results = await checkA11y(page, {
  includedImpacts: ['critical', 'serious'] // Only high-impact issues
});
```

**Exclude specific rules**:
```javascript
const results = await checkA11y(page, {
  rules: {
    'color-contrast': { enabled: false }, // Temporarily disable for testing
    'duplicate-id': { enabled: true }
  }
});
```

**Test specific components**:
```javascript
// Test only the main form area
const formArea = page.locator('.popup-form');
const results = await checkA11y(formArea, {
  includedImpacts: ['critical']
});
```

## Memory and Resource Issues

### Problem: Worker Pools Not Scaling

**Solutions**:

**Configure adaptive scaling**:
```javascript
const executor = new ParallelExecutor({
  maxWorkers: 4,
  enableAdaptiveScaling: true,
  adaptiveScalingConfig: {
    scaleUpThreshold: 0.8, // Scale up when 80% busy
    scaleDownThreshold: 0.2, // Scale down when 20% busy
    minWorkers: 1,
    maxWorkers: 8
  }
});
```

**Monitor worker health**:
```javascript
executor.on('worker-health', (healthReport) => {
  console.log('Worker health:', healthReport);
  if (healthReport.healthyWorkers < healthReport.totalWorkers * 0.5) {
    console.warn('Many workers unhealthy');
  }
});
```

### Problem: Cache Invalidation Issues

**Solutions**:

**Implement proper cache invalidation**:
```javascript
const cache = new ScreenshotCache({
  invalidationStrategy: 'time-based', // or 'change-based'
  ttl: 3600000, // 1 hour
  maxEntries: 1000
});

// Invalidate cache when files change
await cache.invalidateOnFileChange(['styles.css', 'popup.html']);
```

## Chrome Extension Specific Issues

### Problem: Chrome Protocol Errors

**Error Message**: `Protocol "chrome-extension:" not supported`

**Solution**:
```javascript
// Use chrome extension protocol properly
const extensionUrl = `chrome-extension://${process.env.EXTENSION_ID}/ui/main_popup.html`;

// Alternative: Load extension in test environment
await page.goto(extensionUrl);

// Handle permission issues
await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
```

### Problem: Content Script Injection Fails

**Solutions**:
```javascript
// Use Chrome Extension API for content script injection
await page.addInitScript(() => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ type: 'test-initialization' });
  }
});

// Wait for extension to be ready
await page.waitForFunction(() => {
  return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
}, { timeout: 10000 });
```

## AI Integration Problems

### Problem: AI Command Parsing Fails

**Solutions**:
```javascript
// Use structured command interface
import { AICommandParser } from '../utils/ai-command-parser.js';

const parser = new AICommandParser();
const command = await parser.parseCommand('run visual test for popup component');

if (command.success) {
  // Execute parsed command
  await executeTestCommand(command.parsed);
} else {
  console.error('Command parsing failed:', command.error);
}
```

### Problem: AI-Friendly Reports Not Generated

**Solutions**:
```javascript
// Configure AI-optimized reporting
import { AIReporter } from '../utils/reporter.js';

const reporter = new AIReporter({
  format: 'ai-optimized',
  includePerformanceMetrics: true,
  includeErrorAnalysis: true,
  successRateTarget: 0.8
});

const report = await reporter.generateReport(testResults);
console.log('AI-optimized report:', report);
```

## Debugging Strategies

### Enable Comprehensive Logging

```javascript
// Configure verbose logging
test.beforeAll(async () => {
  console.log('Starting test suite with debug logging');
});

test.afterAll(async () => {
  console.log('Test suite completed');
});

test('debug example', async ({ page }) => {
  // Add debug information
  console.log('Page URL:', page.url());
  console.log('Page title:', await page.title());

  // Log element states
  const element = page.locator('.save-button');
  console.log('Button visible:', await element.isVisible());
  console.log('Button enabled:', await element.isEnabled());
});
```

### Use Browser DevTools

```javascript
// Enable debug mode in Playwright
test.use({
  viewport: { width: 1280, height: 720 },
  launchOptions: {
    headless: false, // Show browser for debugging
    devtools: true,  // Open DevTools
    slowMo: 500      // Slow down actions
  }
});
```

### Implement Custom Debug Commands

```javascript
// Debug utilities
const debugUtils = {
  logPageState: async (page) => {
    const state = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      readyState: document.readyState,
      hasFocus: document.hasFocus()
    }));
    console.log('Page state:', state);
  },

  logElementInfo: async (page, selector) => {
    const info = await page.$eval(selector, (el) => ({
      visible: el.offsetParent !== null,
      enabled: !el.disabled,
      textContent: el.textContent,
      className: el.className
    }));
    console.log('Element info:', info);
  }
};
```

## Common Error Messages and Solutions

### `TypeError: Cannot read property 'click' of null`
**Cause**: Element doesn't exist in DOM
**Solution**: Use proper waits and existence checks

### `TimeoutError: Waiting for selector failed`
**Cause**: Element not found within timeout
**Solution**: Increase timeout or use different selector

### `Error: net::ERR_BLOCKED_BY_CLIENT`
**Cause**: Browser extension or ad blocker blocking request
**Solution**: Disable extensions or use headless mode

### `Error: Protocol error (Runtime.callFunctionOn)`
**Cause**: Page closed or navigation occurred
**Solution**: Wait for stable page state before executing JavaScript

### `Error: Failed to execute 'addScriptTag' on 'Page'`
**Cause**: Script file not found or CSP blocking
**Solution**: Check file paths and CSP configuration

## Getting Additional Help

### Resources
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Axe-Core Documentation](https://www.deque.com/axe/)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)

### Community Support
- Stack Overflow with tags `[playwright]`, `[chrome-extension]`, `[testing]`
- Playwright GitHub Discussions
- Chrome Extensions Developer Forum

### Internal Documentation
- Check `tests/ai-workflow/` for AI-specific patterns
- Review `tests/utils/` for utility documentation
- Consult `specs/002-add-ui-testing/` for implementation details

---

This troubleshooting guide covers the most common issues encountered with the UI testing workflow. For issues not covered here, please consult the additional resources or file an issue in the project repository.