# WebClip Assistant Testing Guide

## Overview

This document provides comprehensive guidance for testing the WebClip Assistant Chrome extension using our component isolation strategy with mocked Chrome APIs.

## Testing Strategy

We use a component isolation approach that allows us to test individual UI components in isolation without requiring a Chrome extension environment. This strategy provides:

- **Reliable Tests**: Consistent execution across environments
- **Fast Feedback**: Quick test execution during development
- **Focused Debugging**: Easy identification of issues
- **CI/CD Friendly**: Tests can run anywhere without Chrome browser

## Test Structure

```
tests/
├── mocks/                    # API and Chrome mocks
│   ├── chrome-api.js        # Chrome extension API mocks
│   ├── external-apis.js    # OpenAI/Notion API mocks
│   └── dom-utils.js        # DOM manipulation utilities
├── components/               # Individual component tests
│   ├── popup/               # Popup component tests
│   ├── settings/            # Settings component tests
│   └── background/          # Background service tests
├── integration/              # Component interaction tests
├── visual/                   # Visual regression tests
├── accessibility/           # Accessibility tests
└── utils/                    # Testing utilities
    ├── test-utils.js       # Common test utilities
    ├── dom-helpers.js       # DOM manipulation helpers
    └── assertion-helpers.js # Custom assertions
```

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm package manager

### Installation
```bash
# Install all dependencies
npm install

# Install Playwright browsers
npm run install:browsers
```

### Running Tests

#### All Tests
```bash
npm test
```

#### Specific Test Types
```bash
# Component tests only
npm run test:components

# Visual regression tests
npm run test:visual

# Accessibility tests
npm run test:accessibility

# Integration tests
npm run test:integration

# Unit tests
npm run test:unit
```

#### Debug Mode
```bash
# Run tests with debug mode
npm run test:debug

# Debug specific test file
npm run test:debug:visual
```

## Writing Tests

### Test Structure Example

```javascript
import { describe, test, expect, beforeEach, afterEach } from '@playwright/test';
import { setupTestEnvironment, cleanupTestEnvironment } from '../utils/test-utils.js';
import { createChromeMock } from '../mocks/chrome-api.js';

describe('Component Name', () => {
  let chromeMock;
  let component;

  beforeEach(() => {
    // Setup Chrome API mocks
    chromeMock = createChromeMock();
    global.chrome = chromeMock;

    // Setup DOM environment
    const { container } = setupTestEnvironment(/* HTML content */);

    // Initialize component
    component = new Component();
  });

  afterEach(() => {
    // Clean up test environment
    cleanupTestEnvironment();
  });

  test('should perform expected behavior', async () => {
    // Arrange: Setup test conditions
    chromeMock.storage.sync.get.mockResolvedValue({ key: 'value' });

    // Act: Execute the functionality
    await component.doSomething();

    // Assert: Verify the results
    expect(chromeMock.storage.sync.get).toHaveBeenCalled();
    expect(component.state).toBe('expected');
  });
});
```

### Mocking Chrome APIs

#### Basic Chrome API Mocking
```javascript
import { createChromeMock } from '../mocks/chrome-api.js';

// Setup complete Chrome mock
const chromeMock = createChromeMock();
global.chrome = chromeMock;

// Mock specific API responses
chromeMock.storage.sync.get.mockResolvedValue({
  apiKey: 'test-api-key',
  notionToken: 'test-notion-token'
});

chromeMock.runtime.sendMessage.mockResolvedValue({
  success: true,
  data: 'test-data'
});
```

#### External API Mocking
```javascript
import { createMockOpenAIResponse, createMockNotionResponse } from '../mocks/external-apis.js';

// Mock OpenAI API response
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(createMockOpenAIResponse('Test summary'))
});

// Mock Notion API response
chromeMock.runtime.sendMessage.mockResolvedValue(createMockNotionResponse());
```

### DOM Testing Utilities

#### Setting Up Test Environment
```javascript
import { setupTestEnvironment, cleanupTestEnvironment } from '../utils/test-utils.js';

// Setup DOM with HTML content
const { container } = setupTestEnvironment(`
  <div class="popup-container">
    <input id="title-input" type="text" />
    <button id="save-button">Save</button>
  </div>
`);

// Access DOM elements
const titleInput = container.querySelector('#title-input');
const saveButton = container.querySelector('#save-button');

// Clean up after test
cleanupTestEnvironment();
```

#### Simulating User Interactions
```javascript
import { simulateClick, simulateKeyPress, simulateInput } from '../utils/test-utils.js';

// Simulate button click
simulateClick(saveButton);

// Simulate keyboard input
simulateKeyPress(titleInput, 'Enter');

// Simulate text input
simulateInput(titleInput, 'Test Title');
```

### Component Testing Patterns

#### Testing Form Handling
```javascript
test('should validate form inputs', async () => {
  const form = new FormManager();

  // Test validation
  expect(form.validateField('title', '')).toBe(false);
  expect(form.validateField('title', 'Valid Title')).toBe(true);

  // Test error states
  form.setFieldValue('title', '');
  await form.validateForm();

  expect(form.errors.title).toBeDefined();
  expect(form.isValid).toBe(false);
});
```

