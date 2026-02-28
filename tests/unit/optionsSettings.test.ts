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
      storage: {
        sync: {
          get: jest.fn((defaults: any, cb: (items: any) => void) => cb(defaults)),
          set: jest.fn((_items: any, cb: () => void) => cb()),
          clear: jest.fn((cb: () => void) => cb())
        }
      }
    };
  });

  test('saves smart suggestion preferences', async () => {
    jest.resetModules();
    require('../../scripts/options.js');
    (global as any).document.dispatchEvent({ type: 'DOMContentLoaded' });

    const ask = (global as any).document.getElementById('ask-folder-before-save');
    const auto = (global as any).document.getElementById('auto-create-folders');
    ask.checked = false;
    auto.checked = true;

    const save = (global as any).document.getElementById('save-btn');
    save.click();

    expect((global as any).chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({ askFolderBeforeSave: false, autoCreateFolders: true }),
      expect.any(Function)
    );
  });
});
