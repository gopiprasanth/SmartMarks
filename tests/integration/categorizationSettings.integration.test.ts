import { BookmarkService, BookmarkFolder } from '../../src/common/services/BookmarkService';

describe('Categorization v2 integration', () => {
  test('falls back to v1 heuristics when llm returns no suggestions', async () => {
    const service = new BookmarkService();

    const docsFolder: BookmarkFolder = {
      id: 'docs-folder',
      title: 'Docs',
      path: 'Bookmarks Bar/Docs',
      children: [],
      bookmarkCount: 3,
      keywords: new Set(['docs', 'guide', 'reference'])
    };

    jest.spyOn(service, 'getBookmarkAnalysis').mockResolvedValue({
      folders: new Map([['docs-folder', docsFolder]]),
      totalBookmarks: 3,
      totalFolders: 1,
      rootFolders: []
    });

    (global as any).chrome = {
      storage: {
        sync: {
          get: jest.fn((defaults: any, cb: (items: any) => void) =>
            cb({
              ...defaults,
              folderPreferences: {},
              categorizationSettings: {
                categorizationVersion: 'v2',
                llm: {
                  enabled: true,
                  provider: 'openai',
                  model: 'gpt-4o-mini',
                  apiKey: 'test-key',
                  baseUrl: 'https://api.openai.com/v1',
                  temperature: 0.2
                }
              }
            })
          )
        }
      }
    };

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"suggestions":[]}' } }]
      })
    });

    const suggestions = await service.suggestFolders(
      'TypeScript Docs Guide',
      'https://www.typescriptlang.org/docs/'
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].id).toBe('docs-folder');
  });
});
