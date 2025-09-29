/**
 * Test Script Executor with Error Handling
 *
 * Provides robust test script execution with comprehensive error handling,
 * logging, and status reporting. Ensures reliable test execution across
 * different environments and scenarios.
 *
 * Features:
 * - Graceful error handling and recovery
 * - Detailed logging and status reporting
 * - Environment-aware configuration
 * - Process management and cleanup
 * - Test timeout handling
 * - Resource usage monitoring
 * - Exit code management
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestScriptExecutor {
  constructor(options = {}) {
    this.options = {
      defaultTimeout: 300000, // 5 minutes
      enableLogging: true,
      logLevel: 'info',
      enableMonitoring: true,
      ...options
    };

    this.logFile = path.join(process.cwd(), 'test-execution.log');
    this.currentProcess = null;
    this.executionId = this.generateExecutionId();
  }

  /**
   * Generate unique execution ID
   */
  generateExecutionId() {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Execute test script with proper error handling
   */
  async executeScript(scriptCommand, options = {}) {
    const execOptions = {
      cwd: process.cwd(),
      timeout: options.timeout || this.options.defaultTimeout,
      env: { ...process.env, ...options.env },
      stdio: 'pipe',
      ...options
    };

    this.log(`Starting execution: ${scriptCommand}`, 'info');

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = '';
      let errorOutput = '';

      // Create child process
      this.currentProcess = spawn(scriptCommand, [], {
        shell: true,
        ...execOptions
      });

      // Setup monitoring if enabled
      let monitoringInterval = null;
      if (this.options.enableMonitoring) {
        monitoringInterval = setInterval(() => {
          this.monitorProcess(this.currentProcess);
        }, 5000);
      }

      // Handle stdout
      this.currentProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;

        if (this.options.enableLogging) {
          process.stdout.write(chunk);
        }

        this.logChunk(chunk, 'stdout');
      });

      // Handle stderr
      this.currentProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;

        if (this.options.enableLogging) {
          process.stderr.write(chunk);
        }

        this.logChunk(chunk, 'stderr');
      });

      // Handle process completion
      this.currentProcess.on('close', (code, signal) => {
        const endTime = Date.now();
        const executionTime = endTime - startTime;

        // Cleanup monitoring
        if (monitoringInterval) {
          clearInterval(monitoringInterval);
        }

        const result = {
          executionId: this.executionId,
          command: scriptCommand,
          exitCode: code,
          signal,
          executionTime,
          output,
          errorOutput,
          success: code === 0,
          timestamp: new Date().toISOString()
        };

        this.log(`Execution completed: ${scriptCommand} (exit code: ${code}, time: ${executionTime}ms)`, 'info');

        if (code === 0) {
          resolve(result);
        } else {
          const error = new Error(`Script execution failed with exit code ${code}`);
          error.details = result;
          reject(error);
        }
      });

      // Handle process error
      this.currentProcess.on('error', (error) => {
        const endTime = Date.now();
        const executionTime = endTime - startTime;

        // Cleanup monitoring
        if (monitoringInterval) {
          clearInterval(monitoringInterval);
        }

        this.log(`Process error: ${error.message}`, 'error');

        const result = {
          executionId: this.executionId,
          command: scriptCommand,
          exitCode: -1,
          executionTime,
          output,
          errorOutput,
          error: error.message,
          success: false,
          timestamp: new Date().toISOString()
        };

        error.details = result;
        reject(error);
      });

      // Handle timeout
      if (execOptions.timeout) {
        setTimeout(() => {
          if (this.currentProcess && !this.currentProcess.killed) {
            this.log(`Process timeout after ${execOptions.timeout}ms`, 'warn');
            this.currentProcess.kill('SIGTERM');

            // Force kill after grace period
            setTimeout(() => {
              if (this.currentProcess && !this.currentProcess.killed) {
                this.currentProcess.kill('SIGKILL');
              }
            }, 5000);
          }
        }, execOptions.timeout);
      }
    });
  }

  /**
   * Monitor process health and resource usage
   */
  monitorProcess(process) {
    if (!process || process.killed) return;

    try {
      // Get process stats if available
      const pid = process.pid;
      const stats = this.getProcessStats(pid);

      if (stats) {
        this.log(`Process ${pid} stats: CPU=${stats.cpu}%, Memory=${stats.memory}MB`, 'debug');

        // Check for resource limits
        if (stats.memory > 1024) { // 1GB
          this.log(`High memory usage detected: ${stats.memory}MB`, 'warn');
        }

        if (stats.cpu > 90) {
          this.log(`High CPU usage detected: ${stats.cpu}%`, 'warn');
        }
      }
    } catch (error) {
      this.log(`Process monitoring error: ${error.message}`, 'debug');
    }
  }

  /**
   * Get process statistics (Unix-like systems)
   */
  getProcessStats(pid) {
    try {
      if (process.platform === 'win32') {
        return null; // Windows implementation would be different
      }

      // Read process status from /proc
      const statPath = `/proc/${pid}/stat`;
      if (!fs.existsSync(statPath)) {
        return null;
      }

      const statContent = fs.readFileSync(statPath, 'utf8');
      const stats = statContent.split(' ');

      const utime = parseInt(stats[13]);
      const stime = parseInt(stats[14]);
      const totalTime = utime + stime;

      // Get memory info
      const statusPath = `/proc/${pid}/status`;
      const statusContent = fs.readFileSync(statusPath, 'utf8');
      const memoryMatch = statusContent.match(/VmRSS:\\s+(\\d+)\\s+kB/);

      return {
        cpu: totalTime,
        memory: memoryMatch ? Math.round(parseInt(memoryMatch[1]) / 1024) : 0
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Execute npm script with enhanced error handling
   */
  async executeNpmScript(scriptName, options = {}) {
    const command = `npm run ${scriptName}`;
    const scriptOptions = {
      ...options,
      env: {
        CI: process.env.CI || 'false',
        NODE_ENV: process.env.NODE_ENV || 'test',
        ...options.env
      }
    };

    return this.executeScript(command, scriptOptions);
  }

  /**
   * Execute Playwright test with custom configuration
   */
  async executePlaywrightTest(testPath, options = {}) {
    const args = [];

    // Build command arguments
    if (options.headless !== undefined) {
      args.push(options.headless ? '--headed=false' : '--headed=true');
    }

    if (options.browser) {
      args.push(`--browser=${options.browser}`);
    }

    if (options.reporter) {
      args.push(`--reporter=${options.reporter}`);
    }

    if (options.grep) {
      args.push(`--grep=${options.grep}`);
    }

    if (options.timeout) {
      args.push(`--timeout=${options.timeout}`);
    }

    if (options.workers) {
      args.push(`--workers=${options.workers}`);
    }

    const command = `npx playwright test ${testPath} ${args.join(' ')}`;
    return this.executeScript(command, options);
  }

  /**
   * Execute test suite with custom runner
   */
  async executeTestSuite(suiteType, options = {}) {
    const runnerPath = path.join(__dirname, '..', 'infrastructure', 'test-runner.js');
    const command = `node ${runnerPath} --type=${suiteType}`;

    return this.executeScript(command, options);
  }

  /**
   * Execute parallel test suite
   */
  async executeParallelTests(options = {}) {
    const coordinatorPath = path.join(__dirname, '..', 'infrastructure', 'parallel-coordinator.js');
    const command = `node ${coordinatorPath}`;

    return this.executeScript(command, options);
  }

  /**
   * Log message with level
   */
  log(message, level = 'info') {
    if (!this.options.enableLogging) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.executionId}] ${message}`;

    // Write to console
    if (level === 'error') {
      console.error(logMessage);
    } else if (level === 'warn') {
      console.warn(logMessage);
    } else if (level === 'debug' && this.options.logLevel === 'debug') {
      console.log(logMessage);
    } else if (level === 'info') {
      console.log(logMessage);
    }

    // Write to log file
    this.writeToLogFile(logMessage);
  }

  /**
   * Log output chunk with context
   */
  logChunk(chunk, source) {
    if (!this.options.enableLogging) return;

    const lines = chunk.split('\\n').filter(line => line.trim());
    lines.forEach(line => {
      this.log(`[${source}] ${line}`, 'debug');
    });
  }

  /**
   * Write message to log file
   */
  writeToLogFile(message) {
    try {
      fs.appendFileSync(this.logFile, message + '\\n');
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }

  /**
   * Get execution status
   */
  getExecutionStatus() {
    return {
      executionId: this.executionId,
      isRunning: this.currentProcess !== null && !this.currentProcess.killed,
      pid: this.currentProcess ? this.currentProcess.pid : null,
      logFile: this.logFile
    };
  }

  /**
   * Stop current execution
   */
  stopExecution() {
    if (this.currentProcess && !this.currentProcess.killed) {
      this.log('Stopping execution...', 'info');
      this.currentProcess.kill('SIGTERM');

      // Force kill after grace period
      setTimeout(() => {
        if (this.currentProcess && !this.currentProcess.killed) {
          this.currentProcess.kill('SIGKILL');
        }
      }, 5000);

      return true;
    }

    return false;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopExecution();

    // Clean up log file if too large
    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size > 10 * 1024 * 1024) { // 10MB
          fs.unlinkSync(this.logFile);
        }
      }
    } catch (error) {
      this.log(`Cleanup error: ${error.message}`, 'warn');
    }
  }
}

/**
 * Create singleton instance for easy import
 */
const testScriptExecutor = new TestScriptExecutor();

/**
 * Export utilities for different use cases
 */
module.exports = {
  TestScriptExecutor,
  testScriptExecutor,

  /**
   * Quick access methods for common operations
   */
  executeScript: (command, options) => testScriptExecutor.executeScript(command, options),
  executeNpmScript: (scriptName, options) => testScriptExecutor.executeNpmScript(scriptName, options),
  executePlaywrightTest: (testPath, options) => testScriptExecutor.executePlaywrightTest(testPath, options),
  executeTestSuite: (suiteType, options) => testScriptExecutor.executeTestSuite(suiteType, options),
  executeParallelTests: (options) => testScriptExecutor.executeParallelTests(options),

  /**
   * Control methods
   */
  stopExecution: () => testScriptExecutor.stopExecution(),
  getExecutionStatus: () => testScriptExecutor.getExecutionStatus(),
  cleanup: () => testScriptExecutor.cleanup()
};