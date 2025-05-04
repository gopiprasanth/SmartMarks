import { BookmarkEventHandler } from '../../src/background/services/BookmarkEventHandler';
import { jest } from '@jest/globals';

// Import jest-chrome properly and setup global chrome mock
import * as Chrome from 'jest-chrome';

// Define types for bookmark events and data
type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode;
type BookmarkChangeInfo = { title?: string; url?: string };

describe('BookmarkEventHandler Integration Tests', () => {
  let bookmarkEventHandler: BookmarkEventHandler;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create a new instance for each test
    bookmarkEventHandler = new BookmarkEventHandler();
  });

  test('should register all event listeners on init', () => {
    // Initialize the handler
    bookmarkEventHandler.init();

    // Check that event listeners were registered
    expect(chrome.bookmarks.onCreated.addListener).toHaveBeenCalled();
    expect(chrome.bookmarks.onChanged.addListener).toHaveBeenCalled();
    expect(chrome.bookmarks.onMoved.addListener).toHaveBeenCalled();
    expect(chrome.bookmarks.onRemoved.addListener).toHaveBeenCalled();
  });

  test('should handle bookmark creation events', async () => {
    // Setup a spy on console.info to check logging since the Logger uses info
    const consoleSpy = jest.spyOn(console, 'info');

    // Initialize the handler
    bookmarkEventHandler.init();

    // Get the callback function that was registered
    const callback = (chrome.bookmarks.onCreated.addListener as jest.Mock).mock.calls[0][0];

    // Create mock bookmark data
    const mockId = '123';
    const mockBookmark: BookmarkTreeNode = {
      id: '123',
      title: 'Test Bookmark',
      url: 'https://example.com',
      parentId: 'folder1'
    };

    // Mock the getBookmarkById function to return our test data
    (chrome.bookmarks.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve([mockBookmark]);
    });

    // Trigger the callback with our test data
    if (typeof callback === 'function') {
      await callback(mockId, mockBookmark);
    }

    // Check that appropriate logging happened - Logger uses console.info not console.log
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BookmarkEventHandler] Bookmark created'),
      expect.objectContaining({ id: mockId })
    );

    // It should also call getBookmarkById and log the full details
    expect(chrome.bookmarks.get).toHaveBeenCalledWith(mockId);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BookmarkEventHandler] Bookmark created with details'),
      expect.objectContaining({
        id: mockId,
        fullDetails: [mockBookmark]
      })
    );
  });

  test('should handle bookmark change events', () => {
    // Setup a spy on console.info to check logging
    const consoleSpy = jest.spyOn(console, 'info');

    // Initialize the handler
    bookmarkEventHandler.init();

    // Get the callback function that was registered
    const callback = (chrome.bookmarks.onChanged.addListener as jest.Mock).mock.calls[0][0];

    // Create mock change data
    const mockId = '123';
    const mockChangeInfo: BookmarkChangeInfo = {
      title: 'Updated Title',
      url: 'https://example-updated.com'
    };

    // Trigger the callback with our test data
    if (typeof callback === 'function') {
      callback(mockId, mockChangeInfo);
    }

    // Check that appropriate logging happened with Logger format
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BookmarkEventHandler] Bookmark changed'),
      expect.objectContaining({
        id: mockId,
        changes: mockChangeInfo
      })
    );
  });

  test('should handle bookmark move events', () => {
    // Setup a spy on console.info
    const consoleSpy = jest.spyOn(console, 'info');

    // Initialize the handler
    bookmarkEventHandler.init();

    // Get the callback function that was registered
    const callback = (chrome.bookmarks.onMoved.addListener as jest.Mock).mock.calls[0][0];

    // Create mock move data
    const mockId = '123';
    const mockMoveInfo = {
      parentId: 'newFolder',
      oldParentId: 'oldFolder',
      index: 0,
      oldIndex: 1
    };

    // Trigger the callback with our test data
    if (typeof callback === 'function') {
      callback(mockId, mockMoveInfo);
    }

    // Check that appropriate logging happened
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BookmarkEventHandler] Bookmark moved'),
      expect.objectContaining({
        id: mockId,
        from: mockMoveInfo.oldParentId,
        to: mockMoveInfo.parentId
      })
    );
  });

  test('should handle bookmark removal events', () => {
    // Setup a spy on console.info
    const consoleSpy = jest.spyOn(console, 'info');

    // Initialize the handler
    bookmarkEventHandler.init();

    // Get the callback function that was registered
    const callback = (chrome.bookmarks.onRemoved.addListener as jest.Mock).mock.calls[0][0];

    // Create mock remove data
    const mockId = '123';
    const mockRemoveInfo = {
      parentId: 'folder1',
      index: 0
    };

    // Trigger the callback with our test data
    if (typeof callback === 'function') {
      callback(mockId, mockRemoveInfo);
    }

    // Check that appropriate logging happened
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BookmarkEventHandler] Bookmark removed'),
      expect.objectContaining({
        id: mockId,
        parentId: mockRemoveInfo.parentId
      })
    );
  });
});
