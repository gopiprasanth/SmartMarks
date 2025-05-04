/**
 * Tests for BookmarkEventHandler
 */

import { BookmarkEventHandler } from '../../src/background/services/BookmarkEventHandler';
import { Logger, LogLevel } from '../../src/common/utils/Logger';

// Mock Logger
jest.mock('../../src/common/utils/Logger');

// Mock BookmarkService
jest.mock('../../src/common/services/BookmarkService', () => {
  return {
    BookmarkService: jest.fn().mockImplementation(() => ({
      analyzeBookmarks: jest.fn().mockResolvedValue({
        totalBookmarks: 10,
        totalFolders: 5,
        folders: new Map(),
        rootFolders: []
      }),
      suggestFolders: jest.fn().mockResolvedValue([
        {
          id: 'folder1',
          title: 'Suggested Folder',
          path: 'Parent/Suggested Folder',
          bookmarkCount: 5
        }
      ]),
      getBookmarkService: jest.fn().mockReturnThis()
    }))
  };
});

// Mock Chrome API
const mockChrome = {
  bookmarks: {
    onCreated: { addListener: jest.fn() },
    onChanged: { addListener: jest.fn() },
    onMoved: { addListener: jest.fn() },
    onRemoved: { addListener: jest.fn() },
    get: jest.fn()
  },
  runtime: {
    lastError: null,
    sendMessage: jest.fn().mockReturnValue(Promise.resolve())
  }
};

// Mock ChromeUtils
jest.mock('../../src/common/utils/ChromeUtils', () => ({
  getBookmarkById: jest.fn()
}));

// Import mocked ChromeUtils
import { getBookmarkById } from '../../src/common/utils/ChromeUtils';

// Assign mock to global
(global as any).chrome = mockChrome;

