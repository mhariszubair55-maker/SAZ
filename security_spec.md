# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default Deny**: All paths not explicitly matched under `/users/{userId}` and its authorized subcollections (`projects`, `conversations`, `knowledge`, `artifacts`) are strictly denied (`allow read, write: if false`).
2. **PII Isolation & Ownership**: User profile documents at `/users/{userId}` and all nested subcollections (`projects`, `conversations`, `knowledge`, `artifacts`) are strictly readable and writable only by the authenticated owner (`request.auth.uid == userId`) with a verified email (`request.auth.token.email_verified == true`).
3. **Master Gate Relational Sync**: Every write to `/users/{userId}/{subcollection}/{docId}` verifies that the parent `/users/{userId}` document exists (`exists(/databases/$(database)/documents/users/$(userId))`) and that `incoming().ownerId == request.auth.uid && incoming().ownerId == userId`.
4. **No Cross-User List Scraping**: `allow list` on `/users` is disabled (`if false`). Subcollection `allow list` rules strictly enforce `isVerified() && isOwner(userId) && resource.data.ownerId == request.auth.uid` without any O(n) `get()` calls.
5. **Strict Schema & Volumetric Bounds**: Every entity (`UserProfile`, `UserProject`, `UserConversation`, `UserKnowledgeDoc`, `UserArtifact`) enforces exact key allowlisting (`hasAll` + `hasOnly`), type checks, regex patterns (`^[a-zA-Z0-9_\-]+$`), and string `.size()` limits.
6. **Temporal & Identity Immutability**: `uid`/`ownerId`/`id` and `createdAt` are immutable on update, and `createdAt`/`updatedAt` must equal `request.time`.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Read/Write**: `{ "uid": "u1", "displayName": "Test" }` with `auth = null` -> `PERMISSION_DENIED`
2. **Cross-User PII Read**: Authenticated as `userA`, `get(/users/userB)` -> `PERMISSION_DENIED`
3. **Cross-User Subcollection Read**: Authenticated as `userA`, `get(/users/userB/projects/p1)` -> `PERMISSION_DENIED`
4. **Shadow/Ghost Field Injection**: Adding `"isAdmin": true` or `"role": "superadmin"` -> `PERMISSION_DENIED`
5. **Unverified Email Write**: Authenticated user with `email_verified: false` writing `/users/{userId}` -> `PERMISSION_DENIED`
6. **Oversized DisplayName DoW**: `displayName` of 5,000 chars (> 80 max) -> `PERMISSION_DENIED`
7. **Orphaned Subcollection Write**: Writing `/users/userA/projects/p1` when `/users/userA` does not exist -> `PERMISSION_DENIED`
8. **Invalid Provider / Status Enum**: `provider: "hacker"` or `status: "deleted"` -> `PERMISSION_DENIED`
9. **Spoofed Client Timestamp on Create**: `createdAt` not matching `request.time` -> `PERMISSION_DENIED`
10. **Immutable `createdAt` Mutation on Update**: Changing `createdAt` during update -> `PERMISSION_DENIED`
11. **Immutable `ownerId` Mutation on Update**: Changing `ownerId` during project/conversation update -> `PERMISSION_DENIED`
12. **Collection Enumeration (`list`) on `/users`**: Running a collection query on `/users` -> `PERMISSION_DENIED`
