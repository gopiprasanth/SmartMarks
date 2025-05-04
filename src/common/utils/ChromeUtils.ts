/**
 * ChromeUtils.ts - Utility functions for Chrome API interactions
 */

import { Logger, LogLevel } from './Logger';

const logger = new Logger('ChromeUtils', LogLevel.INFO);

/**
 * Types for bookmark event callbacks
 */
export type BookmarkChangeInfo = {
  title: string;
  url?: string;
};

export type BookmarkCreateInfo = {
  index: number;
  parentId: string;
  title: string;
  url?: string;
};

export type BookmarkMoveInfo = {
  index: number;
  oldIndex: number;
  parentId: string;
  oldParentId: string;
};

export type BookmarkRemoveInfo = {
  index: number;
  parentId: string;
};

/**
 * Get all bookmarks from Chrome's bookmark API
 */
export const getAllBookmarks = async (): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
  try {
    const bookmarks = await chrome.bookmarks.getTree();
    logger.info('Retrieved all bookmarks');
    return bookmarks;
  } catch (error) {
    logger.error('Error retrieving bookmarks', error);
    throw new Error(`Failed to retrieve bookmarks: ${error}`);
  }
};

/**
 * Get a specific bookmark by ID
 */
export const getBookmarkById = async (id: string): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
  try {
    const bookmark = await chrome.bookmarks.get(id); // Now passing id directly, not as an array
    logger.info(`Retrieved bookmark with ID: ${id}`);
    return bookmark;
  } catch (error) {
    logger.error(`Error retrieving bookmark with ID: ${id}`, error);
    throw new Error(`Failed to retrieve bookmark: ${error}`);
  }
};

/**
 * Get children of a bookmark folder
 */
export const getBookmarkChildren = async (
  folderId: string
): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
  try {
    const children = await chrome.bookmarks.getChildren(folderId);
    logger.info(`Retrieved children of folder: ${folderId}`);
    return children;
  } catch (error) {
    logger.error(`Error retrieving children of folder: ${folderId}`, error);
    throw new Error(`Failed to retrieve bookmark children: ${error}`);
  }
};

/**
 * Get all bookmark folders
 */
export const getAllBookmarkFolders = async (): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
  const allBookmarks = await getAllBookmarks();
  const folders: chrome.bookmarks.BookmarkTreeNode[] = [];

  // Recursive function to extract folders
  const extractFolders = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
    for (const node of nodes) {
      if (!node.url && node.id !== '0' && node.id !== '1' && node.id !== '2') {
        folders.push(node);
      }
      if (node.children) {
        extractFolders(node.children);
      }
    }
  };

  extractFolders(allBookmarks);
  logger.info(`Found ${folders.length} bookmark folders`);
  return folders;
};

/**
 * Create a new bookmark
 */
export const createBookmark = async (
  parentId: string,
  title: string,
  url?: string
): Promise<chrome.bookmarks.BookmarkTreeNode> => {
  try {
    const newBookmark = await chrome.bookmarks.create({
      parentId,
      title,
      url
    });
    logger.info(`Created bookmark: ${title}`, { parentId, url });
    return newBookmark;
  } catch (error) {
    logger.error(`Error creating bookmark: ${title}`, error);
    throw new Error(`Failed to create bookmark: ${error}`);
  }
};

/**
 * Create a new bookmark folder
 */
export const createBookmarkFolder = async (
  parentId: string,
  title: string
): Promise<chrome.bookmarks.BookmarkTreeNode> => {
  try {
    const newFolder = await chrome.bookmarks.create({
      parentId,
      title
    });
    logger.info(`Created bookmark folder: ${title}`, { parentId });
    return newFolder;
  } catch (error) {
    logger.error(`Error creating bookmark folder: ${title}`, error);
    throw new Error(`Failed to create bookmark folder: ${error}`);
  }
};

/**
 * Update an existing bookmark
 */
export const updateBookmark = async (
  id: string,
  changes: { title?: string; url?: string }
): Promise<chrome.bookmarks.BookmarkTreeNode> => {
  try {
    const updated = await chrome.bookmarks.update(id, changes);
    logger.info(`Updated bookmark: ${id}`, changes);
    return updated;
  } catch (error) {
    logger.error(`Error updating bookmark: ${id}`, error);
    throw new Error(`Failed to update bookmark: ${error}`);
  }
};

/**
 * Move a bookmark to a different location
 */
export const moveBookmark = async (
  id: string,
  destination: { parentId?: string; index?: number }
): Promise<chrome.bookmarks.BookmarkTreeNode> => {
  try {
    const moved = await chrome.bookmarks.move(id, destination);
    logger.info(`Moved bookmark: ${id}`, destination);
    return moved;
  } catch (error) {
    logger.error(`Error moving bookmark: ${id}`, error);
    throw new Error(`Failed to move bookmark: ${error}`);
  }
};

/**
 * Remove a bookmark
 */
export const removeBookmark = async (id: string): Promise<void> => {
  try {
    await chrome.bookmarks.remove(id);
    logger.info(`Removed bookmark: ${id}`);
  } catch (error) {
    logger.error(`Error removing bookmark: ${id}`, error);
    throw new Error(`Failed to remove bookmark: ${error}`);
  }
};

/**
 * Remove a bookmark tree (folder)
 */
export const removeBookmarkTree = async (id: string): Promise<void> => {
  try {
    await chrome.bookmarks.removeTree(id);
    logger.info(`Removed bookmark tree: ${id}`);
  } catch (error) {
    logger.error(`Error removing bookmark tree: ${id}`, error);
    throw new Error(`Failed to remove bookmark tree: ${error}`);
  }
};

/**
 * Search for bookmarks
 */
export const searchBookmarks = async (
  query: string
): Promise<chrome.bookmarks.BookmarkTreeNode[]> => {
  try {
    const results = await chrome.bookmarks.search(query);
    logger.info(`Search bookmarks for "${query}" returned ${results.length} results`);
    return results;
  } catch (error) {
    logger.error(`Error searching bookmarks for "${query}"`, error);
    throw new Error(`Failed to search bookmarks: ${error}`);
  }
};
