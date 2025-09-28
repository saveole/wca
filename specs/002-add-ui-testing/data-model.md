# Data Model: UI Testing Workflow

## Core Entities

### TestSuite
Represents a collection of UI tests organized by type.

**Fields**:
- `id`: Unique identifier
- `name`: Human-readable name
- `type`: Test type (visual|accessibility|interaction)
- `description`: Purpose of the test suite
- `tests`: Array of Test references
- `configuration`: TestSuiteConfiguration

**Validation Rules**:
- `type` must be one of: visual, accessibility, interaction
- `name` must be unique within type
- `tests` array must contain at least one test

### Test
Individual test case targeting specific UI components.

**Fields**:
- `id`: Unique identifier
- `name`: Test description
- `suiteId`: Reference to parent TestSuite
- `selector`: CSS selector for target element
- `actions`: Array of TestAction
- `expectations`: Array of TestExpectation
- `metadata`: TestMetadata

**Validation Rules**:
- `selector` must be valid CSS selector
- `actions` array must contain at least one action
- `expectations` array must contain at least one expectation

### TestAction
User interaction or system action to perform during test.

**Fields**:
- `type`: Action type (click|type|hover|wait|screenshot|navigate)
- `target`: Element selector or URL
- `value`: Input value (for type actions)
- `timeout`: Maximum wait time in milliseconds
- `options`: Action-specific configuration

**Validation Rules**:
- `type` must be one of: click, type, hover, wait, screenshot, navigate
- `timeout` must be positive integer (default: 5000)
- `target` required for click, type, hover actions
- `value` required for type actions

### TestExpectation
Expected outcome or validation criteria.

**Fields**:
- `type`: Expectation type (visible|enabled|text|attribute|accessible|count)
- `target`: Element selector or value to check
- `operator`: Comparison operator (equals|contains|greater|less)
- `value`: Expected value
- `tolerance`: Allowed variance for numeric comparisons

**Validation Rules**:
- `type` must be one of: visible, enabled, text, attribute, accessible, count
- `operator` defaults to 'equals' if not specified
- `tolerance` only applies to numeric comparisons

### TestResult
Outcome of a test execution including pass/fail status and actionable feedback.

**Fields**:
- `testId`: Reference to executed Test
- `status`: Result status (passed|failed|skipped|error)
- `duration`: Execution time in milliseconds
- `screenshots`: Array of ScreenshotReference (for visual tests)
- `violations`: Array of AccessibilityViolation (for accessibility tests)
- `errors`: Array of TestError
- `metadata`: ResultMetadata

**Validation Rules**:
- `status` must be one of: passed, failed, skipped, error
- `duration` must be non-negative
- `screenshots` required for visual test types

### VisualBaseline
Reference screenshots used for comparison in visual regression testing.

**Fields**:
- `id`: Unique identifier
- `testId`: Reference to associated Test
- `imagePath`: File path to baseline image
- `hash`: Content hash for change detection
- `viewport`: Viewport dimensions
- `theme`: Theme variant (light|dark)
- `approvedBy`: User who approved baseline
- `approvedAt`: Timestamp of approval
- `version`: Baseline version number (default: 1)
- `status`: Approval status (draft|approved|expired|rejected)
- `changeReason`: Description of changes for version tracking

**Validation Rules**:
- `imagePath` must reference existing file
- `viewport` must contain width and height
- `theme` must be one of: light, dark
- `version` must be positive integer
- `status` must be one of: draft, approved, expired, rejected
- `approvedAt` required when status is 'approved'
- `changeReason` required when version > 1

### AccessibilityReport
Detailed findings from WCAG compliance checks.

**Fields**:
- `testId`: Reference to associated Test
- `violations`: Array of AccessibilityViolation
- `passes`: Array of AccessibilityPass
- `incomplete`: Array of AccessibilityIncomplete
- `score`: Overall accessibility score (0-100)
- `wcagLevel`: WCAG compliance level tested

**Validation Rules**:
- `score` must be between 0 and 100
- `wcagLevel` must be 'WCAG 2.1 Level AA'

### AccessibilityViolation
Individual accessibility issue found during testing.

**Fields**:
- `id`: Unique identifier
- `ruleId`: WCAG rule identifier
- `impact`: Impact level (critical|serious|moderate|minor)
- `description`: Human-readable description
- `help`: Help text for fixing the issue
- `helpUrl`: URL to detailed documentation
- `selector`: CSS selector for affected element
- `html`: HTML snippet of the element

