# Tasks: UI Testing Workflow for AI Coding Tools

**Input**: Design documents from `/specs/002-add-ui-testing/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Paths shown below assume single project structure from plan.md

## Phase 3.1: Setup & Configuration
- [X] T001 Create test directory structure per implementation plan
- [X] T002 Initialize package.json with Playwright, axe-core, pixelmatch dependencies
- [X] T003 [P] Configure Playwright config for Chrome extension testing
- [X] T004 [P] Create ESLint configuration for test files
- [X] T005 Create test configuration file with desktop viewports and theme settings

## Phase 3.2: Utility Development (Tests First)
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [X] T006 [P] Failing test for screenshot utility in tests/unit/test-screenshot-utils.test.js
- [X] T007 [P] Failing test for accessibility utility in tests/unit/test-accessibility-utils.test.js
- [X] T008 [P] Failing test for AI-optimized reporter in tests/unit/test-reporter.test.js
- [X] T009 [P] Failing test for configuration loader in tests/unit/test-config.test.js

## Phase 3.3: Utility Implementation
- [X] T010 [P] Implement screenshot comparison utility in tests/utils/screenshot-utils.js
- [X] T011 [P] Implement accessibility testing utility in tests/utils/accessibility-utils.js
- [X] T012 [P] Implement AI-friendly test reporter in tests/utils/reporter.js
- [X] T013 [P] Implement test configuration system in tests/utils/config.js
- [X] T014 [P] Implement baseline management utility in tests/utils/baseline-utils.js

## Phase 3.4: Error Handling Infrastructure
- [X] T015 [P] Implement comprehensive error handling utility in tests/utils/error-handler.js
- [X] T016 [P] Implement retry mechanism for flaky tests in tests/utils/retry-utils.js
- [X] T017 [P] Implement test timeout management in tests/utils/timeout-utils.js
- [X] T018 [P] Implement graceful failure modes for test execution
- [X] T019 [P] Implement user-friendly error message formatting

## Phase 3.5: Data Model Implementation
- [X] T020 [P] Implement TestSuite entity class in tests/models/TestSuite.js
- [X] T022 [P] Implement Test entity class in tests/models/Test.js
- [X] T023 [P] Implement TestAction entity class in tests/models/TestAction.js
- [X] T024 [P] Implement TestResult entity class in tests/models/TestResult.js
- [X] T025 [P] Implement VisualBaseline entity class in tests/models/VisualBaseline.js
- [X] T026 [P] Implement AccessibilityReport entity class in tests/models/AccessibilityReport.js

## Phase 3.6: Visual Regression Tests (Tests First)
**CRITICAL: These tests MUST be written and MUST FAIL before visual test implementation**
- [X] T027 [P] Failing visual test for popup rendering in tests/ui/visual/test-popup-visual.test.js
- [X] T028 [P] Failing visual test for settings page in tests/ui/visual/test-settings-visual.test.js
- [X] T029 [P] Failing visual test for theme consistency in tests/ui/visual/test-theme-visual.test.js

## Phase 3.7: Visual Regression Implementation
- [X] T030 [P] Implement popup visual regression test in tests/ui/visual/popup-visual.spec.js
- [X] T031 [P] Implement settings page visual regression test in tests/ui/visual/settings-visual.spec.js
- [X] T032 [P] Implement theme switching visual test in tests/ui/visual/theme-visual.spec.js
- [X] T033 [P] Implement baseline comparison system in tests/ui/visual/visual-comparison.js
- [X] T034 [P] Create baseline approval workflow utilities

## Phase 3.8: Accessibility Tests (Tests First)
**CRITICAL: These tests MUST be written and MUST FAIL before accessibility implementation**
- [X] T035 [P] Failing accessibility test for popup in tests/ui/accessibility/test-popup-a11y.test.js
- [X] T036 [P] Failing accessibility test for settings page in tests/ui/accessibility/test-settings-a11y.test.js
- [X] T037 [P] Failing accessibility test for keyboard navigation in tests/ui/accessibility/test-keyboard-nav.test.js

## Phase 3.9: Accessibility Implementation
- [X] T038 [P] Implement popup accessibility test in tests/ui/accessibility/popup-a11y.spec.js
- [X] T039 [P] Implement settings page accessibility test in tests/ui/accessibility/settings-a11y.spec.js
- [X] T040 [P] Implement keyboard navigation test in tests/ui/accessibility/keyboard-nav.spec.js
- [X] T041 [P] Implement WCAG 2.1 Level AA validation system
- [X] T042 [P] Implement accessibility violation reporting

## Phase 3.10: Interaction Tests (Tests First)
**CRITICAL: These tests MUST be written and MUST FAIL before interaction implementation**
- [X] T043 [P] Failing interaction test for popup buttons in tests/ui/interactions/test-popup-buttons.test.js
- [X] T044 [P] Failing interaction test for form validation in tests/ui/interactions/test-form-validation.test.js
- [X] T045 [P] Failing interaction test for theme toggle in tests/ui/interactions/test-theme-toggle.test.js

## Phase 3.11: Interaction Implementation
- [X] T046 [P] Implement popup button interaction test in tests/ui/interactions/popup-buttons.spec.js
- [X] T047 [P] Implement form validation interaction test in tests/ui/interactions/form-validation.spec.js
- [X] T048 [P] Implement theme toggle interaction test in tests/ui/interactions/theme-toggle.spec.js
- [X] T049 [P] Implement loading state interaction tests
- [X] T050 [P] Implement error state interaction tests

## Phase 3.12: AI Integration (Tests First)
**CRITICAL: These tests MUST be written and MUST FAIL before AI integration implementation**
- [X] T051 [P] Failing test for AI command parsing in tests/ai-workflow/test-command-parsing.test.js
- [X] T052 [P] Failing test for AI-friendly report generation in tests/ai-workflow/test-ai-reporting.test.js

## Phase 3.13: AI Integration Implementation
- [X] T053 [P] Implement AI command parser with structured command interface in tests/ai-workflow/command-parser.js
- [X] T054 [P] Implement AI-friendly test report generator with 80% success rate targeting
- [X] T055 [P] Create AI command structure documentation with exact CLI commands in tests/ai-workflow/commands.md
- [X] T056 [P] Create AI debugging guide with failure analysis patterns in tests/ai-workflow/debugging.md
- [X] T057 [P] Create AI test patterns documentation with common scenarios in tests/ai-workflow/patterns.md

## Phase 3.14: AI Command Structure Implementation
- [X] T058 [P] Implement CLI command for visual regression testing: `npm run test:visual -- --component=<name>`
- [X] T059 [P] Implement CLI command for accessibility testing: `npm run test:accessibility -- --url=<page>`
- [X] T060 [P] Implement CLI command for interaction testing: `npm run test:interactions -- --feature=<type>`
- [X] T061 [P] Implement CLI command for AI-optimized reporting: `npm run test:report -- --ai-optimized --format=json`
- [X] T062 [P] Implement AI result parsing logic with structured error analysis

## Phase 3.15: Fixtures and Mock Data
- [X] T063 [P] Create popup HTML fixture in tests/ui/fixtures/sample-popup.html
- [X] T064 [P] Create settings page HTML fixture in tests/ui/fixtures/sample-settings.html
- [X] T065 [P] Create mock response data in tests/ui/fixtures/mock-responses.js
- [X] T066 [P] Create test data utilities for consistent test setup

## Phase 3.15: Test Infrastructure
- [X] T062 [P] Implement custom test runner for Chrome extension testing
- [X] T063 [P] Implement test result aggregation and reporting
- [X] T064 [P] Implement test execution monitoring and timeout handling
- [X] T065 [P] Implement parallel test execution coordinator

## Phase 3.16: Package Configuration
- [X] T066 Create package.json test scripts for different test types
- [X] T067 Configure GitHub Actions workflow for CI/CD testing
- [X] T068 Configure test script execution with proper error handling
- [X] T069 Configure environment-specific test configurations

## Phase 3.17: Integration Tests
- [X] T070 [P] End-to-end test of complete visual regression workflow
- [X] T071 [P] End-to-end test of complete accessibility testing workflow
- [X] T072 [P] End-to-end test of complete interaction testing workflow
- [X] T073 [P] Integration test for AI tool command execution
- [X] T074 [P] Integration test for baseline approval workflow

## Phase 3.18: Performance Implementation and Optimization
- [X] T075 [P] Implement screenshot caching mechanism for repeated tests
- [X] T076 [P] Implement parallel test execution with worker pools
- [X] T077 [P] Implement selective test running based on changed files
- [X] T078 [P] Optimize baseline image comparison with lazy loading
- [X] T079 [P] Implement memory management for large test suites

## Phase 3.19: Performance Validation and Polish
- [X] T080 [P] Performance test for screenshot capture (<500ms target)
- [X] T081 [P] Performance test for test execution (<2s per component target)
- [X] T082 [P] Memory usage validation for large test suites
- [X] T083 [P] Test reliability improvements and flaky test mitigation
- [X] T084 [P] Comprehensive error handling and user-friendly error messages

## Phase 3.20: Documentation and Examples
- [X] T085 [P] Update quickstart.md with actual implementation details
- [X] T086 [P] Create example test files for common patterns
- [X] T087 [P] Create troubleshooting guide for common issues
- [X] T088 [P] Document AI integration commands and usage

## Dependencies
- Setup (T001-T005) before utility tests (T006-T009)
- Utility tests (T006-T009) before utility implementation (T010-T014)
- Utility implementation before visual tests (T027-T029)
- Data model (T021-T026) before visual implementation (T030-T034)
- Visual tests (T027-T029) before visual implementation (T030-T034)
- Accessibility tests (T035-T037) before accessibility implementation (T038-T042)
- Interaction tests (T043-T045) before interaction implementation (T046-T050)
- AI integration tests (T051-T052) before AI implementation (T053-T057)
- Performance implementation (T075-T079) before performance validation (T080-T082)
- All implementation before documentation (T085-T088)

## Parallel Example - Setup Phase
```
# Launch these setup tasks in parallel:
Task: "Configure Playwright config for Chrome extension testing"
Task: "Configure ESLint configuration for test files"
Task: "Create test configuration file with desktop viewports and theme settings"
```

## Parallel Example - Utility Tests
```
# Launch utility tests in parallel:
Task: "Failing test for screenshot utility in tests/unit/test-screenshot-utils.test.js"
Task: "Failing test for accessibility utility in tests/unit/test-accessibility-utils.test.js"
Task: "Failing test for AI-optimized reporter in tests/unit/test-reporter.test.js"
Task: "Failing test for configuration loader in tests/unit/test-config.test.js"
```

## Parallel Example - Contract Tests
```
# Launch contract tests in parallel:
Task: "Contract test POST /tests/suites in tests/contract/test-suites-post.test.js"
Task: "Contract test GET /tests/suites/{id} in tests/contract/test-suites-get.test.js"
Task: "Contract test POST /tests/execute in tests/contract/test-execute-post.test.js"
Task: "Contract test GET /tests/results/{id} in tests/contract/test-results-get.test.js"
Task: "Contract test POST /baselines/{testId} in tests/contract/test-baselines-post.test.js"
Task: "Contract test POST /accessibility/scan in tests/contract/test-accessibility-post.test.js"
```

## Parallel Example - Data Model Implementation
```
# Launch data model tasks in parallel:
Task: "Implement TestSuite entity class in tests/models/TestSuite.js"
Task: "Implement Test entity class in tests/models/Test.js"
Task: "Implement TestAction entity class in tests/models/TestAction.js"
Task: "Implement TestResult entity class in tests/models/TestResult.js"
Task: "Implement VisualBaseline entity class in tests/models/VisualBaseline.js"
Task: "Implement AccessibilityReport entity class in tests/models/AccessibilityReport.js"
```

## Parallel Example - Test Category Implementation
```
# Launch visual test implementation in parallel:
Task: "Implement popup visual regression test in tests/ui/visual/popup-visual.spec.js"
Task: "Implement settings page visual regression test in tests/ui/visual/settings-visual.spec.js"
Task: "Implement theme switching visual test in tests/ui/visual/theme-visual.spec.js"

