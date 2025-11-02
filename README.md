# Instagram Video Enhancer Pro

A powerful browser extension that enhances Instagram videos with professional-grade controls and features. Transform your Instagram video viewing experience with rotation, zoom, crop, filters, and more!

## 🎬 Features

### Core Enhancements
- **🎭 Video Rotation** - Rotate videos in 90° increments (0°, 90°, 180°, 270°)
- **🔍 Zoom & Scale** - Scale videos from 25% to 400% with smooth controls
- **📐 Position Control** - Fine-tune X/Y positioning for perfect alignment
- **✂️ Interactive Cropping** - Click and drag to crop videos with visual feedback
- **⛶ Enhanced Fullscreen** - True fullscreen mode with controls overlay

### Advanced Controls
- **⏯️ Playback Control** - Play/pause with timeline scrubbing
- **🎨 Video Filters** - Adjust brightness, contrast, and saturation
- **⬇️ Video Download** - Save Instagram videos to your device
- **⚙️ Advanced Settings** - Position controls, filters, and more

### User Experience
- **⌨️ Keyboard Shortcuts** - Full keyboard control support
- **🎯 Smart Detection** - Automatically detects and enhances Instagram videos
- **🎨 Multiple Themes** - Dark and light control panel themes
- **📱 Responsive Design** - Works perfectly on all screen sizes
- **🔄 Real-time Updates** - Settings sync across all Instagram tabs

## 🚀 Installation

### Chrome/Edge
1. Download the extension files
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension folder

### Firefox
1. Download the extension files
2. Open `about:debugging`
3. Click "This Firefox" → "Load Temporary Add-on"
4. Select `manifest.json`

## 🎮 Usage

### Basic Enhancement
1. Visit any Instagram page with videos
2. The extension automatically detects videos
3. Enhanced controls appear on hover

### Manual Enhancement
- Click the extension icon and select "Enhance Current"
- Right-click any video and select "Enhance Instagram Video"

### Keyboard Shortcuts
- `Space` - Play/Pause video
- `R` - Rotate right (90°)
- `Shift + R` - Rotate left (90°)
- `F` - Toggle fullscreen
- `C` - Enter/exit crop mode
- `0` - Reset all transformations
- `Esc` - Exit fullscreen or close controls

## ⚙️ Settings

Access settings through the extension popup:

- **Auto-enhance videos** - Automatically enhance detected videos
- **Keyboard shortcuts** - Enable/disable keyboard controls
- **Enable cropping** - Show/hide crop functionality
- **Enable downloads** - Allow video downloads
- **Control position** - Place controls at top or bottom
- **Theme** - Choose dark or light control panel

## 🔧 Technical Details

- **Manifest Version**: 3 (Modern Chrome extension standard)
- **Permissions**: Active tab, storage, scripting, downloads, context menus
- **Content Scripts**: Injected into Instagram pages
- **Background Service**: Handles downloads and settings
- **Storage**: Syncs settings across devices

## 🛠️ Development

### Project Structure
```
├── manifest.json      # Extension configuration
├── content.js         # Main enhancement logic
├── background.js      # Background service worker
├── popup.html         # Extension popup interface
├── popup.js           # Popup functionality
├── styles.css         # Control panel styling
└── icons/            # Extension icons (16x16, 32x32, 48x48, 128x128)
```

### Key Components

**Content Script (`content.js`)**
- Video detection and enhancement
- Control panel creation and management
- Keyboard shortcut handling
- Transform and filter application

**Background Script (`background.js`)**
- Settings management and synchronization
- Video download handling
- Context menu creation
- Cross-tab communication

**Popup Interface**
- Settings configuration
- Quick actions
- Status display and statistics

## 📋 Requirements

- **Browser**: Chrome 88+, Edge 88+, Firefox 109+
- **Permissions**: Downloads, storage, active tab
- **Instagram**: Works on all Instagram video content

## 🔒 Privacy & Security

- **No Data Collection** - Extension works entirely locally
- **No External Requests** - All functionality is client-side
- **Secure Downloads** - Direct video URL downloads only
- **Permission-Based** - Only requests necessary permissions

## 🐛 Troubleshooting

### Videos not enhancing
- Check if auto-enhance is enabled in settings
- Try manual enhancement via right-click menu
- Ensure you're on an Instagram video page

### Controls not visible
- Hover over the video area
- Check control position setting
- Try toggling controls via extension popup

### Downloads failing
- Verify download permissions are granted
- Check browser download settings
- Ensure video is fully loaded

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on Instagram
5. Submit a pull request

## 📄 License

This project is open source. Feel free to use, modify, and distribute.

## 🆕 Version 2.0.0

- Complete rewrite with modern architecture
- Added crop functionality
- Enhanced fullscreen mode
- Video filters and advanced controls
- Improved UI/UX with themes
- Better keyboard shortcuts
- Settings synchronization
- Download capability
- Responsive design
- Accessibility improvements

---

**Made with ❤️ for Instagram video enthusiasts**
