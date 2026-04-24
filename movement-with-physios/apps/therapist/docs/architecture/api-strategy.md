# Architecture: API Integration Strategy

## Current State
All API calls are mocked in src/services/auth/AuthService.js.
Backend developer replaces mock blocks only — no UI changes needed.

## Service Layer Pattern
```
UI → Hook (useLoginForm) → Service (AuthService) → API
```

## Response Contract (must not change)
```json
Success: { "success": true, "data": { ... } }
Failure: { "success": false, "error": "Human readable string" }
```

## Token Storage
Currently in-memory mock in tokenStorage.js.
Must be replaced with expo-secure-store before production.

## Future Additions
- [ ] Axios or fetch wrapper with base URL config
- [ ] Auth token injection via request interceptor
- [ ] Centralized error handling
- [ ] Role-based API routing (therapist vs patient)
