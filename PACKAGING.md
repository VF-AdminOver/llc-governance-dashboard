# 🍎 Packaging Vassell Household Finance & Governance for macOS

This guide explains how to package the LLC Governance Dashboard app as a standalone macOS application using Electron.

## 🚀 Quick Start

### Option 1: Automated Build (Recommended)
```bash
# Make the build script executable
chmod +x build-macos.sh

# Run the automated build
./build-macos.sh
```

### Option 2: Manual Build
```bash
# Install dependencies
npm install

# Install Electron dependencies
npm install --save-dev electron electron-builder

# Build the app
npm run dist:mac
```

## 📋 Prerequisites

- **macOS**: This packaging process only works on macOS
- **Node.js**: Version 18.0.0 or higher
- **npm**: Node package manager
- **Homebrew**: For installing additional tools (optional)

## 🔧 Installation Steps

### 1. Install Dependencies
```bash
# Install all project dependencies
npm install

# Install Electron and build tools
npm install --save-dev electron electron-builder
```

### 2. Generate App Icon (Optional)
```bash
# Install ImageMagick for icon generation
brew install imagemagick

# Generate the app icon
cd build && ./create-icon.sh && cd ..
```

**Note**: If you don't have ImageMagick, you can manually create an `icon.icns` file and place it in the `build/` directory.

### 3. Build the Application
```bash
# Build for macOS
npm run dist:mac

# Or build universal binary (Intel + Apple Silicon)
npm run dist:mac-universal
```

## 📁 Output Files

After building, you'll find these files in the `dist/` directory:

- **`.app` file**: `dist/mac/LLC Governance Dashboard.app` - Native macOS application
- **`.dmg` file**: `dist/LLC Governance Dashboard-1.0.0.dmg` - Installer disk image
- **`.zip` file**: `dist/LLC Governance Dashboard-1.0.0-mac.zip` - Compressed archive

## 🎯 Installation on macOS

### Method 1: Drag & Drop (Recommended)
1. Double-click the `.dmg` file
2. Drag the app icon to your Applications folder
3. Launch from Applications or Spotlight

### Method 2: Direct Installation
1. Double-click the `.app` file
2. Click "Open" if prompted about security
3. The app will launch directly

## 🔒 Security & Signing

### Code Signing (Optional but Recommended)
For distribution outside your Mac, consider code signing:

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Sign the app (replace with your developer ID)
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" "dist/mac/Vassell Household Finance.app"
```

### Notarization (Required for App Store)
If distributing through the Mac App Store, you'll need to notarize the app:

```bash
# Notarize the app (requires Apple Developer account)
xcrun altool --notarize-app --primary-bundle-id "com.vassell.household-finance" --username "your-apple-id@example.com" --password "app-specific-password" --file "dist/Vassell Household Finance-1.0.0.dmg"
```

## 🧪 Development & Testing

### Run in Development Mode
```bash
# Start the backend server and Electron app
npm run electron-dev
```

### Test the Packaged App
```bash
# Build and test
npm run dist:mac
open "dist/mac/Vassell Household Finance.app"
```

## ⚙️ Configuration Options

### Customize App Metadata
Edit `package.json` to modify:
- App name and version
- Bundle identifier
- App category
- Build targets

### Customize Build Settings
Edit the `build` section in `package.json`:
```json
{
  "build": {
    "appId": "com.yourcompany.appname",
    "productName": "Your App Name",
    "mac": {
      "category": "public.app-category.finance",
      "target": ["dmg", "zip"]
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "App can't be opened because it's from an unidentified developer"
**Solution**: Right-click the app → "Open" → "Open"

#### 2. Build fails with Electron errors
**Solution**: Clear npm cache and reinstall
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 3. Icon not displaying correctly
**Solution**: Ensure `build/icon.icns` exists and is valid
```bash
# Check if icon file exists
ls -la build/icon.icns

# Regenerate icon
cd build && ./create-icon.sh && cd ..
```

#### 4. App crashes on launch
**Solution**: Check the console for errors
```bash
# Run from terminal to see error messages
./dist/mac/Vassell\ Household\ Finance.app/Contents/MacOS/Vassell\ Household\ Finance
```

### Debug Mode
Enable debug logging by setting environment variables:
```bash
export DEBUG=electron-builder
npm run dist:mac
```

## 📱 Distribution

### Personal Use
- Build the app and install directly
- No signing required
- Works on your Mac only

### Internal Distribution
- Code sign with your developer ID
- Share via email, file sharing, or internal servers
- Works on Macs within your organization

### Public Distribution
- Code sign and notarize
- Upload to your website or GitHub releases
- Users can install without security warnings

### Mac App Store
- Requires Apple Developer account ($99/year)
- Follow Apple's App Store guidelines
- Submit through App Store Connect

## 🔄 Updates & Maintenance

### Version Updates
1. Update version in `package.json`
2. Rebuild the app
3. Distribute new `.dmg` file

### Automatic Updates
For production apps, consider implementing auto-updates:
```bash
npm install electron-updater
```

## 📚 Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder Documentation](https://www.electron.build/)
- [macOS App Distribution Guide](https://developer.apple.com/distribute/)
- [Code Signing Guide](https://developer.apple.com/support/code-signing/)

## 🎉 Success!

Once you've completed the build process, you'll have a professional, standalone macOS application that:

- ✅ Runs independently without Node.js installation
- ✅ Integrates with macOS (Dock, Spotlight, etc.)
- ✅ Has a native app appearance
- ✅ Can be distributed to other Mac users
- ✅ Includes proper security and permissions

Your multi-adult family finance management app is now ready for real-world use! 🏠💰
