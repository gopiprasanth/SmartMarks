import { test, expect } from '@playwright/test';

test.describe('Smart suggestion modal', () => {
  test('shows folder suggestion modal before saving when enabled', async ({ page }) => {
    await page.setContent(`
      <div class="popup-container">
        <input type="text" id="search-box" />
        <div id="bookmarks-list"></div>
        <button id="add-btn">Add Current Page</button>
        <button id="options-btn">Options</button>
      </div>
    `);

    await page.addInitScript(() => {
      (window as any).chrome = {
        storage: {
          sync: {
            get: (_defaults: any, callback: (items: any) => void) =>
              callback({ askFolderBeforeSave: true, autoCreateFolders: false })
          }
        },
        tabs: {
          query: (_options: any, callback: (tabs: any[]) => void) =>
            callback([{ title: 'TypeScript Docs', url: 'https://www.typescriptlang.org' }]),
          create: () => {}
        },
        bookmarks: {
          search: (_query: any, callback: (items: any[]) => void) => callback([]),
          get: (_id: string, callback: (items: any[]) => void) => callback([]),
          create: (_details: any, callback: (bookmark: any) => void) => callback({ id: '1' })
        },
        runtime: {
          sendMessage: (message: any, callback: (response: any) => void) => {
            if (message.action === 'getBookmarkAnalysis') {
              callback({ status: 'success', data: { totalBookmarks: 1, totalFolders: 1 } });
              return;
            }

            if (message.action === 'getFolderSuggestions') {
              callback({
                status: 'success',
                data: [{ id: 'tech', title: 'Tech', path: 'Bookmarks Bar/Tech', bookmarkCount: 5 }]
              });
              return;
            }

            callback({ status: 'success' });
          },
          onMessage: {
            addListener: () => {}
          },
          openOptionsPage: () => {}
        }
      };
    });

    await page.addScriptTag({ path: '/workspace/SmartMarks/scripts/popup.js' });
    await page.click('#add-btn');

    await expect(page.locator('.suggestions-modal')).toBeVisible();
    await expect(page.locator('.suggestion-item')).toContainText(['Tech']);
  });
});
