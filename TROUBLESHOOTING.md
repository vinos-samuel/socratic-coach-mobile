# Expo Git Launch Troubleshooting

## Common Expo Git Integration Issues & Solutions

### Issue 1: "expo: command not found"
**Solution:**
```bash
# Install Expo CLI globally
npm install -g @expo/eas-cli

# Or use npx
npx expo start
```

### Issue 2: "Metro bundler failed to start"
**Solution:**
```bash
cd mobile
npx expo start --clear
```

### Issue 3: "Dependencies not installed"
**Solution:**
```bash
cd mobile
npm install
```

### Issue 4: "Git repository issues"
**Solution:**
```bash
# Initialize git in mobile directory if needed
cd mobile
git init
git add .
git commit -m "Initial mobile app setup"
```

### Issue 5: "React Native version conflicts"
**Error:** `Could not resolve dependency: peer react@"^19.1.0"`
**Solution:**
```bash
cd mobile
npm install --legacy-peer-deps
# or
npm install --force
```

### Issue 6: "Expo Router not working"
**Solution:**
Make sure these files exist:
- `mobile/app/_layout.tsx` ✓
- `mobile/metro.config.js` ✓
- `mobile/babel.config.js` ✓

### Issue 7: "Cannot connect to development server"
**Solution:**
```bash
# Make sure you're in the mobile directory
cd mobile

# Clear Metro cache and restart
npx expo start --clear

# Check if port 8081 is available
lsof -i :8081
```

### Issue 8: "TypeScript errors"
**Solution:**
```bash
cd mobile
npm run type-check
# Fix any TypeScript errors before running expo
```

## Step-by-Step Debugging

1. **Check you're in the right directory:**
   ```bash
   pwd
   # Should show: .../mobile
   ```

2. **Verify package.json exists:**
   ```bash
   ls package.json
   # Should exist in mobile/ directory
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start Expo development server:**
   ```bash
   npx expo start
   # or
   npm start
   ```

5. **If still failing, try clearing everything:**
   ```bash
   rm -rf node_modules
   rm package-lock.json
   npm install
   npx expo start --clear
   ```

## Git-Specific Issues

### Issue: "Git repository not found"
If you're trying to run Expo from a Git repository:

```bash
# Make sure you're in a Git repository
git status

# If not initialized:
git init
git add .
git commit -m "Initial commit"

# Then try expo again
cd mobile
npx expo start
```

### Issue: "Permission denied"
```bash
# Fix permissions
chmod +x node_modules/.bin/expo
```

## Quick Setup Verification

Run these commands to verify your setup:

```bash
# 1. Check Node.js version (should be 18+)
node --version

# 2. Check if you're in the mobile directory
pwd

# 3. Check if package.json exists
cat package.json | grep expo

# 4. Install dependencies
npm install

# 5. Start Expo
npx expo start
```

## Common Error Messages

**"Unable to resolve module"**
- Clear Metro cache: `npx expo start --clear`

**"Metro has encountered an error"**
- Restart with: `npx expo start --reset-cache`

**"The development server returned response error code: 500"**
- Check your React Native code for syntax errors
- Look for missing imports

**"Network response timed out"**
- Check your internet connection
- Try using a different network

## Still Having Issues?

If none of these solutions work, please share:
1. The exact error message you're seeing
2. Your operating system (Windows/Mac/Linux)
3. Node.js version (`node --version`)
4. Whether you're using Expo CLI or npx

I can then provide more specific troubleshooting steps!