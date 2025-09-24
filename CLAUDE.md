# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WebClip Assistant is a Chrome browser extension designed to help users capture, organize, and export web content intelligently. The extension provides AI-powered summarization, multiple export formats, and seamless Notion integration.

## Architecture

### Core Components
- **Background Service Worker** (`background.js`): Core extension logic handling API calls, content extraction, and storage
- **Main Popup UI** (`ui/main_popup.html`): Primary interface for capturing and editing web content
- **Settings Page** (`ui/settings.html`): Configuration interface for API keys and integration settings
- **Popup Manager** (`ui/popup.js`): Handles all popup UI interactions and user feedback
- **Settings Manager** (`ui/settings.js`): Manages configuration, validation, and connection testing
- **Local CSS** (`ui/styles.css`): Custom CSS replacing Tailwind CDN for CSP compliance
- **Icons** (`icons/`): SVG icons for all extension sizes

### Key Features
1. **Information Capture**: Automatically extracts page title, URL, description, and Open Graph metadata
2. **AI Summarization**: Integrates with LLM APIs (OpenAI, Anthropic, Custom) to generate content summaries
3. **Manual Editing**: All captured fields are editable with support for personal notes and tags
4. **Export Options**: Supports Markdown and JSON export formats with automatic downloads
5. **Notion Integration**: Direct saving to Notion databases with configurable field mapping
6. **Dark/Light Theme**: Built-in theme support using CSS custom properties
7. **Tag Management**: Interactive tag system with keyboard shortcuts

### Technical Stack
- **Frontend**: HTML5, Custom CSS (Tailwind utility classes), ES6+ JavaScript
- **Icons**: Material Symbols (Google Fonts)
- **Fonts**: Inter (Google Fonts)
- **Browser APIs**: Chrome Extension Manifest V3 APIs
- **External APIs**: OpenAI/LLM APIs, Notion API
- **Storage**: Chrome Storage Sync for settings persistence

## Development Workflow

### Current Status
The extension is fully functional with all core features implemented. The codebase is well-documented with comprehensive JSDoc comments.

### File Structure
```
wca/
├── docs/
│   └── prd_v1.md          # Product requirements document
├── icons/                 # SVG icons for extension
│   ├── icon16.svg
│   ├── icon32.svg
│   ├── icon48.svg
│   └── icon128.svg
├── ui/
│   ├── main_popup.html    # Main popup interface
│   ├── popup.js           # Popup UI manager
│   ├── settings.html      # Settings/configuration interface
│   ├── settings.js        # Settings page manager
│   ├── styles.css         # Local CSS with Tailwind utilities
│   └── tailwind-config.js  # External Tailwind configuration
├── background.js          # Service worker core logic
├── manifest.json          # Extension manifest
└── CLAUDE.md              # This file
```

### Development Commands
Since this is a Chrome extension with no build system:
- Load the extension in Chrome via `chrome://extensions/` in developer mode
- Test UI changes by refreshing the extension or reloading the extension
- Use Chrome DevTools to debug popup and background script
- No build, lint, or test commands are currently configured

### Chrome Extension Setup
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the project directory
4. The extension will appear in your browser toolbar

## Key Design Decisions

### UI Framework
- **Local CSS**: Replaced Tailwind CDN with custom CSS for CSP compliance
- **Material Symbols**: Consistent iconography with Google Fonts
- **CSS Custom Properties**: Theme system with dark/light mode support
- **Responsive Design**: Optimized for popup dimensions (360px width)

### Security & CSP Compliance
- **No Inline Scripts**: All JavaScript is in external files
- **No CDN Dependencies**: All CSS is self-contained
- **Secure Storage**: API keys stored using `chrome.storage.sync`
- **HTTPS Only**: All external API calls use HTTPS
- **Content Security Policy**: Manifest V3 compliant configuration

### Data Flow Architecture
1. User clicks extension icon → Popup opens
2. Background script extracts current page metadata via content script injection
3. Popup displays extracted data and allows editing
4. User can generate AI summaries, add notes, and manage tags
5. User chooses export method (file download or Notion API)
6. Background script handles external API calls and file operations

