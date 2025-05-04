document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const defaultViewSelect = document.getElementById('default-view');
    const showFaviconsCheckbox = document.getElementById('show-favicons');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const saveBtn = document.getElementById('save-btn');
    const statusEl = document.createElement('div');
    statusEl.className = 'save-confirmation';
    statusEl.style.display = 'none';
    document.body.appendChild(statusEl);
    
    // Load saved options
    function loadOptions() {
        chrome.storage.sync.get({
            defaultView: 'list',
            showFavicons: true
        }, function(items) {
            defaultViewSelect.value = items.defaultView;
            showFaviconsCheckbox.checked = items.showFavicons;
        });
    }
    
    // Save options
    function saveOptions() {
        const options = {
            defaultView: defaultViewSelect.value,
            showFavicons: showFaviconsCheckbox.checked
        };
        
        chrome.storage.sync.set(options, function() {
            // Show saved confirmation
            statusEl.textContent = 'Options saved.';
            statusEl.style.display = 'block';
            
            setTimeout(function() {
                statusEl.style.display = 'none';
            }, 2000);
        });
    }
    
    // Export bookmarks
    function exportBookmarks() {
        chrome.storage.sync.get(null, function(data) {
            const bookmarksData = JSON.stringify(data, null, 2);
            const blob = new Blob([bookmarksData], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'smartmarks_backup_' + new Date().toISOString().slice(0, 10) + '.json';
            a.click();
            
            URL.revokeObjectURL(url);
            
            statusEl.textContent = 'Bookmarks exported successfully!';
            statusEl.style.display = 'block';
            setTimeout(function() {
                statusEl.style.display = 'none';
            }, 2000);
        });
    }
    
    // Import bookmarks
    function importBookmarks() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const data = JSON.parse(event.target.result);
                    chrome.storage.sync.set(data, function() {
                        statusEl.textContent = 'Bookmarks imported successfully!';
                        statusEl.style.display = 'block';
                        setTimeout(function() {
                            statusEl.style.display = 'none';
                        }, 2000);
                        loadOptions(); // Refresh the UI
                    });
                } catch (error) {
                    statusEl.textContent = 'Error: Invalid backup file';
                    statusEl.style.display = 'block';
                    setTimeout(function() {
                        statusEl.style.display = 'none';
                    }, 2000);
                }
            };
            reader.readAsText(file);
        });
        
        fileInput.click();
    }
    
    // Clear all data
    function clearAllData() {
        if (confirm('Are you sure you want to delete all your SmartMarks data? This cannot be undone.')) {
            chrome.storage.sync.clear(function() {
                statusEl.textContent = 'All data cleared successfully.';
                statusEl.style.display = 'block';
                setTimeout(function() {
                    statusEl.style.display = 'none';
                }, 2000);
                loadOptions(); // Refresh the UI
            });
        }
    }
    
    // Event listeners
    saveBtn.addEventListener('click', saveOptions);
    exportBtn.addEventListener('click', exportBookmarks);
    importBtn.addEventListener('click', importBookmarks);
    clearDataBtn.addEventListener('click', clearAllData);
    
    // Initialize
    loadOptions();
});
