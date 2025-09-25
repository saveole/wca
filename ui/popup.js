/**
 * WebClip Assistant - Popup UI Manager
 *
 * Handles all popup interface functionality including:
 * - Loading and displaying current page information
 * - AI content summarization
 * - Tag management system
 * - Export to Markdown/JSON
 * - Notion integration
 * - User feedback through toast notifications
 *
 * @class PopupManager
 */
class PopupManager {
  /**
   * Initialize popup manager with default data structure
   * @constructor
   */
  constructor() {
    /**
     * Current web clip data structure
     * @type {Object}
     * @property {string} title - Page title
     * @property {string} url - Page URL
     * @property {string} description - Page description
     * @property {string} coverImage - Cover image URL
     * @property {string} summary - AI-generated summary
     * @property {string} notes - User notes
     * @property {Array<string>} tags - User-defined tags
     */
    this.currentData = {
      title: '',
      url: '',
      description: '',
      coverImage: '',
      summary: '',
      notes: '',
      tags: []
    };

    /** @type {Object} User settings from chrome.storage.sync */
    this.settings = {};

    /** @type {boolean} Loading state for async operations */
    this.isLoading = false;

    this.init();
  }

  /**
   * Initialize popup components and load initial data
   * Binds event listeners and loads page info/settings
   */
  async init() {
    console.log('[WebClip Popup] Initializing popup manager...');
    this.bindEvents();
    console.log('[WebClip Popup] Event listeners bound');

    await this.loadCurrentPageInfo();
    await this.loadSettings();

    console.log('[WebClip Popup] Popup initialization complete');
  }

  /**
   * Bind all UI event listeners
   * - AI summarization button
   * - Export functionality (Markdown/JSON)
   * - Notion save button
   * - Tag input system
   * - Auto-save on field changes
   */
  bindEvents() {
    console.log('[WebClip Popup] Binding event listeners...');

    // AI Summarize button click handler
    document.getElementById('ai-summarize').addEventListener('click', () => {
      console.log('[WebClip Popup] AI Summarize button clicked');
      this.summarizeContent();
    });

    // Export format buttons
    document.getElementById('export-md').addEventListener('click', () => {
      console.log('[WebClip Popup] Export Markdown button clicked');
      this.exportAsMarkdown();
    });

    document.getElementById('export-json').addEventListener('click', () => {
      console.log('[WebClip Popup] Export JSON button clicked');
      this.exportAsJSON();
    });

    // Notion integration button
    document.getElementById('save-notion').addEventListener('click', () => {
      console.log('[WebClip Popup] Save to Notion button clicked');
      this.saveToNotion();
    });

    // Tag input system - supports Enter, comma, and space to add tags
    const tagInput = document.getElementById('tag-input');

    if (!tagInput) {
      console.error('[WebClip Popup] Tag input element not found!');
      return;
    }

    const self = this; // Preserve 'this' context

    // Handle keyboard events for tag input
    tagInput.addEventListener('keydown', (e) => {
      const inputValue = tagInput.value.trim();

      // Handle Enter, comma, or space to add tags
      if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
        e.preventDefault();

        if (inputValue) {
          // For space, if there are multiple tags separated by spaces, add all of them
          if (e.key === ' ' && inputValue.includes(' ')) {
            const tags = inputValue.split(' ').filter(tag => tag.trim());
            tags.forEach(tag => self.addTag(tag.trim()));
          } else {
            self.addTag(inputValue);
          }
          tagInput.value = '';
        }
      }
    });

    // Handle blur event for adding remaining tags when clicking away
    tagInput.addEventListener('blur', (e) => {
      const tagValue = tagInput.value.trim();
      if (tagValue) {
        // If input contains spaces, treat as multiple tags
        if (tagValue.includes(' ')) {
          const tags = tagValue.split(' ').filter(tag => tag.trim());
          tags.forEach(tag => self.addTag(tag.trim()));
        } else {
          self.addTag(tagValue);
        }
        tagInput.value = '';
      }
    });

