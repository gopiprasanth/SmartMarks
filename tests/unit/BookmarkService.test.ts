/**
 * Tests for BookmarkService
 */
import {
  BookmarkService,
  BookmarkAnalysis,
  BookmarkFolder
} from '../../src/common/services/BookmarkService';
import {
  getAllBookmarks,
  getAllBookmarkFolders,
  getBookmarkChildren
} from '../../src/common/utils/ChromeUtils';
import { jest } from '@jest/globals';

// Mock ChromeUtils functions
jest.mock('../../src/common/utils/ChromeUtils', () => ({
  getAllBookmarks: jest.fn(),
  getAllBookmarkFolders: jest.fn(),
  getBookmarkChildren: jest.fn()
}));

// Mock Logger
jest.mock('../../src/common/utils/Logger');

describe('BookmarkService', () => {
  let bookmarkService: BookmarkService;

  beforeEach(() => {
    jest.clearAllMocks();
    bookmarkService = new BookmarkService();
  });

  describe('analyzeBookmarks', () => {
    test('should retrieve and analyze bookmarks successfully', async () => {
      // Final refinement of mock data to align with chrome.bookmarks.BookmarkTreeNode type
      const finalMockBookmarkTree: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '1',
          title: 'Bookmarks Bar',
          children: [
            {
              id: '2',
              title: 'Tech Folder',
              children: [
                {
                  id: '3',
                  title: 'Google',
                  url: 'https://www.google.com',
                  children: []
                }
              ]
            }
          ]
        }
      ];

      const finalMockFolders: chrome.bookmarks.BookmarkTreeNode[] = [
        {
          id: '2',
          title: 'Tech Folder',
          parentId: '1',
          children: [
            {
              id: '3',
              title: 'Google',
              url: 'https://www.google.com',
              children: []
            }
          ]
        }
      ];

      // Updated mockResolvedValue calls to use final mock data
      (getAllBookmarks as jest.MockedFunction<typeof getAllBookmarks>).mockResolvedValue(
        finalMockBookmarkTree
      );
      (
        getAllBookmarkFolders as jest.MockedFunction<typeof getAllBookmarkFolders>
      ).mockResolvedValue(finalMockFolders);
      (getBookmarkChildren as jest.Mock).mockImplementation(function (folderId) {
        if (folderId === '1') {
          return Promise.resolve(finalMockFolders);
        } else if (folderId === '2') {
          return Promise.resolve([
            {
              id: '3',
              title: 'Google',
              url: 'https://www.google.com',
              children: []
            }
          ] as chrome.bookmarks.BookmarkTreeNode[]);
        }
        return Promise.resolve([] as chrome.bookmarks.BookmarkTreeNode[]);
      });

      // Execute test
      const result = await bookmarkService.analyzeBookmarks();

      // Verify results
      expect(getAllBookmarks).toHaveBeenCalled();
      expect(getAllBookmarkFolders).toHaveBeenCalled();
      expect(getBookmarkChildren).toHaveBeenCalled();

      // Verify analysis structure
      expect(result).toBeDefined();
      expect(result.totalBookmarks).toBeGreaterThan(0);
      expect(result.totalFolders).toBeGreaterThan(0);
      expect(result.folders.size).toBeGreaterThan(0);
      expect(result.folders.has('1')).toBeTruthy();
    });

    test('should handle empty bookmarks', async () => {
      // Mock empty bookmarks
      (getAllBookmarks as jest.MockedFunction<typeof getAllBookmarks>).mockResolvedValue([]);
      (
        getAllBookmarkFolders as jest.MockedFunction<typeof getAllBookmarkFolders>
      ).mockResolvedValue([]);
      (getBookmarkChildren as jest.MockedFunction<typeof getBookmarkChildren>).mockResolvedValue(
        []
      );

      // Execute test
      const result = await bookmarkService.analyzeBookmarks();

      // Verify results
      expect(result.totalBookmarks).toBe(0);
      expect(result.totalFolders).toBe(0);
      expect(result.folders.size).toBe(0);
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error
      (getAllBookmarks as jest.Mock).mockRejectedValue(new Error('API failure') as never);

      // Execute test & verify error is thrown
      await expect(bookmarkService.analyzeBookmarks()).rejects.toThrow(
        'Failed to analyze bookmarks'
      );
    });
  });

  describe('suggestFolders', () => {
    test('should suggest relevant folders based on keywords', async () => {
      // Create mock data that properly implements the BookmarkFolder interface
      const mockFolder: BookmarkFolder = {
        id: '2',
        title: 'Tech Folder',
        parentId: '1',
        path: 'Bookmarks Bar/Tech Folder',
        children: [
          {
            id: '3',
            title: 'Google',
            url: 'https://www.google.com',
            children: []
          }
        ],
        bookmarkCount: 1,
        keywords: new Set<string>(['google', 'search'])
      };

      const rootFolder: BookmarkFolder = {
        id: '1',
        title: 'Bookmarks Bar',
        path: 'Bookmarks Bar',
        children: [
          {
            id: '2',
            title: 'Tech Folder',
            parentId: '1',
            children: [
              {
                id: '3',
                title: 'Google',
                url: 'https://www.google.com',
                children: []
              }
            ]
          }
        ],
        bookmarkCount: 1,
        keywords: new Set<string>()
      };

      const mockAnalysis: BookmarkAnalysis = {
        folders: new Map([['2', mockFolder]]),
        totalBookmarks: 1,
        totalFolders: 1,
        rootFolders: [rootFolder]
      };

      // Updated mockResolvedValue calls to use corrected mock data
      jest.spyOn(bookmarkService, 'getBookmarkAnalysis').mockResolvedValue(mockAnalysis);

      // Test a URL and title that should match the Tech folder
      const suggestions = await bookmarkService.suggestFolders(
        'Google Search Engine',
        'https://google.com/search'
      );

      // Expect Tech folder to be suggested first
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].title).toBe('Tech Folder');
    });

    test('should return empty array when no relevant folders found', async () => {
      // Mock analyzed bookmark data with no matching keywords
      // Create a proper BookmarkFolder object for the test
      const mockFolder: BookmarkFolder = {
        id: '1',
        title: 'Tech',
        path: 'Tech',
        bookmarkCount: 5,
        keywords: new Set(['google', 'technology', 'search']),
        children: [] // Adding the required children property
      };

      const mockAnalysis: BookmarkAnalysis = {
        folders: new Map([['1', mockFolder]]),
        totalBookmarks: 5,
        totalFolders: 1,
        rootFolders: []
      };

      // Spy on the getBookmarkAnalysis method to return our mock data
      jest.spyOn(bookmarkService, 'getBookmarkAnalysis').mockResolvedValue(mockAnalysis);

      // Test with URL and title that have no matches
      const suggestions = await bookmarkService.suggestFolders(
        'Recipe for pasta',
        'https://cooking.com/pasta'
      );

      // Expect no suggestions
      expect(suggestions).toHaveLength(0);
    });

    test('should extract and match keywords correctly', async () => {
      // Mock minimal service for keyword extraction testing
      const mockFolder: BookmarkFolder = {
        id: '1',
        title: 'Programming',
        path: 'Programming',
        bookmarkCount: 1,
        keywords: new Set(['javascript', 'typescript', 'programming']),
        children: [] // Adding the required children property
      };

      const mockAnalysis: BookmarkAnalysis = {
        folders: new Map([['1', mockFolder]]),
        totalBookmarks: 1,
        totalFolders: 1,
        rootFolders: []
      };

      jest.spyOn(bookmarkService, 'getBookmarkAnalysis').mockResolvedValue(mockAnalysis);

      // Test with multiple matching keywords
      const suggestions = await bookmarkService.suggestFolders(
        'TypeScript Programming Guide',
        'https://example.com/typescript-guide'
      );

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].title).toBe('Programming');
    });
  });
});


