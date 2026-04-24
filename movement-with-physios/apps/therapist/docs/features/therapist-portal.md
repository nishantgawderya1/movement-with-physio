# Feature: Therapist Portal (Login)

## Purpose
Sign-in screen for therapists to access their clinic dashboard.

## Screens Involved
- src/screens/auth/TherapistPortalScreen.jsx

## Components Used
- TextInput (email + password)
- Ionicons eye toggle
- TouchableOpacity pill button

## Key Details
- Heading: "Therapist Portal" in Instrument Serif, teal
- Subheading: "Sign in to manage your clients"
- Email placeholder: doctor@reviveai.com
- Password with show/hide toggle
- Forgot Password navigates to ForgotPasswordScreen
- handleSignIn() is currently a MOCK — backend to replace

## Dependencies
- @expo/vector-icons (Ionicons)
- src/services/auth/AuthService.js
- src/services/auth/tokenStorage.js

## Future Improvements
- [ ] Wire real API into handleSignIn
- [ ] Add biometric login option
- [ ] Add error state display
