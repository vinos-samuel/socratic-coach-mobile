# Socratic Coach Mobile App - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- Expo CLI: `npm install -g @expo/eas-cli`

### Development Setup

1. **Navigate to mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

4. **Test on devices:**
   - Scan QR code with Expo Go app (iOS/Android)
   - Or run `npm run ios` / `npm run android` for simulators

### Key Features Ready
✅ **Cross-platform mobile app** (iOS & Android)  
✅ **Native UI components** with React Native  
✅ **Shared backend integration** with web app  
✅ **App store deployment ready** with EAS Build  
✅ **Professional app icon** generated  
✅ **Complete navigation** between screens  

### Next Steps for App Store
1. **Configure API URL** in `lib/api.ts`
2. **Test on real devices** 
3. **Build for production:** `eas build --platform all`
4. **Submit to stores:** `eas submit --platform ios/android`

See `MOBILE_DEPLOYMENT.md` for complete deployment guide.

### Project Structure
```
mobile/
├── app/                 # Main app screens
│   ├── index.tsx       # Landing page
│   ├── coach.tsx       # Socratic coaching
│   └── history.tsx     # Conversation history
├── lib/api.ts          # Backend integration
├── assets/             # App icons & images
└── eas.json           # Build configuration
```

### Development Tips
- **Hot reload:** Changes appear instantly on device
- **Debug:** Shake device to open developer menu
- **Backend:** Update API_BASE_URL for your Replit deployment
- **Icons:** Replace images in `assets/` directory as needed

Ready to deploy to app stores! 📱