#### Testing Async Operations
```javascript
test('should handle API calls correctly', async () => {
  const service = new BackgroundService();

  // Mock successful API response
  chromeMock.runtime.sendMessage.mockResolvedValue({
    success: true,
    summary: 'Generated summary'
  });

  // Test the async operation
  const result = await service.generateSummary('Test content');

  expect(result).toBe('Generated summary');
  expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
    type: 'GENERATE_SUMMARY',
    content: 'Test content'
  });
});
```

#### Testing Error Scenarios
```javascript
test('should handle API errors gracefully', async () => {
  const service = new BackgroundService();

  // Mock API error
  chromeMock.runtime.sendMessage.mockRejectedValue(new Error('API Error'));

  // Test error handling
  await expect(service.generateSummary('Test content')).rejects.toThrow('API Error');

  // Verify error state
  expect(service.isLoading).toBe(false);
  expect(service.error).toBe('API Error');
});
```

## Visual Regression Testing

### Setting Up Visual Tests
```javascript
import { test, expect } from '@playwright/test';
import { takeScreenshot, compareWithBaseline } from '../utils/screenshot-utils.js';

test('should render component correctly', async ({ page }) => {
  // Load component HTML and styles
  await page.setContent(getComponentHTML());
  await page.addStyleTag({ path: 'ui/styles.css' });

  // Take screenshot
  const screenshot = await takeScreenshot(page, '.component-container');

  // Compare with baseline
  const comparison = await compareWithBaseline(screenshot, 'component-name');

  expect(comparison.matches).toBe(true);
  expect(comparison.difference).toBeLessThan(0.05);
});
```

### Updating Baselines
```bash
# Update all visual baselines
npm run test:update-baselines

# Update specific visual baseline
npm run test:update-baseline
```

## Accessibility Testing

### Basic Accessibility Tests
```javascript
test('should meet accessibility standards', async ({ page }) => {
  await page.setContent(getComponentHTML());

  // Check for accessibility violations
  const accessibilityResults = await checkAccessibility(page);

  expect(accessibilityResults.violations).toHaveLength(0);
});

test('should support keyboard navigation', async ({ page }) => {
  await page.setContent(getComponentHTML());

  // Test keyboard navigation
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page.locator('.success-message')).toBeVisible();
});
```

## Integration Testing

### Component Integration Tests
```javascript
test('should integrate popup with background service', async () => {
  const popup = new PopupManager();
  const backgroundService = new BackgroundService();

  // Mock background service
  chromeMock.runtime.sendMessage.mockResolvedValue({
    success: true,
    data: 'extracted-data'
  });

  // Test integration
  await popup.extractPageData();

  expect(popup.currentData).toEqual('extracted-data');
  expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
    type: 'EXTRACT_PAGE_DATA'
  });
});
```

## Best Practices

### Test Organization
1. **One Test File Per Component**: Each major component should have its own test file
2. **Descriptive Test Names**: Use clear, descriptive names that explain what is being tested
3. **Arrange-Act-Assert Pattern**: Structure tests in three clear phases
4. **Test Both Success and Failure**: Test both happy paths and error scenarios

### Mock Usage
1. **Mock External Dependencies**: Always mock Chrome APIs and external services
2. **Reset Mocks**: Clean up mocks between tests using `beforeEach` and `afterEach`
3. **Mock Realistic Responses**: Create mocks that simulate real API responses
4. **Test Error States**: Mock error responses to test error handling

### Performance Considerations
1. **Keep Tests Fast**: Avoid unnecessary delays or waits in tests
2. **Isolate Tests**: Ensure tests don't depend on each other
3. **Clean Up Resources**: Clean up DOM and other resources after each test
4. **Use Selective Testing**: Run only relevant tests during development

## Debugging Tests

### Debug Mode
```bash
# Run tests in debug mode
npm run test:debug

# Debug specific test file
npm run test:debug:visual
```

### Common Issues
1. **Missing Chrome API**: Ensure Chrome APIs are properly mocked
2. **DOM Timing Issues**: Use `await` for DOM operations
3. **Async Test Completion**: Ensure async operations complete before assertions
4. **Mock Cleanup**: Clean up mocks between tests to avoid interference

## Contributing

### Adding New Tests
1. Create test file in appropriate directory
2. Follow the established testing patterns
3. Include both success and failure scenarios
4. Add accessibility checks for UI components
5. Consider adding visual regression tests for UI changes

### Updating Test Infrastructure
1. Coordinate with team before changing mock utilities
2. Maintain backward compatibility for existing tests
3. Update documentation when changing test patterns
4. Test changes thoroughly before committing

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Chrome Extension Testing Guide](https://developer.chrome.com/docs/extensions/mv3/testing/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Jest Testing Framework](https://jestjs.io/)