describe('BookmarkEventHandler', () => {
  let handler: BookmarkEventHandler;
  let mockLoggerInstance: jest.Mocked<Logger>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup logger mock
    mockLoggerInstance = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      setLevel: jest.fn()
    } as unknown as jest.Mocked<Logger>;
    (Logger as jest.MockedClass<typeof Logger>).mockImplementation(() => mockLoggerInstance);

    // Create a new handler for each test
    handler = new BookmarkEventHandler();
  });

  test('should initialize and register event listeners', async () => {
    // Call init
    await handler.init();

    // Verify that all listeners are registered
    expect(mockChrome.bookmarks.onCreated.addListener).toHaveBeenCalled();
    expect(mockChrome.bookmarks.onChanged.addListener).toHaveBeenCalled();
    expect(mockChrome.bookmarks.onMoved.addListener).toHaveBeenCalled();
    expect(mockChrome.bookmarks.onRemoved.addListener).toHaveBeenCalled();

    // Verify initialization is logged
    expect(mockLoggerInstance.info).toHaveBeenCalledWith('Initializing bookmark event handlers');
    expect(mockLoggerInstance.info).toHaveBeenCalledWith(
      'Bookmark event handlers initialized successfully'
    );

    // Verify bookmark analysis was performed during initialization
    const bookmarkService = (handler as any).bookmarkService;
    expect(bookmarkService.analyzeBookmarks).toHaveBeenCalled();
  });

  test('should handle bookmark created event with folder suggestions', async () => {
    // Setup mock to return bookmark details
    const mockBookmark = {
      id: '123',
      title: 'Test Bookmark',
      url: 'https://example.com',
      parentId: 'folder1'
    };
    (getBookmarkById as jest.Mock).mockResolvedValueOnce([mockBookmark]);

    // Initialize handler
    await handler.init();

    // Get the callback that was registered
    const createdCallback = mockChrome.bookmarks.onCreated.addListener.mock.calls[0][0];

    // Call the callback with test data
    await createdCallback('123', {
      index: 0,
      parentId: 'folder1',
      title: 'Test Bookmark',
      url: 'https://example.com'
    });

    // Verify that the bookmark details were retrieved
    expect(getBookmarkById).toHaveBeenCalledWith('123');

    // Verify logging happened correctly
    expect(mockLoggerInstance.info).toHaveBeenCalledWith(
      'Bookmark created',
      expect.objectContaining({ id: '123' })
    );

    // Verify folder suggestions were requested
    const bookmarkService = (handler as any).bookmarkService;
    expect(bookmarkService.suggestFolders).toHaveBeenCalledWith(
      'Test Bookmark',
      'https://example.com'
    );

    // Verify message was sent with suggestions
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'folderSuggestions',
        bookmarkId: '123',
        suggestions: expect.arrayContaining([
          expect.objectContaining({ id: 'folder1', title: 'Suggested Folder' })
        ])
      })
    );
  });

  test('should handle bookmark changed event', async () => {
    // Initialize handler
    await handler.init();

    // Get the callback that was registered
    const changedCallback = mockChrome.bookmarks.onChanged.addListener.mock.calls[0][0];

    // Create change info
    const changeInfo = {
      title: 'Updated Title',
      url: 'https://example-updated.com'
    };

    // Call the callback with test data
    await changedCallback('123', changeInfo);

    // Verify logging happened correctly
    expect(mockLoggerInstance.info).toHaveBeenCalledWith('Bookmark changed', {
      id: '123',
      changes: changeInfo
    });

    // Verify analysis was refreshed since title changed
    const bookmarkService = (handler as any).bookmarkService;
    expect(bookmarkService.analyzeBookmarks).toHaveBeenCalledTimes(2); // Once during init, once after change
  });

  test('should handle bookmark moved event', async () => {
    // Initialize handler
    await handler.init();

    // Get the callback that was registered
    const movedCallback = mockChrome.bookmarks.onMoved.addListener.mock.calls[0][0];

    // Create move info
    const moveInfo = {
      index: 2,
      oldIndex: 1,
      parentId: 'newFolder',
      oldParentId: 'oldFolder'
    };

    // Call the callback with test data
    await movedCallback('123', moveInfo);

    // Verify logging happened correctly
    expect(mockLoggerInstance.info).toHaveBeenCalledWith('Bookmark moved', {
      id: '123',
      from: 'oldFolder',
      to: 'newFolder'
    });

    // Verify analysis was refreshed
    const bookmarkService = (handler as any).bookmarkService;
    expect(bookmarkService.analyzeBookmarks).toHaveBeenCalledTimes(2); // Once during init, once after move
  });

  test('should handle bookmark removed event', async () => {
    // Initialize handler
    await handler.init();

    // Get the callback that was registered
    const removedCallback = mockChrome.bookmarks.onRemoved.addListener.mock.calls[0][0];

    // Create remove info
    const removeInfo = {
      index: 1,
      parentId: 'folder1'
    };

    // Call the callback with test data
    await removedCallback('123', removeInfo);

    // Verify logging happened correctly
    expect(mockLoggerInstance.info).toHaveBeenCalledWith('Bookmark removed', {
      id: '123',
      parentId: 'folder1'
    });

    // Verify analysis was refreshed
    const bookmarkService = (handler as any).bookmarkService;
    expect(bookmarkService.analyzeBookmarks).toHaveBeenCalledTimes(2); // Once during init, once after removal
  });

  test('should handle error when retrieving bookmark details fails', async () => {
    // Setup mock to throw an error
    const mockError = new Error('API failure');
    (getBookmarkById as jest.Mock).mockRejectedValueOnce(mockError);

    // Initialize handler
    await handler.init();

    // Get the callback that was registered
    const createdCallback = mockChrome.bookmarks.onCreated.addListener.mock.calls[0][0];

    // Call the callback with test data
    await createdCallback('123', {
      index: 0,
      parentId: 'folder1',
      title: 'Test Bookmark',
      url: 'https://example.com'
    });

    // Verify that the error was logged
    expect(mockLoggerInstance.error).toHaveBeenCalledWith(
      'Error handling bookmark creation',
      mockError
    );
  });

  test('should create logger with correct context and log level', () => {
    // Verify logger was created with correct parameters
    expect(Logger).toHaveBeenCalledWith('BookmarkEventHandler', LogLevel.INFO);
  });

  test('should provide access to bookmark service instance', () => {
    // Test the getter method
    const bookmarkService = handler.getBookmarkService();
    expect(bookmarkService).toBeDefined();
  });
});
