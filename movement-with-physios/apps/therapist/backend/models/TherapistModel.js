// backend/models/TherapistModel.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Defines the therapist user data schema.
//
// FIELDS:
//   id                  string    UUID primary key
//   phoneNumber         string    Unique — verified via OTP
//   phoneVerified       boolean   True after OTP success
//   fullName            string    Set on PersonalInfoScreen
//   email               string    Collected later in onboarding
//   role                enum      'therapist' | 'patient' | 'admin'
//   onboardingStep      number    Tracks registration progress (1–5)
//   verificationStatus  enum      'pending' | 'approved' | 'rejected'
//   iapNumber           string    IAP registration number (onboarding step 2)
//   aadhaarVerified     boolean   True after Aadhaar doc review
//   profilePhotoUrl     string    Uploaded profile photo URL
//   createdAt           datetime
//   updatedAt           datetime
//
// TODO: Implement using MongoDB (Mongoose), PostgreSQL (Prisma),
//       or Firebase Firestore depending on chosen backend stack.
// ─────────────────────────────────────────────────────────────────────────────
