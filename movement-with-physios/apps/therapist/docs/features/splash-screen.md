# Feature: Splash Screen

## Purpose
Shown on app launch before navigating to the login screen.

## Screens Involved
- src/screens/splash/SplashScreen.jsx

## Components Used
- React Native Animated API (fade + scale)
- ActivityIndicator
- Image (logo.png asset)

## Key Details
- Pure white background
- Logo image centered (assets/images/logo.png)
- "Doctor's App" tagline in Instrument Serif italic below logo
- 2.8 second delay then navigation.replace('Login')
- useNativeDriver: true on all animations

## Dependencies
- @expo-google-fonts/instrument-serif

## Future Improvements
- [ ] Add lottie animation for heartbeat line
- [ ] Sync with real app loading state
