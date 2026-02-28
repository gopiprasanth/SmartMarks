/**
 * BookmarkService.ts - Service for bookmark retrieval and analysis
 */
import { Logger, LogLevel } from '../utils/Logger';
import { getAllBookmarks, getAllBookmarkFolders, getBookmarkChildren } from '../utils/ChromeUtils';
import {
  CATEGORIZATION_SETTINGS_STORAGE_KEY,
  CategorizationSettings,
  defaultCategorizationSettings
} from './categorization/CategorizationSettings';
import { LLMCategorizer } from './categorization/LLMCategorizer';

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
  private llmCategorizer: LLMCategorizer;

  constructor() {
    this.logger = new Logger('BookmarkService', LogLevel.INFO);
    this.llmCategorizer = new LLMCategorizer();
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

      const heuristicSuggestions = await this.suggestFoldersWithHeuristics(
        analysis,
        bookmarkKeywords,
        url
      );

      const settings = await this.getCategorizationSettings();
      if (settings.categorizationVersion !== 'v2' || !settings.llm.enabled) {
        return heuristicSuggestions;
      }

      const llmSuggestions = await this.suggestFoldersWithLLM(title, url, analysis, settings);
      if (llmSuggestions.length === 0) {
        return heuristicSuggestions;
      }

      return llmSuggestions;
    } catch (error) {
      this.logger.error('Error suggesting folders', error);
      return [];
    }
  }

  private async suggestFoldersWithHeuristics(
    analysis: BookmarkAnalysis,
    bookmarkKeywords: Set<string>,
    url: string
  ): Promise<BookmarkFolder[]> {
    const preferenceWeights = await this.getPreferenceWeights();

    // Calculate relevance score for each folder
    const folderScores = new Map<string, number>();

    for (const folder of analysis.folders.values()) {
      if (folder.bookmarkCount > 0) {
        let score = 0;
        bookmarkKeywords.forEach(keyword => {
          if (folder.keywords.has(keyword)) {
            score += 2;
          }

          const inPath = folder.path.toLowerCase().includes(keyword);
          if (inPath) {
            score += 1;
          }
        });

        const domain = this.extractDomain(url);
        if (domain && folder.path.toLowerCase().includes(domain)) {
          score += 2;
        }

        const preferenceBoost = preferenceWeights[folder.id] ?? 0;
        score += preferenceBoost;

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
  }

  private async suggestFoldersWithLLM(
    title: string,
    url: string,
    analysis: BookmarkAnalysis,
    settings: CategorizationSettings
  ): Promise<BookmarkFolder[]> {
    if (!settings.llm.apiKey && settings.llm.provider !== 'openai-compatible') {
      this.logger.info('LLM categorization enabled but API key missing, falling back to heuristics');
      return [];
    }

    try {
      const folderIds = await this.llmCategorizer.suggestFolders(
        title,
        url,
        Array.from(analysis.folders.values()),
        settings.llm
      );

      return folderIds
        .map(folderId => analysis.folders.get(folderId))
        .filter((folder): folder is BookmarkFolder => Boolean(folder));
    } catch (error) {
      this.logger.error('LLM categorization failed, falling back to heuristics', error);
      return [];
    }
  }

  /**
   * Learn from accepted suggestions to personalize future recommendations.
   */
  public async recordFolderSelection(folderId: string): Promise<void> {
    const key = 'folderPreferences';
    const existing = await this.getStorageValue<Record<string, number>>(key, {});
    const next = {
      ...existing,
      [folderId]: (existing[folderId] || 0) + 1
    };
    await this.setStorageValue(key, next);
  }

  /**
   * Suggests a human-friendly folder name from bookmark metadata.
   */
  public suggestFolderName(title: string, url: string): string {
    const domain = this.extractDomain(url);
    if (domain) {
      return `${domain.charAt(0).toUpperCase()}${domain.slice(1)} Resources`;
    }

    const words = title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

    if (words.length > 0) {
      return words.join(' ');
    }

    return 'SmartMarks Collection';
  }

  public async createFolderForBookmark(title: string, url: string): Promise<BookmarkFolder | null> {
    try {
      const analysis = await this.getBookmarkAnalysis();
      const rootParentId = analysis.rootFolders[0]?.id || '1';
      const folderTitle = this.suggestFolderName(title, url);

      const created = await new Promise<chrome.bookmarks.BookmarkTreeNode>((resolve, reject) => {
        chrome.bookmarks.create({ parentId: rootParentId, title: folderTitle }, folder => {
          if (!folder) {
            reject(new Error('Failed to create folder'));
            return;
          }
          resolve(folder);
        });
      });

      await this.analyzeBookmarks();

      return {
        id: created.id,
        title: created.title || folderTitle,
        parentId: created.parentId,
        path: `${analysis.rootFolders[0]?.path || 'Bookmarks Bar'}/${created.title || folderTitle}`,
        children: [],
        bookmarkCount: 0,
        keywords: new Set<string>()
      };
    } catch (error) {
      this.logger.error('Error creating intelligent folder', error);
      return null;
    }
  }

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, '');
      return host.split('.')[0] || '';
    } catch (_error) {
      return '';
    }
  }

  private async getPreferenceWeights(): Promise<Record<string, number>> {
    const preferences = await this.getStorageValue<Record<string, number>>('folderPreferences', {});
    const weighted: Record<string, number> = {};
    Object.entries(preferences).forEach(([folderId, count]) => {
      weighted[folderId] = Math.min(5, Math.floor(count / 2) + 1);
    });
    return weighted;
  }

  private async getStorageValue<T>(key: string, fallback: T): Promise<T> {
    return new Promise(resolve => {
      if (!globalThis.chrome?.storage?.sync) {
        resolve(fallback);
        return;
      }

      globalThis.chrome.storage.sync.get({ [key]: fallback }, data => {
        resolve((data[key] as T) ?? fallback);
      });
    });
  }

  private async getCategorizationSettings(): Promise<CategorizationSettings> {
    const settings = await this.getStorageValue<Partial<CategorizationSettings>>(
      CATEGORIZATION_SETTINGS_STORAGE_KEY,
      defaultCategorizationSettings
    );

    return {
      categorizationVersion:
        settings.categorizationVersion === 'v2' ? settings.categorizationVersion : 'v1',
      llm: {
        ...defaultCategorizationSettings.llm,
        ...(settings.llm || {})
      }
    };
  }

  private async setStorageValue<T>(key: string, value: T): Promise<void> {
    await new Promise<void>(resolve => {
      if (!globalThis.chrome?.storage?.sync) {
        resolve();
        return;
      }

      globalThis.chrome.storage.sync.set({ [key]: value }, () => resolve());
    });
  }
}
