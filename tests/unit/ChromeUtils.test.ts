import {
  getBookmarkById,
  getAllBookmarks,
  createBookmark,
  updateBookmark
} from '../../src/common/utils/ChromeUtils';
import { jest } from '@jest/globals';

describe('ChromeUtils Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBookmarkById', () => {
    test('should return bookmark details when found', async () => {
      const mockBookmark = {
        id: '123',
        title: 'Test Bookmark',
        url: 'https://example.com',
        parentId: 'folder1'
      };

      // Mock the Chrome API response
      (chrome.bookmarks.get as jest.Mock).mockImplementation(() => {
        return Promise.resolve([mockBookmark]);
      });

      const result = await getBookmarkById('123');

      expect(chrome.bookmarks.get).toHaveBeenCalledWith('123');
      expect(result).toEqual([mockBookmark]);
    });

    test('should not throw error when bookmark not found, just return empty array', async () => {
      // Mock the Chrome API to simulate bookmark not found
      (chrome.bookmarks.get as jest.Mock).mockImplementation(() => {
        return Promise.resolve([]);
      });

      const result = await getBookmarkById('nonexistent');

      expect(result).toEqual([]);
      expect(chrome.bookmarks.get).toHaveBeenCalledWith('nonexistent');
    });

    test('should handle Chrome API errors', async () => {
      // Mock the Chrome API to simulate an error
      (chrome.bookmarks.get as jest.Mock).mockImplementation(() => {
        return Promise.reject(new Error('Chrome API error'));
      });

      await expect(getBookmarkById('123')).rejects.toThrow('Failed to retrieve bookmark');
      expect(chrome.bookmarks.get).toHaveBeenCalledWith('123');
    });
  });

  describe('getAllBookmarks', () => {
    test('should return all bookmarks', async () => {
      const mockBookmarks = [
        {
          id: '1',
          title: 'Bookmarks Bar',
          children: [
            {
              id: '123',
              title: 'Test Bookmark',
              url: 'https://example.com'
            }
          ]
        }
      ];

      (chrome.bookmarks.getTree as jest.Mock).mockImplementation(() => {
        return Promise.resolve(mockBookmarks);
      });

      const result = await getAllBookmarks();

      expect(chrome.bookmarks.getTree).toHaveBeenCalled();
      expect(result).toEqual(mockBookmarks);
    });

    test('should handle Chrome API errors', async () => {
      (chrome.bookmarks.getTree as jest.Mock).mockImplementation(() => {
        return Promise.reject(new Error('Chrome API error'));
      });

      await expect(getAllBookmarks()).rejects.toThrow('Failed to retrieve bookmarks');
      expect(chrome.bookmarks.getTree).toHaveBeenCalled();
    });
  });

  describe('createBookmark', () => {
    test('should create a bookmark successfully', async () => {
      const mockBookmark = {
        id: '123',
        title: 'New Bookmark',
        url: 'https://example.com',
        parentId: 'folder1'
      };

      (chrome.bookmarks.create as jest.Mock).mockImplementation(() => {
        return Promise.resolve(mockBookmark);
      });

      const result = await createBookmark('folder1', 'New Bookmark', 'https://example.com');

      expect(chrome.bookmarks.create).toHaveBeenCalledWith({
        parentId: 'folder1',
        title: 'New Bookmark',
        url: 'https://example.com'
      });
      expect(result).toEqual(mockBookmark);
    });

    test('should handle Chrome API errors', async () => {
      (chrome.bookmarks.create as jest.Mock).mockImplementation(() => {
        return Promise.reject(new Error('Chrome API error'));
      });

      await expect(
        createBookmark('folder1', 'New Bookmark', 'https://example.com')
      ).rejects.toThrow('Failed to create bookmark');
      expect(chrome.bookmarks.create).toHaveBeenCalled();
    });
  });

  describe('updateBookmark', () => {
    test('should update a bookmark successfully', async () => {
      const mockBookmark = {
        id: '123',
        title: 'Updated Bookmark',
        url: 'https://updated.com'
      };

      (chrome.bookmarks.update as jest.Mock).mockImplementation(() => {
        return Promise.resolve(mockBookmark);
      });

      const result = await updateBookmark('123', {
        title: 'Updated Bookmark',
        url: 'https://updated.com'
      });

      expect(chrome.bookmarks.update).toHaveBeenCalledWith('123', {
        title: 'Updated Bookmark',
        url: 'https://updated.com'
      });
      expect(result).toEqual(mockBookmark);
    });

    test('should handle Chrome API errors', async () => {
      (chrome.bookmarks.update as jest.Mock).mockImplementation(() => {
        return Promise.reject(new Error('Chrome API error'));
      });

      await expect(updateBookmark('123', { title: 'Updated Bookmark' })).rejects.toThrow(
        'Failed to update bookmark'
      );
      expect(chrome.bookmarks.update).toHaveBeenCalled();
    });
  });
});
