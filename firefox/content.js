/**
 * Instagram Video Enhancer
 * Copyright (c) 2025 Instagram Video Enhancer Contributors
 * 
 * Licensed under Custom License - See LICENSE file for details
 * Personal use only - No commercial use or redistribution
 */

// Instagram Video Enhancer Pro - Content Script

// Browser API compatibility
var browser = typeof browser !== 'undefined' ? browser : chrome;

class InstagramVideoEnhancer {
  constructor() {
    this.enhancedVideos = new Map();
    this.settings = {};
    this.activeVideo = null;
    this.fullscreenMouseMoveHandler = null;
    this.fullscreenHideTimeout = null;
    this.fullscreenManualToggle = false; // Track manual toggle state
    this.init();
  }

  async init() {
    console.log('Instagram Video Enhancer Pro initialized');
    await this.loadSettings();
    this.addVideoObserver();
    this.setupKeyboardShortcuts();
    this.setupGlobalEvents();
  }

  async loadSettings() {
    const defaults = {
      autoEnhance: true,
      enableKeyboardShortcuts: true,
      defaultZoom: 100,
      defaultRotation: 0,
      showControls: true,
      enableDownload: true,
      controlPosition: 'bottom',
      theme: 'dark',
      controlOpacity: 0.85,
      controlSize: 'normal',
      showAdvanced: true
    };
    return new Promise((resolve) => {
      browser.storage.sync.get(defaults, (settings) => {
        if (browser.runtime.lastError) {
          this.settings = defaults;
        } else {
          this.settings = settings;
        }
        resolve();
      });
    });
  }

  addVideoObserver() {
    const observer = new MutationObserver(() => {
      this.findAndEnhanceVideos();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial scan
    this.findAndEnhanceVideos();
  }

  findAndEnhanceVideos() {
    const videos = document.querySelectorAll('video');

    videos.forEach(video => {
      if (!this.enhancedVideos.has(video) && this.isInstagramVideo(video)) {
        if (this.settings.autoEnhance) {
          this.enhanceVideo(video);
        } else {
          this.addEnhanceButton(video);
        }
      }
    });
  }

  isInstagramVideo(video) {
    const rect = video.getBoundingClientRect();
    const isVisible = rect.width > 50 && rect.height > 50;
    const hasValidSrc = video.src || video.currentSrc;
    const isInstagram = window.location.hostname.includes('instagram.com');

    return isVisible && hasValidSrc && isInstagram;
  }

  addEnhanceButton(video) {
    const container = video.closest('article, div[role="presentation"]') || video.parentElement;
    if (!container || container.querySelector('.ive-enhance-btn')) return;

    const enhanceBtn = document.createElement('button');
    enhanceBtn.className = 'ive-enhance-btn';
    enhanceBtn.innerHTML = '🎬 Enhance';
    enhanceBtn.title = 'Enhance this video';

    enhanceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.enhanceVideo(video);
      enhanceBtn.remove();
    });

    container.appendChild(enhanceBtn);
  }

  enhanceVideo(video) {
    if (this.enhancedVideos.has(video)) return;

    const videoData = {
      rotation: this.settings.defaultRotation,
      scale: this.settings.defaultZoom,
      x: 0,
      y: 0,
      isFullscreen: false,
      controlsVisible: false,
      originalRect: video.getBoundingClientRect()
    };

    this.enhancedVideos.set(video, videoData);
    this.createControlPanel(video);
    this.bindVideoEvents(video);
    this.applyTransform(video);
  }

