import { test, expect } from '@playwright/test';
import { ScreenshotCache } from '../utils/screenshot-cache.js';
import { MemoryManager } from '../utils/memory-manager.js';
import config from '../utils/config.js';

test.describe('Performance Validation - Screenshot Capture', () => {
  let memoryManager;
  let screenshotCache;

  test.beforeAll(() => {
    // Initialize performance monitoring utilities
    memoryManager = new MemoryManager({
      memoryLimit: 500 * 1024 * 1024, // 500MB
      enableGarbageCollection: true
    });

    screenshotCache = new ScreenshotCache({
      maxMemorySize: 100 * 1024 * 1024, // 100MB
      defaultTTL: 3600000 // 1 hour
    });
  });

  test.describe('Screenshot Capture Performance', () => {
    test('should capture screenshots within 500ms target', async ({ page }) => {
      const startTime = performance.now();

      try {
        // Navigate to test page
        await page.goto('/ui/main_popup.html
        await page.waitForSelector('.popup-container', {
          timeout: config.defaultTimeout,
          state: 'visible'
        });

        // Wait for stable state
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(100); // Allow for any animations to complete

        // Measure screenshot capture performance
        const screenshotStartTime = performance.now();
        const screenshot = await page.screenshot({
          fullPage: false,
          animations: 'disabled',
          caret: 'hide'
        });
        const screenshotEndTime = performance.now();

        const screenshotTime = screenshotEndTime - screenshotStartTime;
        const totalTime = performance.now() - startTime;

        // Performance assertions
        expect(screenshotTime, `Screenshot capture took ${screenshotTime}ms, exceeding 500ms target`)
          .toBeLessThan(500);

        expect(screenshot.length, 'Screenshot should have reasonable size')
          .toBeGreaterThan(1000); // At least 1KB

        expect(screenshot.length, 'Screenshot should not be excessively large')
          .toBeLessThan(2 * 1024 * 1024); // Less than 2MB

        // Log performance metrics
        console.log(`Screenshot Performance Metrics:`);
        console.log(`  - Capture time: ${screenshotTime.toFixed(2)}ms`);
        console.log(`  - Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`  - Screenshot size: ${(screenshot.length / 1024).toFixed(2)}KB`);
        console.log(`  - Performance target: ${screenshotTime < 500 ? '✅ PASSED' : '❌ FAILED'}`);

        // Test multiple rapid captures to ensure consistent performance
        const captureTimes = [];
        for (let i = 0; i < 5; i++) {
          const rapidStartTime = performance.now();
          await page.screenshot({ animations: 'disabled' });
          const rapidEndTime = performance.now();
          captureTimes.push(rapidEndTime - rapidStartTime);
        }

        const averageCaptureTime = captureTimes.reduce((a, b) => a + b, 0) / captureTimes.length;
        const maxCaptureTime = Math.max(...captureTimes);

        expect(averageCaptureTime, `Average screenshot time ${averageCaptureTime.toFixed(2)}ms should be under 500ms`)
          .toBeLessThan(500);

        expect(maxCaptureTime, `Maximum screenshot time ${maxCaptureTime.toFixed(2)}ms should be under 750ms`)
          .toBeLessThan(750);

        console.log(`Rapid Capture Performance:`);
        console.log(`  - Average time: ${averageCaptureTime.toFixed(2)}ms`);
        console.log(`  - Maximum time: ${maxCaptureTime.toFixed(2)}ms`);
        console.log(`  - Consistency target: ${averageCaptureTime < 500 ? '✅ PASSED' : '❌ FAILED'}`);

      } catch (error) {
        console.error('Screenshot performance test failed:', error);
        throw error;
      }
    });

    test('should maintain performance with caching enabled', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html
        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        const cacheKey = 'performance-test-screenshot';
        const captureTimes = [];

        // Test cached screenshot performance
        for (let i = 0; i < 10; i++) {
          const startTime = performance.now();

          // Try to get from cache first
          const cached = await screenshotCache.getCachedScreenshot(cacheKey);

          let screenshot;
          if (cached) {
            screenshot = cached;
            console.log(`  Cache hit for iteration ${i + 1}`);
          } else {
            screenshot = await page.screenshot({ animations: 'disabled' });
            await screenshotCache.cacheScreenshot(cacheKey, screenshot);
            console.log(`  Cache miss for iteration ${i + 1}`);
          }

          const endTime = performance.now();
          captureTimes.push(endTime - startTime);
        }

        const averageTime = captureTimes.reduce((a, b) => a + b, 0) / captureTimes.length;
        const cacheHitTimes = captureTimes.slice(1); // Exclude first capture (cache miss)

        expect(averageTime, `Average cached capture time ${averageTime.toFixed(2)}ms should be under 300ms`)
          .toBeLessThan(300);

        console.log(`Cached Screenshot Performance:`);
        console.log(`  - Average time: ${averageTime.toFixed(2)}ms`);
        console.log(`  - Individual times: ${captureTimes.map(t => t.toFixed(2)).join(', ')}ms`);
        console.log(`  - Cache efficiency: ${averageTime < 300 ? '✅ PASSED' : '❌ FAILED'}`);

      } catch (error) {
        console.error('Cached screenshot performance test failed:', error);
        throw error;
      }
    });

    test('should handle large element screenshots efficiently', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html
        await page.waitForSelector('.settings-container', { timeout: config.defaultTimeout });

        // Test screenshot of potentially large settings area
        const settingsArea = page.locator('.settings-container');

        const startTime = performance.now();
        const screenshot = await settingsArea.screenshot({
          animations: 'disabled'
        });
        const endTime = performance.now();

        const captureTime = endTime - startTime;

        expect(captureTime, `Large element screenshot took ${captureTime}ms, exceeding 500ms target`)
          .toBeLessThan(500);

        expect(screenshot.length, 'Large element screenshot should be reasonable size')
          .toBeLessThan(3 * 1024 * 1024); // Less than 3MB

        console.log(`Large Element Screenshot Performance:`);
        console.log(`  - Capture time: ${captureTime.toFixed(2)}ms`);
        console.log(`  - Size: ${(screenshot.length / 1024).toFixed(2)}KB`);
        console.log(`  - Performance: ${captureTime < 500 ? '✅ PASSED' : '❌ FAILED'}`);

      } catch (error) {
        console.error('Large element screenshot test failed:', error);
        throw error;
      }
    });

    test('should validate memory usage during screenshot operations', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html
        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        const initialMemory = await memoryManager.getMemoryUsage();
        const screenshots = [];

        // Capture multiple screenshots to test memory usage
        for (let i = 0; i < 20; i++) {
          const screenshot = await page.screenshot({ animations: 'disabled' });
          screenshots.push(screenshot);

          // Check memory every 5 screenshots
          if (i % 5 === 0) {
            const currentMemory = await memoryManager.getMemoryUsage();
            const memoryIncrease = currentMemory.usedHeapSize - initialMemory.usedHeapSize;

            console.log(`Memory after ${i + 1} screenshots: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`);

            // Force garbage collection if memory is getting high
            if (memoryIncrease > 50 * 1024 * 1024) { // 50MB increase
              await memoryManager.forceGarbageCollection();
              console.log('  Forced garbage collection');
            }
          }
        }

        const finalMemory = await memoryManager.getMemoryUsage();
        const totalMemoryIncrease = finalMemory.usedHeapSize - initialMemory.usedHeapSize;

        expect(totalMemoryIncrease, `Memory increase of ${(totalMemoryIncrease / 1024 / 1024).toFixed(2)}MB should be under 100MB`)
          .toBeLessThan(100 * 1024 * 1024);

        console.log(`Memory Usage Validation:`);
        console.log(`  - Initial memory: ${(initialMemory.usedHeapSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  - Final memory: ${(finalMemory.usedHeapSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  - Total increase: ${(totalMemoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  - Memory efficiency: ${totalMemoryIncrease < 100 * 1024 * 1024 ? '✅ PASSED' : '❌ FAILED'}`);

      } catch (error) {
        console.error('Memory usage validation test failed:', error);
        throw error;
      }
    });
  });

  test.describe('Screenshot Performance Under Load', () => {
    test('should maintain performance with concurrent screenshot operations', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html
        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        // Test concurrent screenshot capture
        const concurrentPromises = [];
        const startTime = performance.now();

        for (let i = 0; i < 5; i++) {
          concurrentPromises.push(
            page.screenshot({
              animations: 'disabled',
              style: `transform: translateX(${i * 10}px)` // Slight offset to make each unique
            })
          );
        }

        const screenshots = await Promise.all(concurrentPromises);
        const endTime = performance.now();
        const totalTime = endTime - startTime;

        // Verify all screenshots were captured successfully
        expect(screenshots.length).toBe(5);
        screenshots.forEach((screenshot, i) => {
          expect(screenshot.length, `Screenshot ${i + 1} should have reasonable size`)
            .toBeGreaterThan(1000);
        });

        // Concurrent operations should complete efficiently
        expect(totalTime, `Concurrent screenshot capture took ${totalTime}ms, should be under 1500ms`)
          .toBeLessThan(1500);

        const averageTime = totalTime / 5;
        expect(averageTime, `Average concurrent capture time ${averageTime.toFixed(2)}ms should be under 500ms`)
          .toBeLessThan(500);

        console.log(`Concurrent Screenshot Performance:`);
        console.log(`  - Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`  - Average time: ${averageTime.toFixed(2)}ms`);
        console.log(`  - Screenshots captured: ${screenshots.length}`);
        console.log(`  - Concurrent efficiency: ${averageTime < 500 ? '✅ PASSED' : '❌ FAILED'}`);

      } catch (error) {
        console.error('Concurrent screenshot test failed:', error);
        throw error;
      }
    });

    test('should handle screenshot capture with page complexity', async ({ page }) => {
      try {
        await page.goto('/ui/main_popup.html
        await page.waitForSelector('.popup-container', { timeout: config.defaultTimeout });

        // Add complexity to the page
        await page.evaluate(() => {
          // Create complex DOM structure
          const container = document.querySelector('.popup-container');
          for (let i = 0; i < 50; i++) {
            const div = document.createElement('div');
            div.style.cssText = `
              position: absolute;
              width: ${10 + Math.random() * 50}px;
              height: ${10 + Math.random() * 50}px;
              left: ${Math.random() * 300}px;
              top: ${Math.random() * 400}px;
              background: hsl(${Math.random() * 360}, 70%, 80%);
              opacity: 0.7;
            `;
            container.appendChild(div);
          }
        });

        // Measure performance with complex page
        const complexStartTime = performance.now();
        const complexScreenshot = await page.screenshot({
          animations: 'disabled'
        });
        const complexEndTime = performance.now();

        const complexTime = complexEndTime - complexStartTime;

        // Remove complexity
        await page.evaluate(() => {
          const extraElements = document.querySelectorAll('.popup-container > div[style*="position: absolute"]');
          extraElements.forEach(el => el.remove());
        });

        // Measure performance with clean page
        await page.waitForTimeout(100); // Allow for removal to complete
        const cleanStartTime = performance.now();
        const cleanScreenshot = await page.screenshot({
          animations: 'disabled'
        });
        const cleanEndTime = performance.now();

        const cleanTime = cleanEndTime - cleanStartTime;

        expect(complexTime, `Complex page screenshot took ${complexTime}ms, should be under 750ms`)
          .toBeLessThan(750);

        expect(cleanTime, `Clean page screenshot took ${cleanTime}ms, should be under 500ms`)
          .toBeLessThan(500);

        const performanceRatio = complexTime / cleanTime;
        expect(performanceRatio, `Complex/clean performance ratio ${performanceRatio.toFixed(2)} should be reasonable`)
          .toBeLessThan(3);

        console.log(`Complex Page Screenshot Performance:`);
        console.log(`  - Complex page: ${complexTime.toFixed(2)}ms`);
        console.log(`  - Clean page: ${cleanTime.toFixed(2)}ms`);
        console.log(`  - Performance ratio: ${performanceRatio.toFixed(2)}x`);
        console.log(`  - Complexity handling: ${performanceRatio < 3 ? '✅ PASSED' : '❌ FAILED'}`);

      } catch (error) {
        console.error('Complex page screenshot test failed:', error);
        throw error;
      }
    });
  });

  test.afterAll(async () => {
    // Clean up performance monitoring utilities
    if (screenshotCache) {
      await screenshotCache.clear();
    }

    if (memoryManager) {
      await memoryManager.cleanup();
    }
  });
});

// Export performance metrics for analysis
export const screenshotPerformanceMetrics = {
  targetCaptureTime: 500, // ms
  targetAverageTime: 300, // ms (for cached operations)
  targetMaxTime: 750, // ms
  targetMemoryIncrease: 100 * 1024 * 1024, // 100MB
  targetConcurrentTime: 1500, // ms for 5 concurrent operations
  targetComplexityRatio: 3 // max ratio between complex and simple pages
};