    // Auto-save data on field changes
    const inputs = ['page-title', 'url', 'description', 'summary', 'notes'];
    inputs.forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        console.log('[WebClip Popup] Field changed:', id, 'new length:', e.target.value.length);
        this.updateData(id, e.target.value);
      });
    });

    console.log('[WebClip Popup] All event listeners bound successfully');
  }

  /**
   * Load current page information from background script
   * Extracts title, URL, description, and cover image from active tab
   */
  async loadCurrentPageInfo() {
    try {
      // Request page info from background service worker
      const response = await chrome.runtime.sendMessage({ action: 'getPageInfo' });

      if (response.success) {
        // Merge response data with current data structure
        this.currentData = { ...this.currentData, ...response.data };
        this.updateUI();
      }
    } catch (error) {
      console.error('Error loading page info:', error);
    }
  }

  /**
   * Load user settings from chrome.storage.sync
   * Includes API keys, Notion integration, and user preferences
   */
  async loadSettings() {
    try {
      // Request settings from background service worker
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });

      if (response.success) {
        this.settings = response.data;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  /**
   * Update UI elements with current data
   * Populates form fields and refreshes tag display
   */
  updateUI() {
    // Populate form fields with current data
    document.getElementById('page-title').value = this.currentData.title || '';
    document.getElementById('url').value = this.currentData.url || '';
    document.getElementById('description').value = this.currentData.description || '';
    document.getElementById('summary').value = this.currentData.summary || '';
    document.getElementById('notes').value = this.currentData.notes || '';

    // Refresh tags display
    this.renderTags();
  }

  /**
   * Render tags in the tags container
   * Creates clickable tag elements with remove buttons
   */
  renderTags() {
    console.log('[WebClip Popup] renderTags called with:', this.currentData.tags);
    const tagsContainer = document.getElementById('tags-container');
    if (!tagsContainer) {
      console.error('[WebClip Popup] Tags container not found!');
      return;
    }

    tagsContainer.innerHTML = '';

    // Create tag element for each tag
    this.currentData.tags.forEach(tag => {
      console.log('[WebClip Popup] Creating tag element for:', tag);
      const tagElement = document.createElement('span');
      tagElement.className = 'bg-primary/20 text-primary text-xs font-semibold px-2 py-1 rounded-full flex items-center';
      tagElement.innerHTML = `
        ${tag}
        <button class="ml-1.5 text-primary/70 hover:text-primary" onclick="popupManager.removeTag('${tag}')">
          <span class="material-symbols-outlined !text-sm">close</span>
        </button>
      `;
      tagsContainer.appendChild(tagElement);
    });
  }

  /**
   * Update internal data structure when form fields change
   * Maps HTML element IDs to data object properties
   * @param {string} field - HTML element ID
   * @param {string} value - Field value
   */
  updateData(field, value) {
    const fieldMap = {
      'page-title': 'title',
      'url': 'url',
      'description': 'description',
      'summary': 'summary',
      'notes': 'notes'
    };

    if (fieldMap[field]) {
      this.currentData[fieldMap[field]] = value;
    }
  }

  /**
   * Add a new tag to the current data
   * Prevents duplicate tags and updates display
   * @param {string} tagText - Tag text to add
   */
  addTag(tagText) {
    console.log('[WebClip Popup] addTag called with:', tagText);
    console.log('[WebClip Popup] Current tags before:', this.currentData.tags);

    // Validate and clean tag text
    if (!tagText || typeof tagText !== 'string') {
      console.log('[WebClip Popup] Tag not added - invalid input:', tagText);
      return;
    }

    const cleanTag = tagText.trim();
    if (!cleanTag) {
      console.log('[WebClip Popup] Tag not added - empty after trim');
      return;
    }

    // Check for duplicates (case-insensitive)
    const isDuplicate = this.currentData.tags.some(
      existingTag => existingTag.toLowerCase() === cleanTag.toLowerCase()
    );

    if (isDuplicate) {
      console.log('[WebClip Popup] Tag not added - duplicate:', cleanTag);
      return;
    }

    // Add the tag
    this.currentData.tags.push(cleanTag);
    console.log('[WebClip Popup] Tags after adding:', this.currentData.tags);
    this.renderTags();
  }

  /**
   * Remove a tag from the current data
   * Updates display after removal
   * @param {string} tagText - Tag text to remove
   */
  removeTag(tagText) {
    console.log('[WebClip Popup] removeTag called with:', tagText);

    // Remove tag case-insensitively
    this.currentData.tags = this.currentData.tags.filter(
      tag => tag.toLowerCase() !== tagText.toLowerCase()
    );

    console.log('[WebClip Popup] Tags after removal:', this.currentData.tags);
    this.renderTags();
  }

  /**
   * Generate AI summary using configured LLM provider
   * Shows loading state and handles errors gracefully
   */
  async summarizeContent() {
    // Prevent multiple simultaneous requests
    if (this.isLoading) return;

    const button = document.getElementById('ai-summarize');
    const spinner = button.querySelector('.animate-spin');
    const buttonText = button.querySelector('span:last-child');

    // Show loading state
    this.setLoadingState(true, spinner, buttonText);

    try {
      // Combine title and description for summarization
      const content = `${this.currentData.title}\n\n${this.currentData.description}`;

      // Request summary from background service worker
      const response = await chrome.runtime.sendMessage({
        action: 'summarizeContent',
        content: content,
        settings: this.settings
      });

      if (response.success) {
        // Update data and UI with generated summary
        this.currentData.summary = response.data;
        document.getElementById('summary').value = response.data;
      } else {
        this.showError('Failed to generate summary: ' + response.error);
      }
    } catch (error) {
      this.showError('Error summarizing content: ' + error.message);
    } finally {
      // Reset loading state
      this.setLoadingState(false, spinner, buttonText);
    }
  }

  /**
   * Manage loading state for async operations
   * @param {boolean} loading - Whether operation is in progress
   * @param {HTMLElement} spinner - Loading spinner element
   * @param {HTMLElement} buttonText - Button text element
   */
  setLoadingState(loading, spinner, buttonText) {
    this.isLoading = loading;
    if (loading) {
      // Show loading state
      spinner.classList.remove('hidden');
      buttonText.textContent = 'Summarizing...';
      document.getElementById('ai-summarize').disabled = true;
    } else {
      // Hide loading state
      spinner.classList.add('hidden');
      buttonText.textContent = 'AI Summarize';
      document.getElementById('ai-summarize').disabled = false;
    }
  }

  /**
   * Export current data as Markdown file
   * Generates formatted markdown and triggers download
   */
  async exportAsMarkdown() {
    const markdown = this.generateMarkdown();
    const filename = `${this.sanitizeFilename(this.currentData.title || 'webclip')}.md`;

    try {
      // Request file download from background service worker
      await chrome.runtime.sendMessage({
        action: 'exportFile',
        content: markdown,
        filename: filename,
        type: 'markdown'
      });

      this.showSuccess('Exported as Markdown successfully!');
    } catch (error) {
      this.showError('Failed to export: ' + error.message);
    }
  }

  /**
   * Export current data as JSON file
   * Generates structured JSON and triggers download
   */
  async exportAsJSON() {
    const jsonData = this.generateJSON();
    const filename = `${this.sanitizeFilename(this.currentData.title || 'webclip')}.json`;

    try {
      // Request file download from background service worker
      await chrome.runtime.sendMessage({
        action: 'exportFile',
        content: JSON.stringify(jsonData, null, 2),
        filename: filename,
        type: 'json'
      });

      this.showSuccess('Exported as JSON successfully!');
    } catch (error) {
      this.showError('Failed to export: ' + error.message);
    }
  }

  /**
   * Save current web clip to Notion database
   * Shows loading state and handles API errors
   */
  async saveToNotion() {
    if (this.isLoading) return;

    const button = document.getElementById('save-notion');
    const originalText = button.innerHTML;

    // Show loading state
    this.isLoading = true;
    button.innerHTML = `
      <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
      </svg>
      <span>Saving to Notion...</span>
    `;
    button.disabled = true;

    try {
      // Request Notion save from background service worker
      const response = await chrome.runtime.sendMessage({
        action: 'saveToNotion',
        data: this.currentData,
        settings: this.settings
      });

      if (response.success) {
        this.showSuccess('Saved to Notion successfully!');
      } else {
        this.showError('Failed to save to Notion: ' + response.error);
      }
    } catch (error) {
      this.showError('Error saving to Notion: ' + error.message);
    } finally {
      // Reset button state
      this.isLoading = false;
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }

  /**
   * Generate formatted Markdown content for export
   * Includes title, tags, AI summary, and user notes
   * @returns {string} Formatted Markdown content
   */
  generateMarkdown() {
    const tags = this.currentData.tags.map(tag => `#${tag}`).join(' ');

    return `# [${this.currentData.title}](${this.currentData.url})

**Tags:** ${tags}

---

## 🤖 AI Summary
> ${this.currentData.summary || 'No summary generated'}

---

## ✍️ My Notes
${this.currentData.notes || 'No personal notes added'}

---

*Clipped on ${new Date().toLocaleDateString()}*`;
  }

  /**
   * Generate structured JSON data for export
   * Includes all clip data with timestamp
   * @returns {Object} Structured JSON data
   */
  generateJSON() {
    return {
      title: this.currentData.title,
      url: this.currentData.url,
      description: this.currentData.description,
      cover_image: this.currentData.coverImage,
      summary: this.currentData.summary,
      notes: this.currentData.notes,
      tags: this.currentData.tags,
      clipped_at: new Date().toISOString()
    };
  }

  /**
   * Sanitize filename for safe file system usage
   * Removes special characters and replaces spaces with underscores
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9\s\-_\.]/gi, '').replace(/\s+/g, '_');
  }

  /**
   * Show success toast notification
   * @param {string} message - Success message to display
   */
  showSuccess(message) {
    this.showToast(message, 'success');
  }

  /**
   * Show error toast notification
   * @param {string} message - Error message to display
   */
  showError(message) {
    this.showToast(message, 'error');
  }

  /**
   * Show toast notification with specified type
   * Auto-dismisses after 3 seconds
   * @param {string} message - Message to display
   * @param {string} type - Notification type ('success', 'error', 'info')
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

/**
 * Initialize popup manager when DOM is fully loaded
 * Creates global instance for HTML onclick handlers
 */
let popupManager;
document.addEventListener('DOMContentLoaded', () => {
  popupManager = new PopupManager();
});