  createControlPanel(video) {
    const container = video.closest('article, div[role="presentation"]') || video.parentElement;
    if (!container) return;

    // Detect container/video size for responsive layout
    const containerRect = container.getBoundingClientRect();
    const videoRect = video.getBoundingClientRect();
    const effectiveWidth = Math.min(containerRect.width, videoRect.width);
    const effectiveHeight = Math.min(containerRect.height, videoRect.height);

    // Determine size class based on effective dimensions
    let sizeClass = 'medium'; // default
    if (effectiveWidth < 250 || effectiveHeight < 180) {
      sizeClass = 'small';
    } else if (effectiveWidth > 550 && effectiveHeight > 350) {
      sizeClass = 'large';
    }

    // Determine aspect ratio class
    const aspectRatio = effectiveWidth / effectiveHeight;
    let aspectClass = '';
    if (aspectRatio > 1.5) {
      aspectClass = 'ive-landscape';
    } else if (aspectRatio < 0.8) {
      aspectClass = 'ive-portrait';
    }

    // Check if this is Instagram Reels
    const isReels = window.location.pathname.includes('/reel/') || window.location.pathname.includes('/reels/');
    const reelsClass = isReels ? 'ive-reels' : '';

    // Create main control panel
    const controlPanel = document.createElement('div');
    controlPanel.className = `ive-control-panel ive-${this.settings.controlPosition} ive-${this.settings.theme} ive-size-${sizeClass} ${aspectClass} ${reelsClass}`.trim();

    controlPanel.innerHTML = `
      <div class="ive-controls-main">
        <div class="ive-controls-left">
          <button class="ive-btn ive-play-pause" title="Play/Pause">▶️</button>
          <input type="range" class="ive-slider ive-timeline ive-hide-small" min="0" max="100" value="0" />
          <span class="ive-time ive-hide-small">0:00 / 0:00</span>
        </div>
        <div class="ive-controls-center">
          <button class="ive-btn ive-rotate-left ive-hide-small" title="Rotate Left">↺</button>
          <input type="range" class="ive-slider ive-rotation ${sizeClass === 'small' ? 'ive-compact' : ''}" min="0" max="270" step="90" value="0" />
          <span class="ive-rotation-value ive-hide-small">0°</span>
          <button class="ive-btn ive-rotate-right ive-hide-small" title="Rotate Right">↻</button>
        </div>
        <div class="ive-controls-right">
          <button class="ive-btn ive-zoom-out ive-hide-small" title="Zoom Out">🔍-</button>
          <input type="range" class="ive-slider ive-zoom ${sizeClass === 'small' ? 'ive-compact' : ''}" min="25" max="400" value="100" />
          <span class="ive-zoom-value ive-hide-small">100%</span>
          <button class="ive-btn ive-zoom-in ive-hide-small" title="Zoom In">🔍+</button>
          <button class="ive-btn ive-fullscreen" title="Fullscreen">⛶</button>
          <button class="ive-btn ive-download ive-show-large" title="Download">⬇️</button>
          <button class="ive-btn ive-settings ive-show-large" title="Settings">⚙️</button>
        </div>
      </div>
      <div class="ive-controls-advanced ive-show-large">
        <div class="ive-position-controls">
          <label>X: <input type="range" class="ive-slider ive-pos-x" min="-200" max="200" value="0" /></label>
          <label>Y: <input type="range" class="ive-slider ive-pos-y" min="-200" max="200" value="0" /></label>
        </div>
        <div class="ive-filter-controls">
          <label>Brightness: <input type="range" class="ive-slider ive-brightness" min="0" max="200" value="100" /></label>
          <label>Contrast: <input type="range" class="ive-slider ive-contrast" min="0" max="200" value="100" /></label>
          <label>Saturation: <input type="range" class="ive-slider ive-saturation" min="0" max="200" value="100" /></label>
        </div>
      </div>
    `;

    // Position the control panel
    if (container.style.position !== 'relative' && container.style.position !== 'absolute') {
      container.style.position = 'relative';
    }

    container.appendChild(controlPanel);

    // Initially hide controls by default
    controlPanel.classList.add('ive-hidden');

    // Store references for cleanup
    const videoData = this.enhancedVideos.get(video);
    videoData.controlPanel = controlPanel;
    videoData.container = container;

    // Add resize observer for dynamic responsiveness
    this.addResizeObserver(video, controlPanel);
  }

