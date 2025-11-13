#!/bin/bash

# MaxiReel - Firefox Package Builder
# This script creates a clean ZIP file for Firefox Add-ons submission

echo "🎬 MaxiReel - Firefox Package Builder"
echo "==========================================================="
echo ""

# Set variables
VERSION="1.0.0"
EXTENSION_DIR="/home/baymax/Documents/projects/insta_extension/firefox"
OUTPUT_DIR="/home/baymax/Documents/projects/insta_extension"
PACKAGE_NAME="maxireel-firefox-${VERSION}.zip"

# Change to Firefox directory
cd "$EXTENSION_DIR" || exit 1

echo "📂 Working directory: $EXTENSION_DIR"
echo "📦 Package name: $PACKAGE_NAME"
echo ""

# Clean up any previous packages
if [ -f "$OUTPUT_DIR/$PACKAGE_NAME" ]; then
    echo "🗑️  Removing old package..."
    rm "$OUTPUT_DIR/$PACKAGE_NAME"
fi

echo "📋 Files to include:"
echo "-------------------"

# Create list of files to include
FILES=(
    "manifest.json"
    "background.js"
    "content.js"
    "popup.html"
    "popup.js"
    "popup.css"
    "styles.css"
    "LICENSE"
    "README.md"
    "PRIVACY_POLICY.md"
    "icons/icon16.png"
    "icons/icon32.png"
    "icons/icon48.png"
    "icons/icon96.png"
    "icons/icon128.png"
)

# Verify all files exist
MISSING_FILES=0
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (MISSING!)"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

echo ""

if [ $MISSING_FILES -gt 0 ]; then
    echo "❌ Error: $MISSING_FILES file(s) missing. Cannot create package."
    exit 1
fi

# Create the package
echo "📦 Creating ZIP package..."
zip -r "$OUTPUT_DIR/$PACKAGE_NAME" \
    manifest.json \
    background.js \
    content.js \
    popup.html \
    popup.js \
    popup.css \
    styles.css \
    LICENSE \
    README.md \
    PRIVACY_POLICY.md \
    icons/icon16.png \
    icons/icon32.png \
    icons/icon48.png \
    icons/icon96.png \
    icons/icon128.png \
    -q

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Package created successfully!"
    echo ""
    echo "📊 Package Information:"
    echo "----------------------"
    ls -lh "$OUTPUT_DIR/$PACKAGE_NAME" | awk '{print "   Size: " $5}'
    echo "   Location: $OUTPUT_DIR/$PACKAGE_NAME"
    echo ""
    
    # Verify the package
    echo "🔍 Package contents:"
    echo "-------------------"
    unzip -l "$OUTPUT_DIR/$PACKAGE_NAME" | tail -n +4 | head -n -2
    echo ""
    
    echo "✨ Ready for submission to Firefox Add-ons!"
    echo ""
    echo "Next steps:"
    echo "1. Go to https://addons.mozilla.org/developers/addon/submit/distribution"
    echo "2. Upload: $PACKAGE_NAME"
    echo "3. Fill in the required information"
    echo "4. Submit for review"
    echo ""
    
else
    echo ""
    echo "❌ Error: Failed to create package"
    exit 1
fi
