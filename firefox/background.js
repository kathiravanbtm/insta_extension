// Browser API compatibility
var browser = typeof browser !== 'undefined' ? browser : chrome;

// Instagram Video Enhancer Pro - Background Script
browser.runtime.onInstalled.addListener(() => {
  console.log('Instagram Video Enhancer Pro installed');

  // Set default settings
  browser.storage.sync.set({
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
  browser.contextMenus.create({
    id: 'enhanceVideo',
    title: 'Enhance Instagram Video',
    contexts: ['video'],
    documentUrlPatterns: [
      'https://www.instagram.com/*',
      'https://instagram.com/*'
    ]
  });

  browser.contextMenus.create({
    id: 'toggleControls',
    title: 'Toggle All Controls',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://www.instagram.com/*',
      'https://instagram.com/*'
    ]
  });

  browser.contextMenus.create({
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
browser.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'enhanceVideo':
      browser.tabs.sendMessage(tab.id, { action: 'enhanceCurrentVideo' });
      break;
    case 'toggleControls':
      browser.tabs.sendMessage(tab.id, { action: 'toggleControls' });
      break;
    case 'resetAllVideos':
      browser.tabs.sendMessage(tab.id, { action: 'resetAllVideos' });
      break;
  }
});

// Handle messages from content script and popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'downloadVideo':
      handleVideoDownload(request.url, request.filename, sendResponse);
      return true; // Keep message channel open for async response

    case 'getSettings':
      browser.storage.sync.get(null, (settings) => {
        sendResponse(settings);
      });
      return true;

    case 'saveSettings':
      browser.storage.sync.set(request.settings, () => {
        sendResponse({ success: true });
        // Notify all tabs of settings change
        browser.tabs.query({ url: '*://*.instagram.com/*' }, (tabs) => {
          tabs.forEach(tab => {
            browser.tabs.sendMessage(tab.id, {
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
    const result = await browser.permissions.contains({ permissions: ['downloads'] });
    if (!result) {
      sendResponse({ success: false, error: 'Download permission not granted' });
      return;
    }

    // Start download
    const downloadId = await browser.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });

    // Monitor download progress
    const downloadItem = await new Promise((resolve) => {
      browser.downloads.onChanged.addListener(function listener(delta) {
        if (delta.id === downloadId && delta.state) {
          browser.downloads.onChanged.removeListener(listener);
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
  browser.tabs.query({ url: '*://*.instagram.com/*' }, (tabs) => {
    const stats = {
      activeTabs: tabs.length,
      version: browser.runtime.getManifest().version,
      installDate: new Date().toISOString().split('T')[0]
    };
    sendResponse(stats);
  });
}

// Handle extension icon click
browser.browserAction.onClicked.addListener((tab) => {
  // Open popup or perform quick action
  if (tab.url && tab.url.includes('instagram.com')) {
    browser.tabs.sendMessage(tab.id, { action: 'enhanceCurrentVideo' });
  }
});

// Handle tab updates to inject content script if needed
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('instagram.com')) {
    // Content script should auto-inject, but we can send a refresh message
    browser.tabs.sendMessage(tabId, { action: 'pageLoaded' }).catch(() => {
      // Content script might not be ready yet, ignore error
    });
  }
});