  addResizeObserver(video, controlPanel) {
    // Create a resize observer to update control panel size dynamically
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // Debounce the resize handling
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          this.updateControlPanelSize(video, controlPanel);
        }, 100);
      }
    });

    // Observe the video element and its container
    const container = video.closest('article, div[role="presentation"]') || video.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }
    resizeObserver.observe(video);

    // Store the observer for cleanup
    const videoData = this.enhancedVideos.get(video);
    if (videoData) {
      videoData.resizeObserver = resizeObserver;
    }
  }

  updateControlPanelSize(video, controlPanel) {
    const container = video.closest('article, div[role="presentation"]') || video.parentElement;
    if (!container || !controlPanel) return;

    // Recalculate size class
    const containerRect = container.getBoundingClientRect();
    const videoRect = video.getBoundingClientRect();
    const effectiveWidth = Math.min(containerRect.width, videoRect.width);
    const effectiveHeight = Math.min(containerRect.height, videoRect.height);

    let newSizeClass = 'medium'; // default
    if (effectiveWidth < 250 || effectiveHeight < 180) {
      newSizeClass = 'small';
    } else if (effectiveWidth > 550 && effectiveHeight > 350) {
      newSizeClass = 'large';
    }

    // Recalculate aspect ratio class
    const aspectRatio = effectiveWidth / effectiveHeight;
    let newAspectClass = '';
    if (aspectRatio > 1.5) {
      newAspectClass = 'ive-landscape';
    } else if (aspectRatio < 0.8) {
      newAspectClass = 'ive-portrait';
    }

    // Update classes
    controlPanel.classList.remove('ive-size-small', 'ive-size-medium', 'ive-size-large');
    controlPanel.classList.add(`ive-size-${newSizeClass}`);

    controlPanel.classList.remove('ive-landscape', 'ive-portrait');
    if (newAspectClass) {
      controlPanel.classList.add(newAspectClass);
    }
  }

  bindVideoEvents(video) {
    const videoData = this.enhancedVideos.get(video);
    const controlPanel = video.closest('article, div[role="presentation"]')?.querySelector('.ive-control-panel') ||
                        video.parentElement.querySelector('.ive-control-panel');
    if (!controlPanel) return;

    // Main controls
    const playPauseBtn = controlPanel.querySelector('.ive-play-pause');
    const timeline = controlPanel.querySelector('.ive-timeline');
    const timeDisplay = controlPanel.querySelector('.ive-time');
    const rotateLeftBtn = controlPanel.querySelector('.ive-rotate-left');
    const rotateRightBtn = controlPanel.querySelector('.ive-rotate-right');
    const rotationSlider = controlPanel.querySelector('.ive-rotation');
    const rotationValue = controlPanel.querySelector('.ive-rotation-value');
    const zoomOutBtn = controlPanel.querySelector('.ive-zoom-out');
    const zoomInBtn = controlPanel.querySelector('.ive-zoom-in');
    const zoomSlider = controlPanel.querySelector('.ive-zoom');
    const zoomValue = controlPanel.querySelector('.ive-zoom-value');
    const fullscreenBtn = controlPanel.querySelector('.ive-fullscreen');
    const downloadBtn = controlPanel.querySelector('.ive-download');
    const settingsBtn = controlPanel.querySelector('.ive-settings');

    // Advanced controls
    const advancedPanel = controlPanel.querySelector('.ive-controls-advanced');
    const posX = controlPanel.querySelector('.ive-pos-x');
    const posY = controlPanel.querySelector('.ive-pos-y');
    const brightness = controlPanel.querySelector('.ive-brightness');
    const contrast = controlPanel.querySelector('.ive-contrast');
    const saturation = controlPanel.querySelector('.ive-saturation');

    // Play/Pause
    playPauseBtn.addEventListener('click', () => {
      if (video.paused) {
        video.play();
        playPauseBtn.innerHTML = '⏸️';
      } else {
        video.pause();
        playPauseBtn.innerHTML = '▶️';
      }
    });

    video.addEventListener('play', () => {
      playPauseBtn.innerHTML = '⏸️';
    });

    video.addEventListener('pause', () => {
      playPauseBtn.innerHTML = '▶️';
    });

    // Timeline
    video.addEventListener('timeupdate', () => {
      if (video.duration) {
        const progress = (video.currentTime / video.duration) * 100;
        timeline.value = progress;
        timeDisplay.textContent = `${this.formatTime(video.currentTime)} / ${this.formatTime(video.duration)}`;
      }
    });

    timeline.addEventListener('input', () => {
      if (video.duration) {
        video.currentTime = (timeline.value / 100) * video.duration;
      }
    });

    // Rotation
    rotateLeftBtn.addEventListener('click', () => {
      videoData.rotation = (videoData.rotation - 90) % 360;
      if (videoData.rotation < 0) videoData.rotation += 360;
      rotationSlider.value = videoData.rotation;
      rotationValue.textContent = `${videoData.rotation}°`;
      this.applyTransform(video);
    });

    rotateRightBtn.addEventListener('click', () => {
      videoData.rotation = (videoData.rotation + 90) % 360;
      rotationSlider.value = videoData.rotation;
      rotationValue.textContent = `${videoData.rotation}°`;
      this.applyTransform(video);
    });

    rotationSlider.addEventListener('input', () => {
      videoData.rotation = parseInt(rotationSlider.value);
      rotationValue.textContent = `${videoData.rotation}°`;
      this.applyTransform(video);
    });

    // Zoom
    zoomOutBtn.addEventListener('click', () => {
      videoData.scale = Math.max(25, videoData.scale - 25);
      zoomSlider.value = videoData.scale;
      zoomValue.textContent = `${videoData.scale}%`;
      this.applyTransform(video);
    });

    zoomInBtn.addEventListener('click', () => {
      videoData.scale = Math.min(400, videoData.scale + 25);
      zoomSlider.value = videoData.scale;
      zoomValue.textContent = `${videoData.scale}%`;
      this.applyTransform(video);
    });

    zoomSlider.addEventListener('input', () => {
      videoData.scale = parseInt(zoomSlider.value);
      zoomValue.textContent = `${videoData.scale}%`;
      this.applyTransform(video);
    });

    // Position
    posX.addEventListener('input', () => {
      videoData.x = parseInt(posX.value);
      this.applyTransform(video);
    });

    posY.addEventListener('input', () => {
      videoData.y = parseInt(posY.value);
      this.applyTransform(video);
    });

    // Filters
    brightness.addEventListener('input', () => {
      this.applyFilters(video);
    });

    contrast.addEventListener('input', () => {
      this.applyFilters(video);
    });

    saturation.addEventListener('input', () => {
      this.applyFilters(video);
    });

    // Fullscreen
    fullscreenBtn.addEventListener('click', () => {
      this.toggleFullscreen(video);
    });

    // Download
    downloadBtn.addEventListener('click', () => {
      this.downloadVideo(video);
    });

    // Settings
    settingsBtn.addEventListener('click', () => {
      advancedPanel.style.display = advancedPanel.style.display === 'none' ? 'block' : 'none';
    });

    // Set initial values
    rotationSlider.value = videoData.rotation;
    rotationValue.textContent = `${videoData.rotation}°`;
    zoomSlider.value = videoData.scale;
    zoomValue.textContent = `${videoData.scale}%`;
    posX.value = videoData.x;
    posY.value = videoData.y;
  }

  applyTransform(video) {
    const videoData = this.enhancedVideos.get(video);
    if (!videoData) return;

    const transform = `rotate(${videoData.rotation}deg) scale(${videoData.scale/100}) translate(${videoData.x}px, ${videoData.y}px)`;
    const origin = 'center center';

    video.style.transform = transform;
    video.style.transformOrigin = origin;
    video.style.transition = 'transform 0.3s ease';
  }

  applyFilters(video) {
    const controlPanel = video.closest('article, div[role="presentation"]')?.querySelector('.ive-control-panel') ||
                        video.parentElement.querySelector('.ive-control-panel');
    if (!controlPanel) return;

    const brightness = controlPanel.querySelector('.ive-brightness').value;
    const contrast = controlPanel.querySelector('.ive-contrast').value;
    const saturation = controlPanel.querySelector('.ive-saturation').value;

    video.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  }

  toggleFullscreen(video) {
    const videoData = this.enhancedVideos.get(video);

    if (!document.fullscreenElement) {
      this.enterFullscreen(video);
    } else {
      this.exitFullscreen(video);
    }
  }

  enterFullscreen(video) {
    const container = video.closest('article, div[role="presentation"]') || video.parentElement;
    const controlPanel = container.querySelector('.ive-control-panel');

    if (container && container.requestFullscreen) {
      container.requestFullscreen().then(() => {
        const videoData = this.enhancedVideos.get(video);
        videoData.isFullscreen = true;
        video.style.objectFit = 'contain';

        // Hide Instagram's native UI elements in fullscreen
        this.hideInstagramUIInFullscreen(container);

        // Remove normal listeners to prevent conflicts
        // (none needed for keyboard toggle)

        // Make controls hidden in fullscreen and show on mousemove
        if (controlPanel) {
          controlPanel.classList.add('ive-hidden');
          controlPanel.classList.add('ive-fullscreen-mode');

          // Show controls on mousemove, hide after 1 second (only if not manually toggled)
          this.fullscreenMouseMoveHandler = () => {
            if (!this.fullscreenManualToggle) {
              console.log('Showing controls in fullscreen');
              controlPanel.classList.remove('ive-hidden');
              clearTimeout(this.fullscreenHideTimeout);
              this.fullscreenHideTimeout = setTimeout(() => {
                if (!this.fullscreenManualToggle) {
                  console.log('Hiding controls in fullscreen');
                  controlPanel.classList.add('ive-hidden');
                }
              }, 1000);
            }
          };

          document.addEventListener('mousemove', this.fullscreenMouseMoveHandler);
        }

        setTimeout(() => this.applyTransform(video), 100);
      }).catch(console.error);
    }
  }

  exitFullscreen(video) {
    const videoData = this.enhancedVideos.get(video);
    const controlPanel = document.querySelector('.ive-control-panel.ive-fullscreen-mode');

    if (document.exitFullscreen) {
      document.exitFullscreen().then(() => {
        videoData.isFullscreen = false;
        video.style.objectFit = '';

        // Remove fullscreen mousemove listener
        if (this.fullscreenMouseMoveHandler) {
          document.removeEventListener('mousemove', this.fullscreenMouseMoveHandler);
          this.fullscreenMouseMoveHandler = null;
          clearTimeout(this.fullscreenHideTimeout);
          this.fullscreenManualToggle = false; // Reset manual toggle flag
        }

        // Restore normal behavior
        // (no listeners to restore for keyboard toggle)

        // Restore Instagram's UI elements
        this.showInstagramUIInFullscreen(container);

        // Restore control panel
        if (controlPanel) {
          controlPanel.classList.add('ive-hidden');
          controlPanel.classList.remove('ive-fullscreen-mode');
        }

        setTimeout(() => this.applyTransform(video), 100);
      }).catch(console.error);
    }
  }

  hideInstagramUIInFullscreen(container) {
    // Hide all Instagram UI elements except video and our controls
    const elementsToHide = container.querySelectorAll(
      'header, button:not(.ive-btn), svg:not(.ive-control-panel svg), ' +
      'span:not(.ive-control-panel span):not(.ive-time):not(.ive-rotation-value):not(.ive-zoom-value), ' +
      'a, h1, h2, h3, h4, h5, h6, p:not(.ive-control-panel p), ' +
      'div[role="button"], [role="menuitem"]'
    );
    
    elementsToHide.forEach(el => {
      // Skip our control panel elements and the video itself
      if (!el.closest('.ive-control-panel') && el.tagName !== 'VIDEO') {
        el.style.setProperty('display', 'none', 'important');
        el.setAttribute('data-ive-hidden', 'true');
      }
    });
  }

  showInstagramUIInFullscreen(container) {
    // Restore hidden Instagram UI elements
    const hiddenElements = container.querySelectorAll('[data-ive-hidden="true"]');
    hiddenElements.forEach(el => {
      el.style.removeProperty('display');
      el.removeAttribute('data-ive-hidden');
    });
  }

  downloadVideo(video) {
    const url = video.src || video.currentSrc;
    if (!url) return;

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `instagram-video-${timestamp}.mp4`;

    browser.runtime.sendMessage({
      action: 'downloadVideo',
      url: url,
      filename: filename
    });
  }

  setupKeyboardShortcuts() {
    if (!this.settings.enableKeyboardShortcuts) return;

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Ctrl+R for refresh
      if (e.ctrlKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        location.reload();
        return;
      }

      const activeVideo = this.getActiveVideo();
      if (!activeVideo) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          if (activeVideo.paused) {
            activeVideo.play();
          } else {
            activeVideo.pause();
          }
          break;
        case 'r':
          if (e.shiftKey) {
            e.preventDefault();
            this.rotateVideo(activeVideo, -90);
          } else {
            e.preventDefault();
            this.rotateVideo(activeVideo, 90);
          }
          break;
        case 'f':
          e.preventDefault();
          this.toggleFullscreen(activeVideo);
          break;
        case 'escape':
          e.preventDefault();
          if (document.fullscreenElement) {
            this.exitFullscreen(activeVideo);
          } else {
            this.resetVideo(activeVideo);
          }
          break;
        case '0':
          e.preventDefault();
          this.resetVideo(activeVideo);
          break;
        case 'j':
          e.preventDefault();
          const activeVideoJ = this.getActiveVideo();
          if (activeVideoJ) {
            const data = this.enhancedVideos.get(activeVideoJ);
            if (data) {
              data.scale = Math.min(400, data.scale + 25);
              this.applyTransform(activeVideoJ);
              this.updateZoomUI(activeVideoJ);
            }
          }
          break;
        case 'k':
          e.preventDefault();
          const activeVideoK = this.getActiveVideo();
          if (activeVideoK) {
            const data = this.enhancedVideos.get(activeVideoK);
            if (data) {
              data.scale = Math.max(25, data.scale - 25);
              this.applyTransform(activeVideoK);
              this.updateZoomUI(activeVideoK);
            }
          }
          break;
        case 'g':
          e.preventDefault();
          const activeVideoG = this.getActiveVideo();
          if (activeVideoG) {
            activeVideoG.currentTime = 0;
          }
          break;
        case 'y':
          e.preventDefault();
          this.toggleAllControls();
          break;
        case 'm':
          e.preventDefault();
          if (activeVideo) {
            activeVideo.muted = !activeVideo.muted;
            console.log('Video muted:', activeVideo.muted);
          }
          break;
      }
    });
  }

  setupGlobalEvents() {
    // Handle fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        // Reset fullscreen state for all videos
        this.enhancedVideos.forEach((data, video) => {
          data.isFullscreen = false;
          video.style.objectFit = '';
        });
      }
    });

    // Handle messages from background script
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'enhanceCurrentVideo':
          const activeVideo = this.getActiveVideo();
          if (activeVideo) {
            this.enhanceVideo(activeVideo);
          }
          break;
        case 'toggleControls':
          this.toggleAllControls();
          break;
        case 'settingsUpdated':
          Object.assign(this.settings, request);
          this.updateControlPanels();
          break;
      }
    });
  }

  getActiveVideo() {
    const videos = Array.from(document.querySelectorAll('video'));
    return videos.find(video => {
      const rect = video.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    }) || videos[0];
  }

  rotateVideo(video, degrees) {
    const videoData = this.enhancedVideos.get(video);
    if (!videoData) return;

    videoData.rotation = (videoData.rotation + degrees) % 360;
    if (videoData.rotation < 0) videoData.rotation += 360;
    this.applyTransform(video);

    // Update UI
    const controlPanel = video.closest('article, div[role="presentation"]')?.querySelector('.ive-control-panel') ||
                        video.parentElement.querySelector('.ive-control-panel');
    if (controlPanel) {
      const rotationSlider = controlPanel.querySelector('.ive-rotation');
      const rotationValue = controlPanel.querySelector('.ive-rotation-value');
      rotationSlider.value = videoData.rotation;
      rotationValue.textContent = `${videoData.rotation}°`;
    }
  }

  resetVideo(video) {
    const videoData = this.enhancedVideos.get(video);
    if (!videoData) return;

    videoData.rotation = 0;
    videoData.scale = 100;
    videoData.x = 0;
    videoData.y = 0;
    video.style.filter = '';

    this.applyTransform(video);

    // Update UI
    const controlPanel = video.closest('article, div[role="presentation"]')?.querySelector('.ive-control-panel') ||
                        video.parentElement.querySelector('.ive-control-panel');
    if (controlPanel) {
      controlPanel.querySelector('.ive-rotation').value = 0;
      controlPanel.querySelector('.ive-rotation-value').textContent = '0°';
      controlPanel.querySelector('.ive-zoom').value = 100;
      controlPanel.querySelector('.ive-zoom-value').textContent = '100%';
      controlPanel.querySelector('.ive-pos-x').value = 0;
      controlPanel.querySelector('.ive-pos-y').value = 0;
      controlPanel.querySelector('.ive-brightness').value = 100;
      controlPanel.querySelector('.ive-contrast').value = 100;
      controlPanel.querySelector('.ive-saturation').value = 100;
    }
  }

  toggleAllControls() {
    const controlPanels = document.querySelectorAll('.ive-control-panel');
    const isInFullscreen = document.fullscreenElement !== null;
    
    controlPanels.forEach(panel => {
      panel.classList.toggle('ive-hidden');
      
      // If in fullscreen, set manual toggle flag
      if (isInFullscreen) {
        const wasHidden = panel.classList.contains('ive-hidden');
        this.fullscreenManualToggle = !wasHidden; // true if now visible, false if now hidden
        console.log('Manual toggle in fullscreen:', this.fullscreenManualToggle);
      }
    });
  }

  updateZoomUI(video) {
    const controlPanel = video.closest('article, div[role="presentation"]')?.querySelector('.ive-control-panel') ||
                        video.parentElement.querySelector('.ive-control-panel');
    if (!controlPanel) return;

    const zoomSlider = controlPanel.querySelector('.ive-zoom');
    const zoomValue = controlPanel.querySelector('.ive-zoom-value');
    const data = this.enhancedVideos.get(video);
    if (data && zoomSlider) zoomSlider.value = data.scale;
    if (data && zoomValue) zoomValue.textContent = `${data.scale}%`;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  updateControlPanels() {
    this.enhancedVideos.forEach((videoData, video) => {
      const container = video.closest('article, div[role="presentation"]') || video.parentElement;
      if (!container) return;

      const controlPanel = container.querySelector('.ive-control-panel');
      if (controlPanel) {
        // Update classes
        controlPanel.className = `ive-control-panel ive-${this.settings.controlPosition} ive-${this.settings.theme} ive-${this.settings.controlSize}`;

        // Update opacity
        controlPanel.style.background = `rgba(0, 0, 0, ${this.settings.controlOpacity})`;

        // Update advanced controls visibility
        const advancedControls = controlPanel.querySelector('.ive-controls-advanced');
        if (advancedControls) {
          advancedControls.style.display = this.settings.showAdvanced ? 'flex' : 'none';
        }
      }
    });
  }
}

// Initialize the enhancer
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new InstagramVideoEnhancer();
  });
} else {
  new InstagramVideoEnhancer();
}
