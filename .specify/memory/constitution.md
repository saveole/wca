<!--
Sync Impact Report:
- Version change: undefined → 1.0.0 (MAJOR: First constitution for established project)
- Modified principles: All 5 principles newly defined for Chrome extension context
- Added sections: Technical Requirements, Development Standards
- Removed sections: None
- Templates requiring updates:
  ✅ .specify/templates/plan-template.md (Constitution Check section needs updating)
  ⚠ .specify/templates/spec-template.md (Security requirements need alignment)
  ⚠ .specify/templates/tasks-template.md (Testing standards need extension-specific guidance)
- Follow-up TODOs: None - all placeholders resolved
-->

# WebClip Assistant Constitution

## Core Principles

### I. User Experience First
Every feature must prioritize user workflow efficiency. Popup interface MUST load in under 500ms; Core operations (capture, edit, save) MUST complete in 3 clicks or less; Dark/light theme support is mandatory; UI MUST be intuitive without requiring documentation.

### II. Security & Privacy First (NON-NEGOTIABLE)
API keys MUST be stored securely using chrome.storage.sync; No sensitive data ever logged or exposed; ALL external API calls MUST use HTTPS; Content Security Policy MUST be Manifest V3 compliant; No inline scripts or CDN dependencies for CSS.

### III. Chrome Extension Standards Compliance
Extension MUST follow Manifest V3 standards; Required permissions MUST be minimal (activeTab, storage, downloads, scripting only); Content script injection MUST be used for page data extraction; Service worker pattern MUST handle background tasks and message routing.

### IV. API Integration Reliability
All external API calls (AI summarization, Notion) MUST include proper error handling; Async operations MUST NOT block user interface; Loading states MUST be visible during API calls; Graceful failure with user-friendly error messages is REQUIRED.

### V. Export Flexibility
Multiple export formats MUST be supported (Markdown, JSON, Notion API); Export templates MUST be configurable; File downloads MUST use Chrome Downloads API; Field mapping for external integrations MUST be user-configurable.

## Technical Requirements

### Browser Extension Architecture
- Service Worker (background.js): Central hub for message routing, API calls, and file operations
- Popup UI (ui/main_popup.html): Primary interface for content capture and editing
- Settings Management (ui/settings.html): Configuration interface with validation
- Content Script Injection: Extract page metadata from active tabs
- Local CSS (ui/styles.css): Self-contained styling for CSP compliance

### Data Processing Pipeline
1. User activates extension → Popup opens
2. Background script extracts page metadata via content script injection
3. Popup displays extracted data for user editing
4. User can generate AI summaries, add notes, and manage tags
5. User selects export method (file download or Notion API)
6. Background script handles external API calls and file operations

## Development Standards

### Code Quality
- ES6+ JavaScript with comprehensive JSDoc documentation
- Async/await patterns for Chrome API interactions
- Proper error handling with user-friendly feedback
- Event delegation for dynamic UI elements
- Chrome DevTools debugging practices

### Security Best Practices
- Input validation before processing
- API keys stored in chrome.storage.sync only
- No hard-coded credentials or tokens
- Regular security reviews of permission requests

### Testing Requirements
- Test all export formats (Markdown, JSON, Notion)
- Verify Notion integration with various field mappings
- Validate dark/light theme switching
- Test error scenarios (network failures, invalid API keys)
- Chrome extension loading and performance testing

## Governance

This constitution governs all development decisions and supersedes other practices. Amendments require full documentation, version incrementation, and migration planning. All code reviews MUST verify constitutional compliance.

**Version**: 1.0.0 | **Ratified**: 2025-09-27 | **Last Amended**: 2025-09-27