describe('BookmarkService personalization features', () => {
  let service: BookmarkService;

  beforeEach(() => {
    service = new BookmarkService();
    (global as any).chrome = {
      storage: {
        sync: {
          get: jest.fn((_defaults: any, cb: (value: any) => void) =>
            cb({ folderPreferences: { 'folder-a': 3 } })
          ),
          set: jest.fn((_value: any, cb: () => void) => cb())
        }
      },
      bookmarks: {
        create: jest.fn((details: any, cb: (folder: any) => void) =>
          cb({ id: 'created-folder', title: details.title, parentId: details.parentId })
        )
      }
    };
  });

  test('recordFolderSelection increments folder preference counter', async () => {
    await service.recordFolderSelection('folder-a');

    expect((global as any).chrome.storage.sync.set).toHaveBeenCalledWith(
      { folderPreferences: { 'folder-a': 4 } },
      expect.any(Function)
    );
  });

  test('suggestFolderName derives readable name from domain', () => {
    expect(service.suggestFolderName('Any title', 'https://docs.python.org/3/')).toBe(
      'Docs Resources'
    );
  });

  test('createFolderForBookmark creates a folder beneath root', async () => {
    jest.spyOn(service, 'getBookmarkAnalysis').mockResolvedValue({
      folders: new Map(),
      totalBookmarks: 0,
      totalFolders: 1,
      rootFolders: [
        {
          id: '1',
          title: 'Bookmarks Bar',
          path: 'Bookmarks Bar',
          children: [],
          bookmarkCount: 0,
          keywords: new Set()
        }
      ]
    });
    jest.spyOn(service, 'analyzeBookmarks').mockResolvedValue({
      folders: new Map(),
      totalBookmarks: 0,
      totalFolders: 1,
      rootFolders: []
    });

    const created = await service.createFolderForBookmark('TypeScript Handbook', 'https://typescriptlang.org');

    expect((global as any).chrome.bookmarks.create).toHaveBeenCalled();
    expect(created?.id).toBe('created-folder');
  });
});


