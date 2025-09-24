/**
 * WebClip Assistant - Settings Page Manager
 *
 * Handles all settings page functionality including:
 * - Loading and saving user preferences
 * - API provider configuration (OpenAI, Anthropic, Custom)
 * - Notion integration setup
 * - Field mapping configuration
 * - Connection testing for APIs
 * - Form validation and dirty state management
 *
 * @class SettingsManager
 */
class SettingsManager {
  /**
   * Initialize settings manager with default state
   * @constructor
   */
  constructor() {
    /** @type {Object} Current settings from chrome.storage.sync */
    this.settings = {};

    /** @type {boolean} Whether settings are currently being saved */
    this.isSaving = false;

    this.init();
  }

  /**
   * Initialize settings page components
   * Loads existing settings, binds event listeners, and populates form
   */
  async init() {
    console.log('[WebClip Settings] Initializing settings manager...');

    await this.loadSettings();
    this.bindEvents();
    this.populateForm();

    console.log('[WebClip Settings] Settings page initialization complete');
  }

  /**
   * Bind all form event listeners
   * - Save button functionality
   * - API provider selection changes
   * - Form field dirty state tracking
   * - Preference toggle changes
   */
  bindEvents() {
    console.log('[WebClip Settings] Binding form event listeners...');

    // Save button click handler
    document.getElementById('save-settings').addEventListener('click', () => {
      console.log('[WebClip Settings] Save settings button clicked');
      this.saveSettings();
    });

    // API provider change handler - updates endpoint URL
    document.getElementById('api-provider').addEventListener('change', (e) => {
      console.log('[WebClip Settings] API provider changed to:', e.target.value);
      this.updateApiEndpoint(e.target.value);
    });

    // Track changes in all form fields
    const fields = [
      'api-endpoint',
      'llm-api-key',
      'notion-token',
      'notion-db-id',
      'map-title',
      'map-url',
      'map-content',
      'map-tags'
    ];

    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('change', () => {
          console.log('[WebClip Settings] Form field changed:', fieldId);
          this.markAsDirty();
        });
      }
    });

    // Auto-save preference toggle
    document.getElementById('auto-save').addEventListener('change', () => {
      console.log('[WebClip Settings] Auto-save preference changed');
      this.markAsDirty();
    });

    console.log('[WebClip Settings] All form event listeners bound');
  }

  /**
   * Load user settings from chrome.storage.sync
   * Retrieves all settings including API keys and preferences
   */
  async loadSettings() {
    console.log('[WebClip Settings] Loading user settings...');

    try {
      // Request settings from background service worker
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });

      if (response.success) {
        this.settings = response.data;
        console.log('[WebClip Settings] Settings loaded successfully:', {
          apiProvider: response.data.apiProvider,
          hasApiKey: !!response.data.apiKey,
          hasNotionToken: !!response.data.notionToken,
          autoSave: response.data.autoSave,
          exportFormat: response.data.defaultExportFormat
        });
      } else {
        console.error('[WebClip Settings] Failed to load settings:', response.error);
      }
    } catch (error) {
      console.error('[WebClip Settings] Error loading settings:', error);
      this.showError('Failed to load settings: ' + error.message);
    }
  }

  /**
   * Populate form fields with loaded settings
   * Includes API configuration, Notion integration, field mapping, and preferences
   */
  populateForm() {
    console.log('[WebClip Settings] Populating form fields with loaded settings...');

    // API provider settings
    document.getElementById('api-provider').value = this.settings.apiProvider || 'openai';
    document.getElementById('api-endpoint').value = this.settings.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    document.getElementById('llm-api-key').value = this.settings.apiKey || '';

    // Notion integration settings
    document.getElementById('notion-token').value = this.settings.notionToken || '';
    document.getElementById('notion-db-id').value = this.settings.notionDatabaseId || '';

    // Field mapping configuration
    if (this.settings.fieldMapping) {
      document.getElementById('map-title').value = this.settings.fieldMapping.title || 'Title';
      document.getElementById('map-url').value = this.settings.fieldMapping.url || 'URL';
      document.getElementById('map-content').value = this.settings.fieldMapping.content || 'Page Content';
      document.getElementById('map-tags').value = this.settings.fieldMapping.tags || 'Tags';
      console.log('[WebClip Settings] Field mapping populated:', this.settings.fieldMapping);
    }

    // User preferences
    document.getElementById('auto-save').checked = this.settings.autoSave || false;
    document.getElementById('default-export-format').value = this.settings.defaultExportFormat || 'markdown';

    console.log('[WebClip Settings] Form populated successfully');

    // Hide save button until changes are made
    this.hideSaveButton();
  }

  /**
   * Update API endpoint based on selected provider
   * Pre-fills known endpoints and allows custom configuration
   * @param {string} provider - Selected API provider ('openai', 'anthropic', 'custom')
   */
  updateApiEndpoint(provider) {
    console.log('[WebClip Settings] Updating API endpoint for provider:', provider);

    const endpointField = document.getElementById('api-endpoint');

    switch (provider) {
      case 'openai':
        endpointField.value = 'https://api.openai.com/v1/chat/completions';
        console.log('[WebClip Settings] Set OpenAI endpoint');
        break;
      case 'anthropic':
        endpointField.value = 'https://api.anthropic.com/v1/messages';
        console.log('[WebClip Settings] Set Anthropic endpoint');
        break;
      case 'custom':
        // Clear endpoint for custom provider and focus field
        endpointField.value = '';
        endpointField.focus();
        console.log('[WebClip Settings] Cleared endpoint for custom provider');
        break;
      default:
        endpointField.value = 'https://api.openai.com/v1/chat/completions';
        console.log('[WebClip Settings] Set default OpenAI endpoint');
    }

    // Mark form as dirty when endpoint changes
    this.markAsDirty();
  }

  /**
   * Save all settings to chrome.storage.sync
   * Validates form data and shows appropriate feedback
   */
  async saveSettings() {
    console.log('[WebClip Settings] Starting settings save process...');

    if (this.isSaving) {
      console.log('[WebClip Settings] Save already in progress, ignoring request');
      return;
    }

    // Show saving state
    this.setSavingState(true);
    console.log('[WebClip Settings] Saving state activated');

    try {
      // Collect all form data
      const formData = {
        apiProvider: document.getElementById('api-provider').value,
        apiEndpoint: document.getElementById('api-endpoint').value,
        apiKey: document.getElementById('llm-api-key').value,
        notionToken: document.getElementById('notion-token').value,
        notionDatabaseId: document.getElementById('notion-db-id').value,
        fieldMapping: {
          title: document.getElementById('map-title').value,
          url: document.getElementById('map-url').value,
          content: document.getElementById('map-content').value,
          tags: document.getElementById('map-tags').value
        },
        autoSave: document.getElementById('auto-save').checked,
        defaultExportFormat: document.getElementById('default-export-format').value
      };

      console.log('[WebClip Settings] Form data collected:', {
        apiProvider: formData.apiProvider,
        hasApiKey: !!formData.apiKey,
        hasNotionToken: !!formData.notionToken,
        autoSave: formData.autoSave,
        exportFormat: formData.defaultExportFormat
      });

      // Validate that at least one API key is configured
      if (!formData.apiKey && !formData.notionToken) {
        console.error('[WebClip Settings] Validation failed: No API keys configured');
        throw new Error('Please configure at least one API key');
      }

      // Save settings via background service worker
      console.log('[WebClip Settings] Sending save request to background...');
      const response = await chrome.runtime.sendMessage({
        action: 'saveSettings',
        settings: formData
      });

      if (response.success) {
        console.log('[WebClip Settings] Settings saved successfully');
        // Update local settings and show success
        this.settings = formData;
        this.showSuccess('Settings saved successfully!');
        this.hideSaveButton();
      } else {
        console.error('[WebClip Settings] Failed to save settings:', response.error);
        throw new Error(response.error || 'Failed to save settings');
      }

    } catch (error) {
      console.error('[WebClip Settings] Error during save:', error);
      this.showError('Failed to save settings: ' + error.message);
    } finally {
      // Reset saving state
      this.setSavingState(false);
      console.log('[WebClip Settings] Saving state deactivated');
    }
  }

  /**
   * Manage saving state UI feedback
   * @param {boolean} saving - Whether currently saving
   */
  setSavingState(saving) {
    this.isSaving = saving;
    const saveButton = document.getElementById('save-settings');
    const buttonText = saveButton.querySelector('span');

    if (saving) {
      // Show saving state
      saveButton.disabled = true;
      buttonText.textContent = 'Saving...';
      saveButton.classList.add('opacity-75', 'cursor-not-allowed');
    } else {
      // Reset to normal state
      saveButton.disabled = false;
      buttonText.textContent = 'Save Changes';
      saveButton.classList.remove('opacity-75', 'cursor-not-allowed');
    }
  }

  /**
   * Mark form as dirty (has unsaved changes)
   * Shows save button with pulsing animation
   */
  markAsDirty() {
    const saveButton = document.getElementById('save-settings');
    saveButton.classList.remove('hidden');
    saveButton.classList.add('animate-pulse');

    // Remove pulse animation after 2 seconds to prevent distraction
    setTimeout(() => {
      saveButton.classList.remove('animate-pulse');
    }, 2000);
  }

  /**
   * Hide save button when no unsaved changes exist
   */
  hideSaveButton() {
    const saveButton = document.getElementById('save-settings');
    saveButton.classList.add('hidden');
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
   * Show animated toast notification with slide-in effect
   * Auto-dismisses after 3 seconds with smooth animations
   * @param {string} message - Message to display
   * @param {string} type - Notification type ('success', 'error', 'info')
   */
  showToast(message, type = 'info') {
    // Remove any existing toast to prevent stacking
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }

    // Create toast element with appropriate styling
    const toast = document.createElement('div');
    toast.className = `toast fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`;

    // Set initial position (off-screen)
    toast.style.cssText = `
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
    `;

    // Add toast content with icon
    toast.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="material-symbols-outlined">
          ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}
        </span>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(toast);

    // Animate toast in from right
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);

    // Animate toast out and remove after 3 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 3000);
  }

  /**
   * Test API connection with current settings
   * Makes a minimal API call to verify credentials and endpoint
   */
  async testApiConnection() {
    console.log('[WebClip Settings] Starting API connection test...');

    try {
      const testSettings = {
        apiEndpoint: document.getElementById('api-endpoint').value,
        apiKey: document.getElementById('llm-api-key').value
      };

      console.log('[WebClip Settings] Testing API endpoint:', testSettings.apiEndpoint);

      if (!testSettings.apiKey) {
        console.error('[WebClip Settings] No API key provided for test');
        throw new Error('Please enter an API key');
      }

      // Make minimal test API call
      console.log('[WebClip Settings] Making test API request...');
      const response = await fetch(testSettings.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testSettings.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5
        })
      });

      if (response.ok) {
        console.log('[WebClip Settings] API connection test successful');
        this.showSuccess('API connection successful!');
      } else {
        console.error('[WebClip Settings] API connection test failed:', response.status);
        throw new Error(`API request failed: ${response.status}`);
      }

    } catch (error) {
      console.error('[WebClip Settings] API connection test error:', error);
      this.showError('API test failed: ' + error.message);
    }
  }

  /**
   * Test Notion integration with current settings
   * Verifies database access with provided token
   */
  async testNotionConnection() {
    console.log('[WebClip Settings] Starting Notion connection test...');

    try {
      const token = document.getElementById('notion-token').value;
      const databaseId = document.getElementById('notion-db-id').value;

      console.log('[WebClip Settings] Testing Notion database access for ID:', databaseId);

      if (!token || !databaseId) {
        console.error('[WebClip Settings] Missing Notion token or database ID');
        throw new Error('Please enter both Notion token and database ID');
      }

      // Test database access
      console.log('[WebClip Settings] Making Notion API request...');
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (response.ok) {
        console.log('[WebClip Settings] Notion connection test successful');
        this.showSuccess('Notion connection successful!');
      } else {
        console.error('[WebClip Settings] Notion connection test failed:', response.status);
        throw new Error(`Notion API request failed: ${response.status}`);
      }

    } catch (error) {
      console.error('[WebClip Settings] Notion connection test error:', error);
      this.showError('Notion test failed: ' + error.message);
    }
  }
}

/**
 * Initialize settings manager when DOM is fully loaded
 */
let settingsManager;
document.addEventListener('DOMContentLoaded', () => {
  console.log('[WebClip Settings] DOM content loaded, initializing settings manager...');
  settingsManager = new SettingsManager();
  console.log('[WebClip Settings] Settings manager initialized and ready');
});