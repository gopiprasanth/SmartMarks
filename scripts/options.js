document.addEventListener('DOMContentLoaded', function () {
  // DOM elements
  const defaultViewSelect = document.getElementById('default-view');
  const showFaviconsCheckbox = document.getElementById('show-favicons');
  const askFolderBeforeSaveCheckbox = document.getElementById('ask-folder-before-save');
  const autoCreateFoldersCheckbox = document.getElementById('auto-create-folders');
  const categorizationVersionSelect = document.getElementById('categorization-version');
  const llmEnabledCheckbox = document.getElementById('llm-enabled');
  const llmProviderSelect = document.getElementById('llm-provider');
  const llmModelInput = document.getElementById('llm-model');
  const llmApiKeyInput = document.getElementById('llm-api-key');
  const llmBaseUrlInput = document.getElementById('llm-base-url');
  const llmTemperatureInput = document.getElementById('llm-temperature');
  const exportBtn = document.getElementById('export-btn');

  // when the provider dropdown changes, update fields with its defaults
  llmProviderSelect.addEventListener('change', () => {
    maybeApplyProviderDefaults(llmProviderSelect.value);
  });
  const importBtn = document.getElementById('import-btn');
  const clearDataBtn = document.getElementById('clear-data-btn');
  const saveBtn = document.getElementById('save-btn');
  const statusEl = document.createElement('div');
  statusEl.className = 'save-confirmation';
  statusEl.style.display = 'none';
  document.body.appendChild(statusEl);

  const defaultCategorizationSettings = {
    categorizationVersion: 'v2',
    llm: {
      enabled: true,
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: '',
      baseUrl: '',
      temperature: 0.2
    }
  };

  function clampTemperature(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return defaultCategorizationSettings.llm.temperature;
    }

    return Math.max(0, Math.min(1, parsed));
  }

  // Load saved options
  function loadOptions() {
    chrome.storage.sync.get(
      {
        defaultView: 'list',
        showFavicons: true,
        askFolderBeforeSave: true,
        autoCreateFolders: false,
        categorizationSettings: defaultCategorizationSettings
      },
      function (items) {
        defaultViewSelect.value = items.defaultView;
        showFaviconsCheckbox.checked = items.showFavicons;
        askFolderBeforeSaveCheckbox.checked = items.askFolderBeforeSave;
        autoCreateFoldersCheckbox.checked = items.autoCreateFolders;

        const categorizationSettings = {
          ...defaultCategorizationSettings,
          ...(items.categorizationSettings || {}),
          llm: {
            ...defaultCategorizationSettings.llm,
            ...((items.categorizationSettings && items.categorizationSettings.llm) || {})
          }
        };

        categorizationVersionSelect.value = categorizationSettings.categorizationVersion;
        llmEnabledCheckbox.checked = categorizationSettings.llm.enabled;
        llmProviderSelect.value = categorizationSettings.llm.provider;
        llmModelInput.value = categorizationSettings.llm.model;
        llmApiKeyInput.value = categorizationSettings.llm.apiKey;
        llmBaseUrlInput.value = categorizationSettings.llm.baseUrl;
        llmTemperatureInput.value = String(categorizationSettings.llm.temperature);
        // make sure provider-specific defaults are reflected (in case the stored
        // settings only contained provider/apiKey)
        maybeApplyProviderDefaults(categorizationSettings.llm.provider);
      }
    );
  }

  // when provider changes, load its default config file and patch the
  // model/baseUrl/temperature inputs so the UI reflects what will actually be
  // used (the user may still override values afterwards).
  function maybeApplyProviderDefaults(provider) {
    if (!provider) return;
    const url = chrome.runtime.getURL(`config/${provider}.json`);
    fetch(url)
      .then(res => res.json())
      .then(cfg => {
        if (cfg.model) llmModelInput.value = cfg.model;
        if (cfg.baseUrl) llmBaseUrlInput.value = cfg.baseUrl;
        if (typeof cfg.temperature !== 'undefined') {
          llmTemperatureInput.value = String(cfg.temperature);
        }
      })
      .catch(() => {
        // ignore failure; nothing critical
      });
  }

  // Save options
  function saveOptions() {
    const options = {
      defaultView: defaultViewSelect.value,
      showFavicons: showFaviconsCheckbox.checked,
      askFolderBeforeSave: askFolderBeforeSaveCheckbox.checked,
      autoCreateFolders: autoCreateFoldersCheckbox.checked,
      categorizationSettings: {
        categorizationVersion: categorizationVersionSelect.value,
        llm: {
          enabled: llmEnabledCheckbox.checked,
          provider: llmProviderSelect.value,
          model: llmModelInput.value.trim() || defaultCategorizationSettings.llm.model,
          apiKey: llmApiKeyInput.value.trim(),
          baseUrl: llmBaseUrlInput.value.trim(),
          temperature: clampTemperature(llmTemperatureInput.value)
        }
      }
    };

    chrome.storage.sync.set(options, function () {
      // Show saved confirmation
      statusEl.textContent = 'Options saved.';
      statusEl.style.display = 'block';

      setTimeout(function () {
        statusEl.style.display = 'none';
      }, 2000);
    });
  }

  // Export bookmarks
  function exportBookmarks() {
    chrome.storage.sync.get(null, function (data) {
      const bookmarksData = JSON.stringify(data, null, 2);
      const blob = new Blob([bookmarksData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'smartmarks_backup_' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();

      URL.revokeObjectURL(url);

      statusEl.textContent = 'Bookmarks exported successfully!';
      statusEl.style.display = 'block';
      setTimeout(function () {
        statusEl.style.display = 'none';
      }, 2000);
    });
  }

  // Import bookmarks
  function importBookmarks() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';

    fileInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (event) {
        try {
          const data = JSON.parse(event.target.result);
          chrome.storage.sync.set(data, function () {
            statusEl.textContent = 'Bookmarks imported successfully!';
            statusEl.style.display = 'block';
            setTimeout(function () {
              statusEl.style.display = 'none';
            }, 2000);
            loadOptions(); // Refresh the UI
          });
        } catch (_error) {
          statusEl.textContent = 'Error: Invalid backup file';
          statusEl.style.display = 'block';
          setTimeout(function () {
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
    if (
      confirm('Are you sure you want to delete all your SmartMarks data? This cannot be undone.')
    ) {
      chrome.storage.sync.clear(function () {
        statusEl.textContent = 'All data cleared successfully.';
        statusEl.style.display = 'block';
        setTimeout(function () {
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