describe('BookmarkService v2 categorization', () => {
  test('uses LLM suggestions when v2 mode and llm enabled', async () => {
    const service = new BookmarkService();

    const folderA: BookmarkFolder = {
      id: 'a',
      title: 'General',
      path: 'Bookmarks Bar/General',
      children: [],
      bookmarkCount: 2,
      keywords: new Set(['general'])
    };
    const folderB: BookmarkFolder = {
      id: 'b',
      title: 'LLM Notes',
      path: 'Bookmarks Bar/LLM Notes',
      children: [],
      bookmarkCount: 2,
      keywords: new Set(['llm'])
    };

    jest.spyOn(service, 'getBookmarkAnalysis').mockResolvedValue({
      folders: new Map([
        ['a', folderA],
        ['b', folderB]
      ]),
      totalBookmarks: 4,
      totalFolders: 2,
      rootFolders: []
    });

    (global as any).chrome = {
      storage: {
        sync: {
          get: jest.fn((defaults: any, cb: (value: any) => void) =>
            cb({
              ...defaults,
              categorizationSettings: {
                categorizationVersion: 'v2',
                llm: {
                  enabled: true,
                  provider: 'openai-compatible',
                  model: 'llama3.1',
                  apiKey: '',
                  baseUrl: 'http://localhost:11434/v1',
                  temperature: 0.2
                }
              }
            })
          )
        }
      }
    };

    jest.spyOn((service as any).llmCategorizer, 'suggestFolders').mockResolvedValue(['b']);

    const result = await service.suggestFolders('Local model setup', 'https://ollama.ai');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });

  test('merges provider-specific defaults from JSON when storage omits them', async () => {
    const service = new BookmarkService();

    const folderA: BookmarkFolder = {
      id: 'a',
      title: 'General',
      path: 'Bookmarks Bar/General',
      children: [],
      bookmarkCount: 2,
      keywords: new Set(['general'])
    };
    const folderB: BookmarkFolder = {
      id: 'b',
      title: 'LLM Notes',
      path: 'Bookmarks Bar/LLM Notes',
      children: [],
      bookmarkCount: 2,
      keywords: new Set(['llm'])
    };

    jest.spyOn(service, 'getBookmarkAnalysis').mockResolvedValue({
      folders: new Map([
        ['a', folderA],
        ['b', folderB]
      ]),
      totalBookmarks: 4,
      totalFolders: 2,
      rootFolders: []
    });

    // only provider and apiKey are stored; model/baseUrl/temperature should come
    // from the JSON defaults for that provider
    (global as any).chrome = {
      storage: {
        sync: {
          get: jest.fn((defaults: any, cb: (value: any) => void) =>
            cb({
              ...defaults,
              categorizationSettings: {
                categorizationVersion: 'v2',
                llm: {
                  enabled: true,
                  provider: 'openai',
                  apiKey: 'abc123'
                }
              }
            })
          )
        }
      }
    };

    jest.spyOn((service as any).llmCategorizer, 'suggestFolders').mockResolvedValue(['b']);

    const result = await service.suggestFolders('Local model setup', 'https://ollama.ai');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');

    expect((service as any).llmCategorizer.suggestFolders).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        provider: 'openai',
        apiKey: 'abc123',
        model: 'gpt-4o-mini',
        baseUrl: 'https://api.openai.com/v1',
        temperature: 0.2
      })
    );
  });
});
