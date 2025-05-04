// Mock the global chrome object for testing
const chrome = require('jest-chrome');
// Remove the redundant jest import since it's already available globally

// Set up global chrome object
global.chrome = chrome;

// Initialize core functionality needed for tests
chrome.bookmarks = {
  ...chrome.bookmarks,
  get: jest.fn((id, callback) => {
    if (callback) {
      callback([]);
    }
    return Promise.resolve([]);
  }),
  getTree: jest.fn(() => Promise.resolve([])),
  getChildren: jest.fn(() => Promise.resolve([])),
  create: jest.fn(() => Promise.resolve({})),
  update: jest.fn(() => Promise.resolve({})),
  move: jest.fn(() => Promise.resolve({})),
  remove: jest.fn(() => Promise.resolve()),
  removeTree: jest.fn(() => Promise.resolve()),
  search: jest.fn(() => Promise.resolve([])),
  onCreated: {
    addListener: jest.fn()
  },
  onChanged: {
    addListener: jest.fn()
  },
  onMoved: {
    addListener: jest.fn()
  },
  onRemoved: {
    addListener: jest.fn()
  }
};

chrome.runtime = {
  ...chrome.runtime,
  onInstalled: {
    addListener: jest.fn()
  }
};
