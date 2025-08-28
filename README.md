# Socratic Coach Mobile App

A React Native mobile application built with Expo for iOS and Android app stores, featuring AI-powered Socratic questioning for better thinking and decision-making.

## Features

- ✨ **Socratic Questioning**: AI guides users through thoughtful questions
- 🎙️ **Voice Interaction**: Speak naturally with the AI coach
- 📋 **Action Plans**: Get concrete, actionable steps from insights
- 📱 **Mobile Optimized**: Native mobile experience for iOS and Android
- 📚 **Conversation History**: Review past sessions and track progress
- 📤 **Export & Share**: Download summaries or share insights

## Technology Stack

- **React Native** with Expo framework
- **TypeScript** for type safety
- **Expo Router** for navigation
- **TanStack Query** for data fetching
- **NativeWind** for styling (Tailwind CSS)
- **AsyncStorage** for local data persistence

## Getting Started

### Prerequisites

- Node.js (18+)
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your backend API URL in `lib/api.ts`

### Development

Start the development server:
```bash
npm start
```

Run on specific platforms:
```bash
npm run ios       # iOS Simulator
npm run android   # Android Emulator
npm run web       # Web browser
```

## Building for Production

### Prerequisites for App Store Deployment

1. **Apple Developer Account** (for iOS)
2. **Google Play Console Account** (for Android)
3. **EAS CLI** installed globally:
   ```bash
   npm install -g @expo/eas-cli
   ```

### Configure EAS Build

1. Login to your Expo account:
   ```bash
   eas login
   ```

2. Configure your project:
   ```bash
   eas build:configure
   ```

3. Update `eas.json` with your Apple Developer and Google Play credentials

### Building

Build for both platforms:
```bash
eas build --platform all
```

Build for specific platform:
```bash
eas build --platform ios
eas build --platform android
```

### Submitting to App Stores

Submit to Apple App Store:
```bash
eas submit --platform ios
```

Submit to Google Play Store:
```bash
eas submit --platform android
```

## Configuration

### Backend Integration

Update the API base URL in `lib/api.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000'           // Development
  : 'https://your-app.replit.app';    // Production
```

### App Configuration

Key files to customize:
- `app.json` - App metadata, icons, splash screens
- `eas.json` - Build and submit configuration  
- `mobile/assets/` - App icons and splash screens

## Project Structure

```
mobile/
├── app/                    # Expo Router app directory
│   ├── _layout.tsx        # Root layout with navigation
│   ├── index.tsx          # Landing page
│   ├── coach.tsx          # Main coaching interface
│   └── history.tsx        # Conversation history
├── lib/
│   └── api.ts             # API client and utilities
├── types/
│   └── index.ts           # TypeScript type definitions
├── assets/                # Static assets (icons, images)
├── app.json              # Expo app configuration
├── eas.json              # EAS Build configuration
└── package.json          # Dependencies and scripts
```

## Key Features Implementation

### AI Integration
- Connected to existing Anthropic Claude API
- Reuses backend endpoints for consistency
- Handles conversation threading and persistence

### Navigation
- Uses Expo Router for type-safe navigation
- Stack navigation with modal presentation
- Deep linking support for session sharing

### Styling
- NativeWind for Tailwind CSS utilities
- Custom design system matching web app
- Dark/light mode support (future enhancement)

### Data Management
- TanStack Query for server state
- AsyncStorage for local preferences
- Optimistic updates for better UX

## Deployment Checklist

### Before App Store Submission

- [ ] Update app version in `app.json`
- [ ] Test on real devices (iOS and Android)
- [ ] Configure app store assets (screenshots, descriptions)
- [ ] Set up analytics and crash reporting
- [ ] Configure push notifications (if needed)
- [ ] Test offline functionality
- [ ] Verify deep linking works correctly
- [ ] Test in-app purchases (if applicable)

### App Store Requirements

**iOS App Store:**
- App Store Connect account
- Valid Apple Developer Program membership
- App Store screenshots (multiple device sizes)
- App description and keywords
- Privacy policy (if collecting user data)

**Google Play Store:**
- Google Play Console account
- Signed APK or AAB file
- Store listing with screenshots
- Content rating questionnaire
- Privacy policy (if applicable)

## Contributing

This mobile app shares the same backend as the web application. When making changes:

1. Ensure API compatibility between web and mobile
2. Test on both iOS and Android devices
3. Follow React Native best practices
4. Update documentation for any new features

## Troubleshooting

### Common Issues

**Metro bundler errors:**
```bash
npx expo start --clear
```

**iOS build issues:**
```bash
cd ios && pod install && cd ..
```

**Android build issues:**
```bash
npx expo run:android --clear
```

### Getting Help

- Check [Expo Documentation](https://docs.expo.dev/)
- React Native [Troubleshooting Guide](https://reactnative.dev/docs/troubleshooting)
- EAS Build [Documentation](https://docs.expo.dev/build/introduction/)

## License

This project is part of the Socratic Coach application suite.