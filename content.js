// Instagram fullscreen viewer - Content Script
class InstagramFullscreenViewer {
  constructor() {
    this.enhancedVideos = new Map();
    this.settings = {};
    this.activeVideo = null;
    this.fullscreenMouseMoveHandler = null;
    this.fullscreenHideTimeout = null;
    this.init();
  }

  async init() {
    console.log('Instagram fullscreen viewer initialized');
    await this.loadSettings();
    this.addVideoObserver();
    this.setupKeyboardShortcuts();
    this.setupGlobalEvents();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get({
        autoEnhance: true,
        enableKeyboardShortcuts: true,
        defaultZoom: 100,
        defaultRotation: 0,
        showControls: true,
        enableDownload: true,
        controlPosition: 'bottom',
        theme: 'dark'
      }, (settings) => {
        this.settings = settings;
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
    if (effectiveWidth < 300 || effectiveHeight < 200) {
      sizeClass = 'small';
    } else if (effectiveWidth > 600 && effectiveHeight > 400) {
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
    const isReels = window.location.pathname.includes('/reels/') || 
                    container.closest('section[role="main"]')?.querySelector('div[style*="height: 100vh"]');
    const reelsClass = isReels ? 'ive-reels' : '';

    // Create main control panel
    const controlPanel = document.createElement('div');
    controlPanel.className = `ive-control-panel ive-${this.settings.controlPosition} ive-${this.settings.theme} ive-size-${sizeClass} ${aspectClass} ${reelsClass}`.trim();

    // Adjust HTML structure based on size
    const isSmall = sizeClass === 'small';
    const isLarge = sizeClass === 'large';

    controlPanel.innerHTML = `
      <div class="ive-controls-main">
        <div class="ive-controls-left">
          <button class="ive-btn ive-play-pause" title="Play/Pause">▶️</button>
          ${!isSmall ? `<input type="range" class="ive-slider ive-timeline" min="0" max="100" value="0" />
          <span class="ive-time">0:00 / 0:00</span>` : ''}
        </div>
        <div class="ive-controls-center">
          ${!isSmall ? `<button class="ive-btn ive-rotate-left" title="Rotate Left">↺</button>` : ''}
          <input type="range" class="ive-slider ive-rotation ${isSmall ? 'ive-compact' : ''}" min="0" max="270" step="90" value="0" />
          ${!isSmall ? `<span class="ive-rotation-value">0°</span>
          <button class="ive-btn ive-rotate-right" title="Rotate Right">↻</button>` : ''}
        </div>
        <div class="ive-controls-right">
          ${!isSmall ? `<button class="ive-btn ive-zoom-out" title="Zoom Out">🔍-</button>` : ''}
          <input type="range" class="ive-slider ive-zoom ${isSmall ? 'ive-compact' : ''}" min="25" max="400" value="100" />
          ${!isSmall ? `<span class="ive-zoom-value">100%</span>
          <button class="ive-btn ive-zoom-in" title="Zoom In">🔍+</button>` : ''}
          <button class="ive-btn ive-fullscreen" title="Fullscreen">⛶</button>
          ${isLarge ? `<button class="ive-btn ive-download" title="Download">⬇️</button>
          <button class="ive-btn ive-settings" title="Settings">⚙️</button>` : ''}
        </div>
      </div>
      ${isLarge ? `<div class="ive-controls-advanced" style="display: none;">
        <div class="ive-position-controls">
          <label>X: <input type="range" class="ive-slider ive-pos-x" min="-200" max="200" value="0" /></label>
          <label>Y: <input type="range" class="ive-slider ive-pos-y" min="-200" max="200" value="0" /></label>
        </div>
        <div class="ive-filter-controls">
          <label>Brightness: <input type="range" class="ive-slider ive-brightness" min="0" max="200" value="100" /></label>
          <label>Contrast: <input type="range" class="ive-slider ive-contrast" min="0" max="200" value="100" /></label>
          <label>Saturation: <input type="range" class="ive-slider ive-saturation" min="0" max="200" value="100" /></label>
        </div>
      </div>` : ''}
    `;

    // Position the control panel
    if (container.style.position !== 'relative' && container.style.position !== 'absolute') {
      container.style.position = 'relative';
    }

    container.appendChild(controlPanel);

    // Store references for cleanup
    const videoData = this.enhancedVideos.get(video);
    videoData.controlPanel = controlPanel;
    videoData.container = container;

    // Add resize observer for dynamic responsiveness
    this.addResizeObserver(video, controlPanel);

    // Initially hide controls
    controlPanel.style.opacity = '0';
    controlPanel.style.pointerEvents = 'none';

    // Show controls on hover
    let hideTimeout;
    const showControls = () => {
      clearTimeout(hideTimeout);
      controlPanel.style.opacity = '1';
      controlPanel.style.pointerEvents = 'auto';
    };

    const hideControls = () => {
      hideTimeout = setTimeout(() => {
        const videoData = this.enhancedVideos.get(video);
        if (!videoData || videoData.isFullscreen || videoData.controlsVisible) {
          return;
        }
        controlPanel.style.opacity = '0';
        controlPanel.style.pointerEvents = 'none';
      }, 2000);
    };

    container.addEventListener('mouseenter', showControls);
    container.addEventListener('mouseleave', hideControls);
    controlPanel.addEventListener('mouseenter', showControls);
    controlPanel.addEventListener('mouseleave', hideControls);
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
    if (effectiveWidth < 300 || effectiveHeight < 200) {
      newSizeClass = 'small';
    } else if (effectiveWidth > 600 && effectiveHeight > 400) {
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

    // Update HTML content based on new size
    const isSmall = newSizeClass === 'small';
    const isLarge = newSizeClass === 'large';

    const controlsMain = controlPanel.querySelector('.ive-controls-main');
    if (controlsMain) {
      controlsMain.innerHTML = `
        <div class="ive-controls-left">
          <button class="ive-btn ive-play-pause" title="Play/Pause">▶️</button>
          ${!isSmall ? `<input type="range" class="ive-slider ive-timeline" min="0" max="100" value="0" />
          <span class="ive-time">0:00 / 0:00</span>` : ''}
        </div>
        <div class="ive-controls-center">
          ${!isSmall ? `<button class="ive-btn ive-rotate-left" title="Rotate Left">↺</button>` : ''}
          <input type="range" class="ive-slider ive-rotation ${isSmall ? 'ive-compact' : ''}" min="0" max="270" step="90" value="0" />
          ${!isSmall ? `<span class="ive-rotation-value">0°</span>
          <button class="ive-btn ive-rotate-right" title="Rotate Right">↻</button>` : ''}
        </div>
        <div class="ive-controls-right">
          ${!isSmall ? `<button class="ive-btn ive-zoom-out" title="Zoom Out">🔍-</button>` : ''}
          <input type="range" class="ive-slider ive-zoom ${isSmall ? 'ive-compact' : ''}" min="25" max="400" value="100" />
          ${!isSmall ? `<span class="ive-zoom-value">100%</span>
          <button class="ive-btn ive-zoom-in" title="Zoom In">🔍+</button>` : ''}
          <button class="ive-btn ive-fullscreen" title="Fullscreen">⛶</button>
          ${isLarge ? `<button class="ive-btn ive-download" title="Download">⬇️</button>
          <button class="ive-btn ive-settings" title="Settings">⚙️</button>` : ''}
        </div>
      `;

      // Re-bind events for the new elements
      this.bindVideoEvents(video);
    }

    // Handle advanced controls
    let advancedPanel = controlPanel.querySelector('.ive-controls-advanced');
    if (isLarge && !advancedPanel) {
      // Add advanced controls if they don't exist
      const newAdvancedPanel = document.createElement('div');
      newAdvancedPanel.className = 'ive-controls-advanced';
      newAdvancedPanel.style.display = 'none';
      newAdvancedPanel.innerHTML = `
        <div class="ive-position-controls">
          <label>X: <input type="range" class="ive-slider ive-pos-x" min="-200" max="200" value="0" /></label>
          <label>Y: <input type="range" class="ive-slider ive-pos-y" min="-200" max="200" value="0" /></label>
        </div>
        <div class="ive-filter-controls">
          <label>Brightness: <input type="range" class="ive-slider ive-brightness" min="0" max="200" value="100" /></label>
          <label>Contrast: <input type="range" class="ive-slider ive-contrast" min="0" max="200" value="100" /></label>
          <label>Saturation: <input type="range" class="ive-slider ive-saturation" min="0" max="200" value="100" /></label>
        </div>
      `;
      controlPanel.appendChild(newAdvancedPanel);
      // Re-bind events for advanced controls
      this.bindVideoEvents(video);
    } else if (!isLarge && advancedPanel) {
      // Remove advanced controls if they exist
      advancedPanel.remove();
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
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (video.paused) {
          video.play();
          playPauseBtn.innerHTML = '⏸️';
        } else {
          video.pause();
          playPauseBtn.innerHTML = '▶️';
        }
      });
    }

    video.addEventListener('play', () => {
      if (playPauseBtn) playPauseBtn.innerHTML = '⏸️';
    });

    video.addEventListener('pause', () => {
      if (playPauseBtn) playPauseBtn.innerHTML = '▶️';
    });

    // Timeline
    video.addEventListener('timeupdate', () => {
      if (video.duration) {
        const progress = (video.currentTime / video.duration) * 100;
        if (timeline) timeline.value = progress;
        if (timeDisplay) timeDisplay.textContent = `${this.formatTime(video.currentTime)} / ${this.formatTime(video.duration)}`;
      }
    });

    if (timeline) {
      timeline.addEventListener('input', () => {
        if (video.duration) {
          video.currentTime = (timeline.value / 100) * video.duration;
        }
      });
    }

    // Rotation
    if (rotateLeftBtn) {
      rotateLeftBtn.addEventListener('click', () => {
        videoData.rotation = (videoData.rotation - 90) % 360;
        if (videoData.rotation < 0) videoData.rotation += 360;
        if (rotationSlider) rotationSlider.value = videoData.rotation;
        if (rotationValue) rotationValue.textContent = `${videoData.rotation}°`;
        this.applyTransform(video);
      });
    }

    if (rotateRightBtn) {
      rotateRightBtn.addEventListener('click', () => {
        videoData.rotation = (videoData.rotation + 90) % 360;
        if (rotationSlider) rotationSlider.value = videoData.rotation;
        if (rotationValue) rotationValue.textContent = `${videoData.rotation}°`;
        this.applyTransform(video);
      });
    }

    if (rotationSlider) {
      rotationSlider.addEventListener('input', () => {
        videoData.rotation = parseInt(rotationSlider.value);
        if (rotationValue) rotationValue.textContent = `${videoData.rotation}°`;
        this.applyTransform(video);
      });
    }

    // Zoom
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        videoData.scale = Math.max(25, videoData.scale - 25);
        if (zoomSlider) zoomSlider.value = videoData.scale;
        if (zoomValue) zoomValue.textContent = `${videoData.scale}%`;
        this.applyTransform(video);
      });
    }

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        videoData.scale = Math.min(400, videoData.scale + 25);
        if (zoomSlider) zoomSlider.value = videoData.scale;
        if (zoomValue) zoomValue.textContent = `${videoData.scale}%`;
        this.applyTransform(video);
      });
    }

    if (zoomSlider) {
      zoomSlider.addEventListener('input', () => {
        videoData.scale = parseInt(zoomSlider.value);
        if (zoomValue) zoomValue.textContent = `${videoData.scale}%`;
        this.applyTransform(video);
      });
    }

    // Position
    if (posX) {
      posX.addEventListener('input', () => {
        videoData.x = parseInt(posX.value);
        this.applyTransform(video);
      });
    }

    if (posY) {
      posY.addEventListener('input', () => {
        videoData.y = parseInt(posY.value);
        this.applyTransform(video);
      });
    }

    // Filters
    if (brightness) {
      brightness.addEventListener('input', () => {
        this.applyFilters(video);
      });
    }

    if (contrast) {
      contrast.addEventListener('input', () => {
        this.applyFilters(video);
      });
    }

    if (saturation) {
      saturation.addEventListener('input', () => {
        this.applyFilters(video);
      });
    }

    // Fullscreen
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        this.toggleFullscreen(video);
      });
    }

    // Download
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.downloadVideo(video);
      });
    }

    // Settings
    if (settingsBtn && advancedPanel) {
      settingsBtn.addEventListener('click', () => {
        advancedPanel.style.display = advancedPanel.style.display === 'none' ? 'block' : 'none';
      });
    }

    // Set initial values
    if (rotationSlider) rotationSlider.value = videoData.rotation;
    if (rotationValue) rotationValue.textContent = `${videoData.rotation}°`;
    if (zoomSlider) zoomSlider.value = videoData.scale;
    if (zoomValue) zoomValue.textContent = `${videoData.scale}%`;
    if (posX) posX.value = videoData.x;
    if (posY) posY.value = videoData.y;
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

    const brightnessEl = controlPanel.querySelector('.ive-brightness');
    const contrastEl = controlPanel.querySelector('.ive-contrast');
    const saturationEl = controlPanel.querySelector('.ive-saturation');

    const brightness = brightnessEl ? brightnessEl.value : 100;
    const contrast = contrastEl ? contrastEl.value : 100;
    const saturation = saturationEl ? saturationEl.value : 100;

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

        // Make controls always visible in fullscreen and show on mouse move
        if (controlPanel) {
          controlPanel.style.opacity = '1';
          controlPanel.style.pointerEvents = 'auto';
          controlPanel.classList.add('ive-fullscreen-mode');

          // Add mousemove listener to show controls on any mouse movement
          this.fullscreenMouseMoveHandler = () => {
            controlPanel.style.opacity = '1';
            controlPanel.style.pointerEvents = 'auto';
            clearTimeout(this.fullscreenHideTimeout);
            this.fullscreenHideTimeout = setTimeout(() => {
              if (videoData.isFullscreen) {
                controlPanel.style.opacity = '0';
                controlPanel.style.pointerEvents = 'none';
              }
            }, 3000); // Hide after 3 seconds of no movement
          };

          document.addEventListener('mousemove', this.fullscreenMouseMoveHandler);
          // Trigger initially
          this.fullscreenMouseMoveHandler();
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
        }

        // Restore hover behavior when exiting fullscreen
        if (controlPanel) {
          controlPanel.style.opacity = '0';
          controlPanel.style.pointerEvents = 'none';
          controlPanel.classList.remove('ive-fullscreen-mode');
        }

        setTimeout(() => this.applyTransform(video), 100);
      }).catch(console.error);
    }
  }

  downloadVideo(video) {
    const url = video.src || video.currentSrc;
    if (!url) return;

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `instagram-video-${timestamp}.mp4`;

    chrome.runtime.sendMessage({
      action: 'downloadVideo',
      url: url,
      filename: filename
    });
  }

  setupKeyboardShortcuts() {
    if (!this.settings.enableKeyboardShortcuts) return;

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

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
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
      if (rotationSlider) rotationSlider.value = videoData.rotation;
      if (rotationValue) rotationValue.textContent = `${videoData.rotation}°`;
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
      const rotationSlider = controlPanel.querySelector('.ive-rotation');
      const rotationValue = controlPanel.querySelector('.ive-rotation-value');
      const zoomSlider = controlPanel.querySelector('.ive-zoom');
      const zoomValue = controlPanel.querySelector('.ive-zoom-value');
      const posX = controlPanel.querySelector('.ive-pos-x');
      const posY = controlPanel.querySelector('.ive-pos-y');
      const brightness = controlPanel.querySelector('.ive-brightness');
      const contrast = controlPanel.querySelector('.ive-contrast');
      const saturation = controlPanel.querySelector('.ive-saturation');

      if (rotationSlider) rotationSlider.value = 0;
      if (rotationValue) rotationValue.textContent = '0°';
      if (zoomSlider) zoomSlider.value = 100;
      if (zoomValue) zoomValue.textContent = '100%';
      if (posX) posX.value = 0;
      if (posY) posY.value = 0;
      if (brightness) brightness.value = 100;
      if (contrast) contrast.value = 100;
      if (saturation) saturation.value = 100;
    }
  }

  toggleAllControls() {
    const controlPanels = document.querySelectorAll('.ive-control-panel');
    controlPanels.forEach(panel => {
      const isVisible = panel.style.opacity !== '0';
      panel.style.opacity = isVisible ? '0' : '1';
      panel.style.pointerEvents = isVisible ? 'none' : 'auto';
    });
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Initialize the enhancer
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new InstagramFullscreenViewer();
  });
} else {
  new InstagramFullscreenViewer();
}
