/**
 * Parallel Test Execution with Worker Pools
 *
 * Provides efficient parallel test execution using worker pools,
 * load balancing, and resource management. Optimizes test execution
 * time while maintaining system stability and preventing resource exhaustion.
 *
 * Features:
 * - Configurable worker pools with dynamic scaling
 * - Load balancing and task distribution
 * - Resource monitoring and adaptive scaling
 * - Worker health monitoring and automatic recovery
 * - Progress tracking and real-time reporting
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');
const os = require('os');

class ParallelExecutor {
  constructor(options = {}) {
    this.options = {
      // Worker pool configuration
      maxWorkers: options.maxWorkers || Math.max(1, os.cpus().length - 1),
      minWorkers: options.minWorkers || 1,
      workerTimeout: options.workerTimeout || 30000, // 30 seconds
      idleTimeout: options.idleTimeout || 60000, // 1 minute

      // Resource management
      maxMemoryPerWorker: options.maxMemoryPerWorker || 128 * 1024 * 1024, // 128MB
      maxCpuUsage: options.maxCpuUsage || 80, // 80%
      memoryThreshold: options.memoryThreshold || 85, // 85%

      // Load balancing
      loadBalancingStrategy: options.loadBalancingStrategy || 'round-robin', // 'round-robin', 'least-busy', 'random'
      taskQueueSize: options.taskQueueSize || 1000,

      // Monitoring and health
      healthCheckInterval: options.healthCheckInterval || 10000, // 10 seconds
      maxRestartAttempts: options.maxRestartAttempts || 3,
      restartDelay: options.restartDelay || 5000, // 5 seconds

      // Performance settings
      enableWorkerReuse: options.enableWorkerReuse !== false,
      enableWarmWorkers: options.enableWarmWorkers !== false,
      enableAdaptiveScaling: options.enableAdaptiveScaling !== false,

      ...options
    };

    // Initialize state
    this.workers = new Map();
    this.taskQueue = [];
    this.runningTasks = new Map();
    this.completedTasks = [];
    this.failedTasks = [];

    // Performance metrics
    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      throughput: 0,
      workerUtilization: 0,
      queueLength: 0
    };

    // Monitoring
    this.startTime = Date.now();
    this.lastHealthCheck = 0;
    this.isRunning = false;

    // Initialize executor
    this.initialize();
  }

  /**
   * Initialize parallel executor
   */
  initialize() {
    if (this.options.enableWarmWorkers) {
      this.initializeWorkerPool();
    }

    // Start monitoring
    this.startMonitoring();

    // Start task processing
    this.startTaskProcessing();
  }

  /**
   * Initialize worker pool
   */
  async initializeWorkerPool() {
    const workerCount = Math.min(this.options.maxWorkers, this.options.minWorkers);

    for (let i = 0; i < workerCount; i++) {
      await this.createWorker(i);
    }
  }

  /**
   * Create a new worker
   */
  async createWorker(workerId) {
    try {
      const worker = new Worker(path.join(__dirname, 'parallel-worker.js'), {
        workerData: {
          workerId,
          config: this.options
        }
      });

      const workerInfo = {
        id: workerId,
        worker,
        status: 'idle',
        currentTask: null,
        taskCount: 0,
        startTime: Date.now(),
        lastActivity: Date.now(),
        restartCount: 0,
        memoryUsage: 0,
        cpuUsage: 0
      };

      // Set up worker event handlers
      worker.on('message', (message) => this.handleWorkerMessage(workerId, message));
      worker.on('error', (error) => this.handleWorkerError(workerId, error));
      worker.on('exit', (code) => this.handleWorkerExit(workerId, code));

      this.workers.set(workerId, workerInfo);

      // Send initialization message
      worker.postMessage({
        type: 'initialize',
        workerId,
        config: this.options
      });

      return workerInfo;

    } catch (error) {
      console.error(`Failed to create worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Handle worker messages
   */
  handleWorkerMessage(workerId, message) {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    switch (message.type) {
      case 'task-completed':
        this.handleTaskCompletion(workerId, message.result);
        break;

      case 'task-failed':
        this.handleTaskFailure(workerId, message.error);
        break;

      case 'worker-ready':
        this.handleWorkerReady(workerId);
        break;

      case 'worker-stats':
        this.handleWorkerStats(workerId, message.stats);
        break;

      case 'worker-health':
        this.handleWorkerHealth(workerId, message.health);
        break;

      default:
        console.warn(`Unknown message type from worker ${workerId}:`, message.type);
    }
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(workerId, error) {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    console.error(`Worker ${workerId} error:`, error);

    // Mark worker as unhealthy
    worker.status = 'error';
    worker.lastError = error;

    // Handle task failure if worker was running a task
    if (worker.currentTask) {
      this.handleTaskFailure(workerId, {
        message: 'Worker error',
        error: error.message
      });
    }

    // Attempt to restart worker
    this.restartWorker(workerId);
  }

  /**
   * Handle worker exit
   */
  handleWorkerExit(workerId, code) {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    console.log(`Worker ${workerId} exited with code ${code}`);

    // Handle task failure if worker was running a task
    if (worker.currentTask && code !== 0) {
      this.handleTaskFailure(workerId, {
        message: 'Worker exited unexpectedly',
        exitCode: code
      });
    }

    // Remove worker from pool
    this.workers.delete(workerId);

    // Attempt to restart worker if not shutting down
    if (this.isRunning && worker.restartCount < this.options.maxRestartAttempts) {
      setTimeout(() => this.restartWorker(workerId), this.options.restartDelay);
    }
  }

  /**
   * Restart a worker
   */
  async restartWorker(workerId) {
    const oldWorker = this.workers.get(workerId);
    if (oldWorker) {
      oldWorker.restartCount++;
      oldWorker.worker.terminate();
      this.workers.delete(workerId);
    }

    try {
      const newWorker = await this.createWorker(workerId);
      newWorker.restartCount = oldWorker ? oldWorker.restartCount : 0;
      console.log(`Worker ${workerId} restarted (attempt ${newWorker.restartCount})`);
    } catch (error) {
      console.error(`Failed to restart worker ${workerId}:`, error);
    }
  }

  /**
   * Handle task completion
   */
  handleTaskCompletion(workerId, result) {
    const worker = this.workers.get(workerId);
    if (!worker || !worker.currentTask) return;

    const task = worker.currentTask;
    const completionTime = Date.now();

    // Update task status
    task.status = 'completed';
    task.result = result;
    task.completionTime = completionTime;
    task.executionTime = completionTime - task.startTime;

    // Update metrics
    this.metrics.completedTasks++;
    this.updateAverageExecutionTime(task.executionTime);

    // Move to completed tasks
    this.completedTasks.push(task);
    this.runningTasks.delete(task.id);

    // Update worker status
    worker.status = 'idle';
    worker.currentTask = null;
    worker.taskCount++;
    worker.lastActivity = completionTime;

    // Notify progress callback if available
    if (this.options.onTaskComplete) {
      this.options.onTaskComplete(task);
    }

    // Process next task in queue
    this.processNextTask();
  }

  /**
   * Handle task failure
   */
  handleTaskFailure(workerId, error) {
    const worker = this.workers.get(workerId);
    if (!worker || !worker.currentTask) return;

    const task = worker.currentTask;
    const failureTime = Date.now();

    // Update task status
    task.status = 'failed';
    task.error = error;
    task.completionTime = failureTime;
    task.executionTime = failureTime - task.startTime;

    // Update metrics
    this.metrics.failedTasks++;

    // Move to failed tasks
    this.failedTasks.push(task);
    this.runningTasks.delete(task.id);

    // Update worker status
    worker.status = 'idle';
    worker.currentTask = null;
    worker.lastActivity = failureTime;

    // Notify progress callback if available
    if (this.options.onTaskFail) {
      this.options.onTaskFail(task, error);
    }

    // Process next task in queue
    this.processNextTask();
  }

  /**
   * Handle worker ready state
   */
  handleWorkerReady(workerId) {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.status = 'ready';
    worker.lastActivity = Date.now();

    // Process next task in queue
    this.processNextTask();
  }

  /**
   * Handle worker stats
   */
  handleWorkerStats(workerId, stats) {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.memoryUsage = stats.memoryUsage || 0;
    worker.cpuUsage = stats.cpuUsage || 0;
    worker.lastActivity = Date.now();
  }

  /**
   * Handle worker health
   */
  handleWorkerHealth(workerId, health) {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.health = health;
    worker.lastHealthCheck = Date.now();

    // Take action based on health status
    if (health.status === 'unhealthy') {
      console.warn(`Worker ${workerId} is unhealthy: ${health.reason}`);
      this.restartWorker(workerId);
    }
  }

  /**
   * Add task to execution queue
   */
  addTask(task) {
    const taskId = this.generateTaskId();
    const taskObj = {
      id: taskId,
      ...task,
      status: 'queued',
      createdAt: Date.now(),
      startTime: null,
      completionTime: null,
      executionTime: null
    };

    // Add to queue
    this.taskQueue.push(taskObj);
    this.metrics.totalTasks++;
    this.updateMetrics();

    // Process task immediately if workers are available
    this.processNextTask();

    return taskId;
  }

  /**
   * Add multiple tasks
   */
  addTasks(tasks) {
    return tasks.map(task => this.addTask(task));
  }

  /**
   * Process next task in queue
   */
  processNextTask() {
    if (this.taskQueue.length === 0) return;

    // Find available worker
    const availableWorker = this.findAvailableWorker();
    if (!availableWorker) return;

    // Get next task from queue
    const task = this.taskQueue.shift();
    if (!task) return;

    // Assign task to worker
    this.assignTaskToWorker(availableWorker, task);
  }

  /**
   * Find available worker
   */
  findAvailableWorker() {
    const availableWorkers = Array.from(this.workers.values())
      .filter(worker => worker.status === 'idle' || worker.status === 'ready');

    if (availableWorkers.length === 0) return null;

    // Apply load balancing strategy
    switch (this.options.loadBalancingStrategy) {
      case 'least-busy':
        return availableWorkers.reduce((least, current) =>
          current.taskCount < least.taskCount ? current : least
        );

      case 'random':
        return availableWorkers[Math.floor(Math.random() * availableWorkers.length)];

      case 'round-robin':
      default:
        // Simple round-robin based on task count
        return availableWorkers.reduce((least, current) =>
          current.taskCount < least.taskCount ? current : least
        );
    }
  }

  /**
   * Assign task to worker
   */
  assignTaskToWorker(worker, task) {
    // Update task status
    task.status = 'running';
    task.startTime = Date.now();
    task.workerId = worker.id;

    // Update worker status
    worker.status = 'busy';
    worker.currentTask = task;
    worker.lastActivity = Date.now();

    // Add to running tasks
    this.runningTasks.set(task.id, task);

    // Send task to worker
    worker.worker.postMessage({
      type: 'execute-task',
      task: {
        id: task.id,
        type: task.type,
        data: task.data,
        options: task.options
      }
    });
  }

  /**
   * Start task processing loop
   */
  startTaskProcessing() {
    setInterval(() => {
      this.processNextTask();
      this.updateMetrics();
    }, 100); // Process every 100ms
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    setInterval(() => {
      this.performHealthCheck();
      this.adjustWorkerPool();
      this.updateMetrics();
    }, this.options.healthCheckInterval);
  }

  /**
   * Perform health check on all workers
   */
  async performHealthCheck() {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.options.healthCheckInterval) return;

    this.lastHealthCheck = now;

    for (const worker of this.workers.values()) {
      // Check for stuck workers
      if (worker.status === 'busy' && worker.currentTask) {
        const taskDuration = now - worker.currentTask.startTime;
        if (taskDuration > this.options.workerTimeout) {
          console.warn(`Worker ${worker.id} appears stuck, restarting...`);
          this.restartWorker(worker.id);
        }
      }

      // Check for idle workers
      if (worker.status === 'idle' && now - worker.lastActivity > this.options.idleTimeout) {
        if (this.options.enableWorkerReuse) {
          // Keep worker alive but mark as idle
          worker.status = 'idle';
        } else {
          // Terminate idle worker
          worker.worker.terminate();
          this.workers.delete(worker.id);
        }
      }

      // Request health update
      if (worker.worker) {
        worker.worker.postMessage({ type: 'health-check' });
      }
    }
  }

  /**
   * Adjust worker pool size based on load
   */
  async adjustWorkerPool() {
    if (!this.options.enableAdaptiveScaling) return;

    const currentWorkerCount = this.workers.size;
    const queueLength = this.taskQueue.length;
    const busyWorkers = Array.from(this.workers.values()).filter(w => w.status === 'busy').length;

    // Scale up if queue is long and workers are busy
    if (queueLength > 10 && busyWorkers / currentWorkerCount > 0.8) {
      if (currentWorkerCount < this.options.maxWorkers) {
        const newWorkerId = Math.max(...Array.from(this.workers.keys())) + 1;
        await this.createWorker(newWorkerId);
        console.log(`Scaled up worker pool to ${this.workers.size} workers`);
      }
    }

    // Scale down if queue is empty and workers are idle
    if (queueLength === 0 && busyWorkers === 0 && currentWorkerCount > this.options.minWorkers) {
      const idleWorkers = Array.from(this.workers.values()).filter(w => w.status === 'idle');
      if (idleWorkers.length > 2) {
        const workerToRemove = idleWorkers[0];
        workerToRemove.worker.terminate();
        this.workers.delete(workerToRemove.id);
        console.log(`Scaled down worker pool to ${this.workers.size} workers`);
      }
    }
  }

  /**
   * Update metrics
   */
  updateMetrics() {
    const now = Date.now();
    const elapsed = now - this.startTime;

    // Calculate throughput
    this.metrics.throughput = (this.metrics.completedTasks / elapsed) * 1000; // tasks per second

    // Calculate worker utilization
    const busyWorkers = Array.from(this.workers.values()).filter(w => w.status === 'busy').length;
    this.metrics.workerUtilization = this.workers.size > 0 ? (busyWorkers / this.workers.size) * 100 : 0;

    // Update queue length
    this.metrics.queueLength = this.taskQueue.length;
  }

  /**
   * Update average execution time
   */
  updateAverageExecutionTime(executionTime) {
    if (this.metrics.completedTasks === 1) {
      this.metrics.averageExecutionTime = executionTime;
    } else {
      this.metrics.averageExecutionTime = (
        (this.metrics.averageExecutionTime * (this.metrics.completedTasks - 1) + executionTime) /
        this.metrics.completedTasks
      );
    }
  }

  /**
   * Generate task ID
   */
  generateTaskId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Wait for all tasks to complete
   */
  async waitForCompletion(timeout = 300000) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        const now = Date.now();
        if (now - startTime > timeout) {
          reject(new Error('Timeout waiting for task completion'));
          return;
        }

        if (this.taskQueue.length === 0 && this.runningTasks.size === 0) {
          resolve({
            completed: this.completedTasks,
            failed: this.failedTasks,
            metrics: this.metrics
          });
          return;
        }

        setTimeout(checkCompletion, 100);
      };

      checkCompletion();
    });
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      workers: Array.from(this.workers.values()).map(w => ({
        id: w.id,
        status: w.status,
        taskCount: w.taskCount,
        memoryUsage: w.memoryUsage,
        cpuUsage: w.cpuUsage,
        restartCount: w.restartCount
      })),
      queue: {
        length: this.taskQueue.length,
        running: this.runningTasks.size,
        completed: this.completedTasks.length,
        failed: this.failedTasks.length
      },
      metrics: this.metrics
    };
  }

  /**
   * Stop executor and cleanup
   */
  async stop() {
    this.isRunning = false;

    // Terminate all workers
    for (const worker of this.workers.values()) {
      worker.worker.terminate();
    }

    // Clear collections
    this.workers.clear();
    this.taskQueue = [];
    this.runningTasks.clear();

    console.log('Parallel executor stopped');
  }
}

/**
 * Export utilities for different use cases
 */
module.exports = {
  ParallelExecutor,

  /**
   * Quick access factory method
   */
  createExecutor: (options) => new ParallelExecutor(options)
};