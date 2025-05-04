/**
 * Background Script for SmartMarks
 *
 * This script initializes the extension's background processes:
 * - Sets up event listeners for bookmark operations
 * - Initializes the logging system
 * - Handles extension lifecycle events
 */

import { Logger, LogLevel } from '../common/utils/Logger';
import { BookmarkEventHandler } from './services/BookmarkEventHandler';

// Initialize logger
const logger = new Logger('Background', LogLevel.INFO);
logger.info('SmartMarks background script initializing...');

// Initialize event handlers
const bookmarkEventHandler = new BookmarkEventHandler();

// Extension initialization
const initExtension = () => {
  logger.info('SmartMarks extension initialization started');

  try {
    // Initialize bookmark event handler
    bookmarkEventHandler.init();

    logger.info('SmartMarks extension initialization completed successfully');
  } catch (error) {
    logger.error('SmartMarks extension initialization failed', error);
  }
};

// Event listener for extension installation
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    logger.info('SmartMarks extension installed');
    // Future: First-time setup here
  } else if (details.reason === 'update') {
    const currentVersion = chrome.runtime.getManifest().version;
    logger.info(`SmartMarks extension updated to version ${currentVersion}`);
    // Future: Migration logic here if needed
  }
});

// Initialize extension
initExtension();

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.debug('Message received', { message, sender });

  // Handle different message types here
  // For now, just acknowledge receipt
  sendResponse({ status: 'received' });

  // Return true to indicate we'll respond asynchronously
  return true;
});

logger.info('SmartMarks background script initialized');
