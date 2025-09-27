/**
 * WebClip Assistant - Background Service Worker
 *
 * This is the main background script that handles all core extension functionality:
 * - Page information extraction from active tabs
 * - AI-powered content summarization
 * - File export capabilities (Markdown, JSON)
 * - Notion integration for saving clips
 * - Settings management and persistence
 *
 * @class WebClipAssistant
 */
class WebClipAssistant {
  /**
   * Default settings configuration for the extension
   * Includes API provider settings, Notion integration, and user preferences
   */
  constructor() {
    this.defaultSettings = {
      apiProvider: "openai",
      apiEndpoint: "https://api.openai.com/v1/chat/completions",
      apiKey: "",
      notionToken: "",
      notionDatabaseId: "",
      fieldMapping: {
        title: "",
        url: "",
        content: "",
        tags: "",
      },
      autoSave: false,
      defaultExportFormat: "markdown",
    };
  }

  /**
   * Initialize the extension and set up event listeners
   * - Sets default settings on first install
   * - Configures message handling from popup
   */
  init() {
    console.log("[WebClip Assistant] Initializing extension...");

    // Set default settings when extension is installed
    chrome.runtime.onInstalled.addListener(() => {
      console.log(
        "[WebClip Assistant] Extension installed/updated, setting default settings",
      );
      this.setDefaultSettings();
    });

    // Handle incoming messages from popup UI
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log(
        "[WebClip Assistant] Received message:",
        request.action,
        "from tab:",
        sender.tab?.id || "no-tab",
        "sender:",
        sender.url || "unknown",
      );
      this.handleMessage(request, sender, sendResponse);
      return true; // Required for async responses
    });

    console.log("[WebClip Assistant] Extension initialization complete");
  }

  /**
   * Set default settings when extension is first installed
   * Only sets defaults if no settings already exist
   */
  async setDefaultSettings() {
    console.log("[WebClip Assistant] Setting default settings...");
    const result = await chrome.storage.sync.get(["settings"]);
    if (!result.settings) {
      console.log(
        "[WebClip Assistant] No existing settings found, applying defaults",
      );
      await chrome.storage.sync.set({ settings: this.defaultSettings });
      console.log("[WebClip Assistant] Default settings saved successfully");
    } else {
      console.log(
        "[WebClip Assistant] Existing settings found, skipping defaults",
      );
    }
  }

  /**
   * Main message handler for routing popup requests to appropriate methods
   * @param {Object} request - Message request from popup
   * @param {Object} sender - Message sender information
   * @param {Function} sendResponse - Callback function to send response
   */
  async handleMessage(request, sender, sendResponse) {
    console.log("[WebClip Assistant] Processing action:", request.action);

    try {
      switch (request.action) {
        case "getPageInfo":
          // Get active tab when sender.tab is not available
          let tabId = sender.tab?.id;
          if (!tabId) {
            console.log(
              "[WebClip Assistant] No tab ID from sender, querying active tab",
            );
            try {
              const [activeTab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
              });
              if (activeTab && activeTab.id) {
                tabId = activeTab.id;
                console.log("[WebClip Assistant] Found active tab ID:", tabId);
              } else {
                console.error(
                  "[WebClip Assistant] Cannot get page info: No active tab found",
                );
                sendResponse({
                  success: false,
                  error: "No active tab available",
                });
                break;
              }
            } catch (error) {
              console.error(
                "[WebClip Assistant] Error querying active tab:",
                error,
              );
              sendResponse({
                success: false,
                error: "Cannot access active tab",
              });
              break;
            }
          }
          console.log(
            "[WebClip Assistant] Extracting page info from tab:",
            tabId,
          );
          // Extract page information from active tab
          const pageInfo = await this.getPageInfo(tabId);
          console.log("[WebClip Assistant] Page info extracted:", pageInfo);
          sendResponse({ success: true, data: pageInfo });
          break;

        case "getSettings":
          console.log("[WebClip Assistant] Retrieving user settings");
          // Retrieve user settings from storage
          const settings = await this.getSettings();
          console.log(
            "[WebClip Assistant] Settings retrieved, API provider:",
            settings.apiProvider,
          );
          sendResponse({ success: true, data: settings });
          break;

        case "saveSettings":
          console.log("[WebClip Assistant] Saving user settings");
          // Save user settings to storage
          await this.saveSettings(request.settings);
          console.log("[WebClip Assistant] Settings saved successfully");
          sendResponse({ success: true });
          break;

        case "summarizeContent":
          console.log(
            "[WebClip Assistant] Generating AI summary, content length:",
            request.content?.length || 0,
          );
          // Generate AI summary using configured API provider
          const summary = await this.summarizeContent(
            request.content,
            request.settings,
          );
          console.log(
            "[WebClip Assistant] AI summary generated, length:",
            summary?.length || 0,
          );
          sendResponse({ success: true, data: summary });
          break;

        case "exportFile":
          console.log(
            "[WebClip Assistant] Exporting file:",
            request.filename,
            "type:",
            request.type,
          );
          // Export content as downloadable file
          await this.exportFile(
            request.content,
            request.filename,
            request.type,
          );
          console.log("[WebClip Assistant] File export initiated");
          sendResponse({ success: true });
          break;

        case "saveToNotion":
          console.log("[WebClip Assistant] Saving to Notion database");
          // Save clip data to Notion database
          const notionResult = await this.saveToNotion(
            request.data,
            request.settings,
          );
          console.log(
            "[WebClip Assistant] Saved to Notion successfully, page ID:",
            notionResult?.id,
          );
          sendResponse({ success: true, data: notionResult });
          break;

        default:
          console.warn(
            "[WebClip Assistant] Unknown action requested:",
            request.action,
          );
          sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (error) {
      console.error("[WebClip Assistant] Error processing message:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Extract page information from the active tab
   * @param {number} tabId - ID of the tab to extract information from
   * @returns {Promise<Object>} Page information including title, URL, description, and cover image
   */
  async getPageInfo(tabId) {
    console.log(
      "[WebClip Assistant] Injecting content script into tab:",
      tabId,
    );

    // Validate tab ID
    if (!tabId || typeof tabId !== "number") {
      console.error("[WebClip Assistant] Invalid tab ID:", tabId);
      return {
        title: "",
        url: "",
        description: "",
        coverImage: "",
      };
    }

    return new Promise((resolve) => {
      // Execute content script to extract page information
      chrome.scripting.executeScript(
        {
          target: { tabId },
          function: this.getContentScriptFunction(),
        },
        (results) => {
          if (chrome.runtime.lastError) {
            console.error(
              "[WebClip Assistant] Script injection error:",
              chrome.runtime.lastError,
            );
            resolve({
              title: "",
              url: "",
              description: "",
              coverImage: "",
            });
            return;
          }

          if (results && results[0]) {
            console.log(
              "[WebClip Assistant] Content script executed successfully",
            );
            console.log("[WebClip Assistant] Extracted data:", results[0].result);
            resolve(results[0].result);
          } else {
            console.warn("[WebClip Assistant] No results from content script");
            // Return empty defaults if extraction fails
            resolve({
              title: "",
              url: "",
              description: "",
              coverImage: "",
            });
          }
        },
      );
    });
  }

  /**
   * Content script function to extract page information from DOM
   * This function is injected into the active tab to extract:
   * - Page title from document.title
   * - Current URL from window.location.href
   * - Meta description from meta tags
   * - Cover image from Open Graph tags
   * - Fallback description from first paragraph
   *
   * @returns {Object} Extracted page information
   */
  extractPageInfo() {
    const title = document.title;
    const url = window.location.href;

    // Get meta description from standard meta tag
    const metaDescription = document.querySelector('meta[name="description"]');
    const description = metaDescription ? metaDescription.content : "";

    // Get cover image from Open Graph image tag
    const ogImage = document.querySelector('meta[property="og:image"]');
    const coverImage = ogImage ? ogImage.content : "";

    // Fallback: get first paragraph content if no meta description
    if (!description) {
      const firstParagraph = document.querySelector("p");
      const fallbackDescription = firstParagraph
        ? firstParagraph.textContent.substring(0, 200)
        : "";
      return { title, url, description: fallbackDescription, coverImage };
    }

    return { title, url, description, coverImage };
  }

  /**
   * Standalone content script function that can be serialized and injected
   * This is a self-contained function that doesn't rely on 'this' context
   *
   * @returns {Object} Extracted page information
   */
  getContentScriptFunction() {
    return function() {
      const title = document.title;
      const url = window.location.href;

      // Get meta description from standard meta tag
      const metaDescription = document.querySelector('meta[name="description"]');
      const description = metaDescription ? metaDescription.content : "";

      // Get cover image from Open Graph image tag
      const ogImage = document.querySelector('meta[property="og:image"]');
      const coverImage = ogImage ? ogImage.content : "";

      // Fallback: get first paragraph content if no meta description
      if (!description) {
        const firstParagraph = document.querySelector("p");
        const fallbackDescription = firstParagraph
          ? firstParagraph.textContent.substring(0, 200)
          : "";
        return { title, url, description: fallbackDescription, coverImage };
      }

      return { title, url, description, coverImage };
    };
  }

  /**
   * Retrieve user settings from chrome.storage.sync
   * @returns {Promise<Object>} User settings or default settings if none exist
   */
  async getSettings() {
    const result = await chrome.storage.sync.get(["settings"]);
    return result.settings || this.defaultSettings;
  }

  /**
   * Save user settings to chrome.storage.sync
   * @param {Object} settings - Settings object to save
   */
  async saveSettings(settings) {
    await chrome.storage.sync.set({ settings });
  }

  /**
   * Generate AI summary using configured LLM API provider
   * Currently supports OpenAI-compatible APIs (OpenAI, Anthropic, custom providers)
   *
   * @param {string} content - Content to summarize
   * @param {Object} settings - User settings including API configuration
   * @returns {Promise<string>} Generated summary text
   * @throws {Error} If API key is not configured or API request fails
   */
  async summarizeContent(content, settings) {
    console.log(
      "[WebClip Assistant] Starting AI summarization with provider:",
      settings.apiProvider,
    );

    if (!settings.apiKey) {
      console.error(
        "[WebClip Assistant] API key not configured for provider:",
        settings.apiProvider,
      );
      throw new Error("API key not configured");
    }

    console.log(
      "[WebClip Assistant] Making API request to:",
      settings.apiEndpoint,
    );

    // Make API request to configured LLM provider
    const response = await fetch(settings.apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that summarizes web content. Provide a concise summary of the main points in 2-3 sentences.",
          },
          {
            role: "user",
            content: `Please summarize this content:\n\n${content}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error(
        "[WebClip Assistant] API request failed:",
        response.status,
        response.statusText,
      );
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(
      "[WebClip Assistant] API response received, tokens used:",
      data.usage?.total_tokens || "unknown",
    );
    return data.choices[0].message.content;
  }

  /**
   * Export content as a downloadable file
   * Supports Markdown (.md) and JSON (.json) formats
   *
   * @param {string} content - Content to export
   * @param {string} filename - Name for the downloaded file
   * @param {string} type - Export format ('markdown' or 'json')
   */
  async exportFile(content, filename, type) {
    console.log(
      "[WebClip Assistant] Exporting file:",
      filename,
      "type:",
      type,
      "size:",
      content.length,
      "bytes",
    );

    // Create blob with appropriate MIME type
    const blob = new Blob([content], {
      type: type === "markdown" ? "text/markdown" : "application/json",
    });

    // Convert blob to base64 for Chrome downloads API
    const reader = new FileReader();
    const base64Data = await new Promise((resolve, reject) => {
      reader.onload = () => {
        // Remove data URL prefix to get base64 content
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Create data URL for download
    const dataUrl = `data:${
      type === "markdown" ? "text/markdown" : "application/json"
    };base64,${base64Data}`;
    console.log("[WebClip Assistant] Created data URL for download");

    try {
      // Initiate download using Chrome downloads API
      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: true,
      });
      console.log(
        "[WebClip Assistant] Download initiated with ID:",
        downloadId,
      );
    } catch (error) {
      console.error("[WebClip Assistant] Download initiation failed:", error);
      throw error;
    }

    // Clean up the object URL to prevent memory leaks
    setTimeout(() => {
      URL.revokeObjectURL(url);
      console.log("[WebClip Assistant] Object URL cleaned up");
    }, 1000);
  }

  /**
   * Format content (summary + notes) for rich text property
   * @param {string} summary - AI-generated summary
   * @param {string} notes - User notes
   * @returns {string} Formatted content string
   */
  formatContentForRichText(summary, notes) {
    const parts = [];

    if (summary) {
      parts.push(`AI Summary: ${summary}`);
    }

    if (notes) {
      parts.push(`My Notes: ${notes}`);
    }

    return parts.length > 0 ? parts.join('\n\n') : '';
  }

  /**
   * Save web clip data to Notion database
   * Creates a new page in the configured Notion database with:
   * - Mapped properties (title, URL, tags, content)
   * - Rich content blocks (AI summary, user notes) as fallback
   *
   * @param {Object} data - Web clip data including title, URL, summary, notes, tags
   * @param {Object} settings - User settings including Notion integration configuration
   * @returns {Promise<Object>} Notion API response
   * @throws {Error} If Notion integration is not configured or API request fails
   */
  async saveToNotion(data, settings) {
    console.log("[WebClip Assistant] Starting Notion save process");

    // Validate Notion integration configuration
    if (!settings.notionToken || !settings.notionDatabaseId) {
      console.error("[WebClip Assistant] Notion integration not configured");
      throw new Error("Notion integration not configured");
    }

    // Validate field mapping configuration
    const mapping = settings.fieldMapping || {};
    console.log("[WebClip Assistant] Using field mapping:", mapping);

    if (!mapping.title || !mapping.content) {
      console.error("[WebClip Assistant] Required field mappings not configured");
      throw new Error("Required field mappings (title, content) are not configured. Please check your settings.");
    }

    // Prepare properties based on user's field mapping configuration
    const properties = {};

    // Map title property (required)
    if (mapping.title) {
      properties[mapping.title] = {
        title: [{ text: { content: data.title || "Untitled" } }],
      };
      console.log("[WebClip Assistant] Mapped title property:", mapping.title);
    }

    // Map URL property (optional)
    if (mapping.url && data.url) {
      properties[mapping.url] = {
        url: data.url,
      };
      console.log("[WebClip Assistant] Mapped URL property:", mapping.url);
    }

    // Map tags as multi-select if tags exist and mapping is configured
    if (mapping.tags && data.tags && data.tags.length > 0) {
      properties[mapping.tags] = {
        multi_select: data.tags.map((tag) => ({ name: tag.trim() })),
      };
      console.log(
        "[WebClip Assistant] Mapped tags:",
        data.tags.length,
        "tags to property:",
        mapping.tags,
      );
    }

    // Map content to rich_text property if configured
    if (mapping.content) {
      const contentText = this.formatContentForRichText(data.summary, data.notes);
      if (contentText) {
        properties[mapping.content] = {
          rich_text: [{ text: { content: contentText } }],
        };
        console.log("[WebClip Assistant] Mapped content property:", mapping.content);
      }
    }

    // Prepare rich content blocks for the page (fallback if no content mapping or for additional content)
    const contentParts = [];

    // Only add content blocks if content is not mapped to a property or if there's additional content
    if (!mapping.content || (data.summary && data.notes)) {
      // Add AI summary section if available and not already mapped
      if (data.summary && !mapping.content) {
        contentParts.push({
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ text: { content: "AI Summary" } }],
          },
        });
        contentParts.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ text: { content: data.summary } }],
          },
        });
        console.log("[WebClip Assistant] Added AI summary content block");
      }

      // Add user notes section if available and not already mapped
      if (data.notes && !mapping.content) {
        contentParts.push({
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ text: { content: "My Notes" } }],
          },
        });
        contentParts.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ text: { content: data.notes } }],
          },
        });
        console.log("[WebClip Assistant] Added user notes content block");
      }
    }

    console.log(
      "[WebClip Assistant] Creating Notion page with",
      contentParts.length,
      "content blocks",
    );

    // Create new page in Notion database
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.notionToken}`,
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: settings.notionDatabaseId },
        properties: properties,
        children: contentParts.length > 0 ? contentParts : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[WebClip Assistant] Notion API error:", error);
      throw new Error(`Notion API error: ${error.message}`);
    }

    const result = await response.json();
    console.log(
      "[WebClip Assistant] Notion page created successfully:",
      result.id,
    );
    return result;
  }
}

/**
 * Initialize and start the WebClip Assistant extension
 * Creates instance and sets up event listeners
 */
console.log("[WebClip Assistant] Starting WebClip Assistant service worker...");
const webClipAssistant = new WebClipAssistant();
webClipAssistant.init();
console.log("[WebClip Assistant] Service worker started successfully");
