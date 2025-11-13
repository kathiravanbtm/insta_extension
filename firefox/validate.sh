#!/bin/bash

# MaxiReel - Firefox Validation Script

echo "🔍 Validating Firefox Extension..."
echo ""

ERRORS=0
WARNINGS=0

# Check manifest.json
echo "📋 Checking manifest.json..."
if [ ! -f "manifest.json" ]; then
    echo "❌ manifest.json not found"
    ERRORS=$((ERRORS + 1))
else
    # Validate JSON syntax
    if python3 -m json.tool manifest.json > /dev/null 2>&1; then
        echo "✅ manifest.json is valid JSON"
    else
        echo "❌ manifest.json has syntax errors"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check required fields
    if grep -q '"name"' manifest.json; then
        echo "✅ Name field present"
    else
        echo "❌ Name field missing"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q '"version"' manifest.json; then
        echo "✅ Version field present"
    else
        echo "❌ Version field missing"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q '"description"' manifest.json; then
        echo "✅ Description field present"
    else
        echo "❌ Description field missing"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check extension ID format
    if grep -q '"id": "[a-z0-9-._]*@[a-z0-9-._]*"' manifest.json; then
        echo "✅ Extension ID format is valid"
    else
        echo "⚠️  Extension ID format may be invalid"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

echo ""
echo "📁 Checking required files..."

# Check required files
REQUIRED_FILES=("content.js" "background.js" "popup.html" "popup.js" "styles.css" "LICENSE" "PRIVACY_POLICY.md")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file found"
    else
        echo "❌ $file not found"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "🖼️  Checking icon files..."

# Check icons
ICON_SIZES=(16 32 48 96 128)
for size in "${ICON_SIZES[@]}"; do
    if [ -f "icons/icon${size}.png" ]; then
        echo "✅ icon${size}.png found"
    else
        echo "❌ icon${size}.png not found"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "📝 Checking documentation..."

# Check documentation
DOC_FILES=("README.md" "PRIVACY_POLICY.md" "LICENSE")
for file in "${DOC_FILES[@]}"; do
    if [ -f "$file" ]; then
        SIZE=$(wc -c < "$file")
        if [ $SIZE -gt 100 ]; then
            echo "✅ $file present and has content ($SIZE bytes)"
        else
            echo "⚠️  $file exists but may be too short ($SIZE bytes)"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo "❌ $file not found"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "🔒 Checking permissions..."

# Check for dangerous permissions
if grep -q '"tabs"' manifest.json; then
    echo "⚠️  'tabs' permission found - may require justification"
    WARNINGS=$((WARNINGS + 1))
fi

if grep -q '"<all_urls>"' manifest.json; then
    echo "⚠️  '<all_urls>' permission found - may require justification"
    WARNINGS=$((WARNINGS + 1))
fi

if grep -q '"webRequest"' manifest.json; then
    echo "⚠️  'webRequest' permission found - may require justification"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "📦 Checking package size..."

TOTAL_SIZE=$(du -sb . | cut -f1)
TOTAL_SIZE_MB=$((TOTAL_SIZE / 1024 / 1024))

if [ $TOTAL_SIZE_MB -lt 50 ]; then
    echo "✅ Package size: ${TOTAL_SIZE_MB}MB (under 50MB limit)"
else
    echo "❌ Package size: ${TOTAL_SIZE_MB}MB (exceeds 50MB limit)"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "================================"
echo "📊 VALIDATION SUMMARY"
echo "================================"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo "🎉 Extension is ready for submission!"
        echo ""
        echo "Next steps:"
        echo "1. Run ./package.sh to create the ZIP file"
        echo "2. Go to https://addons.mozilla.org/developers/"
        echo "3. Click 'Submit a New Add-on'"
        echo "4. Upload the generated ZIP file"
        exit 0
    else
        echo "⚠️  Extension has warnings but can be submitted"
        echo "Review the warnings above before submitting"
        exit 0
    fi
else
    echo "❌ Extension has errors and cannot be submitted yet"
    echo "Fix the errors above before submitting"
    exit 1
fi
