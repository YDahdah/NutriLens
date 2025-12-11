/**
 * Performance monitoring utilities
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100;

  /**
   * Measure the execution time of an async function
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name} (error)`, duration);
      throw error;
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, duration: number): void {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get average duration for a metric name
   */
  getAverageDuration(name: string): number {
    const relevantMetrics = this.metrics.filter((m) => m.name === name);
    if (relevantMetrics.length === 0) return 0;

    const total = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / relevantMetrics.length;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get performance report
   */
  getReport(): Record<string, { count: number; avgDuration: number; totalDuration: number }> {
    const report: Record<string, { count: number; avgDuration: number; totalDuration: number }> = {};

    this.metrics.forEach((metric) => {
      if (!report[metric.name]) {
        report[metric.name] = {
          count: 0,
          avgDuration: 0,
          totalDuration: 0,
        };
      }

      report[metric.name].count++;
      report[metric.name].totalDuration += metric.duration;
    });

    // Calculate averages
    Object.keys(report).forEach((name) => {
      report[name].avgDuration = report[name].totalDuration / report[name].count;
    });

    return report;
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component render performance
 */
export function usePerformanceMeasure(componentName: string) {
  React.useEffect(() => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      performanceMonitor.recordMetric(`${componentName} render`, duration);
    };
  });
}

// Re-export for convenience
import React from 'react';
export { usePerformanceMeasure };

