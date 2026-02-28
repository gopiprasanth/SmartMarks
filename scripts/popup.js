document.addEventListener('DOMContentLoaded', function () {
  // DOM elements
  const searchBox = document.getElementById('search-box');
  const bookmarksList = document.getElementById('bookmarks-list');
  const addBtn = document.getElementById('add-btn');
  const optionsBtn = document.getElementById('options-btn');
  const statusDiv = document.createElement('div');
  statusDiv.className = 'status-message';
  bookmarksList.parentNode.insertBefore(statusDiv, bookmarksList);

  function getPreferenceSettings() {
    return new Promise(resolve => {
      if (!chrome.storage || !chrome.storage.sync) {
        resolve({ askFolderBeforeSave: true, autoCreateFolders: false });
        return;
      }

      chrome.storage.sync.get(
        {
          askFolderBeforeSave: true,
          autoCreateFolders: false
        },
        function (settings) {
          resolve(settings);
        }
      );
    });
  }

  function showSuggestionModal(tab, suggestions) {
    const overlay = document.createElement('div');
    overlay.className = 'suggestions-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'suggestions-modal';

    const title = document.createElement('h3');
    title.textContent = 'Choose a folder';
    modal.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'suggestions-subtitle';
    subtitle.textContent = tab.title || tab.url || 'New bookmark';
    modal.appendChild(subtitle);

    const list = document.createElement('div');
    list.className = 'suggestions-list';

    const saveInFolder = folder => {
      if (folder && folder.id) {
        chrome.runtime.sendMessage(
          { action: 'recordFolderSelection', folderId: folder.id },
          () => {}
        );
      }

      const createDetails = {
        title: tab.title,
        url: tab.url,
        parentId: folder && folder.id ? folder.id : undefined
      };

      chrome.bookmarks.create(createDetails, function (result) {
        overlay.remove();
        if (result) {
          showStatus(
            folder && folder.title
              ? `Bookmark added to: ${folder.title}`
              : `Bookmark added: ${result.title}`
          );
        } else {
          showStatus('Error adding bookmark', true);
        }

        setTimeout(loadRecentBookmarks, 300);
      });
    };

    suggestions.forEach(suggestion => {
      const btn = document.createElement('button');
      btn.className = 'suggestion-item';
      btn.textContent = `${suggestion.title} (${suggestion.bookmarkCount} bookmarks)`;
      btn.addEventListener('click', () => saveInFolder(suggestion));
      list.appendChild(btn);
    });

    const createNewBtn = document.createElement('button');
    createNewBtn.className = 'suggestion-item create-folder';
    createNewBtn.textContent = 'Create intelligent folder';
    createNewBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage(
        {
          action: 'createIntelligentFolder',
          title: tab.title || '',
          url: tab.url || ''
        },
        response => {
          if (response && response.status === 'success') {
            saveInFolder(response.data);
            return;
          }

          showStatus('Could not create folder, saved in default location', true);
          saveInFolder(null);
        }
      );
    });
    list.appendChild(createNewBtn);

    const skipBtn = document.createElement('button');
    skipBtn.className = 'suggestion-item secondary';
    skipBtn.textContent = 'Save in default location';
    skipBtn.addEventListener('click', () => saveInFolder(null));
    list.appendChild(skipBtn);

    modal.appendChild(list);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // Load bookmarks and display them in the popup
  function loadBookmarks() {
    showStatus('Loading bookmarks...');

    // Request bookmark analysis data from background script
    chrome.runtime.sendMessage({ action: 'getBookmarkAnalysis' }, function (response) {
      if (response && response.status === 'success') {
        // Display bookmark statistics
        const { totalBookmarks, totalFolders } = response.data;
        showStatus(`Found ${totalBookmarks} bookmarks in ${totalFolders} folders`);

        // Load recent bookmarks
        loadRecentBookmarks();
      } else {
        showStatus('Error loading bookmark data');
      }
    });
  }

  // Display status message to the user
  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = 'status-message' + (isError ? ' error' : '');
    statusDiv.style.display = 'block';
  }

  // Load and display recent bookmarks
  function loadRecentBookmarks() {
    // Clear existing content
    bookmarksList.innerHTML = '';

    // Get recent bookmarks (last 10)
    chrome.bookmarks.search({}, function (bookmarks) {
      // Sort by dateAdded (most recent first)
      const recentBookmarks = bookmarks
        .filter(b => b.url) // Only show actual bookmarks, not folders
        .sort((a, b) => {
          // Some bookmarks might not have dateAdded property
          const dateA = a.dateAdded || 0;
          const dateB = b.dateAdded || 0;
          return dateB - dateA;
        })
        .slice(0, 10); // Get top 10

      if (recentBookmarks.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder-text';
        placeholder.textContent = 'No bookmarks found';
        bookmarksList.appendChild(placeholder);
        return;
      }

      // Create DOM elements for each bookmark
      recentBookmarks.forEach(bookmark => {
        const bookmarkItem = createBookmarkElement(bookmark);
        bookmarksList.appendChild(bookmarkItem);
      });
    });
  }

  // Create a DOM element for a bookmark
  function createBookmarkElement(bookmark) {
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    item.dataset.id = bookmark.id;

    // Create favicon
    const favicon = document.createElement('img');
    favicon.className = 'favicon';
    if (bookmark.url) {
      // Extract domain for favicon
      let domain;
      try {
        domain = new URL(bookmark.url).hostname;
      } catch (_e) {
        domain = '';
      }
      favicon.src = `https://www.google.com/s2/favicons?domain=${domain}`;
    } else {
      favicon.src = 'icons/home.png';
    }

    // Create title and url elements
    const titleElement = document.createElement('div');
    titleElement.className = 'bookmark-title';
    titleElement.textContent = bookmark.title || 'Untitled';

    const urlElement = document.createElement('div');
    urlElement.className = 'bookmark-url';
    urlElement.textContent = bookmark.url || '';

    // Add folder path if available
    const folderElement = document.createElement('div');
    folderElement.className = 'bookmark-folder';

    if (bookmark.parentId) {
      // Get folder path (async)
      getBookmarkPath(bookmark.parentId).then(path => {
        folderElement.textContent = path;
      });
    }

    // Add elements to item
    item.appendChild(favicon);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'bookmark-content';
    contentDiv.appendChild(titleElement);
    contentDiv.appendChild(urlElement);
    contentDiv.appendChild(folderElement);

    item.appendChild(contentDiv);

    // Add click handler to open the bookmark
    item.addEventListener('click', () => {
      if (bookmark.url) {
        chrome.tabs.create({ url: bookmark.url });
      }
    });

    return item;
  }

  // Recursively find the path of a bookmark folder
  async function getBookmarkPath(folderId) {
    return new Promise(resolve => {
      chrome.bookmarks.get(folderId, items => {
        if (items && items.length > 0) {
          const folder = items[0];

          // Root folders (0, 1, 2) don't have parentId
          if (!folder.parentId || folder.parentId === '0') {
            resolve(folder.title);
          } else {
            // Recursively get parent path
            getBookmarkPath(folder.parentId).then(parentPath => {
              resolve(`${parentPath} > ${folder.title}`);
            });
          }
        } else {
          resolve('Unknown');
        }
      });
    });
  }

  // Handle search function
  function handleSearch() {
    const query = searchBox.value.toLowerCase().trim();

    if (!query) {
      loadRecentBookmarks();
      return;
    }

    showStatus(`Searching for: ${query}...`);

    // Search for bookmarks matching the query
    chrome.bookmarks.search(query, results => {
      bookmarksList.innerHTML = '';

      if (results.length === 0) {
        showStatus(`No results found for: ${query}`);
        return;
      }

      showStatus(`Found ${results.length} results for: ${query}`);

      // Filter out folders, only show actual bookmarks
      const bookmarks = results.filter(b => b.url);

      // Create and append bookmark elements
      bookmarks.forEach(bookmark => {
        const bookmarkItem = createBookmarkElement(bookmark);
        bookmarksList.appendChild(bookmarkItem);
      });
    });
  }

  // Add current page as bookmark
  async function addCurrentPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
      const currentTab = tabs[0];
      showStatus(`Adding: ${currentTab.title}...`);

      chrome.runtime.sendMessage(
        {
          action: 'getFolderSuggestions',
          title: currentTab.title || '',
          url: currentTab.url || ''
        },
        async function (response) {
          const suggestions =
            response && response.status === 'success' && Array.isArray(response.data)
              ? response.data
              : [];

          const settings = await getPreferenceSettings();
          if (settings.askFolderBeforeSave && suggestions.length > 0) {
            showSuggestionModal(currentTab, suggestions.slice(0, 5));
            return;
          }

          if (settings.autoCreateFolders && suggestions.length === 0) {
            chrome.runtime.sendMessage(
              {
                action: 'createIntelligentFolder',
                title: currentTab.title || '',
                url: currentTab.url || ''
              },
              createResponse => {
                const createDetails = {
                  title: currentTab.title,
                  url: currentTab.url,
                  parentId:
                    createResponse && createResponse.status === 'success' && createResponse.data
                      ? createResponse.data.id
                      : undefined
                };

                chrome.bookmarks.create(createDetails, function (result) {
                  if (result) {
                    showStatus(`Bookmark added: ${result.title}`);
                  } else {
                    showStatus('Error adding bookmark', true);
                  }
                  setTimeout(loadRecentBookmarks, 300);
                });
              }
            );
            return;
          }

          const createDetails = {
            title: currentTab.title,
            url: currentTab.url
          };

          if (suggestions.length > 0 && suggestions[0].id) {
            createDetails.parentId = suggestions[0].id;
            chrome.runtime.sendMessage(
              {
                action: 'recordFolderSelection',
                folderId: suggestions[0].id
              },
              () => {}
            );
          }

          chrome.bookmarks.create(createDetails, function (result) {
            if (result) {
              if (suggestions.length > 0) {
                showStatus(`Bookmark added to suggested folder: ${suggestions[0].title}`);
              } else {
                showStatus(`Bookmark added: ${result.title}`);
              }
            } else {
              showStatus('Error adding bookmark', true);
            }

            // Refresh the bookmark list
            setTimeout(() => {
              loadRecentBookmarks();
            }, 1000);
          });
        }
      );
    });
  }

  // Open options page
  function openOptionsPage() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'folderSuggestions') {
      const suggestions = Array.isArray(message.suggestions) ? message.suggestions : [];
      if (suggestions.length > 0) {
        const topSuggestions = suggestions
          .slice(0, 3)
          .map(s => s.title)
          .join(', ');
        showStatus(`Suggestions: ${topSuggestions}`);
      }
      sendResponse({ status: 'received' });
    }
    return true;
  });

  // Event listeners
  searchBox.addEventListener('input', handleSearch);
  addBtn.addEventListener('click', addCurrentPage);
  optionsBtn.addEventListener('click', openOptionsPage);

  // Initialize
  loadBookmarks();
});
