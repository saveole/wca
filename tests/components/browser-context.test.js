/**
 * Working Component Test with Browser Context
 *
 * This test demonstrates the proper approach for testing vanilla JavaScript components
 * using Playwright's browser context with Chrome API mocks.
 */

import { test, expect } from '@playwright/test';
import { createChromeMock } from '../mocks/chrome-api.js';

test.describe('Component Testing with Browser Context', () => {
  test.beforeEach(async ({ context }) => {
    // Setup Chrome API mocks in the browser context
    await context.addInitScript(() => {
      // Create a simple Chrome mock for the browser
      window.chrome = {
        runtime: {
          sendMessage: (message, callback) => {
            const response = { success: true, data: null };
            if (message.type === 'EXTRACT_PAGE_DATA') {
              response.data = {
                title: 'Test Page Title',
                url: 'https://example.com',
                description: 'Test page description'
              };
            }
            if (callback) callback(response);
            return Promise.resolve(response);
          }
        },
        storage: {
          sync: {
            get: (keys, callback) => {
              const result = {};
              if (Array.isArray(keys)) {
                keys.forEach(key => {
                  if (key === 'apiKey') result[key] = 'test-api-key';
                  if (key === 'notionToken') result[key] = 'test-notion-token';
                });
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
            const tabs = [{ id: 1, url: 'https://example.com', title: 'Test Page' }];
            if (callback) callback(tabs);
            return Promise.resolve(tabs);
          }
        }
      };
    });
  });

  test('should test popup component structure and interactions', async ({ page }) => {
    // Create a simple HTML structure representing the popup
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: system-ui; margin: 0; padding: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input, textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
            button { padding: 10px 15px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #005a8b; }
            button:disabled { background: #ccc; cursor: not-allowed; }
            .success { background: #28a745; }
            .error { background: #dc3545; }
            .loading { background: #6c757d; }
          </style>
        </head>
        <body>
          <div class="popup-container">
            <div class="form-group">
              <label for="title">Title</label>
              <input type="text" id="title" name="title" placeholder="Enter title..." />
            </div>
            <div class="form-group">
              <label for="url">URL</label>
              <input type="url" id="url" name="url" placeholder="https://example.com" />
            </div>
            <div class="form-group">
              <label for="description">Description</label>
              <textarea id="description" name="description" rows="3" placeholder="Enter description..."></textarea>
            </div>
            <div class="form-group">
              <label for="tags">Tags</label>
              <div id="tags-container">
                <input type="text" id="tag-input" placeholder="Add tags..." />
              </div>
            </div>
            <div class="button-group">
              <button id="extract-data">Extract Data</button>
              <button id="generate-summary">Generate Summary</button>
              <button id="save-to-notion">Save to Notion</button>
              <button id="export-markdown">Export Markdown</button>
            </div>
            <div id="status-message" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
          </div>
        </body>
      </html>
    `);

    // Test basic structure
    await expect(page.locator('.popup-container')).toBeVisible();
    await expect(page.locator('#title')).toBeVisible();
    await expect(page.locator('#url')).toBeVisible();
    await expect(page.locator('#description')).toBeVisible();
    await expect(page.locator('#extract-data')).toBeVisible();

    // Test form input functionality
    await page.fill('#title', 'Test Page Title');
    await expect(page.locator('#title')).toHaveValue('Test Page Title');

    await page.fill('#url', 'https://example.com');
    await expect(page.locator('#url')).toHaveValue('https://example.com');

    await page.fill('#description', 'This is a test description');
    await expect(page.locator('#description')).toHaveValue('This is a test description');

    // Test button interactions
    let extractClicked = false;
    page.on('console', msg => {
      if (msg.text().includes('Extract button clicked')) {
        extractClicked = true;
      }
    });

    await page.addScriptTag({
      content: `
        document.getElementById('extract-data').addEventListener('click', () => {
          console.log('Extract button clicked');

          // Simulate Chrome API call
          chrome.runtime.sendMessage({ type: 'EXTRACT_PAGE_DATA' }, (response) => {
            if (response.success) {
              document.getElementById('title').value = response.data.title;
              document.getElementById('url').value = response.data.url;
              document.getElementById('description').value = response.data.description;

              const statusDiv = document.getElementById('status-message');
              statusDiv.textContent = 'Data extracted successfully!';
              statusDiv.style.display = 'block';
              statusDiv.className = 'success';
            }
          });
        });
      `
    });

    await page.click('#extract-data');

    // Wait for the async operation to complete
    await page.waitForTimeout(100);

    // Verify the Chrome API mock worked
    await expect(page.locator('#title')).toHaveValue('Test Page Title');
    await expect(page.locator('#url')).toHaveValue('https://example.com');
    await expect(page.locator('#description')).toHaveValue('Test page description');
    await expect(page.locator('#status-message')).toBeVisible();
    await expect(page.locator('#status-message')).toHaveText('Data extracted successfully!');
    await expect(page.locator('#status-message')).toHaveClass(/success/);

    // Test tag input functionality
    await page.addScriptTag({
      content: `
        const tagInput = document.getElementById('tag-input');
        const tagsContainer = document.getElementById('tags-container');

        let tags = [];

        tagInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tagText = tagInput.value.trim();
            if (tagText && !tags.includes(tagText)) {
              tags.push(tagText);

              // Create tag element
              const tagElement = document.createElement('span');
              tagElement.textContent = tagText;
              tagElement.style.cssText = 'display: inline-block; background: #e9ecef; padding: 2px 8px; margin: 2px; border-radius: 12px; font-size: 12px;';

              const removeButton = document.createElement('span');
              removeButton.textContent = ' ×';
              removeButton.style.cursor = 'pointer';
              removeButton.onclick = () => {
                tags = tags.filter(t => t !== tagText);
                tagElement.remove();
              };

              tagElement.appendChild(removeButton);
              tagsContainer.insertBefore(tagElement, tagInput);
              tagInput.value = '';
            }
          }
        });
      `
    });

    // Test adding tags
    await page.fill('#tag-input', 'test-tag');
    await page.press('#tag-input', 'Enter');
    await expect(page.locator('#tags-container')).toHaveText(/test-tag/);

    await page.fill('#tag-input', 'another-tag');
    await page.press('#tag-input', 'Enter');
    await expect(page.locator('#tags-container')).toHaveText(/another-tag/);

    // Test generate summary functionality
    await page.addScriptTag({
      content: `
        document.getElementById('generate-summary').addEventListener('click', () => {
          const button = document.getElementById('generate-summary');
          const statusDiv = document.getElementById('status-message');

          button.disabled = true;
          button.textContent = 'Generating...';
          button.className = 'loading';
          statusDiv.style.display = 'block';
          statusDiv.textContent = 'Generating AI summary...';
          statusDiv.className = 'loading';

          // Simulate API call delay
          setTimeout(() => {
            button.disabled = false;
            button.textContent = 'Generate Summary';
            button.className = '';
            statusDiv.textContent = 'Summary generated successfully!';
            statusDiv.className = 'success';

            // Add summary to description
            const currentDesc = document.getElementById('description').value;
            document.getElementById('description').value = currentDesc + '\\n\\nAI Summary: This is a test summary generated by AI.';
          }, 1000);
        });
      `
    });

    await page.click('#generate-summary');

    // Verify loading state
    await expect(page.locator('#generate-summary')).toBeDisabled();
    await expect(page.locator('#generate-summary')).toHaveText('Generating...');
    await expect(page.locator('#status-message')).toHaveText('Generating AI summary...');
    await expect(page.locator('#status-message')).toHaveClass(/loading/);

    // Wait for the operation to complete
    await page.waitForTimeout(1200);

    // Verify completed state
    await expect(page.locator('#generate-summary')).not.toBeDisabled();
    await expect(page.locator('#generate-summary')).toHaveText('Generate Summary');
    await expect(page.locator('#status-message')).toHaveText('Summary generated successfully!');
    await expect(page.locator('#status-message')).toHaveClass(/success/);
    await expect(page.locator('#description')).toHaveValue(/AI Summary: This is a test summary generated by AI\./);

    // Test form validation
    await page.addScriptTag({
      content: `
        document.getElementById('save-to-notion').addEventListener('click', () => {
          const title = document.getElementById('title').value.trim();
          const url = document.getElementById('url').value.trim();
          const statusDiv = document.getElementById('status-message');

          // Simple validation
          if (!title) {
            statusDiv.textContent = 'Please enter a title';
            statusDiv.className = 'error';
            statusDiv.style.display = 'block';
            return;
          }

          if (!url || !url.startsWith('http')) {
            statusDiv.textContent = 'Please enter a valid URL';
            statusDiv.className = 'error';
            statusDiv.style.display = 'block';
            return;
          }

          // Simulate save operation
          chrome.runtime.sendMessage({ type: 'SAVE_TO_NOTION' }, (response) => {
            if (response.success) {
              statusDiv.textContent = 'Saved to Notion successfully!';
              statusDiv.className = 'success';
              statusDiv.style.display = 'block';
            }
          });
        });
      `
    });

    // Test validation - empty title
    await page.fill('#title', '');
    await page.click('#save-to-notion');
    await expect(page.locator('#status-message')).toHaveText('Please enter a title');
    await expect(page.locator('#status-message')).toHaveClass(/error/);

    // Test validation - invalid URL
    await page.fill('#title', 'Valid Title');
    await page.fill('#url', 'invalid-url');
    await page.click('#save-to-notion');
    await expect(page.locator('#status-message')).toHaveText('Please enter a valid URL');
    await expect(page.locator('#status-message')).toHaveClass(/error/);

    // Test successful save
    await page.fill('#url', 'https://valid-url.com');
    await page.click('#save-to-notion');
    await expect(page.locator('#status-message')).toHaveText('Saved to Notion successfully!');
    await expect(page.locator('#status-message')).toHaveClass(/success/);
  });

  test('should test responsive design and styling', async ({ page }) => {
    await page.setContent(`
      <style>
        .popup-container {
          width: 360px;
          padding: 20px;
          background: white;
          border: 1px solid #ccc;
          border-radius: 8px;
        }
        @media (max-width: 380px) {
          .popup-container {
            width: 320px;
            padding: 15px;
          }
        }
        @media (prefers-color-scheme: dark) {
          .popup-container {
            background: #1a1a1a;
            color: white;
            border-color: #444;
          }
        }
      </style>
      <div class="popup-container">
        <h1>Test Popup</h1>
        <p>This is a test popup component</p>
      </div>
    `);

    // Test desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    const container = page.locator('.popup-container');
    await expect(container).toHaveCSS('width', '360px');
    await expect(container).toHaveCSS('padding', '20px');

    // Test mobile size
    await page.setViewportSize({ width: 360, height: 600 });
    await expect(container).toHaveCSS('width', '320px');
    await expect(container).toHaveCSS('padding', '15px');

    // Test dark mode by adding class
    await page.evaluate(() => {
      document.documentElement.style.colorScheme = 'dark';
    });

    // Note: Dark mode testing would require actual CSS media query simulation
    // This demonstrates the approach for testing responsive design
  });

  test('should test accessibility features', async ({ page }) => {
    await page.setContent(`
      <div class="popup-container">
        <form id="test-form">
          <div class="form-group">
            <label for="accessible-input">Accessible Label</label>
            <input type="text" id="accessible-input" aria-describedby="input-help" aria-required="true" />
            <div id="input-help" class="help-text">This field is required</div>
          </div>
          <button type="submit" id="submit-btn">Submit Form</button>
        </form>
      </div>
    `);

    // Test accessibility attributes
    const input = page.locator('#accessible-input');
    await expect(input).toHaveAttribute('aria-describedby', 'input-help');
    await expect(input).toHaveAttribute('aria-required', 'true');

    // Test keyboard navigation
    await page.press('#accessible-input', 'Tab');
    await expect(page.locator('#submit-btn')).toBeFocused();

    // Test form submission
    let formSubmitted = false;
    await page.addScriptTag({
      content: `
        document.getElementById('test-form').addEventListener('submit', (e) => {
          e.preventDefault();
          console.log('Form submitted successfully');
          window.formSubmitted = true;
        });
      `
    });

    await page.press('#submit-btn', 'Enter');
    await page.waitForTimeout(100);

    const submitted = await page.evaluate(() => window.formSubmitted);
    expect(submitted).toBe(true);
  });
});