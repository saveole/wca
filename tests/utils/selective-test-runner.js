/**
 * Selective Test Runner for Changed Files
 *
 * Provides intelligent test selection based on file changes to optimize
 * development workflow performance. Analyzes file dependencies and executes
 * only affected tests to reduce test execution time during development.
 *
 * Features:
 * - Git-based change detection
 * - Dependency analysis and impact mapping
 * - Test-file relationship tracking
 * - Smart test selection algorithms
 * - Performance impact reporting
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SelectiveTestRunner {
  constructor(options = {}) {
    this.options = {
      // Git configuration
      gitPath: options.gitPath || 'git',
      compareBranch: options.compareBranch || 'main',
      includeUncommitted: options.includeUncommitted !== false,

      // Analysis settings
      enableDependencyAnalysis: options.enableDependencyAnalysis !== false,
      enableImpactMapping: options.enableImpactMapping !== false,
      maxAnalysisDepth: options.maxAnalysisDepth || 5,

      // Performance settings
      cacheTestFileRelationships: options.cacheTestFileRelationships !== false,
      enableParallelAnalysis: options.enableParallelAnalysis !== false,

      // Output settings
      verboseLogging: options.verboseLogging || false,
      generateReport: options.generateReport !== false,

      ...options
    };

    // Initialize state
    this.testFileMap = new Map();
    this.dependencyGraph = new Map();
    this.impactCache = new Map();
    this.changeAnalysis = null;

    // Initialize analyzer
    this.initialize();
  }

  /**
   * Initialize selective test runner
   */
  initialize() {
    if (this.options.cacheTestFileRelationships) {
      this.loadTestFileRelationships();
    }

    if (this.options.verboseLogging) {
      console.log('Selective test runner initialized');
    }
  }

  /**
   * Load test-file relationships from cache
   */
  loadTestFileRelationships() {
    try {
      const cacheFile = path.join(process.cwd(), 'test-results', 'test-file-map.json');
      if (fs.existsSync(cacheFile)) {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        this.testFileMap = new Map(cached.testFileMap || []);
        this.dependencyGraph = new Map(cached.dependencyGraph || []);

        if (this.options.verboseLogging) {
          console.log(`Loaded ${this.testFileMap.size} test-file relationships from cache`);
        }
      }
    } catch (error) {
      if (this.options.verboseLogging) {
        console.warn('Failed to load test file relationships:', error.message);
      }
    }
  }

  /**
   * Save test-file relationships to cache
   */
  saveTestFileRelationships() {
    if (!this.options.cacheTestFileRelationships) return;

    try {
      const cacheDir = path.join(process.cwd(), 'test-results');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const cacheFile = path.join(cacheDir, 'test-file-map.json');
      const cached = {
        testFileMap: Array.from(this.testFileMap.entries()),
        dependencyGraph: Array.from(this.dependencyGraph.entries()),
        timestamp: Date.now()
      };

      fs.writeFileSync(cacheFile, JSON.stringify(cached, null, 2));

      if (this.options.verboseLogging) {
        console.log(`Saved ${this.testFileMap.size} test-file relationships to cache`);
      }
    } catch (error) {
      if (this.options.verboseLogging) {
        console.warn('Failed to save test file relationships:', error.message);
      }
    }
  }

  /**
   * Get changed files since comparison branch
   */
  getChangedFiles() {
    try {
      let command = `${this.options.gitPath} diff --name-only ${this.options.compareBranch}`;

      if (this.options.includeUncommitted) {
        command += ' && git diff --name-only && git diff --cached --name-only';
      }

      const output = execSync(command, { encoding: 'utf8' });
      const files = output.split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      return {
        success: true,
        files: [...new Set(files)], // Remove duplicates
        count: files.length
      };

    } catch (error) {
      console.error('Failed to get changed files:', error.message);
      return {
        success: false,
        error: error.message,
        files: [],
        count: 0
      };
    }
  }

  /**
   * Analyze file dependencies and build relationship map
   */
  async analyzeFileDependencies() {
    const testFiles = this.discoverTestFiles();
    const sourceFiles = this.discoverSourceFiles();

    if (this.options.verboseLogging) {
      console.log(`Analyzing dependencies for ${testFiles.length} test files and ${sourceFiles.length} source files`);
    }

    // Build test-file relationships
    for (const testFile of testFiles) {
      const dependencies = await this.extractTestDependencies(testFile, sourceFiles);
      this.testFileMap.set(testFile, dependencies);
    }

    // Build dependency graph
    this.buildDependencyGraph(sourceFiles);

    // Save to cache
    this.saveTestFileRelationships();

    return {
      testFiles: testFiles.length,
      sourceFiles: sourceFiles.length,
      relationships: this.testFileMap.size,
      dependencies: this.dependencyGraph.size
    };
  }

  /**
   * Discover test files in the project
   */
  discoverTestFiles() {
    const testFiles = [];
    const testDirectories = ['tests', 'test', '__tests__'];

    for (const dir of testDirectories) {
      if (fs.existsSync(dir)) {
        this.findFiles(dir, testFiles, /\.(test|spec)\.js$/);
      }
    }

    return testFiles;
  }

  /**
   * Discover source files in the project
   */
  discoverSourceFiles() {
    const sourceFiles = [];
    const sourceDirectories = ['src', 'lib', 'ui'];

    for (const dir of sourceDirectories) {
      if (fs.existsSync(dir)) {
        this.findFiles(dir, sourceFiles, /\.js$/);
      }
    }

    return sourceFiles;
  }

  /**
   * Recursively find files matching pattern
   */
  findFiles(dir, results, pattern) {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory() && !item.name.startsWith('.')) {
        this.findFiles(fullPath, results, pattern);
      } else if (item.isFile() && pattern.test(item.name)) {
        results.push(fullPath);
      }
    }
  }

  /**
   * Extract dependencies from test file
   */
  async extractTestDependencies(testFile, sourceFiles) {
    try {
      const content = fs.readFileSync(testFile, 'utf8');
      const dependencies = new Set();

      // Extract require/import statements
      const requireMatches = content.match(/require\(['"`]([^'"`]+)['"`]\)/g) || [];
      const importMatches = content.match(/import\s+(?:.*\s+from\s+)?['"`]([^'"`]+)['"`]/g) || [];

      // Process require statements
      for (const match of requireMatches) {
        const requirePath = match.match(/require\(['"`]([^'"`]+)['"`]\)/)[1];
        const resolvedPath = this.resolveRequirePath(requirePath, path.dirname(testFile));
        if (resolvedPath && sourceFiles.includes(resolvedPath)) {
          dependencies.add(resolvedPath);
        }
      }

      // Process import statements
      for (const match of importMatches) {
        const importPath = match.match(/['"`]([^'"`]+)['"`]/)[1];
        const resolvedPath = this.resolveRequirePath(importPath, path.dirname(testFile));
        if (resolvedPath && sourceFiles.includes(resolvedPath)) {
          dependencies.add(resolvedPath);
        }
      }

      // Extract file paths from test descriptions and comments
      const fileReferences = content.match(/['"`]([^'"`]*\.(js|html|css|json)['"`])/g) || [];
      for (const ref of fileReferences) {
        const filePath = ref.match(/['"`]([^'"`]+)['"`]/)[1];
        const resolvedPath = path.resolve(path.dirname(testFile), filePath);
        if (sourceFiles.includes(resolvedPath)) {
          dependencies.add(resolvedPath);
        }
      }

      return Array.from(dependencies);

    } catch (error) {
      if (this.options.verboseLogging) {
        console.warn(`Failed to extract dependencies from ${testFile}:`, error.message);
      }
      return [];
    }
  }

  /**
   * Resolve require/import path to file system path
   */
  resolveRequirePath(requirePath, currentDir) {
    // Handle relative paths
    if (requirePath.startsWith('./') || requirePath.startsWith('../')) {
      return path.resolve(currentDir, requirePath);
    }

    // Handle absolute paths (rare in tests)
    if (requirePath.startsWith('/')) {
      return requirePath;
    }

    // Handle module paths (simplified - in reality would use node_modules resolution)
    const possiblePaths = [
      path.resolve(currentDir, requirePath),
      path.resolve(currentDir, requirePath + '.js'),
      path.resolve(currentDir, requirePath, 'index.js'),
      path.resolve(process.cwd(), 'node_modules', requirePath),
      path.resolve(process.cwd(), requirePath),
      path.resolve(process.cwd(), requirePath + '.js')
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }

    return null;
  }

  /**
   * Build dependency graph between source files
   */
  buildDependencyGraph(sourceFiles) {
    for (const sourceFile of sourceFiles) {
      const dependencies = this.extractSourceDependencies(sourceFile, sourceFiles);
      this.dependencyGraph.set(sourceFile, dependencies);
    }
  }

  /**
   * Extract dependencies from source file
   */
  extractSourceDependencies(sourceFile, allSourceFiles) {
    try {
      const content = fs.readFileSync(sourceFile, 'utf8');
      const dependencies = new Set();

      // Extract require/import statements
      const requireMatches = content.match(/require\(['"`]([^'"`]+)['"`]\)/g) || [];
      const importMatches = content.match(/import\s+(?:.*\s+from\s+)?['"`]([^'"`]+)['"`]/g) || [];

      // Process all imports/requires
      for (const match of [...requireMatches, ...importMatches]) {
        const importPath = match.match(/['"`]([^'"`]+)['"`]/)[1];
        const resolvedPath = this.resolveRequirePath(importPath, path.dirname(sourceFile));
        if (resolvedPath && allSourceFiles.includes(resolvedPath)) {
          dependencies.add(resolvedPath);
        }
      }

      return Array.from(dependencies);

    } catch (error) {
      return [];
    }
  }

  /**
   * Analyze changes and determine affected tests
   */
  async analyzeChanges() {
    // Get changed files
    const changedFilesResult = this.getChangedFiles();
    if (!changedFilesResult.success) {
      throw new Error(`Failed to get changed files: ${changedFilesResult.error}`);
    }

    const changedFiles = changedFilesResult.files;

    if (changedFiles.length === 0) {
      return {
        hasChanges: false,
        changedFiles: [],
        affectedTests: [],
        analysis: {
          totalFiles: 0,
          changedFiles: 0,
          affectedTests: 0,
          analysisTime: 0
        }
      };
    }

    const startTime = Date.now();

    // Ensure we have dependency analysis
    if (this.testFileMap.size === 0) {
      await this.analyzeFileDependencies();
    }

    // Find affected tests
    const affectedTests = this.findAffectedTests(changedFiles);

    // Calculate impact metrics
    const impact = this.calculateImpact(changedFiles, affectedTests);

    const analysisTime = Date.now() - startTime;

    this.changeAnalysis = {
      hasChanges: true,
      changedFiles,
      affectedTests,
      impact,
      analysis: {
        totalFiles: this.testFileMap.size + this.dependencyGraph.size,
        changedFiles: changedFiles.length,
        affectedTests: affectedTests.length,
        analysisTime
      }
    };

    return this.changeAnalysis;
  }

  /**
   * Find tests affected by changed files
   */
  findAffectedTests(changedFiles) {
    const affectedTests = new Set();

    // Direct relationships (tests that import changed files)
    for (const [testFile, dependencies] of this.testFileMap.entries()) {
      for (const dependency of dependencies) {
        if (changedFiles.includes(dependency)) {
          affectedTests.add(testFile);
          break;
        }
      }
    }

    // Indirect relationships (through dependency graph)
    if (this.options.enableImpactMapping) {
      const indirectlyAffected = this.findIndirectlyAffectedTests(changedFiles);
      indirectlyAffected.forEach(test => affectedTests.add(test));
    }

    // Test files that were directly changed
    for (const changedFile of changedFiles) {
      if (this.testFileMap.has(changedFile) || changedFile.match(/\.(test|spec)\.js$/)) {
        affectedTests.add(changedFile);
      }
    }

    return Array.from(affectedTests);
  }

  /**
   * Find indirectly affected tests through dependency graph
   */
  findIndirectlyAffectedTests(changedFiles) {
    const affectedTests = new Set();
    const visited = new Set();
    const queue = [...changedFiles];

    // Traverse dependency graph to find transitive dependencies
    while (queue.length > 0) {
      const currentFile = queue.shift();

      if (visited.has(currentFile)) continue;
      visited.add(currentFile);

      // Find tests that depend on this file
      for (const [testFile, dependencies] of this.testFileMap.entries()) {
        if (dependencies.includes(currentFile)) {
          affectedTests.add(testFile);
        }
      }

      // Add dependent files to queue
      const dependents = this.getDependents(currentFile);
      for (const dependent of dependents) {
        if (!visited.has(dependent)) {
          queue.push(dependent);
        }
      }
    }

    return Array.from(affectedTests);
  }

  /**
   * Get files that depend on the given file
   */
  getDependents(file) {
    const dependents = [];

    for (const [sourceFile, dependencies] of this.dependencyGraph.entries()) {
      if (dependencies.includes(file)) {
        dependents.push(sourceFile);
      }
    }

    return dependents;
  }

  /**
   * Calculate impact metrics
   */
  calculateImpact(changedFiles, affectedTests) {
    const totalTests = this.testFileMap.size;
    const affectedCount = affectedTests.length;
    const changedCount = changedFiles.length;

    return {
      changeRatio: totalTests > 0 ? (changedCount / (this.testFileMap.size + this.dependencyGraph.size)) * 100 : 0,
      testImpactRatio: totalTests > 0 ? (affectedCount / totalTests) * 100 : 0,
      efficiency: changedCount > 0 ? (totalTests - affectedCount) / totalTests * 100 : 100,
      severity: this.calculateSeverity(changedCount, affectedCount)
    };
  }

  /**
   * Calculate severity level
   */
  calculateSeverity(changedFiles, affectedTests) {
    const totalTests = this.testFileMap.size;

    if (affectedTests === 0) return 'none';
    if (affectedTests / totalTests > 0.5) return 'high';
    if (affectedTests / totalTests > 0.2) return 'medium';
    return 'low';
  }

  /**
   * Get selective test execution command
   */
  getExecutionCommand(testFramework = 'jest') {
    if (!this.changeAnalysis || !this.changeAnalysis.hasChanges) {
      return null;
    }

    const affectedTests = this.changeAnalysis.affectedTests;

    if (affectedTests.length === 0) {
      return 'echo "No tests to run - no relevant changes detected"';
    }

    // Generate test pattern for the framework
    const testPattern = this.generateTestPattern(affectedTests, testFramework);

    return this.generateTestCommand(testPattern, testFramework);
  }

  /**
   * Generate test pattern for different frameworks
   */
  generateTestPattern(testFiles, framework) {
    switch (framework.toLowerCase()) {
      case 'jest':
        return testFiles.map(f => f.replace(/\.(test|spec)\.js$/, '')).join('|');

      case 'mocha':
        return testFiles.join(' ');

      case 'playwright':
        return testFiles.map(f => f.replace(/^tests\//, '')).join(',');

      default:
        return testFiles.join(' ');
    }
  }

  /**
   * Generate test command for different frameworks
   */
  generateTestCommand(testPattern, framework) {
    switch (framework.toLowerCase()) {
      case 'jest':
        return `npm test -- --testNamePattern="${testPattern}"`;

      case 'mocha':
        return `npm test -- ${testPattern}`;

      case 'playwright':
        return `npx playwright test ${testPattern}`;

      default:
        return `npm test -- ${testPattern}`;
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    if (!this.changeAnalysis) {
      return { error: 'No analysis available. Run analyzeChanges() first.' };
    }

    const analysis = this.changeAnalysis;
    const report = {
      summary: {
        hasChanges: analysis.hasChanges,
        changedFiles: analysis.changedFiles.length,
        affectedTests: analysis.affectedTests.length,
        efficiency: analysis.impact.efficiency.toFixed(1) + '%',
        severity: analysis.impact.severity
      },
      changedFiles: analysis.changedFiles,
      affectedTests: analysis.affectedTests,
      impact: analysis.impact,
      analysis: analysis.analysis,
      recommendations: this.generateRecommendations(analysis),
      execution: this.getExecutionCommand()
    };

    return report;
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.affectedTests.length === 0) {
      recommendations.push('No tests need to run - changes are in non-test files');
    } else if (analysis.impact.efficiency > 80) {
      recommendations.push('High efficiency - running minimal test suite');
    } else if (analysis.impact.efficiency < 50) {
      recommendations.push('Consider refactoring to improve test isolation');
    }

    if (analysis.impact.severity === 'high') {
      recommendations.push('Large number of changes detected - consider running full test suite');
    }

    if (analysis.changedFiles.length > 10) {
      recommendations.push('Many files changed - consider breaking into smaller commits');
    }

    return recommendations;
  }

  /**
   * Execute selective test run
   */
  async executeTests(testFramework = 'jest') {
    const analysis = await this.analyzeChanges();

    if (!analysis.hasChanges || analysis.affectedTests.length === 0) {
      return {
        success: true,
        message: 'No tests to run - no relevant changes detected',
        testsRun: 0,
        executionTime: 0
      };
    }

    const command = this.getExecutionCommand(testFramework);
    const startTime = Date.now();

    try {
      const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        command,
        output,
        testsRun: analysis.affectedTests.length,
        executionTime,
        analysis
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        command,
        error: error.message,
        output: error.stdout || error.stderr,
        testsRun: analysis.affectedTests.length,
        executionTime,
        analysis
      };
    }
  }

  /**
   * Clear cache and rebuild relationships
   */
  clearCache() {
    this.testFileMap.clear();
    this.dependencyGraph.clear();
    this.impactCache.clear();
    this.changeAnalysis = null;

    // Remove cache file
    const cacheFile = path.join(process.cwd(), 'test-results', 'test-file-map.json');
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }

    if (this.options.verboseLogging) {
      console.log('Cache cleared');
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      ready: this.testFileMap.size > 0,
      testFiles: this.testFileMap.size,
      sourceFiles: this.dependencyGraph.size,
      cached: this.options.cacheTestFileRelationships,
      hasAnalysis: this.changeAnalysis !== null,
      lastAnalysis: this.changeAnalysis ? this.changeAnalysis.analysis.analysisTime : null
    };
  }
}

/**
 * Create singleton instance for easy import
 */
const selectiveTestRunner = new SelectiveTestRunner();

/**
 * Export utilities for different use cases
 */
module.exports = {
  SelectiveTestRunner,
  selectiveTestRunner,

  /**
   * Quick access methods for common operations
   */
  analyzeChanges: () => selectiveTestRunner.analyzeChanges(),
  getAffectedTests: () => selectiveTestRunner.analyzeChanges().then(a => a.affectedTests),
  executeTests: (framework) => selectiveTestRunner.executeTests(framework),
  generateReport: () => selectiveTestRunner.generateReport(),
  clearCache: () => selectiveTestRunner.clearCache(),
  getStatus: () => selectiveTestRunner.getStatus()
};