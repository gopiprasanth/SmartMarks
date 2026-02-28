import { LLMCategorizer } from '../../src/common/services/categorization/LLMCategorizer';

describe('LLMCategorizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns folder ids parsed from OpenAI-compatible response', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                '{"suggestions":[{"folderId":"folder-2","confidence":0.95},{"folderId":"folder-1","confidence":0.72}]}'
            }
          }
        ]
      })
    });

    const categorizer = new LLMCategorizer();
    const result = await categorizer.suggestFolders(
      'OpenAI API docs',
      'https://platform.openai.com/docs',
      [
        {
          id: 'folder-1',
          title: 'General AI',
          path: 'Bookmarks Bar/General AI',
          children: [],
          bookmarkCount: 2,
          keywords: new Set(['ai'])
        },
        {
          id: 'folder-2',
          title: 'OpenAI',
          path: 'Bookmarks Bar/OpenAI',
          children: [],
          bookmarkCount: 3,
          keywords: new Set(['openai', 'api'])
        }
      ],
      {
        enabled: true,
        provider: 'openai-compatible',
        model: 'llama3.1',
        apiKey: '',
        baseUrl: 'http://localhost:11434/v1',
        temperature: 0.2
      }
    );

    expect(result).toEqual(['folder-2', 'folder-1']);
    expect((global as any).fetch).toHaveBeenCalled();
  });

  test('returns empty array when model output is not parseable JSON', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not valid json output' } }]
      })
    });

    const categorizer = new LLMCategorizer();
    const result = await categorizer.suggestFolders(
      'Example',
      'https://example.com',
      [],
      {
        enabled: true,
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: 'x',
        baseUrl: '',
        temperature: 0.2
      }
    );

    expect(result).toEqual([]);
  });
});
