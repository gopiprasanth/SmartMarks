/**
 * BookmarkService.ts - Service for bookmark retrieval and analysis
 */
import { Logger, LogLevel } from '../utils/Logger';
import { getAllBookmarks, getAllBookmarkFolders, getBookmarkChildren } from '../utils/ChromeUtils';

// Define types for bookmarks data analysis
export interface BookmarkFolder {
  id: string;
  title: string;
  parentId?: string;
  path: string;
  children: chrome.bookmarks.BookmarkTreeNode[];
  bookmarkCount: number;
  keywords: Set<string>;
}

export interface BookmarkAnalysis {
  folders: Map<string, BookmarkFolder>;
  totalBookmarks: number;
  totalFolders: number;
  rootFolders: BookmarkFolder[];
}

export class BookmarkService {
  private logger: Logger;
  private bookmarkAnalysis: BookmarkAnalysis | null = null;

  constructor() {
    this.logger = new Logger('BookmarkService', LogLevel.INFO);
  }

  /**
   * Get all bookmarks and analyze their structure
   */
  public async analyzeBookmarks(): Promise<BookmarkAnalysis> {
    try {
      this.logger.info('Starting bookmark analysis');

      const allBookmarks = await getAllBookmarks();
      const folders = await getAllBookmarkFolders();

      this.logger.info(`Retrieved ${folders.length} bookmark folders`);

      const analysis = await this.processBookmarkStructure(allBookmarks, folders);
      this.bookmarkAnalysis = analysis;

      this.logger.info('Bookmark analysis complete', {
        totalBookmarks: analysis.totalBookmarks,
        totalFolders: analysis.totalFolders
      });

      return analysis;
    } catch (error) {
      this.logger.error('Error analyzing bookmarks', error);
      throw new Error(`Failed to analyze bookmarks: ${error}`);
    }
  }

  /**
   * Process bookmark structure and extract folder information
   */
  private async processBookmarkStructure(
    allBookmarks: chrome.bookmarks.BookmarkTreeNode[],
    folders: chrome.bookmarks.BookmarkTreeNode[]
  ): Promise<BookmarkAnalysis> {
    const folderMap = new Map<string, BookmarkFolder>();
    let totalBookmarks = 0;
    const rootFolders: BookmarkFolder[] = [];

    // Add default folders (Bookmarks Bar, Other Bookmarks, Mobile Bookmarks)
    const defaultFolders = allBookmarks.filter(node => !node.parentId);
    for (const folder of defaultFolders) {
      const folderInfo = await this.createFolderInfo(folder);
      folderMap.set(folder.id, folderInfo);
      rootFolders.push(folderInfo);
      totalBookmarks += folderInfo.bookmarkCount;
    }

    // Process all other folders
    for (const folder of folders) {
      if (!folderMap.has(folder.id)) {
        const folderInfo = await this.createFolderInfo(folder);
        folderMap.set(folder.id, folderInfo);
        totalBookmarks += folderInfo.bookmarkCount;
      }
    }

    // Build folder paths and parent-child relationships
    for (const folder of folderMap.values()) {
      if (folder.parentId && folderMap.has(folder.parentId)) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          folder.path = `${parent.path}/${folder.title}`;
        }
      }
    }

    return {
      folders: folderMap,
      totalBookmarks,
      totalFolders: folderMap.size,
      rootFolders
    };
  }

  /**
   * Create folder information object with bookmark count and keywords
   */
  private async createFolderInfo(
    folder: chrome.bookmarks.BookmarkTreeNode
  ): Promise<BookmarkFolder> {
    let bookmarkCount = 0;
    const keywords = new Set<string>();
    let children: chrome.bookmarks.BookmarkTreeNode[] = [];

    try {
      children = await getBookmarkChildren(folder.id);

      // Count bookmarks and extract keywords
      for (const child of children) {
        if (child.url) {
          bookmarkCount++;
          this.extractKeywords(child.title, keywords);
          this.extractKeywords(child.url, keywords);
        }
      }
    } catch (error) {
      this.logger.error(`Error processing folder ${folder.id}`, error);
    }

    return {
      id: folder.id,
      title: folder.title || 'Unnamed Folder',
      parentId: folder.parentId,
      path: folder.title || 'Unnamed Folder',
      children,
      bookmarkCount,
      keywords
    };
  }

  /**
   * Extract meaningful keywords from text
   */
  private extractKeywords(text: string | undefined, keywords: Set<string>): void {
    if (!text) return;

    // Simple keyword extraction (will be improved in future)
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3) // Filter out short words
      .filter(word => !this.isStopWord(word)); // Filter out common stop words

    words.forEach(word => keywords.add(word));
  }

  /**
   * Check if a word is a common stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'https',
      'http',
      'www',
      'com',
      'org',
      'net',
      'the',
      'and',
      'for',
      'with'
    ]);
    return stopWords.has(word);
  }

  /**
   * Get the current bookmark analysis or perform analysis if not available
   */
  public async getBookmarkAnalysis(): Promise<BookmarkAnalysis> {
    if (!this.bookmarkAnalysis) {
      return await this.analyzeBookmarks();
    }
    return this.bookmarkAnalysis;
  }

  /**
   * Find folders that might be relevant for a given bookmark
   */
  public async suggestFolders(title: string, url: string): Promise<BookmarkFolder[]> {
    try {
      const analysis = await this.getBookmarkAnalysis();
      const bookmarkKeywords = new Set<string>();

      this.extractKeywords(title, bookmarkKeywords);
      this.extractKeywords(url, bookmarkKeywords);

      // If we don't have any keywords, return empty array
      if (bookmarkKeywords.size === 0) {
        return [];
      }

      // Calculate relevance score for each folder
      const folderScores = new Map<string, number>();

      for (const folder of analysis.folders.values()) {
        if (folder.bookmarkCount > 0) {
          let score = 0;
          bookmarkKeywords.forEach(keyword => {
            if (folder.keywords.has(keyword)) {
              score += 1;
            }
          });

          if (score > 0) {
            folderScores.set(folder.id, score);
          }
        }
      }

      // Convert scores to array and sort by relevance
      const suggestedFolders = Array.from(folderScores.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => analysis.folders.get(id)!)
        .slice(0, 5); // Return top 5 suggestions

      return suggestedFolders;
    } catch (error) {
      this.logger.error('Error suggesting folders', error);
      return [];
    }
  }
}
