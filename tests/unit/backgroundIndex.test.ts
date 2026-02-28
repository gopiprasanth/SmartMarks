/**
 * Tests for background/index.ts message handling
 */

import { jest } from '@jest/globals';

const mockGetBookmarkAnalysis = jest.fn(async () => ({}));
const mockSuggestFolders = jest.fn(async (): Promise<any[]> => []);
const mockRecordFolderSelection = jest.fn(async () => undefined);
const mockCreateFolderForBookmark = jest.fn(async () => null as any);
const mockGetBookmarkService = jest.fn(() => ({
  getBookmarkAnalysis: mockGetBookmarkAnalysis,
  suggestFolders: mockSuggestFolders,
  recordFolderSelection: mockRecordFolderSelection,
  createFolderForBookmark: mockCreateFolderForBookmark
}));

const mockInit = jest.fn(async () => undefined);

jest.mock('../../src/common/utils/Logger', () => ({
  LogLevel: {
    INFO: 'INFO'
  },
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

jest.mock('../../src/background/services/BookmarkEventHandler', () => ({
  BookmarkEventHandler: jest.fn().mockImplementation(() => ({
    init: mockInit,
    getBookmarkService: mockGetBookmarkService
  }))
}));

describe('background/index.ts', () => {
  let messageListener: (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ) => boolean | void;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    (global as any).chrome = {
      runtime: {
        onInstalled: {
          addListener: jest.fn()
        },
        onMessage: {
          addListener: jest.fn((callback: typeof messageListener) => {
            messageListener = callback;
          })
        },
        getManifest: jest.fn(() => ({ version: '1.0.0' }))
      }
    };

    await import('../../src/background/index');
  });

  test('handles getFolderSuggestions and returns ranked folder data', async () => {
    mockSuggestFolders.mockResolvedValueOnce([
      {
        id: 'folder-1',
        title: 'Tech',
        path: 'Bookmarks Bar/Tech',
        bookmarkCount: 10
      }
    ]);

    const responsePromise = new Promise<any>(resolve => {
      const handled = messageListener(
        {
          action: 'getFolderSuggestions',
          title: 'TypeScript Handbook',
          url: 'https://www.typescriptlang.org/docs/'
        },
        {} as chrome.runtime.MessageSender,
        resolve
      );

      expect(handled).toBe(true);
    });

    const response = await responsePromise;

    expect(mockGetBookmarkService).toHaveBeenCalled();
    expect(mockSuggestFolders).toHaveBeenCalledWith(
      'TypeScript Handbook',
      'https://www.typescriptlang.org/docs/'
    );
    expect(response).toEqual({
      status: 'success',
      data: [
        {
          id: 'folder-1',
          title: 'Tech',
          path: 'Bookmarks Bar/Tech',
          bookmarkCount: 10
        }
      ]
    });
  });

  test('defaults invalid title/url payloads to empty strings', async () => {
    mockSuggestFolders.mockResolvedValueOnce([]);

    const responsePromise = new Promise<any>(resolve => {
      messageListener(
        {
          action: 'getFolderSuggestions',
          title: { invalid: true },
          url: null
        },
        {} as chrome.runtime.MessageSender,
        resolve
      );
    });

    const response = await responsePromise;

    expect(mockSuggestFolders).toHaveBeenCalledWith('', '');
    expect(response).toEqual({
      status: 'success',
      data: []
    });
  });

  test('returns error response when suggestion lookup fails', async () => {
    mockSuggestFolders.mockRejectedValueOnce(new Error('suggestion failure'));

    const responsePromise = new Promise<any>(resolve => {
      messageListener(
        {
          action: 'getFolderSuggestions',
          title: 'Fail Case',
          url: 'https://example.com/fail'
        },
        {} as chrome.runtime.MessageSender,
        resolve
      );
    });

    const response = await responsePromise;
    expect(response).toEqual({
      status: 'error',
      message: 'suggestion failure'
    });
  });


  test('records user folder selection for preference learning', async () => {
    const responsePromise = new Promise<any>(resolve => {
      messageListener(
        {
          action: 'recordFolderSelection',
          folderId: 'folder-12'
        },
        {} as chrome.runtime.MessageSender,
        resolve
      );
    });

    const response = await responsePromise;
    expect(mockRecordFolderSelection).toHaveBeenCalledWith('folder-12');
    expect(response).toEqual({ status: 'success' });
  });

  test('creates intelligent folder and returns created folder payload', async () => {
    mockCreateFolderForBookmark.mockResolvedValueOnce({
      id: 'f-created',
      title: 'Docs Resources',
      path: 'Bookmarks Bar/Docs Resources',
      bookmarkCount: 0
    });

    const responsePromise = new Promise<any>(resolve => {
      messageListener(
        {
          action: 'createIntelligentFolder',
          title: 'API Docs',
          url: 'https://docs.example.com'
        },
        {} as chrome.runtime.MessageSender,
        resolve
      );
    });

    const response = await responsePromise;
    expect(mockCreateFolderForBookmark).toHaveBeenCalledWith('API Docs', 'https://docs.example.com');
    expect(response).toEqual({
      status: 'success',
      data: {
        id: 'f-created',
        title: 'Docs Resources',
        path: 'Bookmarks Bar/Docs Resources',
        bookmarkCount: 0
      }
    });
  });
});
