import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// This test file covers end-to-end tests for bookmark operations
test.describe('Bookmark Operations', () => {
  let mockBookmarksPage: Page;

  test.beforeEach(async ({ context }) => {
    // Create a mock bookmarks page
    mockBookmarksPage = await context.newPage();

    // Set up our test page with a simple HTML structure for bookmarks
    await mockBookmarksPage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SmartMarks Test</title>
          <style>
            .bookmark-item {
              padding: 5px;
              margin: 5px 0;
              border: 1px solid #ccc;
            }
          </style>
        </head>
        <body>
          <h1>Bookmarks</h1>
          <div id="bookmarks-container">
            <div class="bookmark-item" id="bookmark-1">Example - https://example.com</div>
            <div class="bookmark-item" id="bookmark-2">Google - https://google.com</div>
          </div>
          <button id="add-button">Add Bookmark</button>
          <button id="modify-button">Modify Bookmark</button>
          <button id="delete-button">Delete Bookmark</button>
        </body>
      </html>
    `);

    // Add mock functionality for the buttons
    await mockBookmarksPage.addScriptTag({
      content: `
        // Simple bookmark management system
        document.getElementById('add-button').addEventListener('click', () => {
          const container = document.getElementById('bookmarks-container');
          const newBookmark = document.createElement('div');
          newBookmark.className = 'bookmark-item';
          newBookmark.id = 'bookmark-' + (container.children.length + 1);
          newBookmark.textContent = 'New Bookmark - https://newexample.com';
          container.appendChild(newBookmark);
        });
        
        document.getElementById('modify-button').addEventListener('click', () => {
          const bookmark = document.getElementById('bookmark-2');
          if (bookmark) {
            bookmark.textContent = 'Modified Google - https://google.com/modified';
          }
        });
        
        document.getElementById('delete-button').addEventListener('click', () => {
          const bookmark = document.getElementById('bookmark-1');
          if (bookmark) {
            bookmark.remove();
          }
        });
      `
    });
  });

  test('should create a new bookmark', async () => {
    // Verify initial state
    const initialCount = await mockBookmarksPage.locator('.bookmark-item').count();
    expect(initialCount).toBe(2);

    // Simulate creating a bookmark by clicking the add button
    await mockBookmarksPage.locator('#add-button').click();

    // Check that bookmark count has increased
    const newCount = await mockBookmarksPage.locator('.bookmark-item').count();
    expect(newCount).toBe(3);

    // Verify the new bookmark is present with correct content
    const newBookmark = await mockBookmarksPage.locator('#bookmark-3').textContent();
    expect(newBookmark).toContain('New Bookmark');
  });

  test('should modify a bookmark', async () => {
    // Verify the initial content of the bookmark
    const initialContent = await mockBookmarksPage.locator('#bookmark-2').textContent();
    expect(initialContent).toContain('Google');

    // Simulate modifying a bookmark by clicking the modify button
    await mockBookmarksPage.locator('#modify-button').click();

    // Verify the bookmark was updated
    const updatedContent = await mockBookmarksPage.locator('#bookmark-2').textContent();
    expect(updatedContent).toContain('Modified Google');
  });

  test('should delete a bookmark', async () => {
    // Verify initial state
    const initialCount = await mockBookmarksPage.locator('.bookmark-item').count();
    expect(initialCount).toBe(2);

    // Verify the bookmark exists before deletion
    expect(await mockBookmarksPage.locator('#bookmark-1').count()).toBe(1);

    // Simulate deleting a bookmark by clicking the delete button
    await mockBookmarksPage.locator('#delete-button').click();

    // Check that bookmark count has decreased
    const newCount = await mockBookmarksPage.locator('.bookmark-item').count();
    expect(newCount).toBe(1);

    // Verify the specific bookmark was removed
    expect(await mockBookmarksPage.locator('#bookmark-1').count()).toBe(0);
  });
});
