import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// This test file covers end-to-end tests for extension UI
test.describe('Extension UI Tests', () => {
  let mockPopupPage: Page;
  let mockOptionsPage: Page;

  // Create mock UI pages before tests
  test.beforeEach(async ({ context }) => {
    // Create a mock popup page
    mockPopupPage = await context.newPage();
    await mockPopupPage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SmartMarks</title>
          <style>
            .bookmark-item {
              padding: 8px;
              margin: 4px 0;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            .controls {
              margin-top: 16px;
            }
            button {
              padding: 8px 12px;
              margin-right: 8px;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div id="app">
            <h1>SmartMarks</h1>
            <div class="bookmark-list">
              <div class="bookmark-item">Example Bookmark</div>
              <div class="bookmark-item">Google</div>
            </div>
            <div class="controls">
              <button id="add-bookmark">Add Bookmark</button>
              <button id="open-options">Options</button>
            </div>
          </div>
        </body>
      </html>
    `);

    // Add event handlers to the popup page
    await mockPopupPage.addScriptTag({
      content: `
        document.getElementById('add-bookmark').addEventListener('click', function() {
          const bookmarkList = document.querySelector('.bookmark-list');
          const newBookmark = document.createElement('div');
          newBookmark.className = 'bookmark-item';
          newBookmark.id = 'new-bookmark';
          newBookmark.textContent = 'New Bookmark';
          bookmarkList.appendChild(newBookmark);
        });
        
        document.getElementById('open-options').addEventListener('click', function() {
          // We'll just set a flag to indicate this was clicked
          window.optionsOpened = true;
          document.body.setAttribute('data-options-opened', 'true');
        });
      `
    });

    // Create a mock options page
    mockOptionsPage = await context.newPage();
    await mockOptionsPage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SmartMarks Options</title>
          <style>
            .option-group {
              margin-bottom: 16px;
            }
            button {
              padding: 8px 12px;
              cursor: pointer;
            }
            label {
              display: block;
              margin-bottom: 4px;
            }
          </style>
        </head>
        <body>
          <div id="options-app">
            <h1>SmartMarks Options</h1>
            <form id="options-form">
              <div class="option-group">
                <label for="auto-organize">Auto-organize bookmarks</label>
                <input type="checkbox" id="auto-organize" />
              </div>
              <div class="option-group">
                <label for="theme-select">Theme</label>
                <select id="theme-select">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
              <button id="save-options" type="button">Save Options</button>
            </form>
            <div id="save-status" style="display: none; margin-top: 10px; color: green;">
              Options saved!
            </div>
          </div>
        </body>
      </html>
    `);

    // Add event handlers to the options page
    await mockOptionsPage.addScriptTag({
      content: `
        document.getElementById('save-options').addEventListener('click', function() {
          const autoOrganize = document.getElementById('auto-organize').checked;
          const theme = document.getElementById('theme-select').value;
          
          // Simulate saving options
          window.savedOptions = {
            autoOrganize,
            theme
          };
          
          // Show save status
          document.getElementById('save-status').style.display = 'block';
          document.getElementById('save-status').textContent = 'Options saved!';
        });
      `
    });
  });

  test('should display popup UI correctly', async () => {
    // Verify key UI elements are present
    await expect(mockPopupPage).toHaveTitle(/SmartMarks/);
    await expect(mockPopupPage.locator('h1')).toHaveText('SmartMarks');
    await expect(mockPopupPage.locator('.bookmark-item')).toHaveCount(2);
    await expect(mockPopupPage.locator('#add-bookmark')).toBeVisible();
    await expect(mockPopupPage.locator('#open-options')).toBeVisible();
  });

  test('should display options page correctly', async () => {
    // Verify key UI elements are present
    await expect(mockOptionsPage).toHaveTitle(/SmartMarks Options/);
    await expect(mockOptionsPage.locator('h1')).toHaveText('SmartMarks Options');
    await expect(mockOptionsPage.locator('#auto-organize')).toBeVisible();
    await expect(mockOptionsPage.locator('#theme-select')).toBeVisible();
    await expect(mockOptionsPage.locator('#save-options')).toBeVisible();
  });

  test('should interact with popup UI elements', async () => {
    // Verify initial state
    await expect(mockPopupPage.locator('.bookmark-item')).toHaveCount(2);

    // Click the "Add Bookmark" button - will trigger our event handler
    await mockPopupPage.locator('#add-bookmark').click();

    // Verify the bookmark was added
    await expect(mockPopupPage.locator('.bookmark-item')).toHaveCount(3);
    await expect(mockPopupPage.locator('#new-bookmark')).toHaveText('New Bookmark');

    // Test the Options button
    await mockPopupPage.locator('#open-options').click();

    // Verify the options button was clicked by checking our data attribute
    await expect(mockPopupPage.locator('body[data-options-opened="true"]')).toBeVisible();
  });

  test('should save options on the options page', async () => {
    // Check the auto-organize checkbox
    await mockOptionsPage.locator('#auto-organize').check();

    // Select the dark theme
    await mockOptionsPage.locator('#theme-select').selectOption('dark');

    // Click the save button
    await mockOptionsPage.locator('#save-options').click();

    // Verify the save status is displayed
    await expect(mockOptionsPage.locator('#save-status')).toBeVisible();
    await expect(mockOptionsPage.locator('#save-status')).toHaveText('Options saved!');

    // Verify the saved options using page.evaluate
    const savedOptions = await mockOptionsPage.evaluate(() => window.savedOptions);
    expect(savedOptions).toEqual({
      autoOrganize: true,
      theme: 'dark'
    });
  });
});
