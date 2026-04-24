# Feature: Authentication System

## Purpose
Manages therapist login, token storage, and session handling.

## Screens Involved
- src/screens/auth/TherapistPortalScreen.jsx
- src/screens/auth/ForgotPasswordScreen.jsx
- src/screens/auth/RegisterScreen.jsx

## Files Involved
- src/services/auth/AuthService.js
- src/services/auth/tokenStorage.js
- src/hooks/useLoginForm.js
- src/utils/validators.js

## Current State
All functions are MOCKS. Backend developer must replace
the mock blocks in AuthService.js only.

## API Endpoints Required
- POST /auth/login
- POST /auth/forgot
- POST /auth/register

## Response Contract
Success: { success: true, data: { token, therapist } }
Failure: { success: false, error: "message" }

## Dependencies
- expo-secure-store (for tokenStorage — TODO)

## Future Improvements
- [ ] Replace all mocks with real API
- [ ] Implement token refresh logic
- [ ] Add patient auth flow
