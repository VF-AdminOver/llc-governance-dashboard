# 🔧 Troubleshooting Guide

## 🚨 **Common Issues & Solutions**

### **1. App Launches But No Interface Visible**

**Problem**: App appears to be running but no window is visible
**Solution**: 
- Check if the app is in the Dock
- Look for the app icon in the menu bar
- Try `Cmd+Tab` to switch to the app
- Check Activity Monitor for running processes

**If still not visible**:
```bash
# Force quit the app
pkill -f "LLC Governance Dashboard"

# Rebuild and try again
npm run pack
open "dist/mac-arm64/LLC Governance Dashboard.app"
```

### **2. Port 3000 Already in Use**

**Problem**: `EADDRINUSE: address already in use :::3000`
**Solution**:
```bash
# Find processes using port 3000
lsof -ti:3000

# Kill the process
kill [PID]

# Or kill all processes on port 3000
lsof -ti:3000 | xargs kill -9
```

### **3. App Crashes on Launch**

**Problem**: App opens then immediately closes
**Solution**:
```bash
# Check console for errors
npm run electron-dev

# Rebuild the app
npm run pack

# Check for missing dependencies
npm install
```

### **4. Development vs Production Mode**

**Problem**: Confusion about which mode to use
**Solution**:

**For Development (Full Features)**:
```bash
# Terminal 1: Start backend
npm start

# Terminal 2: Start Electron
npm run electron-dev
```

**For Production (Standalone)**:
```bash
# Build standalone app
npm run pack

# Launch the app
open "dist/mac-arm64/LLC Governance Dashboard.app"
```

### **5. Menu Actions Not Working**

**Problem**: Menu items don't respond
**Solution**:
- Check if preload.js is properly configured
- Verify IPC handlers are set up
- Check console for JavaScript errors

### **6. App Icon Not Displaying**

**Problem**: Generic app icon instead of custom icon
**Solution**:
```bash
# Generate custom icon
cd build && ./create-icon.sh && cd ..

# Rebuild app
npm run pack
```

## 🔍 **Debugging Steps**

### **Step 1: Check App Status**
```bash
# See if app is running
ps aux | grep "LLC Governance Dashboard"

# Check port usage
lsof -ti:3000
```

### **Step 2: Check Console Output**
```bash
# Run in development mode to see errors
npm run electron-dev
```

### **Step 3: Verify File Structure**
```bash
# Check if files exist
ls -la "dist/mac-arm64/LLC Governance Dashboard.app/Contents/Resources/"
```

### **Step 4: Rebuild App**
```bash
# Clean and rebuild
rm -rf dist/
npm run pack
```

## 📱 **App Interface Issues**

### **No Interface Visible**
- ✅ **Fixed**: HTML is now embedded in main.js
- ✅ **No external file dependencies**
- ✅ **Works in packaged app**

### **Interface Loads But No Features**
- **Current**: Standalone mode shows feature overview
- **Future**: Will add "Launch Full App" button
- **Development**: Use `npm run electron-dev` for full features

## 🚀 **Quick Fixes**

### **Immediate Solutions**
1. **Force quit and relaunch** the app
2. **Check Dock and menu bar** for app icon
3. **Use Cmd+Tab** to switch to the app
4. **Rebuild the app** if issues persist

### **Rebuild Commands**
```bash
# Quick rebuild
npm run pack

# Full rebuild
rm -rf dist/ node_modules/
npm install
npm run pack
```

## 🎯 **Current Status**

### **✅ What's Working**
- App launches without port conflicts
- Beautiful interface is visible
- Native macOS integration
- No server dependencies

### **⚠️ Known Limitations**
- Standalone mode only (no backend calculations)
- Feature overview display
- No data persistence yet

### **🔮 Next Steps**
- Add "Launch Full App" functionality
- Implement embedded backend
- Add local data storage

## 📞 **Getting Help**

### **If Problems Persist**
1. **Check this troubleshooting guide**
2. **Run in development mode** to see detailed errors
3. **Check console output** for specific error messages
4. **Rebuild the app** from scratch

### **Useful Commands**
```bash
# Check app status
ps aux | grep "Vassell"

# Check port conflicts
lsof -ti:3000

# Rebuild app
npm run pack

# Launch app
open "dist/mac-arm64/LLC Governance Dashboard.app"
```

## 🎉 **Success Indicators**

Your app is working correctly when:
- ✅ **App launches** without errors
- ✅ **Interface is visible** with beautiful design
- ✅ **Menu bar appears** with File, Edit, View options
- ✅ **Dock icon shows** the app is running
- ✅ **No port conflicts** or server errors

**The app should now display a beautiful interface! 🎨✨**
