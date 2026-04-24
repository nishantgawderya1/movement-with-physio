# Architecture: Folder Structure

## Current Structure
```
MovementWithPhysios/
├── assets/images/          Logo and image assets
├── docs/                   Project documentation (this system)
├── src/
│   ├── components/         Reusable UI components
│   ├── constants/          colors.js, fonts.js, strings.js
│   ├── hooks/              useLoginForm.js
│   ├── navigation/         AppNavigator, AuthNavigator
│   ├── screens/
│   │   ├── auth/           LoginScreen, TherapistPortal, etc.
│   │   └── splash/         SplashScreen
│   ├── services/auth/      AuthService, tokenStorage
│   └── utils/              validators.js
└── App.js                  Entry point, font loading
```

## Design Principles
- Screens own only layout and UI
- Logic lives in hooks (useLoginForm)
- API calls live in services (AuthService)
- Constants are never hardcoded in components

## Future Additions
- src/screens/dashboard/    Post-login screens
- src/screens/patient/      Patient-facing screens
- src/context/              Auth context for global state
- src/api/                  Centralized API client
