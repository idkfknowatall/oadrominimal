#!/usr/bin/env node

/**
 * @fileoverview Test runner script specifically for the radio system components
 * This script runs all radio-related tests with appropriate configuration
 */

const { spawn } = require('child_process');
const path = require('path');

const RADIO_TEST_PATTERNS = [
  'src/lib/radio-worker.test.ts',
  'src/lib/interaction-stream.test.ts',
  'src/lib/radio-integration.test.ts',
  'src/lib/radio-performance.test.ts',
  'src/app/api/radio-stream/route.test.ts',
  'src/app/api/radio-stream/integration.test.ts',
];

const JEST_CONFIG = path.join(__dirname, '..', 'jest.config.js');

function runTests(patterns, options = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      '--config',
      JEST_CONFIG,
      '--testPathPattern',
      patterns.join('|'),
      '--verbose',
      '--no-cache',
    ];

    if (options.coverage) {
      args.push('--coverage');
      args.push('--coverageDirectory', 'coverage/radio-system');
    }

    if (options.watch) {
      args.push('--watch');
    }

    if (options.updateSnapshots) {
      args.push('--updateSnapshot');
    }

    console.log('🧪 Running Radio System Tests...');
    console.log('Test patterns:', patterns);
    console.log('Jest args:', args.join(' '));
    console.log('');

    const jest = spawn('npx', ['jest', ...args], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });

    jest.on('close', (code) => {
      if (code === 0) {
        console.log('✅ All radio system tests passed!');
        resolve();
      } else {
        console.log('❌ Some radio system tests failed.');
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    jest.on('error', (error) => {
      console.error('Failed to start test runner:', error);
      reject(error);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    coverage: args.includes('--coverage'),
    watch: args.includes('--watch'),
    updateSnapshots: args.includes('--updateSnapshot') || args.includes('-u'),
  };

  try {
    await runTests(RADIO_TEST_PATTERNS, options);
  } catch (error) {
    console.error('Test execution failed:', error.message);
    process.exit(1);
  }
}

// Handle specific test categories
if (process.argv.includes('--unit')) {
  console.log('Running unit tests only...');
  runTests(
    [
      'src/lib/radio-worker.test.ts',
      'src/lib/interaction-stream.test.ts',
      'src/app/api/radio-stream/route.test.ts',
    ],
    { coverage: process.argv.includes('--coverage') }
  );
} else if (process.argv.includes('--integration')) {
  console.log('Running integration tests only...');
  runTests(
    [
      'src/lib/radio-integration.test.ts',
      'src/app/api/radio-stream/integration.test.ts',
    ],
    { coverage: process.argv.includes('--coverage') }
  );
} else if (process.argv.includes('--performance')) {
  console.log('Running performance tests only...');
  runTests(['src/lib/radio-performance.test.ts'], { coverage: false }); // Performance tests don't need coverage
} else {
  main();
}
