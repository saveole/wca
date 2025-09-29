
# Implementation Plan: UI Testing Workflow for AI Coding Tools

**Branch**: `002-add-ui-testing` | **Date**: 2025-09-28 | **Spec**: /home/ant/projects/wca/specs/002-add-ui-testing/spec.md
**Input**: Feature specification from `/specs/002-add-ui-testing/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Develop a comprehensive UI testing workflow for Chrome extension development with AI coding tools, providing visual regression testing, WCAG 2.1 Level AA accessibility validation, interactive component testing, and AI-interpretable test reports.

## Technical Context
**Language/Version**: JavaScript ES6+ (Chrome extension)
**Primary Dependencies**: Playwright (cross-browser testing), axe-core (accessibility), pixelmatch (visual regression)
**Storage**: Chrome Storage API for test configuration, file system for baseline screenshots
**Testing**: Direct Playwright integration with Chrome extension context
**Target Platform**: Chrome extension (Manifest V3)
**Project Type**: single (Chrome extension with testing infrastructure)
**Performance Goals**: <2s test execution time per component, <500ms screenshot capture
**Constraints**: Chrome extension permissions, CSP compliance, no external CDN dependencies
**Scale/Scope**: Chrome extension popup UI, settings page, theme switching, responsive design

### Test Execution Architecture
**Approach**: Direct Playwright integration within Chrome extension context
- Tests run as part of extension development workflow
- Playwright configured to test extension pages (chrome-extension:// protocol)
- No external API server - testing framework embedded in extension
- Test results generated locally and exposed to AI tools via file system

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. User Experience First ✅
- **Popup testing**: MUST validate <500ms load time
- **Core operations**: MUST validate 3-click workflow for test execution
- **Theme support**: MUST test dark/light mode consistency
- **Intuitive interface**: MUST validate test results are clear without documentation

### II. Security & Privacy First ✅
- **API keys**: MUST NOT store in test files, use environment variables
- **No sensitive data**: Screenshots MUST NOT capture personal information
- **HTTPS only**: All external test dependencies MUST use HTTPS
- **CSP compliance**: Test infrastructure MUST be Manifest V3 compliant
- **No inline scripts**: Test setup MUST use external files only

### III. Chrome Extension Standards Compliance ✅
- **Manifest V3**: Test infrastructure MUST follow V3 standards
- **Minimal permissions**: Test framework MUST use minimal required permissions
- **Content script injection**: Tests MUST validate page extraction functionality
- **Service worker pattern**: Tests MUST validate background task handling
- **Extension Context**: Tests MUST run within Chrome extension development environment
- **CSP Compliance**: Test files MUST NOT use inline scripts or external CDN dependencies

### IV. API Integration Reliability ✅
- **Error handling**: Tests MUST validate graceful failure modes
- **Async operations**: Tests MUST verify non-blocking behavior
- **User-friendly errors**: Test reports MUST be actionable for AI tools

### V. Export Flexibility ✅
- **Multiple formats**: Test reports MUST support multiple output formats
- **Configurable templates**: Test configuration MUST be user-customizable
- **Field mapping**: Test results MUST support configurable field mapping

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
tests/
├── ui/
│   ├── visual/              # Visual regression tests
│   │   ├── baseline/        # Reference screenshots
│   │   ├── current/         # Current screenshots for comparison
│   │   └── playback.js      # Visual test runner
│   ├── accessibility/       # WCAG 2.1 Level AA tests
│   │   ├── axe-tests.js     # axe-core integration tests
│   │   └── keyboard-nav.js  # Keyboard navigation tests
│   ├── interactions/        # Interactive component tests
│   │   ├── popup-tests.js   # Extension popup interactions
│   │   ├── settings-tests.js # Settings page functionality
│   │   └── theme-tests.js   # Dark/light mode tests
│   └── fixtures/           # Test data and mock responses
│       ├── sample-popup.html
│       └── mock-responses.js
├── utils/
│   ├── screenshot-utils.js  # Screenshot capture utilities
│   ├── reporter.js         # AI-friendly test reporter
│   └── config.js           # Test configuration
├── ai-workflow/
│   ├── commands.md         # Commands AI can run
│   ├── patterns.md         # Common test patterns
│   └── debugging.md       # Debug guide for AI tools
└── package.json            # Test dependencies and scripts
```

**Structure Decision**: Single project structure with dedicated UI testing folders integrated into existing Chrome extension codebase. Tests organized by type (visual, accessibility, interactions) with supporting utilities for AI tool integration.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart, API contracts)
- Each API endpoint → contract test task [P]
- Each entity → utility creation task [P]
- Each user story → integration test task
- Implementation tasks to make tests pass
- Configuration and setup tasks for test infrastructure

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Utilities → Configuration → Tests → Implementation
- Mark [P] for parallel execution (independent files)
- Group by functional area: setup → visual → accessibility → interactions → reporting

**Task Categories**:
1. **Setup & Configuration**: Install dependencies, create config files, establish structure
2. **Utility Development**: Screenshot utils, accessibility utils, reporting utils
3. **Test Infrastructure**: Test runners, baseline management, AI integration
4. **Visual Testing**: Screenshot capture, comparison, baseline management
5. **Accessibility Testing**: axe-core integration, WCAG validation, reporting
6. **Interaction Testing**: Component interactions, form validation, theme testing
7. **AI Integration**: Command parsing, report generation, debugging support
8. **Documentation & Integration**: Quickstart guide, CI/CD setup, examples

**Estimated Output**: 30-35 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
