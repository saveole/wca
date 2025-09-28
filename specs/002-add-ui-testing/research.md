# Phase 0 Research: UI Testing Workflow for AI Coding Tools

## Technology Decisions

### Visual Regression Testing Framework
**Decision**: Playwright with pixelmatch for screenshot comparison
- **Rationale**: Playwright provides reliable screenshot capture across Chrome versions, pixelmatch offers precise pixel-level comparison with configurable tolerance
- **Alternatives considered**:
  - Cypress (limited screenshot comparison capabilities)
  - Puppeteer (requires more manual setup for visual testing)
  - BackstopJS (overkill for Chrome extension scope)

### Accessibility Testing
**Decision**: axe-core integration with Playwright
- **Rationale**: Industry standard for automated accessibility testing, comprehensive WCAG 2.1 Level AA coverage, excellent integration with Playwright
- **Alternatives considered**:
  - WAVE (manual testing only)
  - Lighthouse (performance-focused, not continuous testing)
  - Custom accessibility checks (high maintenance burden)

### Test Reporting
**Decision**: Custom JSON reporter with AI-friendly formatting
- **Rationale**: Enables 80% success rate target for AI interpretation, structured output for automated analysis
- **Alternatives considered**:
  - Standard Playwright reports (not AI-optimized)
  - HTML reports (difficult for AI to parse)
  - JUnit XML (limited structure for complex UI tests)

### Screenshot Storage
**Decision**: File system with git-ignored baseline directory
- **Rationale**: Simple, reliable, works offline, easy to update baselines during development
- **Alternatives considered**:
  - Database storage (overkill for screenshots)
  - Cloud storage (requires internet, adds complexity)
  - Git LFS (complicates workflow for extension development)

## Best Practices

### Chrome Extension Testing
1. **Manifest V3 Compliance**: All tests must work within service worker constraints
2. **Content Script Testing**: Validate popup and content script interactions separately
3. **Permissions**: Test with minimal required permissions only
4. **CSP Compliance**: No inline scripts or external CDN dependencies

### Visual Regression Testing
1. **Screenshot Consistency**: Capture screenshots at consistent viewport sizes
2. **Theme Testing**: Test both dark and light modes separately
3. **Tolerance Settings**: Use configurable pixel tolerance for anti-aliasing
4. **Baseline Management**: Manual approval workflow for intentional changes

### Accessibility Testing
1. **WCAG 2.1 Level AA**: Focus on critical accessibility requirements
2. **Keyboard Navigation**: Test all interactive elements with keyboard only
3. **Screen Reader**: Validate proper ARIA labels and descriptions
4. **Color Contrast**: Ensure sufficient contrast ratios in both themes

### AI Tool Integration
1. **Structured Output**: JSON format with clear pass/fail indicators
2. **Actionable Feedback**: Include specific selectors and suggested fixes
3. **Test Commands**: Document CLI commands for specific test suites
4. **Debugging Support**: Provide detailed failure analysis for AI tools

## Integration Patterns

### Chrome Extension APIs
- Use `chrome.runtime.sendMessage` for test communication
- Mock `chrome.storage` for unit tests
- Validate permission requirements in integration tests

### External Dependencies
- axe-core loaded via npm package (not CDN)
- Playwright configured for Chrome extension testing
- pixelmatch for image comparison in Node.js environment

### Test Configuration
- Environment variables for API keys
- Configuration file for test settings
- Viewport definitions for responsive testing

## Performance Considerations

### Test Execution Speed
- Parallel test execution where possible
- Screenshot caching for repeated tests
- Selective test running based on changed files

### Resource Usage
- Memory management for screenshot storage
- Cleanup of temporary test files
- Efficient baseline image comparison

## Security Considerations

### Data Privacy
- Screenshots must not capture personal information
- Test fixtures should use mock data
- No real API keys in test files

### Extension Security
- Test with minimal permissions
- Validate content script isolation
- Ensure no security policy violations

---

**Research Complete**: All technical decisions made with clear rationale. Ready for Phase 1 design.