**Validation Rules**:
- `impact` must be one of: critical, serious, moderate, minor
- `selector` must be valid CSS selector
- `ruleId` must reference valid WCAG rule

## Supporting Entities

### TestSuiteConfiguration
Configuration settings for test suite execution.

**Fields**:
- `viewport`: ViewportConfiguration
- `theme`: ThemeConfiguration
- `timeout`: Default timeout in milliseconds
- `retries`: Number of retry attempts
- `parallel`: Boolean for parallel execution
- `reporting`: ReportingConfiguration

### ViewportConfiguration
Viewport settings for responsive testing.

**Fields**:
- `width`: Viewport width in pixels (default: 1280, min: 320)
- `height`: Viewport height in pixels (default: 720, min: 240)
- `deviceScaleFactor`: Device pixel ratio (default: 1, range: 1-3)
- `isMobile`: Boolean for mobile emulation (default: false)
- `hasTouch`: Boolean for touch support (default: false)

**Validation Rules**:
- Width must be between 320 and 3840 pixels
- Height must be between 240 and 2160 pixels
- Device scale factor must be between 1 and 3
- Mobile emulation requires touch support to be true

### ThemeConfiguration
Theme testing configuration.

**Fields**:
- `modes`: Array of theme modes to test (default: ['light', 'dark'])
- `selectors`: CSS selectors for theme detection (default: {'light': '[data-theme="light"]', 'dark': '[data-theme="dark"]'})
- `transitions`: Boolean to test theme transitions (default: false)

**Validation Rules**:
- Modes must contain at least one theme mode
- Only 'light' and 'dark' theme modes are supported
- Selectors must be valid CSS selector syntax

### ReportingConfiguration
Test reporting settings.

**Fields**:
- `format`: Output format (default: 'json', enum: ['json', 'html', 'junit'])
- `aiOptimized`: Boolean for AI-friendly formatting (default: true)
- `includeScreenshots`: Boolean to include screenshots in reports (default: false)
- `verbosity`: Detail level (default: 'normal', enum: ['minimal', 'normal', 'detailed'])

**Validation Rules**:
- Format must be one of supported output formats
- AI optimization requires JSON format
- Screenshots inclusion increases report size significantly
- Verbosity levels control detail depth in error messages

## State Transitions

### Test Execution States
1. **Pending**: Test queued for execution
2. **Running**: Test currently executing
3. **Completed**: Test finished with results
4. **Failed**: Test execution error

### Baseline Management States
1. **Draft**: New baseline captured awaiting approval
2. **Approved**: Baseline approved for comparison (can be expired)
3. **Expired**: Baseline marked as needing refresh after UI changes
4. **Rejected**: Baseline replaced by new version with change reason

**State Transitions**:
- Draft → Approved: Manual approval with user signature
- Approved → Expired: Manual expiration after UI updates
- Approved → Rejected: Manual rejection with reason
- Expired → Draft: New capture with incremented version
- Rejected → Draft: New capture with incremented version
- Any → Approved: Requires manual review and approval

**Approval Workflow**:
- Visual diff interface for comparing baselines
- Change reason documentation for version tracking
- Email/notification system for approval requests
- Rollback capability to previous approved versions

## Relationships

### Entity Relationships
- TestSuite (1) → (*) Test
- Test (1) → (*) TestAction
- Test (1) → (*) TestExpectation
- Test (1) → (1) TestResult
- Test (0..1) → (*) VisualBaseline
- Test (1) → (0..1) AccessibilityReport
- TestResult (1) → (*) ScreenshotReference
- AccessibilityReport (1) → (*) AccessibilityViolation

### Data Flow
1. TestSuite defines collection of related tests
2. Test contains actions to perform and expectations to validate
3. TestResult captures execution outcome and metrics
4. VisualBaseline provides reference images for comparison
5. AccessibilityReport documents WCAG compliance findings

## Validation Constraints

### Data Integrity
- All foreign key references must be valid
- Required fields cannot be null or empty
- Enumerated values must match predefined sets
- Numeric values must be within valid ranges

### Business Rules
- Visual baselines must be approved before use in comparisons
- Accessibility tests must validate against WCAG 2.1 Level AA
- Test execution must not exceed configured timeout
- Screenshot capture must respect privacy constraints

---

**Data Model Complete**: All entities defined with validation rules and relationships. Ready for implementation.