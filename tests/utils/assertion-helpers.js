/**
 * Custom Assertion Helpers for WebClip Assistant Testing
 *
 * Specialized assertion helpers for common testing patterns in the WebClip Assistant,
 * including Chrome API interactions, DOM state validation, and component behavior.
 */

/**
 * Assert that Chrome API was called with expected parameters
 * @param {Object} mock - Mock function to check
 * @param {Object} expectedCall - Expected call parameters
 * @param {string} message - Optional assertion message
 */
export function expectChromeApiCall(mock, expectedCall, message = '') {
  expect(mock).toHaveBeenCalled();

  const actualCall = mock.mock.calls[mock.mock.calls.length - 1];
  const defaultMessage = `Chrome API called with ${JSON.stringify(expectedCall)} but got ${JSON.stringify(actualCall)}`;

  if (expectedCall.type) {
    expect(actualCall[0].type).toBe(expectedCall.type, message || defaultMessage);
  }

  if (expectedCall.data) {
    expect(actualCall[0].data).toEqual(expectedCall.data, message || defaultMessage);
  }

  if (expectedCall.keys) {
    expect(actualCall[0]).toEqual(expect.objectContaining(expectedCall.keys), message || defaultMessage);
  }
}

/**
 * Assert that element has specific CSS classes
 * @param {HTMLElement} element - Element to check
 * @param {Array<string>} expectedClasses - Expected CSS classes
 * @param {string} message - Optional assertion message
 */
export function expectClasses(element, expectedClasses, message = '') {
  const elementClasses = Array.from(element.classList);
  const defaultMessage = `Expected element to have classes [${expectedClasses.join(', ')}] but has [${elementClasses.join(', ')}]`;

  expectedClasses.forEach(expectedClass => {
    expect(elementClasses).toContain(expectedClass, message || defaultMessage);
  });
}

/**
 * Assert that element is visible
 * @param {HTMLElement} element - Element to check
 * @param {string} message - Optional assertion message
 */
export function expectVisible(element, message = '') {
  const style = window.getComputedStyle(element);
  const isVisible = style.display !== 'none' &&
                   style.visibility !== 'hidden' &&
                   style.opacity !== '0' &&
                   element.offsetWidth > 0 &&
                   element.offsetHeight > 0;

  const defaultMessage = `Expected element to be visible but it's hidden (display: ${style.display}, visibility: ${style.visibility}, opacity: ${style.opacity})`;
  expect(isVisible).toBe(true, message || defaultMessage);
}

/**
 * Assert that element is hidden
 * @param {HTMLElement} element - Element to check
 * @param {string} message - Optional assertion message
 */
export function expectHidden(element, message = '') {
  const style = window.getComputedStyle(element);
  const isHidden = style.display === 'none' ||
                  style.visibility === 'hidden' ||
                  style.opacity === '0' ||
                  element.offsetWidth === 0 ||
                  element.offsetHeight === 0;

  const defaultMessage = `Expected element to be hidden but it's visible (display: ${style.display}, visibility: ${style.visibility}, opacity: ${style.opacity})`;
  expect(isHidden).toBe(true, message || defaultMessage);
}

/**
 * Assert that form field has expected value
 * @param {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} field - Form field
 * @param {string|number|boolean} expectedValue - Expected value
 * @param {string} message - Optional assertion message
 */
export function expectFieldValue(field, expectedValue, message = '') {
  const defaultMessage = `Expected field to have value '${expectedValue}' but has '${field.value}'`;
  expect(field.value).toBe(expectedValue.toString(), message || defaultMessage);
}

/**
 * Assert that form field has specific validation state
 * @param {HTMLInputElement|HTMLTextAreaElement} field - Form field
 * @param {boolean} isValid - Expected validation state
 * @param {string} message - Optional assertion message
 */
export function expectFieldValidation(field, isValid, message = '') {
  const defaultMessage = `Expected field to be ${isValid ? 'valid' : 'invalid'} but it's ${field.validity.valid ? 'valid' : 'invalid'}`;
  expect(field.validity.valid).toBe(isValid, message || defaultMessage);
}

/**
 * Assert that element has specific text content
 * @param {HTMLElement} element - Element to check
 * @param {string|RegExp} expectedText - Expected text content
 * @param {string} message - Optional assertion message
 */
export function expectTextContent(element, expectedText, message = '') {
  const actualText = element.textContent.trim();
  const defaultMessage = `Expected element to have text '${expectedText}' but has '${actualText}'`;

  if (expectedText instanceof RegExp) {
    expect(actualText).toMatch(expectedText, message || defaultMessage);
  } else {
    expect(actualText).toBe(expectedText, message || defaultMessage);
  }
}

/**
 * Assert that button is in specific state
 * @param {HTMLButtonElement} button - Button to check
 * @param {Object} state - Expected button state
 * @param {boolean} state.disabled - Whether button should be disabled
 * @param {boolean} state.loading - Whether button should show loading state
 * @param {string} state.text - Expected button text
 * @param {string} message - Optional assertion message
 */
export function expectButtonState(button, state, message = '') {
  if (state.disabled !== undefined) {
    const defaultMessage = `Expected button to be ${state.disabled ? 'disabled' : 'enabled'} but it's ${button.disabled ? 'disabled' : 'enabled'}`;
    expect(button.disabled).toBe(state.disabled, message || defaultMessage);
  }

  if (state.loading !== undefined) {
    const hasLoadingClass = button.classList.contains('loading') ||
                           button.getAttribute('aria-busy') === 'true';
    const defaultMessage = `Expected button to be ${state.loading ? 'loading' : 'not loading'} but it's ${hasLoadingClass ? 'loading' : 'not loading'}`;
    expect(hasLoadingClass).toBe(state.loading, message || defaultMessage);
  }

  if (state.text !== undefined) {
    const defaultMessage = `Expected button to have text '${state.text}' but has '${button.textContent.trim()}'`;
    expect(button.textContent.trim()).toBe(state.text, message || defaultMessage);
  }
}

