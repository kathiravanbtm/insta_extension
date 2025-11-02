// Instagram Video Enhancer Pro - Content Script
class InstagramVideoEnhancer {
  constructor() {
    this.enhancedVideos = new Map();
    this.settings = {};
    this.activeVideo = null;
    this.cropMode = false;
    this.cropRect = null;
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
    return new Promise((resolve) => {
      chrome.storage.sync.get({
        autoEnhance: true,
        enableKeyboardShortcuts: true,
        defaultZoom: 100,
        defaultRotation: 0,
        showControls: true,
        enableCrop: true,
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
      cropMode: false,
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

    // Create main control panel
    const controlPanel = document.createElement('div');
    controlPanel.className = `ive-control-panel ive-${this.settings.controlPosition} ive-${this.settings.theme}`;

    controlPanel.innerHTML = `
      <div class="ive-controls-main">
        <div class="ive-controls-left">
          <button class="ive-btn ive-play-pause" title="Play/Pause">▶️</button>
          <input type="range" class="ive-slider ive-timeline" min="0" max="100" value="0" />
          <span class="ive-time">0:00 / 0:00</span>
        </div>
        <div class="ive-controls-center">
          <button class="ive-btn ive-rotate-left" title="Rotate Left">↺</button>
          <input type="range" class="ive-slider ive-rotation" min="0" max="270" step="90" value="0" />
          <span class="ive-rotation-value">0°</span>
          <button class="ive-btn ive-rotate-right" title="Rotate Right">↻</button>
        </div>
        <div class="ive-controls-right">
          <button class="ive-btn ive-zoom-out" title="Zoom Out">🔍-</button>
          <input type="range" class="ive-slider ive-zoom" min="25" max="400" value="100" />
          <span class="ive-zoom-value">100%</span>
          <button class="ive-btn ive-zoom-in" title="Zoom In">🔍+</button>
          <button class="ive-btn ive-crop" title="Crop Mode">✂️</button>
          <button class="ive-btn ive-fullscreen" title="Fullscreen">⛶</button>
          <button class="ive-btn ive-download" title="Download">⬇️</button>
          <button class="ive-btn ive-settings" title="Settings">⚙️</button>
        </div>
      </div>
      <div class="ive-controls-advanced" style="display: none;">
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
        if (!this.enhancedVideos.get(video).controlsVisible) {
          controlPanel.style.opacity = '0';
          controlPanel.style.pointerEvents = 'none';
        }
      }, 2000);
    };

    container.addEventListener('mouseenter', showControls);
    container.addEventListener('mouseleave', hideControls);
    controlPanel.addEventListener('mouseenter', showControls);
    controlPanel.addEventListener('mouseleave', hideControls);
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
    const cropBtn = controlPanel.querySelector('.ive-crop');
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

    // Crop
    cropBtn.addEventListener('click', () => {
      this.toggleCropMode(video);
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
    const origin = videoData.cropMode ? 'top left' : 'center center';

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

  toggleCropMode(video) {
    const videoData = this.enhancedVideos.get(video);
    videoData.cropMode = !videoData.cropMode;

    const controlPanel = video.closest('article, div[role="presentation"]')?.querySelector('.ive-control-panel') ||
                        video.parentElement.querySelector('.ive-control-panel');
    const cropBtn = controlPanel.querySelector('.ive-crop');

    if (videoData.cropMode) {
      cropBtn.innerHTML = '✅';
      cropBtn.title = 'Exit Crop Mode';
      this.enterCropMode(video);
    } else {
      cropBtn.innerHTML = '✂️';
      cropBtn.title = 'Crop Mode';
      this.exitCropMode(video);
    }
  }

  enterCropMode(video) {
    video.style.cursor = 'crosshair';
    video.addEventListener('mousedown', this.handleCropStart.bind(this));
  }

  exitCropMode(video) {
    video.style.cursor = '';
    video.removeEventListener('mousedown', this.handleCropStart.bind(this));
    if (this.cropRect) {
      this.cropRect.remove();
      this.cropRect = null;
    }
  }

  handleCropStart(e) {
    e.preventDefault();
    const video = e.target;
    const rect = video.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    this.cropRect = document.createElement('div');
    this.cropRect.className = 'ive-crop-rect';
    this.cropRect.style.position = 'absolute';
    this.cropRect.style.border = '2px dashed #fff';
    this.cropRect.style.background = 'rgba(255, 255, 255, 0.1)';
    this.cropRect.style.left = `${startX}px`;
    this.cropRect.style.top = `${startY}px`;
    this.cropRect.style.width = '0px';
    this.cropRect.style.height = '0px';
    this.cropRect.style.pointerEvents = 'none';
    this.cropRect.style.zIndex = '9999';

    video.parentElement.appendChild(this.cropRect);

    const handleMouseMove = (e) => {
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      this.cropRect.style.left = `${Math.min(startX, currentX)}px`;
      this.cropRect.style.top = `${Math.min(startY, currentY)}px`;
      this.cropRect.style.width = `${width}px`;
      this.cropRect.style.height = `${height}px`;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      this.finalizeCrop(video);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  finalizeCrop(video) {
    if (!this.cropRect) return;

    const rect = this.cropRect.getBoundingClientRect();
    const videoRect = video.getBoundingClientRect();

    // Calculate crop values relative to video
    const cropX = ((rect.left - videoRect.left) / videoRect.width) * 100;
    const cropY = ((rect.top - videoRect.top) / videoRect.height) * 100;
    const cropWidth = (rect.width / videoRect.width) * 100;
    const cropHeight = (rect.height / videoRect.height) * 100;

    // Apply crop using clip-path
    video.style.clipPath = `inset(${cropY}% ${100 - cropWidth - cropX}% ${100 - cropHeight - cropY}% ${cropX}%)`;

    this.cropRect.remove();
    this.cropRect = null;
    this.toggleCropMode(video); // Exit crop mode
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

    if (container && container.requestFullscreen) {
      container.requestFullscreen().then(() => {
        const videoData = this.enhancedVideos.get(video);
        videoData.isFullscreen = true;
        video.style.objectFit = 'contain';
        setTimeout(() => this.applyTransform(video), 100);
      }).catch(console.error);
    }
  }

  exitFullscreen(video) {
    if (document.exitFullscreen) {
      document.exitFullscreen().then(() => {
        const videoData = this.enhancedVideos.get(video);
        videoData.isFullscreen = false;
        video.style.objectFit = '';
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
        case 'c':
          e.preventDefault();
          this.toggleCropMode(activeVideo);
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
    video.style.clipPath = '';

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
    new InstagramVideoEnhancer();
  });
} else {
  new InstagramVideoEnhancer();
}
