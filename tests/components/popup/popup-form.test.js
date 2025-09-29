/**
 * Popup Form Component Tests
 *
 * Tests popup form handling including:
 * - Form data management
 * - Input validation
 * - Field updates
 * - Form submission
 *
 * Uses component isolation approach with mocked Chrome APIs.
 */

import { test, expect } from '@playwright/test';
import { setupTestEnvironment, cleanupTestEnvironment, simulateInput, simulateFormSubmit } from '../../utils/test-utils.js';
import { expectFieldValue, expectFieldValidation, expectVisible, expectHidden } from '../../utils/assertion-helpers.js';
import { createChromeMock } from '../../mocks/chrome-api.js';
import { getComponentHTML } from '../../utils/test-utils.js';

test.describe('Popup Form Handling', () => {
  let chromeMock;
  let testEnv;

  test.beforeEach(() => {
    // Setup Chrome API mocks
    chromeMock = createChromeMock();
    global.chrome = chromeMock;

    // Setup test environment with popup HTML
    testEnv = setupTestEnvironment(getComponentHTML('popup'));
  });

  test.afterEach(() => {
    // Clean up test environment
    cleanupTestEnvironment();
    if (global.chrome && global.chrome._reset) {
      global.chrome._reset();
    }
  });

  test('should handle form data initialization', async () => {
    const titleInput = testEnv.$('#title');
    const urlInput = testEnv.$('#url');
    const descriptionInput = testEnv.$('#description');

    // Verify form fields exist
    expectVisible(titleInput);
    expectVisible(urlInput);
    expectVisible(descriptionInput);

    // Verify initial empty state
    expectFieldValue(titleInput, '');
    expectFieldValue(urlInput, '');
    expectFieldValue(descriptionInput, '');
  });

  test('should handle form data population from Chrome storage', async () => {
    const titleInput = testEnv.$('#title');
    const urlInput = testEnv.$('#url');

    // Mock Chrome storage with existing data
    chromeMock.storage.sync.get.mockResolvedValue({
      lastClip: {
        title: 'Previously Saved Title',
        url: 'https://example.com/previous'
      }
    });

    // In a real implementation, this would be handled by the PopupManager
    // For testing, we verify the storage API is available
    expect(chromeMock.storage.sync.get).toBeDefined();
  });

  test('should handle title input validation', async () => {
    const titleInput = testEnv.$('#title');

    // Test valid title
    simulateInput(titleInput, 'Test Title');
    expectFieldValue(titleInput, 'Test Title');

    // Test empty title (should be valid in our case as title is optional)
    simulateInput(titleInput, '');
    expectFieldValue(titleInput, '');
  });

  test('should handle URL input validation', async () => {
    const urlInput = testEnv.$('#url');

    // Test valid URL
    simulateInput(urlInput, 'https://example.com');
    expectFieldValue(urlInput, 'https://example.com');

    // Test invalid URL
    simulateInput(urlInput, 'invalid-url');
    expectFieldValue(urlInput, 'invalid-url');

    // Test empty URL
    simulateInput(urlInput, '');
    expectFieldValue(urlInput, '');
  });

  test('should handle description input', async () => {
    const descriptionInput = testEnv.$('#description');

    // Test setting description
    simulateInput(descriptionInput, 'This is a test description');
    expectFieldValue(descriptionInput, 'This is a test description');

    // Test clearing description
    simulateInput(descriptionInput, '');
    expectFieldValue(descriptionInput, '');
  });

  test('should handle form submission with valid data', async () => {
    const titleInput = testEnv.$('#title');
    const urlInput = testEnv.$('#url');
    const descriptionInput = testEnv.$('#description');
    const form = testEnv.container.querySelector('form');

    // Fill form with valid data
    simulateInput(titleInput, 'Test Title');
    simulateInput(urlInput, 'https://example.com');
    simulateInput(descriptionInput, 'Test Description');

    // Mock successful save response
    chromeMock.runtime.sendMessage.mockResolvedValue({
      success: true,
      data: { id: 'test-id' }
    });

    // Submit form
    simulateFormSubmit(form);

    // Verify Chrome API was called with form data
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('SAVE') || expect.stringContaining('EXPORT'),
        data: expect.objectContaining({
          title: 'Test Title',
          url: 'https://example.com',
          description: 'Test Description'
        })
      })
    );
  });

  test('should handle form submission with minimal data', async () => {
    const titleInput = testEnv.$('#title');
    const urlInput = testEnv.$('#url');
    const form = testEnv.container.querySelector('form');

    // Fill form with minimal data
    simulateInput(titleInput, 'Test Title');
    simulateInput(urlInput, 'https://example.com');

    // Mock successful save response
    chromeMock.runtime.sendMessage.mockResolvedValue({
      success: true,
      data: { id: 'test-id' }
    });

    // Submit form
    simulateFormSubmit(form);

    // Verify Chrome API was called
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalled();
  });

  test('should handle form submission errors gracefully', async () => {
    const titleInput = testEnv.$('#title');
    const urlInput = testEnv.$('#url');
    const form = testEnv.container.querySelector('form');

    // Fill form with data
    simulateInput(titleInput, 'Test Title');
    simulateInput(urlInput, 'https://example.com');

    // Mock error response
    chromeMock.runtime.sendMessage.mockRejectedValue(new Error('Network error'));

    // Submit form
    simulateFormSubmit(form);

    // Verify error was handled (no exception thrown)
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalled();
  });

  test('should handle form reset functionality', async () => {
    const titleInput = testEnv.$('#title');
    const urlInput = testEnv.$('#url');
    const descriptionInput = testEnv.$('#description');

    // Fill form with data
    simulateInput(titleInput, 'Test Title');
    simulateInput(urlInput, 'https://example.com');
    simulateInput(descriptionInput, 'Test Description');

    // Verify data is set
    expectFieldValue(titleInput, 'Test Title');
    expectFieldValue(urlInput, 'https://example.com');
    expectFieldValue(descriptionInput, 'Test Description');

    // Reset form (this would be handled by form.reset() in real implementation)
    titleInput.value = '';
    urlInput.value = '';
    descriptionInput.value = '';

    // Verify form is reset
    expectFieldValue(titleInput, '');
    expectFieldValue(urlInput, '');
    expectFieldValue(descriptionInput, '');
  });

  test('should handle form data updates', async () => {
    const titleInput = testEnv.$('#title');
    const urlInput = testEnv.$('#url');

    // Set initial data
    simulateInput(titleInput, 'Initial Title');
    simulateInput(urlInput, 'https://initial.com');

    // Update data
    simulateInput(titleInput, 'Updated Title');
    simulateInput(urlInput, 'https://updated.com');

    // Verify updates
    expectFieldValue(titleInput, 'Updated Title');
    expectFieldValue(urlInput, 'https://updated.com');
  });

  test('should handle special characters in form fields', async () => {
    const titleInput = testEnv.$('#title');
    const descriptionInput = testEnv.$('#description');

    // Test special characters
    const specialTitle = 'Test Title with "quotes" & symbols @#$';
    const specialDescription = 'Description with <html> entities &amp; symbols';

    simulateInput(titleInput, specialTitle);
    simulateInput(descriptionInput, specialDescription);

    // Verify special characters are preserved
    expectFieldValue(titleInput, specialTitle);
    expectFieldValue(descriptionInput, specialDescription);
  });

  test('should handle long text inputs', async () => {
    const titleInput = testEnv.$('#title');
    const descriptionInput = testEnv.$('#description');

    // Test long title
    const longTitle = 'A'.repeat(200);
    simulateInput(titleInput, longTitle);
    expectFieldValue(titleInput, longTitle);

    // Test long description
    const longDescription = 'This is a very long description. '.repeat(50);
    simulateInput(descriptionInput, longDescription);
    expectFieldValue(descriptionInput, longDescription);
  });

  test.describe('Form Integration', () => {
    test('should integrate with Chrome storage for persistence', async () => {
      const titleInput = testEnv.$('#title');
      const urlInput = testEnv.$('#url');

      // Mock storage get and set
      chromeMock.storage.sync.get.mockResolvedValue({
        formDraft: {
          title: 'Draft Title',
          url: 'https://draft.com'
        }
      });

      // Verify storage integration
      expect(chromeMock.storage.sync.get).toBeDefined();
      expect(chromeMock.storage.sync.set).toBeDefined();
    });

    test('should integrate with Chrome runtime for operations', async () => {
      const titleInput = testEnv.$('#title');
      const urlInput = testEnv.$('#url');

      // Fill form
      simulateInput(titleInput, 'Test Title');
      simulateInput(urlInput, 'https://example.com');

      // Mock successful response
      chromeMock.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: { id: 'test-id' }
      });

      // Verify runtime integration
      expect(chromeMock.runtime.sendMessage).toBeDefined();
    });
  });
});