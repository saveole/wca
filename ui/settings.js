/**
 * WebClip Assistant - Settings Page Manager
 *
 * Handles all settings page functionality including:
 * - Loading and saving user preferences
 * - API provider configuration (OpenAI, Anthropic, Custom)
 * - Notion integration setup
 * - Field mapping configuration
 * - Connection testing for APIs
 * - Form management
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


    /** @type {Object|null} Current database properties from schema detection */
    this.currentDatabaseProperties = null;

    
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
   * - Form field management
   * - Preference toggle changes
   */
  bindEvents() {
    console.log('[WebClip Settings] Binding form event listeners...');

    // Save button click handler - use event delegation to handle dynamic visibility
    document.getElementById('save-settings').addEventListener('click', (e) => {
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
      'map-description',
      'map-summary',
      'map-notes',
      'map-content',
      'map-tags',
      'map-created-date'
    ];

    // Track changes for export format (auto-save is already handled below)
    const exportFormatField = document.getElementById('default-export-format');
    if (exportFormatField) {
      exportFormatField.addEventListener('change', () => {
        console.log('[WebClip Settings] Export format changed');
      });
    }

    // Test Notion connection button
    const testNotionButton = document.getElementById('test-notion-connection');
    if (testNotionButton) {
      testNotionButton.addEventListener('click', () => {
        console.log('[WebClip Settings] Test Notion connection button clicked');
        this.testNotionConnectionWithSchema();
      });
    }

    // Refresh schema button
    const refreshSchemaButton = document.getElementById('refresh-schema');
    if (refreshSchemaButton) {
      refreshSchemaButton.addEventListener('click', () => {
        console.log('[WebClip Settings] Refresh schema button clicked');
        this.testNotionConnectionWithSchema();
      });
    }

    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('change', () => {
          console.log('[WebClip Settings] Form field changed:', fieldId);
        });
      }
    });

    // Auto-save preference toggle
    document.getElementById('auto-save').addEventListener('change', () => {
      console.log('[WebClip Settings] Auto-save preference changed');
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
    const defaultFieldMapping = {
      title: 'Name',
      url: 'URL',
      description: 'Description',
      summary: 'Summary',
      notes: 'Notes',
      tags: 'Tags',
      createdDate: 'Created Date'
    };

    if (this.settings.fieldMapping) {
      document.getElementById('map-title').value = this.settings.fieldMapping.title || defaultFieldMapping.title;
      document.getElementById('map-url').value = this.settings.fieldMapping.url || defaultFieldMapping.url;
      document.getElementById('map-description').value = this.settings.fieldMapping.description || defaultFieldMapping.description;
      document.getElementById('map-summary').value = this.settings.fieldMapping.summary || defaultFieldMapping.summary;
      document.getElementById('map-notes').value = this.settings.fieldMapping.notes || defaultFieldMapping.notes;
      document.getElementById('map-tags').value = this.settings.fieldMapping.tags || defaultFieldMapping.tags;
      document.getElementById('map-created-date').value = this.settings.fieldMapping.createdDate || defaultFieldMapping.createdDate;
      console.log('[WebClip Settings] Field mapping populated:', this.settings.fieldMapping);
    } else {
      // Set default field mapping values
      document.getElementById('map-title').value = defaultFieldMapping.title;
      document.getElementById('map-url').value = defaultFieldMapping.url;
      document.getElementById('map-description').value = defaultFieldMapping.description;
      document.getElementById('map-summary').value = defaultFieldMapping.summary;
      document.getElementById('map-notes').value = defaultFieldMapping.notes;
      document.getElementById('map-tags').value = defaultFieldMapping.tags;
      document.getElementById('map-created-date').value = defaultFieldMapping.createdDate;
      console.log('[WebClip Settings] Default field mapping set:', defaultFieldMapping);
    }

    // Initialize field mapping validation
    this.initializeFieldMappingValidation();

    // User preferences
    document.getElementById('auto-save').checked = this.settings.autoSave || false;
    document.getElementById('default-export-format').value = this.settings.defaultExportFormat || 'markdown';

    console.log('[WebClip Settings] Form populated successfully');
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

    }

  /**
   * Save all settings to chrome.storage.sync
   * Shows appropriate feedback
   */
  async saveSettings() {
    console.log('[WebClip Settings] Starting settings save process...');

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
          description: document.getElementById('map-description').value,
          summary: document.getElementById('map-summary').value,
          notes: document.getElementById('map-notes').value,
          tags: document.getElementById('map-tags').value,
          createdDate: document.getElementById('map-created-date').value
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
      } else {
        console.error('[WebClip Settings] Failed to save settings:', response.error);
        throw new Error(response.error || 'Failed to save settings');
      }

    } catch (error) {
      console.error('[WebClip Settings] Error during save:', error);
      this.showError('Failed to save settings: ' + error.message);
    }
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

  /**
   * Test Notion connection and detect database schema
   * Enhanced version that retrieves database properties for field mapping
   */
  async testNotionConnectionWithSchema() {
    console.log('[WebClip Settings] Starting Notion connection test with schema detection...');

    const connectionStatus = document.getElementById('connection-status');

    try {
      const token = document.getElementById('notion-token').value;
      const databaseId = document.getElementById('notion-db-id').value;

      console.log('[WebClip Settings] Testing Notion database schema for ID:', databaseId);

      if (!token || !databaseId) {
        throw new Error('Please enter both Notion token and database ID');
      }

      // Test database access and retrieve schema
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[WebClip Settings] Notion API error:', error);
        throw new Error(`Notion API error: ${error.message || response.status}`);
      }

      const database = await response.json();
      console.log('[WebClip Settings] Database schema retrieved:', database);

      // Update schema status UI
      this.updateSchemaStatus(database);

      // Populate field mapping dropdowns with available properties
      this.populateFieldMappingOptions(database.properties);

      // Show success message
      this.showSuccess('Connection successful! Database schema detected.');
      connectionStatus.className = 'text-green-600';
      connectionStatus.textContent = '✓ Connected';

    } catch (error) {
      console.error('[WebClip Settings] Notion connection test error:', error);
      this.showError('Connection test failed: ' + error.message);
      connectionStatus.className = 'text-red-600';
      connectionStatus.textContent = '✗ Failed';
    }
  }

  /**
   * Update database schema status display
   * @param {Object} database - Notion database object
   */
  updateSchemaStatus(database) {
    const schemaStatus = document.getElementById('schema-status');
    const statusIcon = document.getElementById('schema-status-icon');
    const statusText = document.getElementById('schema-status-text');
    const schemaDetails = document.getElementById('schema-details');

    // Store current database properties for validation
    this.currentDatabaseProperties = database.properties;
    console.log('[WebClip Settings] Stored current database properties:', this.currentDatabaseProperties);

    schemaStatus.classList.remove('hidden', 'border-red-200', 'border-green-200', 'bg-red-50', 'bg-green-50', 'dark:bg-red-900/20', 'dark:bg-green-900/20');

    schemaStatus.classList.add('border-green-200', 'bg-green-50', 'dark:bg-green-900/20');
    statusIcon.textContent = 'check_circle';
    statusIcon.className = 'material-symbols-outlined text-green-600';
    statusText.textContent = 'Database Connected';
    statusText.className = 'text-sm font-medium text-green-800 dark:text-green-200';

    const propertyCount = Object.keys(database.properties).length;
    const propertyTypes = [...new Set(Object.values(database.properties).map(p => p.type))].join(', ');
    schemaDetails.textContent = `${propertyCount} properties detected • Types: ${propertyTypes}`;
  }

  /**
   * Populate field mapping dropdowns with available database properties
   * @param {Object} properties - Notion database properties object
   */
  populateFieldMappingOptions(properties) {
    const fieldMappings = {
      'map-title': { type: 'title', required: true },
      'map-url': { type: 'url', required: false },
      'map-description': { type: 'rich_text', required: false },
      'map-summary': { type: 'rich_text', required: false },
      'map-notes': { type: 'rich_text', required: false },
      'map-tags': { type: 'multi_select', required: false },
      'map-created-date': { type: 'date', required: false }
    };

    Object.entries(fieldMappings).forEach(([fieldId, config]) => {
      const select = document.getElementById(fieldId);
      if (!select) return;

      // Save current selection
      const currentValue = select.value;

      // Clear existing options except the placeholder
      select.innerHTML = '<option value="">Select a property...</option>';

      // Add compatible properties
      Object.entries(properties).forEach(([propName, propData]) => {
        if (this.isPropertyCompatible(propData.type, config.type)) {
          const option = document.createElement('option');
          option.value = propName;
          option.textContent = `${propName} (${propData.type})`;

          // Set as selected if it matches current value or is a common default
          if (propName === currentValue ||
              (config.type === 'title' && propName.toLowerCase().includes('title')) ||
              (config.type === 'url' && propName.toLowerCase().includes('url') || propName.toLowerCase().includes('link')) ||
              (config.type === 'rich_text' && (propName.toLowerCase().includes('content') || propName.toLowerCase().includes('description'))) ||
              (config.type === 'multi_select' && (propName.toLowerCase().includes('tag') || propName.toLowerCase().includes('category') || propName.toLowerCase().includes('label'))) ||
              (config.type === 'date' && (propName.toLowerCase().includes('date') || propName.toLowerCase().includes('created') || propName.toLowerCase().includes('时间') || propName.toLowerCase().includes('日期')))) {
            option.selected = true;
          }

          select.appendChild(option);
        }
      });

      // Add validation feedback
      this.validateFieldMapping(fieldId, select);
    });

    // Validate overall mapping configuration
    this.validateFieldMappingConfiguration();
  }

  /**
   * Check if a Notion property type is compatible with a field mapping type
   * @param {string} propertyType - Notion property type
   * @param {string} expectedType - Expected field mapping type
   * @returns {boolean} Whether compatible
   */
  isPropertyCompatible(propertyType, expectedType) {
    const compatibility = {
      'title': ['title'],
      'url': ['url'],
      'rich_text': ['rich_text'],
      'multi_select': ['multi_select'],
      'date': ['date'],
      'text': ['rich_text'], // Allow text properties for rich_text fields
      'select': ['multi_select'] // Allow select properties for multi_select fields
    };

    return compatibility[expectedType]?.includes(propertyType) || false;
  }

  /**
   * Validate property constraints for specific types
   * @param {Object} property - Notion property object
   * @returns {string|null} Validation issue message or null if valid
   */
  validatePropertyConstraints(property) {
    switch (property.type) {
      case 'title':
        if (property.title?.type !== 'title') {
          return 'Property must be a title type';
        }
        break;

      case 'url':
        if (property.url?.type !== 'url') {
          return 'Property must be a URL type';
        }
        break;

      case 'rich_text':
      case 'text':
        if (property.rich_text?.type !== 'rich_text' && property.text?.type !== 'text') {
          return 'Property must be a text or rich text type';
        }
        break;

      case 'date':
        if (property.date?.type !== 'date') {
          return 'Property must be a date type';
        }
        break;

      case 'multi_select':
        if (property.multi_select?.type !== 'multi_select') {
          return 'Property must be a multi-select type';
        }
        // Check if multi-select has options (not strictly required but good practice)
        if (!property.multi_select?.options || property.multi_select.options.length === 0) {
          return 'Multi-select property has no defined options';
        }
        break;

      case 'select':
        if (property.select?.type !== 'select') {
          return 'Property must be a select type';
        }
        // Check if select has options
        if (!property.select?.options || property.select.options.length === 0) {
          return 'Select property has no defined options';
        }
        break;
    }

    return null; // No issues found
  }

  /**
   * Initialize field mapping validation event listeners
   */
  initializeFieldMappingValidation() {
    const fieldMappingSelects = ['map-title', 'map-url', 'map-description', 'map-summary', 'map-notes', 'map-tags', 'map-created-date'];

    fieldMappingSelects.forEach(fieldId => {
      const select = document.getElementById(fieldId);
      if (select) {
        select.addEventListener('change', () => {
          this.validateFieldMapping(fieldId, select);
          this.validateFieldMappingConfiguration();
        });
      }
    });

    // Initial validation if we have stored schema
    if (this.currentDatabaseProperties) {
      console.log('[WebClip Settings] Performing initial field mapping validation with stored schema');
      this.validateFieldMappingConfiguration();
    }
  }

  /**
   * Validate individual field mapping selection
   * @param {string} fieldId - Field mapping ID
   * @param {HTMLSelectElement} select - Select element
   */
  validateFieldMapping(fieldId, select) {
    const validationDiv = document.getElementById(fieldId.replace('map-', '') + '-validation');
    if (!validationDiv) return;

    const value = select.value;
    const fieldConfig = {
      'map-title': { required: true, type: 'title' },
      'map-url': { required: false, type: 'url' },
      'map-description': { required: false, type: 'rich_text' },
      'map-summary': { required: false, type: 'rich_text' },
      'map-notes': { required: false, type: 'rich_text' },
      'map-content': { required: true, type: 'rich_text' },
      'map-tags': { required: false, type: 'multi_select' },
      'map-created-date': { required: false, type: 'date' }
    }[fieldId];

    if (!value) {
      if (fieldConfig.required) {
        this.showFieldValidation(validationDiv, 'error', 'This field is required');
      } else {
        this.hideFieldValidation(validationDiv);
      }
      return;
    }

    // Check if the selected property exists in the current schema
    const selectedProperty = this.currentDatabaseProperties?.[value];
    if (!selectedProperty) {
      this.showFieldValidation(validationDiv, 'error', 'Selected property not found in database schema');
      return;
    }

    // Validate property type compatibility
    if (!this.isPropertyCompatible(selectedProperty.type, fieldConfig.type)) {
      this.showFieldValidation(validationDiv, 'error',
        `Property type '${selectedProperty.type}' is not compatible with required '${fieldConfig.type}'`);
      return;
    }

    // Additional validation for specific property types
    const validationIssue = this.validatePropertyConstraints(selectedProperty);
    if (validationIssue) {
      this.showFieldValidation(validationDiv, 'warning', validationIssue);
    } else {
      this.hideFieldValidation(validationDiv);
    }
  }

  /**
   * Validate overall field mapping configuration
   */
  validateFieldMappingConfiguration() {
    const validationDiv = document.getElementById('mapping-validation');
    const validationIcon = document.getElementById('validation-icon');
    const validationText = document.getElementById('validation-text');
    const validationDetails = document.getElementById('validation-details');

    const mappings = {
      title: document.getElementById('map-title').value,
      url: document.getElementById('map-url').value,
      description: document.getElementById('map-description').value,
      summary: document.getElementById('map-summary').value,
      notes: document.getElementById('map-notes').value,
      tags: document.getElementById('map-tags').value,
      createdDate: document.getElementById('map-created-date').value
    };

    const issues = [];
    const warnings = [];

    // Check if we have database schema loaded
    if (!this.currentDatabaseProperties) {
      issues.push('No database schema detected. Please test your Notion connection first.');
    }

    // Check required fields
    if (!mappings.title) issues.push('Title mapping is required');

    // Check for duplicate mappings
    const usedProperties = Object.values(mappings).filter(v => v);
    const uniqueProperties = new Set(usedProperties);
    if (usedProperties.length !== uniqueProperties.size) {
      issues.push('Each property can only be mapped to one field');
    }

    // Validate each mapping against the schema
    if (this.currentDatabaseProperties) {
      Object.entries(mappings).forEach(([fieldType, propertyName]) => {
        if (propertyName) {
          const property = this.currentDatabaseProperties[propertyName];
          if (!property) {
            issues.push(`${propertyName} property not found in database schema`);
          } else {
            const fieldConfig = {
              title: { type: 'title' },
              url: { type: 'url' },
              description: { type: 'rich_text' },
              summary: { type: 'rich_text' },
              notes: { type: 'rich_text' },
              tags: { type: 'multi_select' },
              createdDate: { type: 'date' }
            }[fieldType];

            if (fieldConfig && !this.isPropertyCompatible(property.type, fieldConfig.type)) {
              issues.push(`${propertyName} (${property.type}) is not compatible with ${fieldType} field`);
            }

            // Check for warnings
            const constraintIssue = this.validatePropertyConstraints(property);
            if (constraintIssue) {
              warnings.push(`${propertyName}: ${constraintIssue}`);
            }
          }
        }
      });
    }

    if (issues.length === 0) {
      // Show success with warnings if any
      validationDiv.className = 'mt-4 p-3 rounded-lg text-sm bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800';
      validationIcon.textContent = 'check_circle';
      validationIcon.className = 'material-symbols-outlined text-green-600';
      validationText.textContent = 'Field mapping configuration is valid';
      validationText.className = 'font-medium text-green-800 dark:text-green-200';

      let detailsHtml = '<div class="text-green-700 dark:text-green-300">All required fields are mapped correctly</div>';
      if (warnings.length > 0) {
        detailsHtml += '<div class="mt-2 text-yellow-700 dark:text-yellow-300">Warnings:</div>' +
          warnings.map(warning => `<div class="text-yellow-600 dark:text-yellow-400">⚠ ${warning}</div>`).join('');
      }
      validationDetails.innerHTML = detailsHtml;
    } else {
      // Show errors
      validationDiv.className = 'mt-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800';
      validationIcon.textContent = 'error';
      validationIcon.className = 'material-symbols-outlined text-red-600';
      validationText.textContent = 'Field mapping configuration has issues';
      validationText.className = 'font-medium text-red-800 dark:text-red-200';
      validationDetails.innerHTML = issues.map(issue =>
        `<div class="text-red-700 dark:text-red-300">• ${issue}</div>`
      ).join('');
    }

    validationDiv.classList.remove('hidden');
  }

  /**
   * Show field validation feedback
   * @param {HTMLElement} validationDiv - Validation element
   * @param {string} type - Validation type ('error', 'warning', 'success')
   * @param {string} message - Validation message
   */
  showFieldValidation(validationDiv, type, message) {
    validationDiv.classList.remove('hidden');
    validationDiv.className = `mt-1 text-xs ${
      type === 'error' ? 'text-red-600' :
      type === 'warning' ? 'text-yellow-600' :
      'text-green-600'
    }`;
    validationDiv.textContent = message;
  }

  /**
   * Hide field validation feedback
   * @param {HTMLElement} validationDiv - Validation element
   */
  hideFieldValidation(validationDiv) {
    validationDiv.classList.add('hidden');
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