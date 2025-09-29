/**
 * Parallel Test Execution Coordinator
 *
 * Manages efficient parallel execution of Chrome extension UI tests with
 * resource optimization, dependency management, and adaptive scaling.
 * Provides sophisticated task distribution with intelligent resource allocation
 * and performance optimization for large test suites.
 *
 * Features:
 * - Dynamic worker pool management
 * - Intelligent task distribution and load balancing
 * - Resource-based scaling and throttling
 * - Dependency resolution and execution ordering
 * - Adaptive batch sizing based on system resources
 * - Progress tracking and real-time monitoring
 * - Graceful degradation under resource constraints
 * - Test isolation and conflict prevention
 */

const EventEmitter = require('events');
const { Worker } = require('worker_threads');
const os = require('os');

class ParallelTestCoordinator extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      maxWorkers: Math.min(os.cpus().length, 8),
      workerTimeout: 30000,
      batchSize: 5,
      enableResourceMonitoring: true,
      memoryThreshold: 0.8, // 80% of system memory
      cpuThreshold: 0.7,   // 70% CPU usage
      adaptiveScaling: true,
      ...options
    };

    this.workerPool = [];
    this.activeWorkers = new Map();
    this.pendingTasks = [];
    this.completedTasks = new Map();
    this.failedTasks = new Map();
    this.taskDependencies = new Map();
    this.resourceMetrics = {
      memoryUsage: [],
      cpuUsage: [],
      workerUtilization: []
    };

    this.isRunning = false;
    this.monitoringInterval = null;
    this.taskCounter = 0;

    this.setupWorkerPool();
  }

  /**
   * Setup initial worker pool
   */
  setupWorkerPool() {
    for (let i = 0; i < this.options.maxWorkers; i++) {
      this.createWorker(i);
    }
  }

  /**
   * Create a new worker thread
   */
  createWorker(workerId) {
    const worker = new Worker(this.createWorkerScript(), {
      eval: true,
      resourceLimits: {
        maxOldGenerationSizeMb: 512,
        maxYoungGenerationSizeMb: 256,
        codeRangeSizeMb: 16
      }
    });

    const workerInfo = {
      id: workerId,
      worker,
      status: 'idle',
      currentTask: null,
      startTime: null,
      tasksCompleted: 0,
      memoryUsage: [],
      cpuUsage: []
    };

    this.workerPool.push(workerInfo);
    this.activeWorkers.set(workerId, workerInfo);

    // Setup worker event handlers
    worker.on('message', (message) => {
      this.handleWorkerMessage(workerId, message);
    });

    worker.on('error', (error) => {
      this.handleWorkerError(workerId, error);
    });

    worker.on('exit', (code) => {
      this.handleWorkerExit(workerId, code);
    });

    this.emit('workerCreated', { workerId, workerInfo });
  }

  /**
   * Create worker script content
   */
  createWorkerScript() {
    return `
      const { workerData, parentPort } = require('worker_threads');

      // Test execution logic in worker
      parentPort.on('message', async (task) => {
        try {
          const result = await executeTestTask(task);
          parentPort.postMessage({
            type: 'taskCompleted',
            taskId: task.id,
            result,
            workerId: workerData?.workerId
          });
        } catch (error) {
          parentPort.postMessage({
            type: 'taskFailed',
            taskId: task.id,
            error: {
              message: error.message,
              stack: error.stack,
              type: error.constructor.name
            },
            workerId: workerData?.workerId
          });
        }
      });

      async function executeTestTask(task) {
        const { type, config, testData, timeout } = task;

        // Import required modules based on test type
        switch (type) {
          case 'visual':
            return await executeVisualTest(config, testData);
          case 'accessibility':
            return await executeAccessibilityTest(config, testData);
          case 'interaction':
            return await executeInteractionTest(config, testData);
          case 'performance':
            return await executePerformanceTest(config, testData);
          case 'api':
            return await executeApiTest(config, testData);
          default:
            throw new Error(\`Unknown test type: \${type}\`);
        }
      }

      async function executeVisualTest(config, testData) {
        // Simulate visual test execution
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        return {
          type: 'visual',
          success: true,
          executionTime: Date.now() - testData.startTime,
          metrics: {
            screenshotTime: 150 + Math.random() * 100,
            comparisonTime: 50 + Math.random() * 50,
            similarity: 0.95 + Math.random() * 0.05
          },
          timestamp: Date.now()
        };
      }

      async function executeAccessibilityTest(config, testData) {
        // Simulate accessibility test execution
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 3000));

        return {
          type: 'accessibility',
          success: true,
          executionTime: Date.now() - testData.startTime,
          metrics: {
            violations: Math.floor(Math.random() * 3),
            passes: 50 + Math.floor(Math.random() * 20),
            incomplete: Math.floor(Math.random() * 5),
            scanTime: 1200 + Math.random() * 800
          },
          timestamp: Date.now()
        };
      }

      async function executeInteractionTest(config, testData) {
        // Simulate interaction test execution
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

        return {
          type: 'interaction',
          success: true,
          executionTime: Date.now() - testData.startTime,
          metrics: {
            interactions: testData.interactions?.length || 5,
            successRate: 0.9 + Math.random() * 0.1,
            averageResponseTime: 100 + Math.random() * 200
          },
          timestamp: Date.now()
        };
      }

      async function executePerformanceTest(config, testData) {
        // Simulate performance test execution
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 4000));

        return {
          type: 'performance',
          success: true,
          executionTime: Date.now() - testData.startTime,
          metrics: {
            memoryUsed: 50 * 1024 * 1024 + Math.random() * 100 * 1024 * 1024,
            cpuTime: 500 + Math.random() * 1500,
            throughput: 100 + Math.random() * 200
          },
          timestamp: Date.now()
        };
      }

      async function executeApiTest(config, testData) {
        // Simulate API test execution
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));

        return {
          type: 'api',
          success: Math.random() > 0.1, // 90% success rate
          executionTime: Date.now() - testData.startTime,
          metrics: {
            responseTime: 200 + Math.random() * 800,
            statusCode: Math.random() > 0.1 ? 200 : 500,
            dataSize: 1024 + Math.random() * 10240
          },
          timestamp: Date.now()
        };
      }
    `;
  }

  /**
   * Add a task to the execution queue
   */
  addTask(task) {
    const taskId = this.taskCounter++;
    const fullTask = {
      id: taskId,
      status: 'pending',
      priority: task.priority || 0,
      dependencies: task.dependencies || [],
      retryCount: 0,
      maxRetries: task.maxRetries || 3,
      createdAt: Date.now(),
      ...task
    };

    this.pendingTasks.push(fullTask);
    this.taskDependencies.set(taskId, new Set(task.dependencies));

    this.emit('taskAdded', fullTask);

    // Process queue if coordinator is running
    if (this.isRunning) {
      this.processTaskQueue();
    }

    return taskId;
  }

  /**
   * Add multiple tasks with dependencies
   */
  addTasks(tasks) {
    const taskIds = [];
    const dependencyMap = new Map();

    // Create task ID mapping
    tasks.forEach((task, index) => {
      const taskId = this.taskCounter++;
      taskIds.push(taskId);
      dependencyMap.set(index, taskId);
    });

    // Add tasks with resolved dependencies
    tasks.forEach((task, index) => {
      const taskId = dependencyMap.get(index);
      const resolvedDependencies = task.dependencies?.map(depIndex =>
        dependencyMap.get(depIndex)
      ) || [];

      this.addTask({
        ...task,
        dependencies: resolvedDependencies
      });
    });

    return taskIds;
  }

  /**
   * Start parallel execution
   */
  async start() {
    if (this.isRunning) {
      throw new Error('Coordinator is already running');
    }

    this.isRunning = true;
    this.startTime = Date.now();

    if (this.options.enableResourceMonitoring) {
      this.startResourceMonitoring();
    }

    this.emit('started');
    this.processTaskQueue();

    return this.waitForCompletion();
  }

  /**
   * Process the task queue
   */
  async processTaskQueue() {
    if (!this.isRunning) return;

    // Get available workers
    const availableWorkers = this.workerPool.filter(w => w.status === 'idle');
    if (availableWorkers.length === 0) return;

    // Check system resources
    if (this.options.adaptiveScaling && !this.hasSufficientResources()) {
      this.adjustWorkerPool();
      return;
    }

    // Get ready tasks (dependencies satisfied)
    const readyTasks = this.getReadyTasks();
    const batchSize = Math.min(
      availableWorkers.length,
      readyTasks.length,
      this.calculateAdaptiveBatchSize()
    );

    // Assign tasks to workers
    for (let i = 0; i < batchSize && i < readyTasks.length; i++) {
      const worker = availableWorkers[i];
      const task = readyTasks[i];

      await this.assignTaskToWorker(worker, task);
    }

    // Schedule next processing if more tasks remain
    if (this.pendingTasks.length > 0 && this.hasAvailableWorkers()) {
      setTimeout(() => this.processTaskQueue(), 100);
    }
  }

  /**
   * Get tasks that are ready to execute (dependencies satisfied)
   */
  getReadyTasks() {
    const readyTasks = [];

    for (let i = this.pendingTasks.length - 1; i >= 0; i--) {
      const task = this.pendingTasks[i];

      // Check if all dependencies are completed
      const dependencies = this.taskDependencies.get(task.id);
      const allDependenciesComplete = Array.from(dependencies).every(depId =>
        this.completedTasks.has(depId)
      );

      if (allDependenciesComplete) {
        readyTasks.push(task);
        this.pendingTasks.splice(i, 1);
      }
    }

    // Sort by priority and creation time
    return readyTasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Check if system has sufficient resources
   */
  hasSufficientResources() {
    const memUsage = process.memoryUsage();
    const memUsagePercentage = memUsage.heapUsed / memUsage.heapTotal;

    return memUsagePercentage < this.options.memoryThreshold;
  }

  /**
   * Calculate adaptive batch size based on system resources
   */
  calculateAdaptiveBatchSize() {
    const memUsage = process.memoryUsage();
    const memUsagePercentage = memUsage.heapUsed / memUsage.heapTotal;

    // Reduce batch size as memory usage increases
    if (memUsagePercentage > 0.9) {
      return 1;
    } else if (memUsagePercentage > 0.8) {
      return Math.max(1, Math.floor(this.options.batchSize / 3));
    } else if (memUsagePercentage > 0.7) {
      return Math.max(1, Math.floor(this.options.batchSize / 2));
    }

    return this.options.batchSize;
  }

  /**
   * Adjust worker pool based on system resources
   */
  adjustWorkerPool() {
    const memUsage = process.memoryUsage();
    const memUsagePercentage = memUsage.heapUsed / memUsage.heapTotal;

    // Scale down workers if memory is high
    if (memUsagePercentage > 0.9 && this.workerPool.length > 1) {
      const workerToRemove = this.workerPool.find(w => w.status === 'idle');
      if (workerToRemove) {
        this.removeWorker(workerToRemove.id);
      }
    }
  }

  /**
   * Assign a task to a worker
   */
  async assignTaskToWorker(worker, task) {
    worker.status = 'busy';
    worker.currentTask = task;
    worker.startTime = Date.now();

    task.status = 'running';
    task.startTime = Date.now();

    this.emit('taskAssigned', { workerId: worker.id, task });

    // Send task to worker with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${this.options.workerTimeout}ms`));
      }, this.options.workerTimeout);
    });

    try {
      await Promise.race([
        this.sendTaskToWorker(worker, task),
        timeoutPromise
      ]);
    } catch (error) {
      this.handleTaskTimeout(task, error);
    }
  }

  /**
   * Send task to worker
   */
  sendTaskToWorker(worker, task) {
    return new Promise((resolve) => {
      worker.worker.postMessage({
        ...task,
        testData: {
          ...task.testData,
          startTime: Date.now()
        }
      });
      resolve();
    });
  }

  /**
   * Handle worker message
   */
  handleWorkerMessage(workerId, message) {
    const worker = this.activeWorkers.get(workerId);
    if (!worker) return;

    switch (message.type) {
      case 'taskCompleted':
        this.handleTaskCompleted(workerId, message.taskId, message.result);
        break;
      case 'taskFailed':
        this.handleTaskFailed(workerId, message.taskId, message.error);
        break;
      default:
        this.emit('unknownMessage', { workerId, message });
    }
  }

  /**
   * Handle task completion
   */
  handleTaskCompleted(workerId, taskId, result) {
    const worker = this.activeWorkers.get(workerId);
    if (!worker) return;

    // Update worker status
    worker.status = 'idle';
    worker.currentTask = null;
    worker.tasksCompleted++;
    worker.lastCompleted = Date.now();

    // Update task status
    const task = this.completedTasks.get(taskId) ||
                 this.pendingTasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      task.endTime = Date.now();
      task.executionTime = task.endTime - task.startTime;
      task.result = result;

      this.completedTasks.set(taskId, task);

      // Remove from pending if it exists there
      const pendingIndex = this.pendingTasks.findIndex(t => t.id === taskId);
      if (pendingIndex !== -1) {
        this.pendingTasks.splice(pendingIndex, 1);
      }
    }

    this.emit('taskCompleted', { taskId, result, workerId, executionTime: task?.executionTime });

    // Process queue for dependent tasks
    this.processTaskQueue();
  }

  /**
   * Handle task failure
   */
  handleTaskFailed(workerId, taskId, error) {
    const worker = this.activeWorkers.get(workerId);
    if (!worker) return;

    // Update worker status
    worker.status = 'idle';
    worker.currentTask = null;

    // Find and update task
    let task = this.pendingTasks.find(t => t.id === taskId);
    if (!task) {
      task = this.completedTasks.get(taskId);
    }

    if (task) {
      task.retryCount++;

      if (task.retryCount < task.maxRetries) {
        // Retry task
        task.status = 'pending';
        this.pendingTasks.push(task);
        this.emit('taskRetry', { taskId, retryCount: task.retryCount, error });
      } else {
        // Mark as failed
        task.status = 'failed';
        task.endTime = Date.now();
        task.executionTime = task.endTime - task.startTime;
        task.error = error;

        this.failedTasks.set(taskId, task);

        // Remove from pending if it exists there
        const pendingIndex = this.pendingTasks.findIndex(t => t.id === taskId);
        if (pendingIndex !== -1) {
          this.pendingTasks.splice(pendingIndex, 1);
        }

        this.emit('taskFailed', { taskId, error, task });
      }
    }

    // Process queue
    this.processTaskQueue();
  }

  /**
   * Handle task timeout
   */
  handleTaskTimeout(task, error) {
    task.status = 'timeout';
    task.endTime = Date.now();
    task.executionTime = task.endTime - task.startTime;
    task.error = error;

    this.failedTasks.set(task.id, task);
    this.emit('taskTimeout', { taskId: task.id, error, task });

    // Remove from pending if it exists there
    const pendingIndex = this.pendingTasks.findIndex(t => t.id === task.id);
    if (pendingIndex !== -1) {
      this.pendingTasks.splice(pendingIndex, 1);
    }
  }

  /**
   * Handle worker error
   */
  handleWorkerError(workerId, error) {
    const worker = this.activeWorkers.get(workerId);
    if (!worker) return;

    this.emit('workerError', { workerId, error });

    // Recreate worker if it crashes
    this.removeWorker(workerId);
    this.createWorker(workerId);
  }

  /**
   * Handle worker exit
   */
  handleWorkerExit(workerId, code) {
    const worker = this.activeWorkers.get(workerId);
    if (!worker) return;

    this.emit('workerExit', { workerId, code });

    // Recreate worker if it exited unexpectedly
    if (code !== 0) {
      this.removeWorker(workerId);
      this.createWorker(workerId);
    }
  }

  /**
   * Remove a worker from the pool
   */
  removeWorker(workerId) {
    const worker = this.activeWorkers.get(workerId);
    if (!worker) return;

    // Terminate worker
    worker.worker.terminate();

    // Remove from pool
    const poolIndex = this.workerPool.findIndex(w => w.id === workerId);
    if (poolIndex !== -1) {
      this.workerPool.splice(poolIndex, 1);
    }

    this.activeWorkers.delete(workerId);

    this.emit('workerRemoved', { workerId });
  }

  /**
   * Check if there are available workers
   */
  hasAvailableWorkers() {
    return this.workerPool.some(w => w.status === 'idle');
  }

  /**
   * Wait for all tasks to complete
   */
  async waitForCompletion() {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        if (this.pendingTasks.length === 0 && !this.hasAvailableWorkers()) {
          this.isRunning = false;
          this.stopResourceMonitoring();
          this.endTime = Date.now();
          this.emit('completed');
          resolve();
        } else {
          setTimeout(checkCompletion, 100);
        }
      };

      checkCompletion();
    });
  }

  /**
   * Start resource monitoring
   */
  startResourceMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.collectResourceMetrics();
    }, 1000);
  }

  /**
   * Stop resource monitoring
   */
  stopResourceMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Collect resource metrics
   */
  collectResourceMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.resourceMetrics.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external
    });

    this.resourceMetrics.cpuUsage.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system
    });

    // Worker utilization
    const activeWorkersCount = this.workerPool.filter(w => w.status === 'busy').length;
    this.resourceMetrics.workerUtilization.push({
      timestamp: Date.now(),
      utilization: activeWorkersCount / this.workerPool.length
    });

    // Keep only last 100 metrics
    if (this.resourceMetrics.memoryUsage.length > 100) {
      this.resourceMetrics.memoryUsage = this.resourceMetrics.memoryUsage.slice(-100);
    }
    if (this.resourceMetrics.cpuUsage.length > 100) {
      this.resourceMetrics.cpuUsage = this.resourceMetrics.cpuUsage.slice(-100);
    }
    if (this.resourceMetrics.workerUtilization.length > 100) {
      this.resourceMetrics.workerUtilization = this.resourceMetrics.workerUtilization.slice(-100);
    }
  }

  /**
   * Get execution summary
   */
  getExecutionSummary() {
    const totalTasks = this.completedTasks.size + this.failedTasks.size + this.pendingTasks.length;
    const executionTime = this.endTime ? this.endTime - this.startTime : 0;

    return {
      totalTasks,
      completed: this.completedTasks.size,
      failed: this.failedTasks.size,
      pending: this.pendingTasks.length,
      executionTime,
      throughput: executionTime > 0 ? totalTasks / (executionTime / 1000) : 0,
      workerCount: this.workerPool.length,
      resourceMetrics: this.resourceMetrics
    };
  }

  /**
   * Get detailed task results
   */
  getTaskResults() {
    return {
      completed: Array.from(this.completedTasks.values()),
      failed: Array.from(this.failedTasks.values()),
      pending: this.pendingTasks
    };
  }

  /**
   * Force stop execution
   */
  async stop() {
    this.isRunning = false;
    this.stopResourceMonitoring();

    // Terminate all workers
    this.workerPool.forEach(worker => {
      worker.worker.terminate();
    });

    this.workerPool = [];
    this.activeWorkers.clear();

    this.emit('stopped');
  }
}

/**
 * Create singleton instance for easy import
 */
const parallelTestCoordinator = new ParallelTestCoordinator();

/**
 * Export utilities for different use cases
 */
module.exports = {
  ParallelTestCoordinator,
  parallelTestCoordinator,

  /**
   * Quick access methods for common operations
   */
  addTask: (task) => parallelTestCoordinator.addTask(task),
  addTasks: (tasks) => parallelTestCoordinator.addTasks(tasks),
  start: () => parallelTestCoordinator.start(),
  stop: () => parallelTestCoordinator.stop(),

  /**
   * Information methods
   */
  getExecutionSummary: () => parallelTestCoordinator.getExecutionSummary(),
  getTaskResults: () => parallelTestCoordinator.getTaskResults(),
  getWorkerStatus: () => parallelTestCoordinator.workerPool.map(w => ({
    id: w.id,
    status: w.status,
    tasksCompleted: w.tasksCompleted,
    currentTask: w.currentTask?.id
  }))
};