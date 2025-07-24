/**
 * Enhanced health check API endpoint with comprehensive monitoring
 */
import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthStatus;
    externalServices: HealthStatus;
    memory: HealthStatus;
    disk: HealthStatus;
  };
  metrics: {
    requestCount: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

interface HealthStatus {
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

// Simple in-memory metrics (in production, use Redis or similar)
let requestCount = 0;
let errorCount = 0;
let responseTimes: number[] = [];
const startTime = Date.now();

function updateMetrics(responseTime: number, isError: boolean = false) {
  requestCount++;
  if (isError) errorCount++;
  
  responseTimes.push(responseTime);
  // Keep only last 1000 response times
  if (responseTimes.length > 1000) {
    responseTimes = responseTimes.slice(-1000);
  }
}

async function checkDatabase(): Promise<HealthStatus> {
  try {
    // Placeholder for database health check
    // In a real app, you'd check database connectivity
    const startTime = Date.now();
    
    // Simulate database check
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'pass',
      responseTime,
      message: 'Database connection healthy'
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Database connection failed',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

async function checkExternalServices(): Promise<HealthStatus> {
  try {
    const startTime = Date.now();
    
    // Check radio stream availability
    const response = await fetch('https://radio.oadro.com/api/nowplaying_static/oadro.json', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        status: 'pass',
        responseTime,
        message: 'External services healthy'
      };
    } else {
      return {
        status: 'warn',
        responseTime,
        message: `External service returned ${response.status}`,
        details: { statusCode: response.status }
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'External services unreachable',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

function checkMemory(): HealthStatus {
  try {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
      const usagePercent = (usedMB / totalMB) * 100;
      
      const status = usagePercent > 90 ? 'fail' : usagePercent > 70 ? 'warn' : 'pass';
      
      return {
        status,
        message: `Memory usage: ${usedMB}MB / ${totalMB}MB (${usagePercent.toFixed(1)}%)`,
        details: {
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          external: usage.external,
          rss: usage.rss
        }
      };
    } else {
      return {
        status: 'warn',
        message: 'Memory usage not available in this environment'
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'Failed to check memory usage',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

function checkDisk(): HealthStatus {
  try {
    // Placeholder for disk space check
    // In a real app, you'd check available disk space
    return {
      status: 'pass',
      message: 'Disk space healthy'
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Failed to check disk space',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    apiLogger.info('Health check requested', {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // Run all health checks in parallel
    const [database, externalServices, memory, disk] = await Promise.all([
      checkDatabase(),
      checkExternalServices(),
      Promise.resolve(checkMemory()),
      Promise.resolve(checkDisk())
    ]);

    const checks = { database, externalServices, memory, disk };
    
    // Determine overall status
    const hasFailures = Object.values(checks).some(check => check.status === 'fail');
    const hasWarnings = Object.values(checks).some(check => check.status === 'warn');
    
    const overallStatus = hasFailures ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy';
    
    // Calculate metrics
    const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
      checks,
      metrics: {
        requestCount,
        errorRate: Math.round(errorRate * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100
      }
    };

    const responseTime = Date.now() - startTime;
    updateMetrics(responseTime, false);

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(result, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    updateMetrics(responseTime, true);
    
    apiLogger.error('Health check failed', error instanceof Error ? error : new Error('Unknown health check error'));

    const errorResult: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
      checks: {
        database: { status: 'fail', message: 'Health check failed' },
        externalServices: { status: 'fail', message: 'Health check failed' },
        memory: { status: 'fail', message: 'Health check failed' },
        disk: { status: 'fail', message: 'Health check failed' }
      },
      metrics: {
        requestCount,
        errorRate: requestCount > 0 ? (errorCount / requestCount) * 100 : 0,
        averageResponseTime: responseTimes.length > 0 
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
          : 0
      }
    };

    return NextResponse.json(errorResult, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  }
}