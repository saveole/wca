/**
 * Chrome Extension API Mocks
 *
 * Comprehensive mock implementations for Chrome extension APIs used in WebClip Assistant.
 * These mocks allow testing components in isolation without requiring Chrome extension environment.
 */

/**
 * Create a mock function for testing
 * @param {Function} impl - Implementation function
 * @returns {Function} Mock function with tracking capabilities
 */
const createMockFunction = (impl = () => {}) => {
  const mockFn = function(...args) {
    mockFn.calls.push(args);
    mockFn.callCount++;
    return impl.apply(this, args);
  };
  mockFn.calls = [];
  mockFn.callCount = 0;
  mockFn.mockClear = () => {
    mockFn.calls = [];
    mockFn.callCount = 0;
  };
  mockFn.mockResolvedValue = (value) => {
    mockFn.mockImplementation(() => Promise.resolve(value));
  };
  mockFn.mockRejectedValue = (value) => {
    mockFn.mockImplementation(() => Promise.reject(value));
  };
  mockFn.mockImplementation = (newImpl) => {
    mockFn.impl = newImpl;
    mockFn.calls = [];
    mockFn.callCount = 0;
  };
  return mockFn;
};

/**
 * Create a complete Chrome API mock with all methods used by WebClip Assistant
 * @returns {Object} Mock Chrome API object
 */
