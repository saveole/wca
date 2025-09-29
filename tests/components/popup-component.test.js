/**
 * Popup Component Test Template
 *
 * This template shows how to test individual popup components in isolation
 * using Playwright's browser context approach.
 */

import { test, expect } from '@playwright/test';

test.describe('Popup Component Tests', () => {
  test.beforeEach(async ({ context }) => {
    // Setup Chrome API mocks for all tests
    await context.addInitScript(() => {
      window.chrome = {
        runtime: {
          sendMessage: (message, callback) => {
            const responses = {
              'EXTRACT_PAGE_DATA': {
                success: true,
                data: {
                  title: 'Extracted Page Title',
                  url: 'https://extracted-example.com',
                  description: 'Extracted page description from content script'
                }
              },
              'GENERATE_SUMMARY': {
                success: true,
                data: 'AI-generated summary of the page content'
              },
              'SAVE_TO_NOTION': {
                success: true,
                data: { id: 'notion-page-123', url: 'https://notion.so/page-123' }
              },
              'EXPORT_FILE': {
                success: true,
                data: { filename: 'export.md', success: true }
              }
            };

            const response = responses[message.type] || { success: false, error: 'Unknown message type' };
            if (callback) callback(response);
            return Promise.resolve(response);
          }
        },
        storage: {
          sync: {
            get: (keys, callback) => {
              const mockData = {
                apiKey: 'test-api-key-123',
                notionToken: 'test-notion-token-456',
                notionDatabaseId: 'test-database-789',
                selectedProvider: 'openai',
                theme: 'light',
                autoClosePopup: true
              };

              let result = {};
              if (Array.isArray(keys)) {
                keys.forEach(key => {
                  if (mockData[key] !== undefined) {
                    result[key] = mockData[key];
                  }
                });
              } else if (typeof keys === 'string') {
                if (mockData[keys] !== undefined) {
                  result[keys] = mockData[keys];
                }
              } else {
                result = { ...mockData };
              }

              if (callback) callback(result);
              return Promise.resolve(result);
            },
            set: (items, callback) => {
              if (callback) callback();
              return Promise.resolve();
            }
          }
        },
        tabs: {
          query: (queryInfo, callback) => {
            const tabs = [{
              id: 1,
              url: 'https://current-tab.com',
              title: 'Current Tab Title',
              active: true
            }];
            if (callback) callback(tabs);
            return Promise.resolve(tabs);
          }
        }
      };
    });
  });

  test('should load and display popup component', async ({ page }) => {
    // Create popup HTML structure
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: system-ui, -apple-system, sans-serif;
              background: #f5f5f5;
            }
            .popup-container {
              width: 360px;
              min-height: 400px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              padding: 20px;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 1px solid #e0e0e0;
            }
            .header h1 {
              margin: 0;
              font-size: 18px;
              color: #333;
            }
            .loading {
              display: none;
              text-align: center;
              padding: 20px;
              color: #666;
            }
            .content {
              display: block;
            }
          </style>
        </head>
        <body>
          <div class="popup-container">
            <div class="header">
              <h1>WebClip Assistant</h1>
            </div>
            <div class="loading" id="loading">
              <p>Loading extension...</p>
            </div>
            <div class="content" id="content">
              <!-- Main content will be loaded here -->
            </div>
          </div>
        </body>
      </html>
    `);

    // Add popup initialization script
    await page.addScriptTag({
      content: `
        class PopupManager {
          constructor() {
            this.content = document.getElementById('content');
            this.loading = document.getElementById('loading');
            this.initialize();
          }

          async initialize() {
            try {
              this.showLoading();
              await this.loadSettings();
              await this.extractPageData();
              this.renderForm();
              this.hideLoading();
            } catch (error) {
              console.error('Popup initialization error:', error);
              this.showError('Failed to initialize popup');
            }
          }

          showLoading() {
            this.loading.style.display = 'block';
            this.content.style.display = 'none';
          }

          hideLoading() {
            this.loading.style.display = 'none';
            this.content.style.display = 'block';
          }

          async loadSettings() {
            return new Promise((resolve) => {
              chrome.storage.sync.get(['apiKey', 'notionToken'], resolve);
            });
          }

          async extractPageData() {
            return new Promise((resolve) => {
              chrome.runtime.sendMessage({ type: 'EXTRACT_PAGE_DATA' }, resolve);
            });
          }

          renderForm() {
            this.content.innerHTML = \`
              <div class="form-group">
                <label for="title">Title</label>
                <input type="text" id="title" placeholder="Enter title..." />
              </div>
              <div class="form-group">
                <label for="url">URL</label>
                <input type="url" id="url" placeholder="https://example.com" />
              </div>
              <div class="button-group">
                <button id="extract-btn">Extract Data</button>
                <button id="save-btn">Save</button>
              </div>
            \`;

            this.attachEventListeners();
          }

          attachEventListeners() {
            document.getElementById('extract-btn').addEventListener('click', () => {
              this.extractData();
            });

            document.getElementById('save-btn').addEventListener('click', () => {
              this.saveData();
            });
          }

          async extractData() {
            const response = await new Promise((resolve) => {
              chrome.runtime.sendMessage({ type: 'EXTRACT_PAGE_DATA' }, resolve);
            });

            if (response.success) {
              document.getElementById('title').value = response.data.title;
              document.getElementById('url').value = response.data.url;
              this.showSuccess('Data extracted successfully!');
            } else {
              this.showError('Failed to extract data');
            }
          }

          async saveData() {
            const title = document.getElementById('title').value;
            const url = document.getElementById('url').value;

            if (!title || !url) {
              this.showError('Please fill in all required fields');
              return;
            }

            const response = await new Promise((resolve) => {
              chrome.runtime.sendMessage({
                type: 'SAVE_TO_NOTION',
                data: { title, url }
              }, resolve);
            });

            if (response.success) {
              this.showSuccess('Data saved successfully!');
            } else {
              this.showError('Failed to save data');
            }
          }

          showSuccess(message) {
            this.showMessage(message, 'success');
          }

          showError(message) {
            this.showMessage(message, 'error');
          }

          showMessage(message, type) {
            const existingMessage = document.querySelector('.message');
            if (existingMessage) {
              existingMessage.remove();
            }

            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            messageDiv.textContent = message;
            messageDiv.style.cssText = \`
              margin-top: 10px;
              padding: 10px;
              border-radius: 4px;
              text-align: center;
              background: \${type === 'success' ? '#d4edda' : '#f8d7da'};
              color: \${type === 'success' ? '#155724' : '#721c24'};
              border: 1px solid \${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
            \`;

            this.content.appendChild(messageDiv);

            setTimeout(() => {
              messageDiv.remove();
            }, 3000);
          }
        }

        // Initialize popup when DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            window.popupManager = new PopupManager();
          });
        } else {
          window.popupManager = new PopupManager();
        }
      `
    });

    // Wait for initialization
    await page.waitForTimeout(100);

    // Test that popup loads correctly
    await expect(page.locator('.popup-container')).toBeVisible();
    await expect(page.locator('.header h1')).toHaveText('WebClip Assistant');
    await expect(page.locator('#content')).toBeVisible();
    await expect(page.locator('#loading')).toBeHidden();

    // Test form elements are present
    await expect(page.locator('#title')).toBeVisible();
    await expect(page.locator('#url')).toBeVisible();
    await expect(page.locator('#extract-btn')).toBeVisible();
    await expect(page.locator('#save-btn')).toBeVisible();

    // Test extract data functionality
    await page.click('#extract-btn');
    await page.waitForTimeout(100);

    // Verify Chrome API mock worked
    await expect(page.locator('#title')).toHaveValue('Extracted Page Title');
    await expect(page.locator('#url')).toHaveValue('https://extracted-example.com');

    // Test success message appears
    await expect(page.locator('.message')).toBeVisible();
    await expect(page.locator('.message')).toHaveText('Data extracted successfully!');
    await expect(page.locator('.message')).toHaveCSS('background', /d4edda/); // success color

    // Test save functionality
    await page.click('#save-btn');
    await page.waitForTimeout(100);

    // Verify save success message
    await expect(page.locator('.message')).toBeVisible();
    await expect(page.locator('.message')).toHaveText('Data saved successfully!');

    // Test validation - empty fields
    await page.fill('#title', '');
    await page.fill('#url', '');
    await page.click('#save-btn');
    await page.waitForTimeout(50);

    // Verify error message for validation
    await expect(page.locator('.message')).toBeVisible();
    await expect(page.locator('.message')).toHaveText('Please fill in all required fields');
    await expect(page.locator('.message')).toHaveCSS('background', /f8d7da/); // error color

    // Test message auto-removal
    await page.waitForTimeout(3000);
    await expect(page.locator('.message')).toBeHidden();
  });

  test('should handle popup initialization errors gracefully', async ({ page }) => {
    // Setup Chrome API to return errors
    await page.addInitScript(() => {
      window.chrome = {
        runtime: {
          sendMessage: (message, callback) => {
            // Simulate network error
            setTimeout(() => {
              if (callback) callback({ success: false, error: 'Network error' });
            }, 100);
            return Promise.resolve({ success: false, error: 'Network error' });
          },
        },
        storage: {
          sync: {
            get: (keys, callback) => {
              // Simulate storage error
              setTimeout(() => {
                if (callback) callback({});
              }, 50);
              return Promise.resolve({});
            }
          }
        }
      };
    });

    await page.setContent(`
      <div class="popup-container">
        <div id="loading">Loading...</div>
        <div id="content"></div>
      </div>
    `);

    // Add error-handling popup manager
    await page.addScriptTag({
      content: `
        class RobustPopupManager {
          constructor() {
            this.content = document.getElementById('content');
            this.loading = document.getElementById('loading');
            this.initialize();
          }

          async initialize() {
            try {
              this.showLoading();
              await this.loadSettings();
              await this.extractPageData();
              this.renderSuccessState();
            } catch (error) {
              console.error('Initialization error:', error);
              this.renderErrorState('Failed to initialize. Please try again.');
            } finally {
              this.hideLoading();
            }
          }

          showLoading() {
            this.loading.style.display = 'block';
            this.content.style.display = 'none';
          }

          hideLoading() {
            this.loading.style.display = 'none';
            this.content.style.display = 'block';
          }

          async loadSettings() {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Settings load timeout'));
              }, 200);

              chrome.storage.sync.get(['apiKey'], (result) => {
                clearTimeout(timeout);
                resolve(result);
              });
            });
          }

          async extractPageData() {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Data extraction timeout'));
              }, 150);

              chrome.runtime.sendMessage({ type: 'EXTRACT_PAGE_DATA' }, (response) => {
                clearTimeout(timeout);
                if (response.success) {
                  resolve(response.data);
                } else {
                  reject(new Error(response.error || 'Extraction failed'));
                }
              });
            });
          }

          renderSuccessState() {
            this.content.innerHTML = '<div class="success">Popup loaded successfully!</div>';
          }

          renderErrorState(message) {
            this.content.innerHTML = \`
              <div class="error-state">
                <div class="error-message">\${message}</div>
                <button id="retry-btn">Retry</button>
              </div>
            \`;

            document.getElementById('retry-btn').addEventListener('click', () => {
              this.content.innerHTML = '';
              this.initialize();
            });
          }
        }

        window.popupManager = new RobustPopupManager();
      `
    });

    // Wait for initialization to complete with timeout
    await page.waitForTimeout(300);

    // Test that error state is rendered
    await expect(page.locator('#loading')).toBeHidden();
    await expect(page.locator('#content')).toBeVisible();
    await expect(page.locator('.error-state')).toBeVisible();
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('#retry-btn')).toBeVisible();

    // Test retry functionality
    await page.click('#retry-btn');
    await page.waitForTimeout(200);

    // Should show loading again, then error state
    await expect(page.locator('#loading')).toBeVisible();
    await page.waitForTimeout(200);
    await expect(page.locator('#loading')).toBeHidden();
    await expect(page.locator('.error-state')).toBeVisible();
  });

  test('should test popup responsiveness and styling', async ({ page }) => {
    await page.setContent(`
      <style>
        .popup-container {
          width: 360px;
          min-height: 400px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: #333;
        }
        .form-group input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .form-group input:focus {
          outline: none;
          border-color: #007cba;
          box-shadow: 0 0 0 2px rgba(0, 124, 186, 0.1);
        }
        button {
          background: #007cba;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        button:hover {
          background: #005a8b;
        }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        @media (max-width: 380px) {
          .popup-container {
            width: 320px;
            padding: 15px;
          }
        }
      </style>
      <div class="popup-container">
        <div class="form-group">
          <label for="test-input">Test Input</label>
          <input type="text" id="test-input" placeholder="Test responsive input..." />
        </div>
        <button id="test-button">Test Button</button>
      </div>
    `);

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    const container = page.locator('.popup-container');
    const input = page.locator('#test-input');
    const button = page.locator('#test-button');

    await expect(container).toHaveCSS('width', '360px');
    await expect(container).toHaveCSS('padding', '20px');
    await expect(input).toHaveCSS('width', '304px'); // 360px - 32px padding - 24px border?
    await expect(button).toHaveCSS('background', /rgb\(0, 124, 186\)/);

    // Test mobile viewport
    await page.setViewportSize({ width: 360, height: 600 });
    await expect(container).toHaveCSS('width', '320px');
    await expect(container).toHaveCSS('padding', '15px');

    // Test input focus states
    await input.click();
    await expect(input).toHaveCSS('border-color', /rgb\(0, 124, 186\)/);
    await expect(input).toHaveCSS('box-shadow', /rgba\(0, 124, 186, 0\.1\)/);

    // Test button hover state
    await button.hover();
    await expect(button).toHaveCSS('background', /rgb\(0, 90, 139\)/);

    // Test button disabled state
    await page.evaluate(() => {
      document.getElementById('test-button').disabled = true;
    });
    await expect(button).toHaveCSS('background', /rgb\(204, 204, 204\)/);
  });
});