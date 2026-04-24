# Feature: Welcome / Login Screen

## Purpose
First screen after splash. Introduces the app to therapists
and offers two paths: onboard new clinic or sign in.

## Screens Involved
- src/screens/auth/LoginScreen.jsx

## Components Used
- FeatureCard (inline component)
- TouchableOpacity pill buttons

## Key Details
- Heading: "Welcome !!"
- Subtitle: "Scale Your Practice Without Compromising Care..."
- 3 feature cards: Made for India, Scale Fast, Secure & Encrypted
- Primary button: "Activate My Clinic" → navigates to Register
- Outline button: "Login" → navigates to TherapistPortal

## Dependencies
- @react-navigation/stack

## Future Improvements
- [ ] Add patient-facing welcome variant
- [ ] Animate feature cards on scroll
