// filepath: /Users/gopiprasan.potipired/Documents/Personal/Projects/SmartMarks/tests/e2e/bookmark-structure-analysis.test.ts
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test file specifically for bookmark structure analysis functionality
test.describe('Bookmark Structure Analysis', () => {
  let extPage: Page;
  let popupPage: Page;

  // More complex mock bookmark structure for analysis testing
  test.beforeEach(async ({ context }) => {
    // Create a mock page for testing extension functionality
    extPage = await context.newPage();

    // Mock Chrome API calls with a more complex bookmark structure
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
                    title: 'Programming',
                    children: [
                      {
                        id: 'subfolder1',
                        title: 'JavaScript',
                        children: [
                          {
                            id: 'bm1',
                            title: 'MDN JavaScript',
                            url: 'https://developer.mozilla.org/javascript'
                          },
                          {
                            id: 'bm2',
                            title: 'JavaScript - The Good Parts',
                            url: 'https://javascript-good-parts.com'
                          }
                        ]
                      },
                      {
                        id: 'subfolder2',
                        title: 'Python',
                        children: [
                          {
                            id: 'bm3',
                            title: 'Python Documentation',
                            url: 'https://python.org/doc'
                          },
                          {
                            id: 'bm4',
                            title: 'Python for Data Science',
                            url: 'https://python-data-science.org'
                          }
                        ]
                      }
                    ]
                  },
                  {
                    id: 'folder2',
                    title: 'News',
                    children: [
                      { id: 'bm5', title: 'Tech News', url: 'https://technews.com' },
                      { id: 'bm6', title: 'Science Daily', url: 'https://sciencedaily.com' }
                    ]
                  },
                  {
                    id: 'folder3',
                    title: 'Shopping',
                    children: [
                      { id: 'bm7', title: 'Amazon', url: 'https://amazon.com' },
                      { id: 'bm8', title: 'eBay', url: 'https://ebay.com' },
                      { id: 'bm9', title: 'Etsy', url: 'https://etsy.com' }
                    ]
                  }
                ]
              }
            ]);
          },
          getSubTree: id => {
            if (id === 'folder1') {
              return Promise.resolve([
                {
                  id: 'folder1',
                  title: 'Programming',
                  children: [
                    {
                      id: 'subfolder1',
                      title: 'JavaScript',
                      children: [
                        {
                          id: 'bm1',
                          title: 'MDN JavaScript',
                          url: 'https://developer.mozilla.org/javascript'
                        },
                        {
                          id: 'bm2',
                          title: 'JavaScript - The Good Parts',
                          url: 'https://javascript-good-parts.com'
                        }
                      ]
                    },
                    {
                      id: 'subfolder2',
                      title: 'Python',
                      children: [
                        { id: 'bm3', title: 'Python Documentation', url: 'https://python.org/doc' },
                        {
                          id: 'bm4',
                          title: 'Python for Data Science',
                          url: 'https://python-data-science.org'
                        }
                      ]
                    }
                  ]
                }
              ]);
            }
            return Promise.resolve([]);
          },
          get: id => {
            // Basic implementation
            return Promise.resolve([{ id, title: 'Test Bookmark', url: 'https://test.com' }]);
          }
        }
      };
    });

    // Navigate to the extension popup
    popupPage = await context.newPage();
    await popupPage.goto('chrome-extension://id/popup.html');
  });

  test('should correctly analyze nested folder structure', async () => {
    // Test that analysis works with nested folders
    await popupPage.locator('#analyze-bookmarks-btn').click();

    // Check that the analysis detected the correct number of folders
    await expect(popupPage.locator('#folder-count')).toContainText('5', { timeout: 5000 });

    // Check that the analysis detected the correct number of bookmarks
    await expect(popupPage.locator('#bookmark-count')).toContainText('9', { timeout: 5000 });

    // Check that nested structure is preserved
    await popupPage.locator('#view-folders-btn').click();
    await popupPage.locator('.folder-item:has-text("Programming")').click();

    // Verify subfolders are displayed
    await expect(popupPage.locator('.subfolder-item')).toHaveCount(2);
    await expect(popupPage.locator('.subfolder-item')).toContainText('JavaScript');
    await expect(popupPage.locator('.subfolder-item')).toContainText('Python');
  });

  test('should generate correct statistics for bookmark structure', async () => {
    // Test statistics generation
    await popupPage.locator('#analyze-structure-btn').click();

    // Check that statistics are displayed correctly
    await expect(popupPage.locator('#stats-display')).toBeVisible();

    // Verify folder distribution
    await expect(popupPage.locator('#folder-distribution')).toContainText(
      'Programming: 4 bookmarks'
    );
    await expect(popupPage.locator('#folder-distribution')).toContainText('News: 2 bookmarks');
    await expect(popupPage.locator('#folder-distribution')).toContainText('Shopping: 3 bookmarks');

    // Verify nesting level stats
    await expect(popupPage.locator('#nesting-stats')).toContainText('Maximum nesting level: 3');
    await expect(popupPage.locator('#nesting-stats')).toContainText(
      'Average bookmarks per folder: 1.8'
    );
  });

  test('should detect folder patterns', async () => {
    // Test pattern detection in folder organization
    await popupPage.locator('#detect-patterns-btn').click();

    // Verify pattern detection works
    await expect(popupPage.locator('#pattern-results')).toContainText('Programming languages');
    await expect(popupPage.locator('#pattern-results')).toContainText('Shopping sites');
  });

  test('should visualize bookmark structure', async () => {
    // Test visualization of the bookmark structure
    await popupPage.locator('#visualize-structure-btn').click();

    // Check that visualization is displayed
    await expect(popupPage.locator('#structure-visualization')).toBeVisible();

    // Check that all main folders are represented in the visualization
    await expect(popupPage.locator('#structure-visualization')).toContainText('Programming');
    await expect(popupPage.locator('#structure-visualization')).toContainText('News');
    await expect(popupPage.locator('#structure-visualization')).toContainText('Shopping');
  });

  test('should store keyword metadata about folders', async () => {
    // Test keyword extraction from folders
    await popupPage.locator('#extract-keywords-btn').click();

    // Verify keywords are extracted correctly
    await expect(popupPage.locator('#keyword-metadata')).toContainText(
      'Programming: javascript, python, documentation'
    );
    await expect(popupPage.locator('#keyword-metadata')).toContainText('News: tech, science');
    await expect(popupPage.locator('#keyword-metadata')).toContainText(
      'Shopping: amazon, ebay, etsy'
    );

    // Check that the keyword cloud is generated with proper weighting
    const javascriptWeight = await popupPage.evaluate(() => {
      const element = document.querySelector('.keyword-item:has-text("javascript")');
      return element ? parseFloat(getComputedStyle(element).fontSize) : 0;
    });

    const amazonWeight = await popupPage.evaluate(() => {
      const element = document.querySelector('.keyword-item:has-text("amazon")');
      return element ? parseFloat(getComputedStyle(element).fontSize) : 0;
    });

    // JavaScript should be more prominent than Amazon (based on our mock structure)
    expect(javascriptWeight).toBeGreaterThan(amazonWeight);
  });

  test('should handle bookmark updates and reflect in analysis', async () => {
    // First perform analysis
    await popupPage.locator('#analyze-bookmarks-btn').click();

    // Get initial analysis results
    const initialKeywords = await popupPage.locator('#keyword-cloud').textContent();

    // Mock bookmark update
    await extPage.evaluate(() => {
      // Simulate bookmark updated event
      const event = new CustomEvent('bookmarks.updated', {
        detail: {
          id: 'bm9',
          title: 'Etsy Handmade Crafts',
          url: 'https://etsy.com/handmade'
        }
      });
      window.dispatchEvent(event);
    });

    // Re-analyze
    await popupPage.reload();
    await popupPage.locator('#analyze-bookmarks-btn').click();

    // Check that the analysis has been updated
    await expect(popupPage.locator('#keyword-cloud')).toContainText('handmade');
    await expect(popupPage.locator('#keyword-cloud')).toContainText('crafts');

    // Verify that the new analysis is different from the initial one
    const updatedKeywords = await popupPage.locator('#keyword-cloud').textContent();
    expect(updatedKeywords).not.toEqual(initialKeywords);
  });
});
