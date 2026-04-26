'use strict';

// Jest configuration for the MWP backend
module.exports = {
  testEnvironment: 'node',
  testPathPattern: 'src/**/*.test.js',
  testMatch: ['**/tests/**/*.test.js', '**/src/**/*.test.js'],
  setupFilesAfterFramework: ['./tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // exclude entry point
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
};
