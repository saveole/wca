/**
 * Test Utilities for WebClip Assistant Component Testing
 *
 * Common utilities for setting up test environments, simulating user interactions,
 * and managing component state during tests.
 */

/**
 * Setup a test environment with HTML content
 * @param {string} html - HTML content to set up in test container
 * @param {Object} options - Setup options
 * @param {boolean} options.clearPrevious - Whether to clear previous content
 * @param {string} options.containerId - Custom container ID
 * @returns {Object} Test environment object with container and utilities
 */
export function setupTestEnvironment(html, options = {}) {
  const {
    clearPrevious = true,
    containerId = 'test-root'
  } = options;

  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    return {
      container: null,
      $: () => null,
      $$: () => [],
      cleanup: () => {},
      getDimensions: () => ({ width: 0, height: 0 })
    };
  }

  // Get or create test container
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.cssText = `
      position: absolute;
      top: -10000px;
      left: -10000px;
      width: 360px;
      height: 600px;
      overflow: hidden;
      background: white;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    document.body.appendChild(container);
  } else if (clearPrevious) {
    container.innerHTML = '';
  }

  // Set HTML content
  container.innerHTML = html;

  // Return test environment utilities
  return {
    container,

    /**
     * Query selector within test container
     */
    $: (selector) => container.querySelector(selector),

    /**
     * Query selector all within test container
     */
    $$: (selector) => container.querySelectorAll(selector),

    /**
     * Clean up this test environment
     */
    cleanup: () => {
      if (container && container.parentNode) {
        container.remove();
      }
    },

    /**
     * Get container dimensions
     */
    getDimensions: () => ({
      width: container.offsetWidth,
      height: container.offsetHeight
    })
  };
}

/**
 * Clean up test environment
 * @param {string} containerId - Container ID to clean up
 */
export function cleanupTestEnvironment(containerId = 'test-root') {
  if (typeof document === 'undefined') {
    return;
  }

  const container = document.getElementById(containerId);
  if (container) {
    container.remove();
  }
}

/**
 * Simulate a mouse click on an element
 * @param {HTMLElement} element - Element to click
 * @param {Object} options - Click options
 * @param {boolean} options.bubbles - Whether event bubbles
 * @param {boolean} options.cancelable - Whether event is cancelable
 * @param {Object} options.button - Mouse button (0 = left, 1 = middle, 2 = right)
 */
export function simulateClick(element, options = {}) {
  if (typeof window === 'undefined' || !element) {
    return;
  }

  const {
    bubbles = true,
    cancelable = true,
    button = 0
  } = options;

  const clickEvent = new MouseEvent('click', {
    bubbles,
    cancelable,
    button,
    view: window,
    detail: 1
  });

  element.dispatchEvent(clickEvent);
}

/**
 * Simulate a keyboard event
 * @param {HTMLElement} element - Element to dispatch event on
 * @param {string} key - Key to press
 * @param {Object} options - Keyboard event options
 * @param {string} options.type - Event type ('keydown', 'keyup', 'keypress')
 * @param {boolean} options.bubbles - Whether event bubbles
 * @param {boolean} options.cancelable - Whether event is cancelable
 * @param {Array<string>} options.modifiers - Modifier keys to hold
 */
export function simulateKeyPress(element, key, options = {}) {
  if (typeof window === 'undefined' || !element) {
    return;
  }

  const {
    type = 'keydown',
    bubbles = true,
    cancelable = true,
    modifiers = []
  } = options;

  const keyboardEvent = new KeyboardEvent(type, {
    key,
    code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
    bubbles,
    cancelable,
    ctrlKey: modifiers.includes('Ctrl'),
    shiftKey: modifiers.includes('Shift'),
    altKey: modifiers.includes('Alt'),
    metaKey: modifiers.includes('Meta')
  });

  element.dispatchEvent(keyboardEvent);
}

/**
 * Simulate text input on an input element
 * @param {HTMLInputElement|HTMLTextAreaElement} element - Input element
 * @param {string} text - Text to input
 * @param {Object} options - Input options
 * @param {boolean} options.triggerEvents - Whether to trigger input events
 */
export function simulateInput(element, text, options = {}) {
  const {
    triggerEvents = true
  } = options;

  element.value = text;

  if (triggerEvents) {
    // Trigger input event
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);

    // Trigger change event
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);
  }
}

/**
 * Simulate form submission
 * @param {HTMLFormElement} form - Form element to submit
 */
export function simulateFormSubmit(form) {
  const submitEvent = new Event('submit', {
    bubbles: true,
    cancelable: true
  });
  form.dispatchEvent(submitEvent);
}

/**
 * Wait for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {Object} options - Wait options
 * @param {number} options.timeout - Maximum time to wait
 * @param {number} options.interval - Check interval
 * @returns {Promise<void>}
 */
export async function waitForCondition(condition, options = {}) {
  const {
    timeout = 5000,
    interval = 100
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return;
    }
    await waitFor(interval);
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Create a mock function with call tracking
 * @param {Function} implementation - Optional implementation function
 * @returns {Function} Mock function with tracking properties
 */
export function createMockFunction(implementation = () => {}) {
  const mockFn = function(...args) {
    mockFn.calls.push(args);
    mockFn.callCount++;
    return implementation.apply(this, args);
  };

  mockFn.calls = [];
  mockFn.callCount = 0;
  mockFn.lastCall = () => mockFn.calls[mockFn.calls.length - 1] || null;
  mockFn.clear = () => {
    mockFn.calls = [];
    mockFn.callCount = 0;
  };

  return mockFn;
}

/**
 * Create a mock HTML element
 * @param {string} tagName - Tag name for element
 * @param {Object} attributes - Element attributes
 * @param {string} innerHTML - Inner HTML content
 * @returns {HTMLElement} Mock element
 */
export function mockElement(tagName, attributes = {}, innerHTML = '') {
  if (typeof document === 'undefined') {
    return null;
  }

  const element = document.createElement(tagName);

  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style') {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  });

  if (innerHTML) {
    element.innerHTML = innerHTML;
  }

  return element;
}

/**
 * Mock Chrome storage API response
 * @param {Object} data - Data to return from storage
 * @param {string} storageType - Storage type ('sync' or 'local')
 */
export function mockStorageResponse(data, storageType = 'sync') {
  if (global.chrome && global.chrome.storage && global.chrome.storage[storageType]) {
    global.chrome.storage[storageType].get.mockResolvedValue(data);
  }
}

/**
 * Mock Chrome runtime message response
 * @param {Object} response - Response to return from sendMessage
 * @param {Function} filter - Optional filter function to check message type
 */
export function mockRuntimeResponse(response, filter = null) {
  if (global.chrome && global.chrome.runtime) {
    global.chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (!filter || filter(message)) {
        if (callback) {
          callback(response);
          return Promise.resolve();
        }
        return Promise.resolve(response);
      }
      // Return default response for other message types
      const defaultResponse = { success: false, error: 'Not mocked' };
      if (callback) {
        callback(defaultResponse);
        return Promise.resolve();
      }
      return Promise.resolve(defaultResponse);
    });
  }
}

/**
 * Reset all Chrome API mocks
 */
export function resetChromeMocks() {
  if (global.chrome && global.chrome._reset) {
    global.chrome._reset();
  }
}

/**
 * Get component HTML for testing
 * @param {string} componentName - Name of component to get HTML for
 * @returns {string} HTML string for component
 */
export function getComponentHTML(componentName) {
  const components = {
    popup: `
      <div class="popup-container">
        <div class="form-group">
          <label for="title">Title</label>
          <input type="text" id="title" name="title" />
        </div>
        <div class="form-group">
          <label for="url">URL</label>
          <input type="url" id="url" name="url" />
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description"></textarea>
        </div>
        <div class="form-group">
          <label for="tags">Tags</label>
          <div id="tags-container">
            <input type="text" id="tag-input" placeholder="Add tags..." />
          </div>
        </div>
        <div class="button-group">
          <button id="generate-summary">Generate Summary</button>
          <button id="save-to-notion">Save to Notion</button>
          <button id="export-markdown">Export Markdown</button>
          <button id="export-json">Export JSON</button>
        </div>
      </div>
    `,
    settings: `
      <div class="settings-container">
        <div class="form-group">
          <label for="api-key">API Key</label>
          <input type="password" id="api-key" name="apiKey" />
        </div>
        <div class="form-group">
          <label for="notion-token">Notion Token</label>
          <input type="password" id="notion-token" name="notionToken" />
        </div>
        <div class="form-group">
          <label for="notion-database">Notion Database ID</label>
          <input type="text" id="notion-database" name="notionDatabaseId" />
        </div>
        <div class="button-group">
          <button id="test-connection">Test Connection</button>
          <button id="save-settings">Save Settings</button>
        </div>
      </div>
    `
  };

  return components[componentName] || '<div>Unknown component</div>';
}

// Export all utilities as default for easy importing
export default {
  setupTestEnvironment,
  cleanupTestEnvironment,
  simulateClick,
  simulateKeyPress,
  simulateInput,
  simulateFormSubmit,
  waitFor,
  waitForCondition,
  createMockFunction,
  mockElement,
  mockStorageResponse,
  mockRuntimeResponse,
  resetChromeMocks,
  getComponentHTML
};