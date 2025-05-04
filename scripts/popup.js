document.addEventListener('DOMContentLoaded', function () {
  // DOM elements
  const searchBox = document.getElementById('search-box');
  const bookmarksList = document.getElementById('bookmarks-list');
  const addBtn = document.getElementById('add-btn');
  const optionsBtn = document.getElementById('options-btn');

  // Placeholder function to load bookmarks
  // This will be implemented in future commits
  function loadBookmarks() {
    console.log('Loading bookmarks...');
    // This will be replaced with actual bookmark loading logic
  }

  // Placeholder function to handle search
  function handleSearch() {
    const query = searchBox.value.toLowerCase();
    console.log('Searching for:', query);
    // Will implement search functionality in future commits
  }

  // Add current page as bookmark
  function addCurrentPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0];
      console.log('Adding current page:', currentTab.title);
      // Will implement bookmark adding functionality in future commits
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

  // Event listeners
  searchBox.addEventListener('input', handleSearch);
  addBtn.addEventListener('click', addCurrentPage);
  optionsBtn.addEventListener('click', openOptionsPage);

  // Initialize
  loadBookmarks();
});
