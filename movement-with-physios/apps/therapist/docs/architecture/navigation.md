# Architecture: Navigation Structure

## Stack Overview
App uses React Navigation with a stack-based auth flow.

## Navigator Hierarchy
```
AppNavigator (NavigationContainer)
  └── AuthNavigator (Stack.Navigator, headerShown: false)
        ├── Splash          → SplashScreen.jsx
        ├── Login           → LoginScreen.jsx (Welcome screen)
        ├── TherapistPortal → TherapistPortalScreen.jsx
        ├── ForgotPassword  → ForgotPasswordScreen.jsx (stub)
        └── Register        → RegisterScreen.jsx (stub)
```

## Navigation Flow
App Launch → Splash (2.8s) → Login (Welcome) → TherapistPortal

## Key Decisions
- navigation.replace() used on splash (prevents back navigation)
- headerShown: false on all auth screens
- MainNavigator (dashboard etc.) to be added after auth is wired

## Future Additions
- [ ] MainNavigator for post-login dashboard
- [ ] Patient navigator (role-based routing)
- [ ] Deep linking setup
