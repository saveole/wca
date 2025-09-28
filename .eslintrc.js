// ESLint Configuration for WebClip Assistant UI Testing

import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Playwright test globals
        test: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',

        // Chrome extension globals
        chrome: 'readonly',
        browser: 'readonly',

        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',

        // Test utilities
        console: 'writable',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },

    rules: {
      // Best practices
      'no-unused-vars': ['error', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }],
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',

      // Playwright-specific rules
      'no-empty-function': 'off', // Allow empty test functions
      'no-throw-literal': 'warn', // Allow throwing strings in tests

      // Chrome extension specific
      'no-undef': 'error', // Catch undefined variables early

      // Test-specific relaxations
      'max-lines-per-function': 'off', // Tests can be long
      'complexity': 'off', // Tests can be complex

      // Code quality
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Async/await
      'require-await': 'off', // Allow async functions without await in tests
      'no-return-await': 'off' // Allow return await for clarity in tests
    },

    // Environment-specific settings
    env: {
      browser: true,
      node: true,
      es2022: true
    },

    // File patterns
    ignores: [
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      '.cache/**',
      'tests/ui/visual/baseline/**',
      'tests/ui/visual/current/**'
    ]
  }
];