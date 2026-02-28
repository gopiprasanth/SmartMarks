import { jest } from '@jest/globals';

class FakeElement {
  public id = '';
  public className = '';
  public textContent = '';
  public innerHTML = '';
  public style: Record<string, string> = {};
  public dataset: Record<string, string> = {};
  public parentNode: FakeElement | null = null;
  private listeners: Record<string, Array<() => void>> = {};
  private children: FakeElement[] = [];

  appendChild(child: FakeElement): FakeElement {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(newNode: FakeElement, _referenceNode: FakeElement): FakeElement {
    newNode.parentNode = this;
    this.children.unshift(newNode);
    return newNode;
  }

  addEventListener(event: string, callback: () => void): void {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(callback);
  }

  click(): void {
    (this.listeners.click || []).forEach(listener => listener());
  }
}

const createFakeDocument = () => {
  const elementsById = new Map<string, FakeElement>();
  const domListeners: Record<string, Array<() => void>> = {};

  const popupContainer = new FakeElement();
  popupContainer.className = 'popup-container';

  const searchBox = new FakeElement();
  searchBox.id = 'search-box';
  (searchBox as any).value = '';
  searchBox.parentNode = popupContainer;
  elementsById.set('search-box', searchBox);

  const bookmarksList = new FakeElement();
  bookmarksList.id = 'bookmarks-list';
  bookmarksList.parentNode = popupContainer;
  elementsById.set('bookmarks-list', bookmarksList);

  const addBtn = new FakeElement();
  addBtn.id = 'add-btn';
  addBtn.parentNode = popupContainer;
  elementsById.set('add-btn', addBtn);

  const optionsBtn = new FakeElement();
  optionsBtn.id = 'options-btn';
  optionsBtn.parentNode = popupContainer;
  elementsById.set('options-btn', optionsBtn);

  return {
    body: new FakeElement(),
    createElement: jest.fn(() => new FakeElement()),
    getElementById: jest.fn((id: string) => elementsById.get(id) || null),
    addEventListener: jest.fn((event: string, callback: () => void) => {
      domListeners[event] = domListeners[event] || [];
      domListeners[event].push(callback);
    }),
    dispatchEvent: jest.fn((event: { type: string }) => {
      (domListeners[event.type] || []).forEach(listener => listener());
      return true;
    })
  };
};

describe('popup folder suggestion flow', () => {
  const loadPopupScript = async () => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../scripts/popup.js');
    (global as any).document.dispatchEvent({ type: 'DOMContentLoaded' });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).document = createFakeDocument();
    (global as any).window = { open: jest.fn() };
  });

  test('creates bookmark in suggested folder when suggestions exist', async () => {
    const sendMessage = jest.fn((message: any, callback: (response: any) => void) => {
      if (message.action === 'getBookmarkAnalysis') {
        callback({
          status: 'success',
          data: { totalBookmarks: 5, totalFolders: 2 }
        });
        return;
      }

      if (message.action === 'getFolderSuggestions') {
        callback({
          status: 'success',
          data: [{ id: 'folder-tech', title: 'Tech', path: 'Tech', bookmarkCount: 3 }]
        });
      }
    });

    const createBookmark = jest.fn((details: any, callback: (result: any) => void) =>
      callback({ id: 'bookmark-1', title: details.title })
    );

    (global as any).chrome = {
      runtime: {
        sendMessage,
        onMessage: {
          addListener: jest.fn()
        },
        openOptionsPage: jest.fn(),
        getURL: jest.fn((path: string) => path)
      },
      bookmarks: {
        search: jest.fn((_query: any, callback: (results: any[]) => void) => callback([])),
        create: createBookmark,
        get: jest.fn()
      },
      tabs: {
        query: jest.fn((_query: any, callback: (tabs: any[]) => void) =>
          callback([{ title: 'TypeScript', url: 'https://www.typescriptlang.org/' }])
        ),
        create: jest.fn()
      }
    };

    await loadPopupScript();

    const addButton = (global as any).document.getElementById('add-btn');
    addButton.click();

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'getFolderSuggestions',
        title: 'TypeScript',
        url: 'https://www.typescriptlang.org/'
      }),
      expect.any(Function)
    );

    expect(createBookmark).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'TypeScript',
        url: 'https://www.typescriptlang.org/',
        parentId: 'folder-tech'
      }),
      expect.any(Function)
    );
  });

  test('creates bookmark in default location when suggestions are empty', async () => {
    const sendMessage = jest.fn((message: any, callback: (response: any) => void) => {
      if (message.action === 'getBookmarkAnalysis') {
        callback({
          status: 'success',
          data: { totalBookmarks: 5, totalFolders: 2 }
        });
        return;
      }

      if (message.action === 'getFolderSuggestions') {
        callback({
          status: 'success',
          data: []
        });
      }
    });

    const createBookmark = jest.fn((details: any, callback: (result: any) => void) =>
      callback({ id: 'bookmark-1', title: details.title })
    );

    (global as any).chrome = {
      runtime: {
        sendMessage,
        onMessage: {
          addListener: jest.fn()
        },
        openOptionsPage: jest.fn(),
        getURL: jest.fn((path: string) => path)
      },
      bookmarks: {
        search: jest.fn((_query: any, callback: (results: any[]) => void) => callback([])),
        create: createBookmark,
        get: jest.fn()
      },
      tabs: {
        query: jest.fn((_query: any, callback: (tabs: any[]) => void) =>
          callback([{ title: 'No Match', url: 'https://example.com/no-match' }])
        ),
        create: jest.fn()
      }
    };

    await loadPopupScript();

    const addButton = (global as any).document.getElementById('add-btn');
    addButton.click();

    expect(createBookmark).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'No Match',
        url: 'https://example.com/no-match'
      }),
      expect.any(Function)
    );

    const createdArgs = createBookmark.mock.calls[0][0];
    expect(createdArgs.parentId).toBeUndefined();
  });
});
