import { NextResponse } from 'next/server';
import { AZURACAST_BASE_URL, AZURACAST_STATION_NAME } from '@/lib/config';

export const dynamic = 'force-dynamic';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    azuracast: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    application: {
      status: 'healthy';
      memory: {
        used: number;
        total: number;
        percentage: number;
      };
    };
  };
  version?: string;
}

async function checkAzuracastHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(
      `${AZURACAST_BASE_URL}/api/nowplaying/${AZURACAST_STATION_NAME}`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'OADRO-HealthCheck/1.0'
        }
      }
    );
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      // Basic validation that we got expected data structure
      if (data && typeof data === 'object' && 'now_playing' in data) {
        return {
          status: 'healthy',
          responseTime
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          error: 'Invalid response format'
        };
      }
    } else {
      return {
        status: 'unhealthy',
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      used: Math.round(usage.heapUsed / 1024 / 1024), // MB
      total: Math.round(usage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100)
    };
  }
  
  // Fallback for edge runtime
  return {
    used: 0,
    total: 0,
    percentage: 0
  };
}

function getUptime(): number {
  if (typeof process !== 'undefined' && process.uptime) {
    return Math.floor(process.uptime());
  }
  return 0;
}

export async function GET() {
  try {
    const [azuracastHealth] = await Promise.all([
      checkAzuracastHealth()
    ]);
    
    const memory = getMemoryUsage();
    const uptime = getUptime();
    
    // Determine overall status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (azuracastHealth.status === 'unhealthy') {
      overallStatus = 'degraded'; // App can still function without Azuracast
    }
    
    // Check memory usage
    if (memory.percentage > 90) {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
    }
    
    const healthResult: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      services: {
        azuracast: azuracastHealth,
        application: {
          status: 'healthy',
          memory
        }
      },
      version: process.env.npm_package_version || '0.1.0'
    };
    
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json(healthResult, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    const errorResult: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: getUptime(),
      services: {
        azuracast: {
          status: 'unhealthy',
          error: 'Health check failed'
        },
        application: {
          status: 'healthy',
          memory: getMemoryUsage()
        }
      }
    };
    
    return NextResponse.json(errorResult, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}