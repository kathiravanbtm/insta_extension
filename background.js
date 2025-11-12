// Instagram fullscreen viewer - Background Script
chrome.runtime.onInstalled.addListener(() => {
  console.log('Instagram fullscreen viewer extension installed.');

  // Set default settings
  chrome.storage.sync.set({
    autoEnhance: true,
    enableKeyboardShortcuts: true,
    defaultZoom: 100,
    defaultRotation: 0,
    showControls: true,
    enableCrop: true,
    enableDownload: true,
    controlPosition: 'bottom',
    theme: 'dark'
  });

  // Create context menu
  createContextMenu();
});

function createContextMenu() {
  chrome.contextMenus.create({
    id: 'fullscreenViewer',
    title: 'Instagram fullscreen viewer',
    contexts: ['video'],
    documentUrlPatterns: [
      'https://www.instagram.com/*',
      'https://instagram.com/*'
    ]
  });

  chrome.contextMenus.create({
    id: 'toggleControls',
    title: 'Toggle All Controls',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://www.instagram.com/*',
      'https://instagram.com/*'
    ]
  });

  chrome.contextMenus.create({
    id: 'resetAllVideos',
    title: 'Reset All Videos',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://www.instagram.com/*',
      'https://instagram.com/*'
    ]
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'fullscreenViewer':
      chrome.tabs.sendMessage(tab.id, { action: 'fullscreenCurrentVideo' });
      break;
    case 'toggleControls':
      chrome.tabs.sendMessage(tab.id, { action: 'toggleControls' });
      break;
    case 'resetAllVideos':
      chrome.tabs.sendMessage(tab.id, { action: 'resetAllVideos' });
      break;
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'downloadVideo':
      handleVideoDownload(request.url, request.filename, sendResponse);
      return true; // Keep message channel open for async response

    case 'getSettings':
      chrome.storage.sync.get(null, (settings) => {
        sendResponse(settings);
      });
      return true;

    case 'saveSettings':
      chrome.storage.sync.set(request.settings, () => {
        sendResponse({ success: true });
        // Notify all tabs of settings change
        chrome.tabs.query({ url: '*://*.instagram.com/*' }, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'settingsUpdated',
              settings: request.settings
            });
          });
        });
      });
      return true;

    case 'getStats':
      getExtensionStats(sendResponse);
      return true;
  }
});

async function handleVideoDownload(url, filename, sendResponse) {
  try {
    // Check if we have download permission
    const result = await chrome.permissions.contains({ permissions: ['downloads'] });
    if (!result) {
      sendResponse({ success: false, error: 'Download permission not granted' });
      return;
    }

    // Start download
    const downloadId = await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });

    // Monitor download progress
    const downloadItem = await new Promise((resolve) => {
      chrome.downloads.onChanged.addListener(function listener(delta) {
        if (delta.id === downloadId && delta.state) {
          chrome.downloads.onChanged.removeListener(listener);
          resolve(delta);
        }
      });
    });

    if (downloadItem.state.current === 'complete') {
      sendResponse({ success: true, downloadId });
    } else {
      sendResponse({ success: false, error: 'Download failed' });
    }
  } catch (error) {
    console.error('Download error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

function getExtensionStats(sendResponse) {
  chrome.tabs.query({ url: '*://*.instagram.com/*' }, (tabs) => {
    const stats = {
      activeTabs: tabs.length,
      version: chrome.runtime.getManifest().version,
      installDate: new Date().toISOString().split('T')[0]
    };
    sendResponse(stats);
  });
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup or perform quick action
  if (tab.url && tab.url.includes('instagram.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'fullscreenViewer' });
  }
});

// Handle tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('instagram.com')) {
    // Content script should auto-inject, but we can send a refresh message
    chrome.tabs.sendMessage(tabId, { action: 'pageLoaded' }).catch(() => {
      // Content script might not be ready yet, ignore error
    });
  }
});