export const createChromeMock = () => {
  // Storage mock with sync and local storage
  const storageData = {
    sync: {},
    local: {}
  };

  const storage = {
    sync: {
      get: createMockFunction((keys, callback) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (storageData.sync[key] !== undefined) {
              result[key] = storageData.sync[key];
            }
          });
        } else if (typeof keys === 'string') {
          if (storageData.sync[keys] !== undefined) {
            result[keys] = storageData.sync[keys];
          }
        } else {
          Object.assign(result, storageData.sync);
        }

        // Support both callback and promise patterns
        if (callback) {
          callback(result);
          return Promise.resolve();
        }
        return Promise.resolve(result);
      }),

      set: createMockFunction((items, callback) => {
        Object.assign(storageData.sync, items);

        if (callback) {
          callback();
          return Promise.resolve();
        }
        return Promise.resolve();
      }),

      remove: createMockFunction((keys, callback) => {
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            delete storageData.sync[key];
          });
        } else {
          delete storageData.sync[keys];
        }

        if (callback) {
          callback();
          return Promise.resolve();
        }
        return Promise.resolve();
      }),

      clear: createMockFunction((callback) => {
        storageData.sync = {};

        if (callback) {
          callback();
          return Promise.resolve();
        }
        return Promise.resolve();
      }),

      // Helper methods for testing
      _setData: (data) => {
        Object.assign(storageData.sync, data);
      },

      _getData: () => ({ ...storageData.sync }),
      _clearData: () => {
        storageData.sync = {};
      }
    },

    local: {
      get: createMockFunction((keys, callback) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (storageData.local[key] !== undefined) {
              result[key] = storageData.local[key];
            }
          });
        } else if (typeof keys === 'string') {
          if (storageData.local[keys] !== undefined) {
            result[keys] = storageData.local[keys];
          }
        } else {
          Object.assign(result, storageData.local);
        }

        if (callback) {
          callback(result);
          return Promise.resolve();
        }
        return Promise.resolve(result);
      }),

      set: createMockFunction((items, callback) => {
        Object.assign(storageData.local, items);

        if (callback) {
          callback();
          return Promise.resolve();
        }
        return Promise.resolve();
      }),

      _setData: (data) => {
        Object.assign(storageData.local, data);
      },

      _getData: () => ({ ...storageData.local }),
      _clearData: () => {
        storageData.local = {};
      }
    }
  };

  // Runtime mock for messaging and extension communication
  const messageListeners = [];
  const runtime = {
    sendMessage: createMockFunction((message, callback) => {
      // Default success response
      const response = { success: true, data: null };

      // Handle specific message types
      if (message.type === 'EXTRACT_PAGE_DATA') {
        response.data = {
          title: 'Test Page Title',
          url: 'https://example.com',
          description: 'Test page description',
          coverImage: 'https://example.com/image.jpg'
        };
      } else if (message.type === 'GENERATE_SUMMARY') {
        response.data = 'This is a test AI-generated summary of the content.';
      } else if (message.type === 'SAVE_TO_NOTION') {
        response.data = {
          id: 'notion-page-id',
          url: 'https://notion.so/page-id'
        };
      } else if (message.type === 'EXPORT_FILE') {
        response.data = {
          success: true,
          filename: 'test-export.md'
        };
      }

      if (callback) {
        callback(response);
        return Promise.resolve();
      }
      return Promise.resolve(response);
    }),

    onMessage: {
      addListener: createMockFunction((callback) => {
        messageListeners.push(callback);
      }),

      removeListener: createMockFunction((callback) => {
        const index = messageListeners.indexOf(callback);
        if (index > -1) {
          messageListeners.splice(index, 1);
        }
      }),

      // Helper for testing
      _trigger: (message) => {
        messageListeners.forEach(callback => {
          try {
            callback(message, {}, () => {});
          } catch (error) {
            console.error('Error in message listener:', error);
          }
        });
      },

      _clearListeners: () => {
        messageListeners.length = 0;
      }
    },

    getURL: createMockFunction((path) => {
      return `chrome-extension://test-extension-id/${path}`;
    }),

    getId: createMockFunction(() => 'test-extension-id'),

    getManifest: createMockFunction(() => ({
      name: 'WebClip Assistant',
      version: '1.0.0',
      manifest_version: 3
    }))
  };

  // Tabs mock for tab operations
  const tabs = {
    query: createMockFunction((queryInfo, callback) => {
      const tabs = [
        {
          id: 1,
          url: 'https://example.com',
          title: 'Example Page',
          active: true,
          windowId: 1
        }
      ];

      if (callback) {
        callback(tabs);
        return Promise.resolve();
      }
      return Promise.resolve(tabs);
    }),

    sendMessage: createMockFunction((tabId, message, callback) => {
      const response = { success: true, data: null };

      if (message.type === 'EXTRACT_PAGE_DATA') {
        response.data = {
          title: 'Test Page Title',
          url: 'https://example.com',
          description: 'Test page description'
        };
      }

      if (callback) {
        callback(response);
        return Promise.resolve();
      }
      return Promise.resolve(response);
    }),

    create: createMockFunction((createProperties, callback) => {
      const tab = { id: Date.now(), ...createProperties };

      if (callback) {
        callback(tab);
        return Promise.resolve();
      }
      return Promise.resolve(tab);
    }),

    update: createMockFunction((tabId, updateProperties, callback) => {
      const tab = { id: tabId, ...updateProperties };

      if (callback) {
        callback(tab);
        return Promise.resolve();
      }
      return Promise.resolve(tab);
    })
  };

  // Scripting mock for content script injection
  const scripting = {
    executeScript: createMockFunction((injection, callback) => {
      const result = [
        {
          title: 'Test Page Title',
          url: 'https://example.com',
          description: 'Test page description',
          coverImage: 'https://example.com/image.jpg'
        }
      ];

      if (callback) {
        callback(result);
        return Promise.resolve();
      }
      return Promise.resolve(result);
    }),

    insertCSS: createMockFunction((injection, callback) => {
      if (callback) {
        callback();
        return Promise.resolve();
      }
      return Promise.resolve();
    })
  };

  // Downloads mock for file operations
  const downloads = {
    download: createMockFunction((options, callback) => {
      const downloadId = Date.now();

      if (callback) {
        callback(downloadId);
        return Promise.resolve();
      }
      return Promise.resolve(downloadId);
    }),

    search: createMockFunction((query, callback) => {
      const downloads = [
        {
          id: 1,
          filename: 'test-file.md',
          url: 'blob:test-url',
          danger: 'safe',
          mime: 'text/markdown',
          state: 'complete'
        }
      ];

      if (callback) {
        callback(downloads);
        return Promise.resolve();
      }
      return Promise.resolve(downloads);
    })
  };

  // Extension mock for extension-specific operations
  const extension = {
    getURL: createMockFunction((path) => {
      return `chrome-extension://test-extension-id/${path}`;
    }),

    getBackgroundPage: createMockFunction((callback) => {
      const backgroundPage = {
        url: 'chrome-extension://test-extension-id/background.html'
      };

      if (callback) {
        callback(backgroundPage);
        return Promise.resolve();
      }
      return Promise.resolve(backgroundPage);
    })
  };

  // Action mock for browser action
  const action = {
    setIcon: createMockFunction((details, callback) => {
      if (callback) {
        callback();
        return Promise.resolve();
      }
      return Promise.resolve();
    }),

    setTitle: createMockFunction((details, callback) => {
      if (callback) {
        callback();
        return Promise.resolve();
      }
      return Promise.resolve();
    }),

    setBadgeText: createMockFunction((details, callback) => {
      if (callback) {
        callback();
        return Promise.resolve();
      }
      return Promise.resolve();
    })
  };

  // Complete Chrome API mock
  const chromeMock = {
    storage,
    runtime,
    tabs,
    scripting,
    downloads,
    extension,
    action,

    // Helper methods for test setup and teardown
    _reset: () => {
      // Reset all mock implementations
      Object.keys(storage.sync).forEach(key => {
        if (typeof storage.sync[key] === 'function' && !key.startsWith('_')) {
          storage.sync[key].mockClear();
        }
      });

      Object.keys(storage.local).forEach(key => {
        if (typeof storage.local[key] === 'function' && !key.startsWith('_')) {
          storage.local[key].mockClear();
        }
      });

      runtime.sendMessage.mockClear();
      runtime.getURL.mockClear();
      tabs.query.mockClear();
      tabs.sendMessage.mockClear();
      scripting.executeScript.mockClear();
      downloads.download.mockClear();
      extension.getURL.mockClear();

      // Clear data
      storage.sync._clearData();
      storage.local._clearData();
      runtime.onMessage._clearListeners();
    },

    // Setup utilities
    setupSuccessResponse: (messageType, data) => {
      runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === messageType) {
          const response = { success: true, data };
          if (callback) {
            callback(response);
            return Promise.resolve();
          }
          return Promise.resolve(response);
        }
        return runtime.sendMessage.impl ? runtime.sendMessage.impl(message, callback) : Promise.resolve({ success: false });
      });
    },

    setupErrorResponse: (messageType, error) => {
      runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === messageType) {
          const response = { success: false, error: error.message || 'Unknown error' };
          if (callback) {
            callback(response);
            return Promise.resolve();
          }
          return Promise.resolve(response);
        }
        return runtime.sendMessage.impl ? runtime.sendMessage.impl(message, callback) : Promise.resolve({ success: false });
      });
    }
  };

  return chromeMock;
};

