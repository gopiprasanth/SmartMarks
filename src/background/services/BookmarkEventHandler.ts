/**
 * BookmarkEventHandler.ts - Service to handle bookmark events
 */
import { Logger, LogLevel } from '../../common/utils/Logger';
import {
  BookmarkChangeInfo,
  BookmarkMoveInfo,
  BookmarkRemoveInfo,
  getBookmarkById
} from '../../common/utils/ChromeUtils';
import { BookmarkService } from '../../common/services/BookmarkService';

export class BookmarkEventHandler {
  private logger: Logger;
  private bookmarkService: BookmarkService;

  constructor() {
    this.logger = new Logger('BookmarkEventHandler', LogLevel.INFO);
    this.bookmarkService = new BookmarkService();
  }

  /**
   * Initialize event listeners for bookmark events
   */
  public async init(): Promise<void> {
    this.logger.info('Initializing bookmark event handlers');

    // Register event listeners
    chrome.bookmarks.onCreated.addListener(this.handleBookmarkCreated.bind(this));
    chrome.bookmarks.onChanged.addListener(this.handleBookmarkChanged.bind(this));
    chrome.bookmarks.onMoved.addListener(this.handleBookmarkMoved.bind(this));
    chrome.bookmarks.onRemoved.addListener(this.handleBookmarkRemoved.bind(this));

    // Initialize bookmark analysis
    try {
      const analysis = await this.bookmarkService.analyzeBookmarks();
      this.logger.info('Initial bookmark analysis completed', {
        totalFolders: analysis.totalFolders,
        totalBookmarks: analysis.totalBookmarks
      });
    } catch (error) {
      this.logger.error('Error during initial bookmark analysis', error);
    }

    this.logger.info('Bookmark event handlers initialized successfully');
  }

  /**
   * Handle bookmark created event
   */
  private async handleBookmarkCreated(
    id: string,
    bookmark: chrome.bookmarks.BookmarkTreeNode
  ): Promise<void> {
    this.logger.info('Bookmark created', { id, bookmark });

    try {
      // Get full bookmark details
      const bookmarkDetails = await getBookmarkById(id);

      // Log bookmark creation with complete details
      this.logger.info('Bookmark created with details', {
        id,
        title: bookmark.title,
        url: bookmark.url,
        parentId: bookmark.parentId,
        fullDetails: bookmarkDetails
      });

      // If this is not a folder (has URL), then suggest folders
      if (bookmark.url) {
        const suggestedFolders = await this.bookmarkService.suggestFolders(
          bookmark.title || '',
          bookmark.url
        );

        if (suggestedFolders.length > 0) {
          this.logger.info('Suggested folders for new bookmark', {
            bookmarkId: id,
            suggestions: suggestedFolders.map(f => ({ id: f.id, title: f.title, path: f.path }))
          });

          // Send message to UI with suggested folders (if popup is open)
          chrome.runtime
            .sendMessage({
              action: 'folderSuggestions',
              bookmarkId: id,
              suggestions: suggestedFolders.map(f => ({
                id: f.id,
                title: f.title,
                path: f.path,
                bookmarkCount: f.bookmarkCount
              }))
            })
            .catch(err => {
              // It's normal for this to fail if popup is not open
              this.logger.debug('Could not send folder suggestions to UI', err);
            });
        } else {
          this.logger.info('No folder suggestions found for bookmark', { bookmarkId: id });
        }
      } else {
        // If this is a new folder, update our analysis
        await this.bookmarkService.analyzeBookmarks();
      }
    } catch (error) {
      this.logger.error('Error handling bookmark creation', error);
    }
  }

  /**
   * Handle bookmark changed event
   */
  private async handleBookmarkChanged(id: string, changeInfo: BookmarkChangeInfo): Promise<void> {
    this.logger.info('Bookmark changed', { id, changes: changeInfo });

    // Refresh bookmark analysis if significant changes were made
    if (changeInfo.title) {
      try {
        await this.bookmarkService.analyzeBookmarks();
      } catch (error) {
        this.logger.error('Error updating bookmark analysis after change', error);
      }
    }
  }

  /**
   * Handle bookmark moved event
   */
  private async handleBookmarkMoved(id: string, moveInfo: BookmarkMoveInfo): Promise<void> {
    this.logger.info('Bookmark moved', { id, from: moveInfo.oldParentId, to: moveInfo.parentId });

    // Update analysis when bookmarks are reorganized
    try {
      await this.bookmarkService.analyzeBookmarks();
    } catch (error) {
      this.logger.error('Error updating bookmark analysis after move', error);
    }
  }

  /**
   * Handle bookmark removed event
   */
  private async handleBookmarkRemoved(id: string, removeInfo: BookmarkRemoveInfo): Promise<void> {
    this.logger.info('Bookmark removed', { id, parentId: removeInfo.parentId });

    // Refresh bookmark analysis when items are removed
    try {
      await this.bookmarkService.analyzeBookmarks();
    } catch (error) {
      this.logger.error('Error updating bookmark analysis after removal', error);
    }
  }

  /**
   * Get bookmark service instance
   */
  public getBookmarkService(): BookmarkService {
    return this.bookmarkService;
  }
}
