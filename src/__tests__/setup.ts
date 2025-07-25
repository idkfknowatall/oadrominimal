/**
 * Jest test setup file
 * This file is run before each test file
 */

import '@testing-library/jest-dom';
import React from 'react';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_AZURACAST_BASE_URL = 'https://test.example.com';
process.env.NEXT_PUBLIC_AZURACAST_STATION_NAME = 'test-station';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ThumbsUp: jest.fn(({ className, ...props }) => 
    React.createElement('svg', { 
      className, 
      'data-testid': 'thumbs-up-icon', 
      ...props 
    }, React.createElement('title', {}, 'ThumbsUp'))
  ),
  ThumbsDown: jest.fn(({ className, ...props }) => 
    React.createElement('svg', { 
      className, 
      'data-testid': 'thumbs-down-icon', 
      ...props 
    }, React.createElement('title', {}, 'ThumbsDown'))
  ),
  Vote: jest.fn(({ className, ...props }) => 
    React.createElement('svg', { 
      className, 
      'data-testid': 'vote-icon', 
      ...props 
    }, React.createElement('title', {}, 'Vote'))
  ),
}));

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};