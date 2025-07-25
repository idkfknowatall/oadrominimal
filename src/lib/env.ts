/**
 * Environment variable validation and configuration
 * This ensures all required environment variables are present and valid
 */

interface EnvConfig {
  NEXT_PUBLIC_AZURACAST_BASE_URL: string;
  NEXT_PUBLIC_AZURACAST_STATION_NAME: string;
  NODE_ENV: 'development' | 'production' | 'test';
  PORT?: string;
  // Firebase configuration
  NEXT_PUBLIC_FIREBASE_API_KEY?: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
  NEXT_PUBLIC_FIREBASE_APP_ID?: string;
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR?: string;
  NEXT_PUBLIC_FIREBASE_EMULATOR_HOST?: string;
  NEXT_PUBLIC_FIREBASE_EMULATOR_PORT?: string;
}

function validateUrl(url: string, name: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    throw new Error(`Invalid URL for ${name}: ${url}`);
  }
}

function validateString(value: string | undefined, name: string, required = true): string {
  if (!value) {
    if (required) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return '';
  }
  
  if (value.trim().length === 0) {
    throw new Error(`Environment variable ${name} cannot be empty`);
  }
  
  return value.trim();
}

function validateNodeEnv(value: string | undefined): 'development' | 'production' | 'test' {
  const validEnvs = ['development', 'production', 'test'] as const;
  
  if (!value || !validEnvs.includes(value as any)) {
    console.warn(`Invalid NODE_ENV: ${value}, defaulting to 'development'`);
    return 'development';
  }
  
  return value as 'development' | 'production' | 'test';
}

function validatePort(value: string | undefined): string | undefined {
  if (!value) return undefined;
  
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${value}. Must be a number between 1 and 65535`);
  }
  
  return value;
}

// Validate and export environment configuration
function createEnvConfig(): EnvConfig {
  try {
    const config: EnvConfig = {
      NEXT_PUBLIC_AZURACAST_BASE_URL: validateUrl(
        process.env.NEXT_PUBLIC_AZURACAST_BASE_URL || 'https://radio.oadro.com',
        'NEXT_PUBLIC_AZURACAST_BASE_URL'
      ),
      NEXT_PUBLIC_AZURACAST_STATION_NAME: validateString(
        process.env.NEXT_PUBLIC_AZURACAST_STATION_NAME || 'oadro',
        'NEXT_PUBLIC_AZURACAST_STATION_NAME'
      ),
      NODE_ENV: validateNodeEnv(process.env.NODE_ENV),
      PORT: validatePort(process.env.PORT),
      // Firebase configuration (optional for now, will be validated in firebase.ts when needed)
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      NEXT_PUBLIC_USE_FIREBASE_EMULATOR: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR,
      NEXT_PUBLIC_FIREBASE_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST,
      NEXT_PUBLIC_FIREBASE_EMULATOR_PORT: process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PORT
    };

    // Log configuration in development
    if (config.NODE_ENV === 'development') {
      console.log('[ENV] Configuration loaded:', {
        ...config,
        // Don't log sensitive values in production
      });
    }

    return config;
  } catch (error) {
    console.error('[ENV] Environment validation failed:', error);
    throw error;
  }
}

// Export validated environment configuration
export const env = createEnvConfig();

// Export individual values for convenience
export const {
  NEXT_PUBLIC_AZURACAST_BASE_URL,
  NEXT_PUBLIC_AZURACAST_STATION_NAME,
  NODE_ENV,
  PORT
} = env;

// Runtime environment checks
export const isDevelopment = NODE_ENV === 'development';
export const isProduction = NODE_ENV === 'production';
export const isTest = NODE_ENV === 'test';

// Validation helper for runtime checks
export function validateEnvironment(): boolean {
  try {
    createEnvConfig();
    return true;
  } catch {
    return false;
  }
}