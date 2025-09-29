/**
 * Simple Component Test to Validate Infrastructure
 *
 * Basic test to verify that the component testing infrastructure works correctly.
 */

import { test, expect } from '@playwright/test';
import { createChromeMock } from '../mocks/chrome-api.js';

test.describe('Component Testing Infrastructure', () => {
  test.beforeEach(() => {
    // Setup Chrome API mocks for each test
    const chromeMock = createChromeMock();
    global.chrome = chromeMock;
  });

  test.afterEach(() => {
    // Clean up Chrome mocks
    if (global.chrome && global.chrome._reset) {
      global.chrome._reset();
    }
  });

  test('should have Chrome API mocks available', async () => {
    // Verify that Chrome mock is available
    expect(global.chrome).toBeDefined();
    expect(global.chrome.runtime).toBeDefined();
    expect(global.chrome.storage).toBeDefined();
    expect(global.chrome.tabs).toBeDefined();
  });

  test('should have basic DOM access', async () => {
    // Test basic DOM manipulation
    document.body.innerHTML = '<div id="test-element">Test Content</div>';
    const element = document.getElementById('test-element');
    expect(element).toBeDefined();
    expect(element.textContent).toBe('Test Content');
  });

  test('should handle basic user interactions', async () => {
    // Create a simple button
    document.body.innerHTML = '<button id="test-button">Click Me</button>';
    const button = document.getElementById('test-button');

    let clicked = false;
    button.addEventListener('click', () => {
      clicked = true;
    });

    // Simulate click
    button.click();
    expect(clicked).toBe(true);
  });

  test('should handle form inputs', async () => {
    // Create a simple form
    document.body.innerHTML = `
      <input type="text" id="test-input" value="" />
      <div id="result"></div>
    `;

    const input = document.getElementById('test-input');
    const result = document.getElementById('result');

    // Test input change
    input.value = 'Test Value';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(input.value).toBe('Test Value');
  });

  test('should mock Chrome storage operations', async () => {
    // Mock storage operations
    const mockData = { apiKey: 'test-key' };
    global.chrome.storage.sync.get.mockResolvedValue(mockData);

    const result = await global.chrome.storage.sync.get(['apiKey']);
    expect(result).toEqual(mockData);
    expect(global.chrome.storage.sync.get).toHaveBeenCalled();
  });

  test('should mock Chrome runtime operations', async () => {
    // Mock runtime operations
    const mockResponse = { success: true, data: { id: 'test-id' } };
    global.chrome.runtime.sendMessage.mockResolvedValue(mockResponse);

    const result = await global.chrome.runtime.sendMessage({ type: 'TEST' });
    expect(result).toEqual(mockResponse);
    expect(global.chrome.runtime.sendMessage).toHaveBeenCalled();
  });
});