# Launch accessibility test implementation in parallel:
Task: "Implement popup accessibility test in tests/ui/accessibility/popup-a11y.spec.js"
Task: "Implement settings page accessibility test in tests/ui/accessibility/settings-a11y.spec.js"
Task: "Implement keyboard navigation test in tests/ui/accessibility/keyboard-nav.spec.js"

# Launch interaction test implementation in parallel:
Task: "Implement popup button interaction test in tests/ui/interactions/popup-buttons.spec.js"
Task: "Implement form validation interaction test in tests/ui/interactions/form-validation.spec.js"
Task: "Implement theme toggle interaction test in tests/ui/interactions/theme-toggle.spec.js"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Each task specifies exact file path for implementation
- TDD approach: Tests must fail before implementation
- Chrome extension specific: Manifest V3 compliance, CSP rules
- AI integration focus: 80% success rate target for interpretation
- Desktop only: No mobile viewport testing required

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each endpoint → contract test task [P]
   - API specification → implementation tasks

2. **From Data Model**:
   - Each entity → model creation task [P]
   - Entity relationships → integration tasks

3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **From Research**:
   - Technology decisions → setup tasks
   - Best practices → implementation guidance

5. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution
   - TDD approach: Tests before implementation

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task
- [ ] Chrome extension compliance addressed
- [ ] AI integration requirements included
- [ ] Performance targets specified (<2s execution, <500ms screenshots)
- [ ] Accessibility (WCAG 2.1 Level AA) requirements covered