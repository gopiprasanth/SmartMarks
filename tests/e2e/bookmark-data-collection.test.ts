// filepath: /Users/gopiprasan.potipired/Documents/Personal/Projects/SmartMarks/tests/e2e/bookmark-data-collection.test.ts
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test file for Milestone 2: Commit 3 - Bookmark Data Collection
test.describe('Bookmark Data Collection', () => {
  let extPage: Page;
  let popupPage: Page;

  // Sample bookmark structure for testing
  const mockBookmarks = [
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
  ];

  test.beforeEach(async ({ context }) => {
    // Create a mock page for testing extension functionality
    extPage = await context.newPage();

    // Mock Chrome API calls
    await extPage.addInitScript(() => {
      // Mock chrome.bookmarks API
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
          },
          get: id => {
            // Find the bookmark in our mock structure
            if (id === 'bm1') {
              return Promise.resolve([{ id: 'bm1', title: 'GitHub', url: 'https://github.com' }]);
            }
            return Promise.resolve([]);
          }
          // Add other necessary bookmarks API methods if needed
        }
      };
    });

    // Navigate to the extension popup (this will need to be updated with your actual popup URL)
    popupPage = await context.newPage();
    await popupPage.goto('chrome-extension://id/popup.html');
  });

  test('should retrieve and display existing bookmarks', async () => {
    // Test that the popup displays bookmark data
    // Note: exact selectors will depend on your actual implementation
    await expect(popupPage.locator('#bookmark-count')).toContainText('4', { timeout: 5000 });
    await expect(popupPage.locator('#folder-count')).toContainText('2', { timeout: 5000 });
  });

  test('should correctly parse bookmark folder structure', async () => {
    // Test that folder structures are parsed correctly
    // Click a button or trigger an action that shows folder structure
    await popupPage.locator('#view-folders-btn').click();

    // Verify both folders are displayed
    await expect(popupPage.locator('.folder-item')).toHaveCount(2);
    await expect(popupPage.locator('.folder-item')).toContainText('Development');
    await expect(popupPage.locator('.folder-item')).toContainText('News');
  });

  test('should show bookmark details on selection', async () => {
    // Test bookmark details retrieval
    // Click on a specific bookmark to view details
    await popupPage.locator('#bookmark-list-btn').click();
    await popupPage.locator('.bookmark-item:has-text("GitHub")').click();

    // Verify bookmark details are displayed correctly
    await expect(popupPage.locator('#bookmark-detail-title')).toContainText('GitHub');
    await expect(popupPage.locator('#bookmark-detail-url')).toContainText('https://github.com');
  });

  test('should analyze bookmark keywords correctly', async () => {
    // Test the bookmark analysis functionality
    // Trigger analysis
    await popupPage.locator('#analyze-bookmarks-btn').click();

    // Verify analysis results
    await expect(popupPage.locator('#analysis-results')).toContainText('Development');
    await expect(popupPage.locator('#analysis-results')).toContainText('Tech');

    // Check that keyword extraction worked correctly
    await expect(popupPage.locator('#keyword-cloud')).toContainText('GitHub');
    await expect(popupPage.locator('#keyword-cloud')).toContainText('Stack');
    await expect(popupPage.locator('#keyword-cloud')).toContainText('News');
  });

  test('should store bookmark data in appropriate data structures', async () => {
    // This test will check that the extension uses appropriate data structures
    // to store bookmark information by examining debug output

    // Click debug button to show data structure info
    await popupPage.locator('#debug-data-btn').click();

    // Check that appropriate data structures are used
    await expect(popupPage.locator('#debug-output')).toContainText('BookmarkFolder');
    await expect(popupPage.locator('#debug-output')).toContainText('totalBookmarks: 4');
    await expect(popupPage.locator('#debug-output')).toContainText('totalFolders: 2');
  });

  test('should update UI when bookmarks change', async () => {
    // Mock adding a new bookmark
    await extPage.evaluate(() => {
      // Simulate bookmark added event
      const event = new CustomEvent('bookmarks.created', {
        detail: {
          id: 'bm5',
          title: 'New Test Bookmark',
          url: 'https://test.com',
          parentId: 'folder1'
        }
      });
      window.dispatchEvent(event);
    });

    // Refresh the popup
    await popupPage.reload();

    // Check that UI is updated to show the new data
    await expect(popupPage.locator('#bookmark-count')).toContainText('5', { timeout: 5000 });

    // Navigate to view the newly added bookmark
    await popupPage.locator('#view-folders-btn').click();
    await popupPage.locator('.folder-item:has-text("Development")').click();

    // Verify the new bookmark appears in the correct folder
    await expect(popupPage.locator('.bookmark-item')).toContainText('New Test Bookmark');
  });
});
