/**
 * Tests for popup UI functionality
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('Popup UI', () => {
  let mockPopupPage: Page;

  test.beforeEach(async ({ context }) => {
    // Create mock popup page
    mockPopupPage = await context.newPage();

    // Set up basic popup structure
    await mockPopupPage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SmartMarks Popup</title>
          <style>
            .status-message { background: #eee; padding: 5px; }
            .bookmark-item { margin-bottom: 5px; border-bottom: 1px solid #ccc; }
            .favicon { width: 16px; height: 16px; }
            .bookmark-title { font-weight: bold; }
            .bookmark-url { font-size: 0.8em; color: #666; }
            .bookmark-folder { font-size: 0.7em; color: #007bff; }
            .bookmark-content { margin-left: 20px; }
          </style>
        </head>
        <body>
          <div class="popup-container">
            <header class="popup-header">
              <h1>SmartMarks</h1>
            </header>
            
            <div class="search-container">
              <input type="text" id="search-box" placeholder="Search bookmarks...">
            </div>
            
            <div id="status-message" class="status-message"></div>
            
            <div class="bookmarks-container" id="bookmarks-list"></div>
            
            <footer class="popup-footer">
              <button id="add-btn">Add Bookmark</button>
              <button id="options-btn">Options</button>
            </footer>
          </div>
        </body>
      </html>
    `);

    // Add mock functionality
    await mockPopupPage.addScriptTag({
      content: `
        // Mock chrome API
        window.chrome = {
          bookmarks: {
            search: (query, callback) => {
              const mockBookmarks = [
                {
                  id: '1',
                  title: 'Google',
                  url: 'https://www.google.com',
                  parentId: '10',
                  dateAdded: Date.now()
                },
                {
                  id: '2',
                  title: 'GitHub',
                  url: 'https://github.com',
                  parentId: '11',
                  dateAdded: Date.now() - 10000
                }
              ];
              
              if (typeof query === 'string' && query) {
                callback(mockBookmarks.filter(b => 
                  b.title.toLowerCase().includes(query.toLowerCase()) || 
                  b.url.toLowerCase().includes(query.toLowerCase())
                ));
              } else {
                callback(mockBookmarks);
              }
            },
            get: (id, callback) => {
              const mockFolders = {
                '10': { id: '10', title: 'Search Engines', parentId: '1' },
                '11': { id: '11', title: 'Development', parentId: '1' },
                '1': { id: '1', title: 'Bookmarks Bar' }
              };
              
              if (mockFolders[id]) {
                callback([mockFolders[id]]);
              } else {
                callback([]);
              }
            },
            create: (bookmark, callback) => {
              const newBookmark = {
                ...bookmark,
                id: '3',
                dateAdded: Date.now()
              };
              callback(newBookmark);
            }
          },
          tabs: {
            query: (options, callback) => {
              callback([{
                title: 'Test Page',
                url: 'https://example.com/test'
              }]);
            }
          },
          runtime: {
            sendMessage: (message, callback) => {
              if (message && message.action === 'getBookmarkAnalysis') {
                callback({
                  status: 'success',
                  data: {
                    totalBookmarks: 42,
                    totalFolders: 7
                  }
                });
              } else {
                callback({ status: 'received' });
              }
            },
            onMessage: {
              addListener: (fn) => {
                window.messageListener = fn;
              }
            },
            openOptionsPage: () => {
              window.optionsPageOpened = true;
            }
          }
        };
        
        // Set global to track UI state
        window.uiState = {
          statusShown: false,
          bookmarksLoaded: false,
          searchPerformed: false,
          optionsOpened: false,
          bookmarkAdded: false
        };
      `
    });
  });

  test('should display bookmark statistics on load', async () => {
    // Load popup.js
    await mockPopupPage.addScriptTag({ url: '/scripts/popup.js' });

    // Wait for status message to be populated
    await mockPopupPage.waitForFunction(() => {
      const statusEl = document.querySelector('.status-message');
      return statusEl && statusEl.textContent && statusEl.textContent.includes('42 bookmarks');
    });

    // Verify status message shows correct stats
    const statusText = await mockPopupPage.locator('.status-message').textContent();
    expect(statusText).toContain('42 bookmarks');
    expect(statusText).toContain('7 folders');
  });

  test('should display bookmarks in the list', async () => {
    // Load popup.js
    await mockPopupPage.addScriptTag({ url: '/scripts/popup.js' });

    // Wait for bookmarks to be loaded
    await mockPopupPage.waitForSelector('.bookmark-item');

    // Verify bookmarks are displayed
    const bookmarks = await mockPopupPage.locator('.bookmark-item').count();
    expect(bookmarks).toBeGreaterThan(0);

    // Verify first bookmark content
    const firstBookmark = await mockPopupPage.locator('.bookmark-item').first();
    const title = await firstBookmark.locator('.bookmark-title').textContent();
    const url = await firstBookmark.locator('.bookmark-url').textContent();

    expect(title).toBeTruthy();
    expect(url).toContain('http');
  });

  test('should filter bookmarks when searching', async () => {
    // Load popup.js
    await mockPopupPage.addScriptTag({ url: '/scripts/popup.js' });

    // Wait for initial bookmarks to load
    await mockPopupPage.waitForSelector('.bookmark-item');

    // Search for "GitHub"
    await mockPopupPage.fill('#search-box', 'GitHub');

    // Wait for search results
    await mockPopupPage.waitForFunction(() => {
      const statusEl = document.querySelector('.status-message');
      return statusEl && statusEl.textContent && statusEl.textContent.includes('Found');
    });

    // Verify only GitHub appears in results
    const bookmarkTitles = await mockPopupPage.locator('.bookmark-title').allTextContents();
    expect(bookmarkTitles).toContain('GitHub');
    expect(bookmarkTitles).not.toContain('Google');
  });

  test('should add current page as bookmark', async () => {
    // Load popup.js
    await mockPopupPage.addScriptTag({ url: '/scripts/popup.js' });

    // Click add button
    await mockPopupPage.click('#add-btn');

    // Wait for status message to indicate bookmark was added
    await mockPopupPage.waitForFunction(() => {
      const statusEl = document.querySelector('.status-message');
      return statusEl && statusEl.textContent && statusEl.textContent.includes('Bookmark added');
    });

    const statusText = await mockPopupPage.locator('.status-message').textContent();
    expect(statusText).toContain('Bookmark added');
  });
});

// Test file specifically for popup UI feedback functionality
test.describe('Popup UI Feedback', () => {
  let popupPage: Page;

  test.beforeEach(async ({ context }) => {
    // Set up mocks for Chrome API
    await context.addInitScript(() => {
      window.chrome = {
        ...window.chrome,
        bookmarks: {
          getTree: () => {
            return Promise.resolve([
              {
                id: '0',
                title: 'root',
                children: [
                  {
                    id: 'folder1',
                    title: 'Development',
                    children: [
                      { id: 'bm1', title: 'GitHub', url: 'https://github.com' },
                      { id: 'bm2', title: 'Stack Overflow', url: 'https://stackoverflow.com' }
                    ]
                  },
                  {
                    id: 'folder2',
                    title: 'News',
                    children: [
                      { id: 'bm3', title: 'Tech News', url: 'https://technews.com' },
                      { id: 'bm4', title: 'Science Daily', url: 'https://sciencedaily.com' }
                    ]
                  }
                ]
              }
            ]);
          }
        }
      };
    });

    // Navigate to the extension popup
    popupPage = await context.newPage();
    await popupPage.goto('chrome-extension://id/popup.html');
  });

  test('should display loading indicator during data retrieval', async () => {
    // Verify loading indicator is shown when getting bookmarks
    await popupPage.locator('#get-bookmarks-btn').click();

    // Check that loading indicator is visible
    await expect(popupPage.locator('#loading-indicator')).toBeVisible();

    // Wait for data to load
    await expect(
      popupPage.locator('#bookmark-list'),
      'Bookmark list should be visible after loading'
    ).toBeVisible({ timeout: 5000 });

    // Loading indicator should disappear after data loads
    await expect(popupPage.locator('#loading-indicator')).toBeHidden();
  });

  test('should display success message after successful analysis', async () => {
    // Click analyze button
    await popupPage.locator('#analyze-bookmarks-btn').click();

    // Wait for analysis to complete and check success message
    await expect(popupPage.locator('#success-message')).toBeVisible();
    await expect(popupPage.locator('#success-message')).toContainText('Analysis complete', {
      timeout: 5000
    });

    // Success message should automatically hide after a delay
    await expect(popupPage.locator('#success-message')).toBeHidden({ timeout: 10000 });
  });

  test('should display error message when analysis fails', async () => {
    // Modify Chrome API to simulate failure
    await popupPage.evaluate(() => {
      window.chrome.bookmarks.getTree = () => Promise.reject(new Error('API Error'));
    });

    // Trigger analysis
    await popupPage.locator('#analyze-bookmarks-btn').click();

    // Check that error message is displayed
    await expect(popupPage.locator('#error-message')).toBeVisible();
    await expect(popupPage.locator('#error-message')).toContainText('Error analyzing bookmarks', {
      timeout: 5000
    });

    // Error should contain retry button
    await expect(popupPage.locator('#retry-button')).toBeVisible();
  });

  test('should display bookmark counts and statistics', async () => {
    // Trigger bookmark analysis
    await popupPage.locator('#analyze-bookmarks-btn').click();

    // Check that bookmark statistics are displayed
    await expect(popupPage.locator('#bookmark-stats')).toBeVisible();

    // Verify statistics are correct
    await expect(popupPage.locator('#total-bookmarks')).toContainText('4');
    await expect(popupPage.locator('#total-folders')).toContainText('2');
    await expect(popupPage.locator('#folder-ratio')).toContainText('2.0', { timeout: 5000 }); // 4 bookmarks in 2 folders = 2.0 ratio
  });

  test('should display empty state UI when no bookmarks are found', async () => {
    // Modify Chrome API to return empty bookmark structure
    await popupPage.evaluate(() => {
      window.chrome.bookmarks.getTree = () => {
        return Promise.resolve([
          {
            id: '0',
            title: 'root',
            children: []
          }
        ]);
      };
    });

    // Reload to apply the mock
    await popupPage.reload();

    // Trigger bookmark analysis
    await popupPage.locator('#analyze-bookmarks-btn').click();

    // Check that empty state is displayed
    await expect(popupPage.locator('#empty-state')).toBeVisible();
    await expect(popupPage.locator('#empty-state')).toContainText('No bookmarks found', {
      timeout: 5000
    });

    // Should have a button to add a bookmark
    await expect(popupPage.locator('#add-bookmark-btn')).toBeVisible();
  });

  test('should update UI in real-time during analysis', async () => {
    // Modify Chrome API to add delay to simulate longer processing
    await popupPage.evaluate(() => {
      const originalGetTree = window.chrome.bookmarks.getTree;
      window.chrome.bookmarks.getTree = () => {
        return new Promise(resolve => {
          // Add progress update events
          const progressEvent = new CustomEvent('analysis-progress', { detail: { progress: 50 } });
          setTimeout(() => {
            document.dispatchEvent(progressEvent);

            // Resolve after another delay
            setTimeout(() => {
              resolve(originalGetTree());
            }, 500);
          }, 500);
        });
      };
    });

    // Trigger analysis
    await popupPage.locator('#analyze-bookmarks-btn').click();

    // First, loading indicator should be visible
    await expect(popupPage.locator('#loading-indicator')).toBeVisible();

    // Then, we should see progress updates
    await expect(popupPage.locator('#progress-bar')).toBeVisible();
    await expect(popupPage.locator('#progress-percentage')).toContainText('50%', { timeout: 1000 });

    // Finally, we should see the results
    await expect(popupPage.locator('#bookmark-stats')).toBeVisible({ timeout: 2000 });
  });

  test('should provide visual feedback when hovering over bookmarks', async () => {
    // Trigger display of bookmarks
    await popupPage.locator('#view-bookmarks-btn').click();

    // Wait for bookmarks to be displayed
    await expect(popupPage.locator('.bookmark-item')).toBeVisible();

    // Hover over a bookmark
    await popupPage.locator('.bookmark-item:has-text("GitHub")').hover();

    // Check that hover effect is applied
    const hasHoverClass = await popupPage.evaluate(() => {
      const element = document.querySelector('.bookmark-item:has-text("GitHub")');
      return element && element.classList.contains('hover');
    });

    expect(hasHoverClass).toBeTruthy();
  });

  test('should show folder hierarchy visualization', async () => {
    // Click to visualize folder hierarchy
    await popupPage.locator('#visualize-hierarchy-btn').click();

    // Check that visualization is displayed
    await expect(popupPage.locator('#hierarchy-visualization')).toBeVisible();

    // Verify visualization shows correct structure
    await expect(popupPage.locator('#hierarchy-visualization .root-folder')).toBeVisible();
    await expect(popupPage.locator('#hierarchy-visualization .folder-node')).toHaveCount(2);

    // Verify bookmarks are represented
    await expect(popupPage.locator('#hierarchy-visualization .bookmark-node')).toHaveCount(4);

    // Test interactivity - click on a folder
    await popupPage
      .locator('#hierarchy-visualization .folder-node:has-text("Development")')
      .click();

    // Verify folder details expand/collapse
    await expect(popupPage.locator('#hierarchy-visualization .folder-details')).toBeVisible();
    await expect(popupPage.locator('#hierarchy-visualization .folder-details')).toContainText(
      'GitHub',
      { timeout: 1000 }
    );
  });
});
