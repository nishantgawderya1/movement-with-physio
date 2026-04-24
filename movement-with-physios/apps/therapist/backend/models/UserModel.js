// backend/models/UserModel.js
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Defines the therapist/user data schema.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User Schema
 *
 * Fields:
 *   id              string    UUID primary key
 *   phoneNumber     string    Unique, verified mobile number
 *   phoneVerified   boolean   True after OTP verification
 *   email           string    Optional at this stage
 *   role            enum      'therapist' | 'patient' | 'admin'
 *   onboardingStep  number    Track how far through registration they are
 *   verificationStatus enum   'pending' | 'approved' | 'rejected'
 *   createdAt       datetime
 *   updatedAt       datetime
 *
 * TODO: implement using your chosen database
 * Options: MongoDB (Mongoose), PostgreSQL (Prisma), Firebase Firestore
 */
