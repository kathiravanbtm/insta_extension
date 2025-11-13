// Instagram Video Enhancer Pro - Popup Script
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  bindEvents();
  updateStatus();
  loadStats();
});

// Browser API compatibility
const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;

async function loadSettings() {
  try {
    const settings = await getSettings();
    applySettingsToUI(settings);
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

function getSettings() {
  return new Promise((resolve) => {
    browserAPI.storage.sync.get({
      autoEnhance: true,
      enableKeyboardShortcuts: true,
      defaultZoom: 100,
      defaultRotation: 0,
      showControls: true,
      enableDownload: true,
      controlPosition: 'bottom',
      theme: 'dark'
    }, resolve);
  });
}

function applySettingsToUI(settings) {
  // Toggle switches
  document.getElementById('autoEnhance').classList.toggle('active', settings.autoEnhance);
  document.getElementById('keyboardShortcuts').classList.toggle('active', settings.enableKeyboardShortcuts);
  document.getElementById('enableDownload').classList.toggle('active', settings.enableDownload);

  // Select controls
  document.getElementById('controlPosition').value = settings.controlPosition;
  document.getElementById('theme').value = settings.theme;
}

function bindEvents() {
  // Toggle switches
  document.getElementById('autoEnhance').addEventListener('click', (e) => {
    toggleSetting(e.target, 'autoEnhance');
  });

  document.getElementById('keyboardShortcuts').addEventListener('click', (e) => {
    toggleSetting(e.target, 'enableKeyboardShortcuts');
  });

  document.getElementById('enableDownload').addEventListener('click', (e) => {
    toggleSetting(e.target, 'enableDownload');
  });

  // Select controls
  document.getElementById('controlPosition').addEventListener('change', (e) => {
    saveSetting('controlPosition', e.target.value);
  });

  document.getElementById('theme').addEventListener('change', (e) => {
    saveSetting('theme', e.target.value);
  });

  // Quick actions
  document.getElementById('enhanceCurrent').addEventListener('click', enhanceCurrentVideo);
  document.getElementById('toggleControls').addEventListener('click', toggleAllControls);
}

function toggleSetting(element, settingKey) {
  const isActive = element.classList.toggle('active');
  saveSetting(settingKey, isActive);
  showStatus(`${settingKey.replace(/([A-Z])/g, ' $1').toLowerCase()} ${isActive ? 'enabled' : 'disabled'}`, 'success');
}

function saveSetting(key, value) {
  const settings = { [key]: value };
  browserAPI.storage.sync.set(settings, () => {
    if (browserAPI.runtime.lastError) {
      console.error('Failed to save setting:', browserAPI.runtime.lastError);
      showStatus('Failed to save setting', 'error');
    } else {
      // Notify content scripts of settings change
      notifyContentScripts('settingsUpdated', { [key]: value });
    }
  });
}

function notifyContentScripts(action, data) {
  browserAPI.tabs.query({ url: '*://*.instagram.com/*' }, (tabs) => {
    tabs.forEach(tab => {
      browserAPI.tabs.sendMessage(tab.id, { action, ...data }).catch(() => {
        // Content script might not be ready, ignore error
      });
    });
  });
}

async function enhanceCurrentVideo() {
  try {
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (activeTab && activeTab.url && activeTab.url.includes('instagram.com')) {
      await browserAPI.tabs.sendMessage(activeTab.id, { action: 'enhanceCurrentVideo' });
      showStatus('Enhanced current video!', 'success');
    } else {
      showStatus('Please navigate to Instagram first', 'warning');
    }
  } catch (error) {
    showStatus('Failed to enhance video', 'error');
  }
}

async function toggleAllControls() {
  try {
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (activeTab && activeTab.url && activeTab.url.includes('instagram.com')) {
      await browserAPI.tabs.sendMessage(activeTab.id, { action: 'toggleControls' });
      showStatus('Toggled all controls', 'success');
    } else {
      showStatus('Please navigate to Instagram first', 'warning');
    }
  } catch (error) {
    showStatus('Failed to toggle controls', 'error');
  }
}

function updateStatus() {
  browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const statusElement = document.getElementById('status');

    if (currentTab && currentTab.url && currentTab.url.includes('instagram.com')) {
      statusElement.textContent = '✅ Extension active on Instagram!';
      statusElement.className = 'status-bar';
    } else {
      statusElement.textContent = '⚠️ Visit Instagram to use the enhancer';
      statusElement.className = 'status-bar warning';
    }
  });
}

async function loadStats() {
  try {
    const response = await sendMessageToBackground({ action: 'getStats' });
    document.getElementById('activeTabs').textContent = response.activeTabs;
    document.getElementById('version').textContent = response.version;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    browserAPI.runtime.sendMessage(message, (response) => {
      if (browserAPI.runtime.lastError) {
        reject(browserAPI.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

function showStatus(message, type = 'info') {
  const statusElement = document.getElementById('status');
  statusElement.textContent = message;
  statusElement.className = `status-bar ${type}`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    updateStatus();
  }, 3000);
}

// Handle settings updates from background
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'settingsUpdated') {
    // Refresh settings display
    loadSettings();
  }
});

// Refresh stats periodically
setInterval(loadStats, 30000); // Update every 30 seconds
