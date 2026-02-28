import { jest } from '@jest/globals';

class FakeElement {
  public id = '';
  public className = '';
  public textContent = '';
  public style: Record<string, string> = {};
  public checked = false;
  public value = '';
  private listeners: Record<string, Array<(...args: any[]) => void>> = {};
  private children: FakeElement[] = [];

  appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }

  addEventListener(event: string, callback: (...args: any[]) => void): void {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(callback);
  }

  click(): void {
    (this.listeners.click || []).forEach(listener => listener());
  }
}

const createDocument = () => {
  const domListeners: Record<string, Array<() => void>> = {};
  const ids = [
    'default-view',
    'show-favicons',
    'ask-folder-before-save',
    'auto-create-folders',
    'categorization-version',
    'llm-enabled',
    'llm-provider',
    'llm-model',
    'llm-api-key',
    'llm-base-url',
    'llm-temperature',
    'export-btn',
    'import-btn',
    'clear-data-btn',
    'save-btn'
  ];
  const map = new Map<string, FakeElement>();
  ids.forEach(id => {
    const el = new FakeElement();
    el.id = id;
    map.set(id, el);
  });

  return {
    body: new FakeElement(),
    createElement: jest.fn(() => new FakeElement()),
    getElementById: jest.fn((id: string) => map.get(id) || null),
    addEventListener: jest.fn((event: string, cb: () => void) => {
      domListeners[event] = domListeners[event] || [];
      domListeners[event].push(cb);
    }),
    dispatchEvent: jest.fn((event: { type: string }) => {
      (domListeners[event.type] || []).forEach(cb => cb());
      return true;
    })
  };
};

describe('options settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).document = createDocument();
    (global as any).confirm = jest.fn(() => true);

    (global as any).chrome = {
      runtime: {
        getURL: (path: string) => path
      },
      storage: {
        sync: {
          get: jest.fn((defaults: any, cb: (items: any) => void) => cb(defaults)),
          set: jest.fn((_items: any, cb: () => void) => cb()),
          clear: jest.fn((cb: () => void) => cb())
        }
      }
    };
  });

  test('loads provider defaults when options page is initialized', async () => {
    // stub fetch so the default config can be returned
    (global as any).fetch = (jest.fn() as any).mockResolvedValue({
      json: async () => ({ model: 'foo', baseUrl: 'bar', temperature: 0.9 })
    } as any);

    jest.resetModules();
    require('../../scripts/options.js');
    (global as any).document.dispatchEvent({ type: 'DOMContentLoaded' });

    // provider defaults should be fetched for the initial provider value ('openai')
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('config/openai.json'));

    // changing the provider should trigger another fetch
    const provider = (global as any).document.getElementById('llm-provider');
    provider.value = 'anthropic';
    // manually invoke any change listeners that were registered by the script
    (provider.listeners.change || []).forEach((cb: () => void) => cb());
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('config/anthropic.json'));
  });

  test('saves smart suggestion and LLM categorization preferences', async () => {
    jest.resetModules();
    require('../../scripts/options.js');
    (global as any).document.dispatchEvent({ type: 'DOMContentLoaded' });

    const ask = (global as any).document.getElementById('ask-folder-before-save');
    const auto = (global as any).document.getElementById('auto-create-folders');
    const version = (global as any).document.getElementById('categorization-version');
    const llmEnabled = (global as any).document.getElementById('llm-enabled');
    const llmProvider = (global as any).document.getElementById('llm-provider');
    const llmModel = (global as any).document.getElementById('llm-model');
    const llmApiKey = (global as any).document.getElementById('llm-api-key');
    const llmBaseUrl = (global as any).document.getElementById('llm-base-url');
    const llmTemperature = (global as any).document.getElementById('llm-temperature');

    ask.checked = false;
    auto.checked = true;
    version.value = 'v2';
    llmEnabled.checked = true;
    llmProvider.value = 'openai-compatible';
    llmModel.value = 'llama3.1';
    llmApiKey.value = '';
    llmBaseUrl.value = 'http://localhost:11434/v1';
    llmTemperature.value = '0.4';

    const save = (global as any).document.getElementById('save-btn');
    save.click();

    expect((global as any).chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        askFolderBeforeSave: false,
        autoCreateFolders: true,
        categorizationSettings: {
          categorizationVersion: 'v2',
          llm: {
            enabled: true,
            provider: 'openai-compatible',
            model: 'llama3.1',
            apiKey: '',
            baseUrl: 'http://localhost:11434/v1',
            temperature: 0.4
          }
        }
      }),
      expect.any(Function)
    );
  });
});
