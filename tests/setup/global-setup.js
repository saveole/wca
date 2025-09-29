/**
 * Global Setup for WebClip Assistant Tests
 *
 * This file runs once before all tests to set up the global testing environment,
 * including Chrome API mocks and common test utilities.
 */

import { setupChromeMock } from '../mocks/chrome-api.js';

/**
 * Global setup function called by Playwright before all tests
 * @param {Object} config - Playwright test configuration
 * @param {Object} config.config - Playwright configuration object
 * @returns {Promise<Object>} Global state to be passed to tests
 */
export default async function globalSetup(config) {
  console.log('🔧 Setting up global test environment...');

  // Setup global Chrome API mocks
  const chromeMock = setupChromeMock();

  // Setup global mock responses
  setupGlobalMockResponses(chromeMock);

  console.log('✅ Global test environment setup complete');

  // Return global state that can be accessed by tests
  return {
    chromeMock,
    testStartTime: Date.now(),
    testEnvironment: 'component-isolation'
  };
}

/**
 * Setup global mock responses for common API calls
 */
function setupGlobalMockResponses(chromeMock) {
  // Setup default successful responses for common message types
  chromeMock.setupSuccessResponse('EXTRACT_PAGE_DATA', {
    title: 'Test Page Title',
    url: 'https://example.com',
    description: 'Test page description',
    coverImage: 'https://example.com/image.jpg'
  });

  chromeMock.setupSuccessResponse('GENERATE_SUMMARY', {
    summary: 'This is a test AI-generated summary of the content.'
  });

  chromeMock.setupSuccessResponse('SAVE_TO_NOTION', {
    id: 'notion-page-id',
    url: 'https://notion.so/page-id'
  });

  chromeMock.setupSuccessResponse('EXPORT_FILE', {
    success: true,
    filename: 'test-export.md'
  });

  // Setup default storage data
  chromeMock.storage.sync._setData({
    apiKey: 'test-api-key',
    notionToken: 'test-notion-token',
    notionDatabaseId: 'test-database-id',
    selectedProvider: 'openai',
    theme: 'light',
    autoClosePopup: true,
    fieldMapping: {
      title: 'Title',
      url: 'URL',
      description: 'Description',
      summary: 'Summary',
      notes: 'Notes',
      tags: 'Tags',
      createdDate: 'Create Date'
    }
  });
}

/**
 * Cleanup function for individual tests
 * This can be called by tests that need additional cleanup
 */
global.cleanupTestEnvironment = function() {
  // Reset Chrome mock state
  if (global.chrome && global.chrome._reset) {
    global.chrome._reset();
  }

  // Clear any global timeouts
  if (global.setTimeout) {
    const highestTimeoutId = setTimeout(() => {}, 0);
    for (let i = 0; i < highestTimeoutId; i++) {
      clearTimeout(i);
    }
  }
};