### Extension Architecture
- **Service Worker**: Handles background tasks, API calls, and message routing
- **Popup UI**: User interface for content capture and editing
- **Content Script Injection**: Extracts page information from active tab
- **Storage Management**: Settings persistence using Chrome Storage API
- **File Downloads**: Chrome Downloads API for export functionality

## Implementation Details

### Background Service Worker (`background.js`)
- **Message Routing**: Central hub for all popup→background communication
- **Page Extraction**: Injects content scripts to extract title, URL, description, and OG images
- **API Integration**: Handles LLM and Notion API calls with proper error handling
- **File Export**: Manages blob creation and download initiation
- **Settings Management**: Chrome Storage API operations

### Popup Manager (`ui/popup.js`)
- **UI State Management**: Maintains current clip data and loading states
- **Event Handling**: Binds all user interactions (buttons, inputs, tags)
- **Tag System**: Interactive tag input with keyboard shortcuts
- **Export Generation**: Creates Markdown and JSON export formats
- **User Feedback**: Toast notifications for success/error states

### Settings Manager (`ui/settings.js`)
- **Form Management**: Population, validation, and dirty state tracking
- **API Configuration**: Provider selection and endpoint management
- **Connection Testing**: Validates API and Notion integration
- **Field Mapping**: Configurable Notion database property mapping

### CSS Architecture (`ui/styles.css`)
- **Utility Classes**: Tailwind-equivalent classes for consistency
- **Custom Properties**: Theme variables for dark/light mode
- **Component Styles**: Reusable UI component patterns
- **Responsive Design**: Mobile-friendly layouts

## Chrome Extension API Usage

### Required Permissions
- `activeTab`: Access to current tab for content extraction
- `storage`: Settings persistence using chrome.storage.sync
- `downloads`: File download functionality for exports
- `scripting`: Content script injection for page data extraction

### Host Permissions
- `https://api.openai.com/*`: OpenAI API access
- `https://api.anthropic.com/*`: Anthropic API access
- `https://api.notion.com/*`: Notion API access
- `https://fonts.googleapis.com/*`: Google Fonts access
- `https://fonts.gstatic.com/*`: Font resources

### API Integration Patterns
- **AI Summarization**: Asynchronous requests with loading states and error handling
- **Notion Integration**: Field mapping configuration and rich content creation
- **Error Handling**: Graceful failure with user feedback and retry options

## Code Quality Standards

### Documentation
- **JSDoc Comments**: Comprehensive method documentation with parameters and returns
- **Class Documentation**: Overviews of main classes and their responsibilities
- **Inline Comments**: Explanations of complex logic and Chrome API usage
- **Architecture Notes**: Design decisions and trade-off explanations

### Code Organization
- **ES6 Classes**: Modern JavaScript with proper encapsulation
- **Async/Await**: Promisified Chrome API interactions
- **Error Handling**: Try/catch blocks with user-friendly error messages
- **Event Delegation**: Efficient event handling for dynamic content

### Security Best Practices
- **Input Validation**: All user input is validated before processing
- **API Key Security**: Keys stored securely, never logged or exposed
- **Content Security Policy**: Manifest V3 compliant with no unsafe practices
- **External Requests**: All third-party API calls use HTTPS

## Troubleshooting

### Common Issues
1. **Extension Not Loading**: Check manifest.json syntax and file paths
2. **API Failures**: Verify API keys and network connectivity
3. **Notion Integration**: Confirm database ID and field mapping configuration
4. **CSS Issues**: Ensure styles.css is properly referenced

### Debugging
- Use Chrome DevTools to debug popup and background script
- Check Chrome extension management page for errors
- Use console.log statements for debugging background script operations
- Test API connections using the built-in connection testers in settings

### Testing
- Test all export formats (Markdown, JSON)
- Verify Notion integration with different field mappings
- Test dark/light theme switching
- Validate tag management functionality
- Test error scenarios (network failures, invalid API keys)