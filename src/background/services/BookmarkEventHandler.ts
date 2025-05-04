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

export class BookmarkEventHandler {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('BookmarkEventHandler', LogLevel.INFO);
  }

  /**
   * Initialize event listeners for bookmark events
   */
  public init(): void {
    this.logger.info('Initializing bookmark event handlers');

    chrome.bookmarks.onCreated.addListener(this.handleBookmarkCreated.bind(this));
    chrome.bookmarks.onChanged.addListener(this.handleBookmarkChanged.bind(this));
    chrome.bookmarks.onMoved.addListener(this.handleBookmarkMoved.bind(this));
    chrome.bookmarks.onRemoved.addListener(this.handleBookmarkRemoved.bind(this));

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

      // This is where we'll eventually add the smart folder suggestion logic
      // For now, just log the event
    } catch (error) {
      this.logger.error('Error handling bookmark creation', error);
    }
  }

  /**
   * Handle bookmark changed event
   */
  private handleBookmarkChanged(id: string, changeInfo: BookmarkChangeInfo): void {
    this.logger.info('Bookmark changed', { id, changes: changeInfo });
  }

  /**
   * Handle bookmark moved event
   */
  private handleBookmarkMoved(id: string, moveInfo: BookmarkMoveInfo): void {
    this.logger.info('Bookmark moved', { id, from: moveInfo.oldParentId, to: moveInfo.parentId });
  }

  /**
   * Handle bookmark removed event
   */
  private handleBookmarkRemoved(id: string, removeInfo: BookmarkRemoveInfo): void {
    this.logger.info('Bookmark removed', { id, parentId: removeInfo.parentId });
  }
}
