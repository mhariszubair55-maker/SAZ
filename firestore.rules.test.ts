/**
 * Firestore Security Rules Verification Spec (Dirty Dozen Payloads)
 */
export const DIRTY_DOZEN_TEST_CASES = [
  { id: 1, name: 'Unauthenticated Read/Write', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Cross-User PII Read', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Cross-User Subcollection Read (/users/userB/projects/p1)', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Shadow/Ghost Field Injection (isAdmin: true)', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'Unverified Email Write', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Oversized DisplayName (>80 chars)', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Orphaned Subcollection Write without Parent User Doc', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'Invalid Provider or Project Status Enum', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Spoofed Client Timestamp on Create', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'Immutable createdAt Mutation on Update', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Immutable ownerId Mutation on Update', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Collection Enumeration (list) on /users', expected: 'PERMISSION_DENIED' },
] as const;