/**
 * Assert that toast notification is showing
 * @param {string} expectedMessage - Expected toast message
 * @param {string} type - Expected toast type ('success', 'error', 'info', 'warning')
 * @param {string} message - Optional assertion message
 */
export function expectToast(expectedMessage, type, message = '') {
  const toastElement = document.querySelector('.toast, .notification, [role="alert"]');
  const defaultMessage = `Expected toast with message '${expectedMessage}' and type '${type}' but no toast found`;

  expect(toastElement).toBeTruthy(message || defaultMessage);

  if (toastElement) {
    const actualMessage = toastElement.textContent.trim();
    expect(actualMessage).toContain(expectedMessage, message || defaultMessage);

    if (type) {
      const typeClass = `toast-${type}` || `notification-${type}` || type;
      expect(toastElement).toHaveClass(typeClass, message || defaultMessage);
    }
  }
}

/**
 * Assert that no toast notification is showing
 * @param {string} message - Optional assertion message
 */
export function expectNoToast(message = '') {
  const toastElements = document.querySelectorAll('.toast, .notification, [role="alert"]');
  const defaultMessage = 'Expected no toast notifications but found some';
  expect(toastElements.length).toBe(0, message || defaultMessage);
}

/**
 * Assert that Chrome storage was called with specific keys
 * @param {Object} storageMock - Chrome storage mock
 * @param {Array<string>} expectedKeys - Expected storage keys
 * @param {string} storageType - Storage type ('sync' or 'local')
 * @param {string} message - Optional assertion message
 */
export function expectStorageKeys(storageMock, expectedKeys, storageType = 'sync', message = '') {
  const storage = storageMock[storageType];
  const defaultMessage = `Expected Chrome storage.${storageType}.get to be called with keys [${expectedKeys.join(', ')}]`;

  expect(storage.get).toHaveBeenCalled();

  const actualCall = storage.get.mock.calls[storage.get.mock.calls.length - 1];
  const actualKeys = Array.isArray(actualCall[0]) ? actualCall[0] : [actualCall[0]];

  expect(actualKeys).toEqual(expect.arrayContaining(expectedKeys), message || defaultMessage);
}

/**
 * Assert that component has expected number of child elements
 * @param {HTMLElement} parent - Parent element
 * @param {string} selector - Child element selector
 * @param {number} expectedCount - Expected number of children
 * @param {string} message - Optional assertion message
 */
export function expectChildCount(parent, selector, expectedCount, message = '') {
  const children = parent.querySelectorAll(selector);
  const defaultMessage = `Expected ${expectedCount} children matching '${selector}' but found ${children.length}`;
  expect(children.length).toBe(expectedCount, message || defaultMessage);
}

/**
 * Assert that element has specific attribute
 * @param {HTMLElement} element - Element to check
 * @param {string} attributeName - Attribute name
 * @param {string|RegExp} expectedValue - Expected attribute value
 * @param {string} message - Optional assertion message
 */
export function expectAttribute(element, attributeName, expectedValue, message = '') {
  const actualValue = element.getAttribute(attributeName);
  const defaultMessage = `Expected attribute '${attributeName}' to be '${expectedValue}' but is '${actualValue}'`;

  expect(actualValue).toBeTruthy(message || defaultMessage);

  if (expectedValue instanceof RegExp) {
    expect(actualValue).toMatch(expectedValue, message || defaultMessage);
  } else {
    expect(actualValue).toBe(expectedValue, message || defaultMessage);
  }
}

/**
 * Assert that async operation completed within timeout
 * @param {Promise} promise - Promise to wait for
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} message - Optional assertion message
 * @returns {Promise<any>}
 */
export async function expectAsyncComplete(promise, timeout = 5000, message = '') {
  const defaultMessage = `Async operation did not complete within ${timeout}ms`;

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message || defaultMessage)), timeout);
    })
  ]);
}

/**
 * Assert that error was thrown
 * @param {Function} fn - Function that should throw
 * @param {string|RegExp} expectedError - Expected error message or pattern
 * @param {string} message - Optional assertion message
 */
export async function expectError(fn, expectedError, message = '') {
  const defaultMessage = `Expected function to throw error matching '${expectedError}' but no error was thrown`;

  try {
    await fn();
    fail(message || defaultMessage);
  } catch (error) {
    if (expectedError instanceof RegExp) {
      expect(error.message).toMatch(expectedError, message || defaultMessage);
    } else {
      expect(error.message).toContain(expectedError, message || defaultMessage);
    }
  }
}

/**
 * Assert that specific number of API calls were made
 * @param {Object} mock - Mock function to check
 * @param {number} expectedCount - Expected call count
 * @param {string} message - Optional assertion message
 */
export function expectCallCount(mock, expectedCount, message = '') {
  const defaultMessage = `Expected ${expectedCount} calls but got ${mock.mock.calls.length}`;
  expect(mock.mock.calls.length).toBe(expectedCount, message || defaultMessage);
}

// Export all assertion helpers as default for easy importing
export default {
  expectChromeApiCall,
  expectClasses,
  expectVisible,
  expectHidden,
  expectFieldValue,
  expectFieldValidation,
  expectTextContent,
  expectButtonState,
  expectToast,
  expectNoToast,
  expectStorageKeys,
  expectChildCount,
  expectAttribute,
  expectAsyncComplete,
  expectError,
  expectCallCount
};