/**
 * Create a minimal Chrome API mock for basic functionality tests
 * @returns {Object} Minimal Chrome API mock
 */
export const createMinimalChromeMock = () => ({
  storage: {
    sync: {
      get: createMockFunction(() => Promise.resolve({})),
      set: createMockFunction(() => Promise.resolve()),
      remove: createMockFunction(() => Promise.resolve()),
      clear: createMockFunction(() => Promise.resolve())
    },
    local: {
      get: createMockFunction(() => Promise.resolve({})),
      set: createMockFunction(() => Promise.resolve())
    }
  },
  runtime: {
    sendMessage: createMockFunction(() => Promise.resolve({ success: true })),
    getURL: createMockFunction(() => 'chrome-extension://test-id/')
  },
  tabs: {
    query: createMockFunction(() => Promise.resolve([])),
    sendMessage: createMockFunction(() => Promise.resolve({ success: true }))
  }
});

/**
 * Setup global Chrome API mock for testing
 * @param {Object} customMock - Custom Chrome API mock to use
 * @returns {Object} The created Chrome API mock
 */
export const setupChromeMock = (customMock = null) => {
  const chromeMock = customMock || createChromeMock();
  global.chrome = chromeMock;
  return chromeMock;
};

/**
 * Cleanup global Chrome API mock
 */
export const cleanupChromeMock = () => {
  if (global.chrome) {
    if (global.chrome._reset) {
      global.chrome._reset();
    }
    delete global.chrome;
  }
};

export default {
  createChromeMock,
  createMinimalChromeMock,
  setupChromeMock,
  cleanupChromeMock
};