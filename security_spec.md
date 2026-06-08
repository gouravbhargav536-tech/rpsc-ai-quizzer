# Security Specification: RPSC AI MCQ Master

This specification document outlines the Zero-Trust security rules, data invariants, and the "Dirty Dozen" attack payloads designed to test and secure the Firebase Firestore configuration.

## 1. Data Invariants

1. **User Ownership**: A user profile (`/users/{userId}`) can only be created, read, updated, or deleted by the authenticated user whose `request.auth.uid` matches `{userId}`.
2. **Quiz Result Ownership**: A quiz result (`/quizzes/{quizId}`) can only be written and read by the user who completed the quiz. The `userId` field inside the quiz document must strictly match `request.auth.uid`.
3. **Immutability of Key Fields**:
   - In `/users/{userId}`: `uid` and `email` are immutable once set.
   - In `/quizzes/{quizId}`: The entire document is immutable once written (results can never be modified or tampered with).
4. **Email Verification**: Standard writes require a verified email address (`request.auth.token.email_verified == true`).
5. **System Field Protection**: Fields like `isAdmin` cannot be updated or modified by regular users.
6. **Temporal Integrity**: The `createdAt` and `updatedAt` fields must align precisely with `request.time`.

---

## 2. The "Dirty Dozen" Attack Payloads

Below are twelve malicious payloads designed to violate system rules. All must be blocked with `PERMISSION_DENIED`.

### Payload 1: Profile Hijack (Create/Update other user's profile)
- **Path**: `/users/attacker123`
- **User**: `victim_user_uid`
- **Action**: Create or Update
- **Payload**: `{ "name": "Fake Profile", "email": "attacker@gmail.com" }`
- **Result**: `PERMISSION_DENIED` - UID in path does not match authenticated user UID.

### Payload 2: Self-Appointed Administrator (Privilege Escalation)
- **Path**: `/users/victim_user_uid`
- **User**: `victim_user_uid`
- **Action**: Update
- **Payload**: `{ "name": "Victim", "email": "victim@gmail.com", "isAdmin": true }`
- **Result**: `PERMISSION_DENIED` - Regular users cannot set `isAdmin` to `true`.

### Payload 3: Spoofed Result Ownership (Foreign Quiz Log)
- **Path**: `/quizzes/malicious_quiz_id`
- **User**: `attacker_uid`
- **Action**: Create
- **Payload**: `{ "userId": "victim_uid", "score": 10, "totalQuestions": 10 }`
- **Result**: `PERMISSION_DENIED` - The `userId` property must match the active writer's UID.

### Payload 4: Invalid Email Registration
- **Path**: `/users/user_uid`
- **User**: `user_uid`
- **Action**: Create
- **Payload**: `{ "uid": "user_uid", "name": "User", "email": "invalid-email-format" }`
- **Result**: `PERMISSION_DENIED` - Email format validation failing.

### Payload 5: Tampering with Historic Scores (Quiz Modification)
- **Path**: `/quizzes/existing_quiz_id`
- **User**: `user_uid`
- **Action**: Update
- **Payload**: `{ "score": 10 }`
- **Result**: `PERMISSION_DENIED` - Quizzes are strictly immutable once written.

### Payload 6: Deletion of Historic Scores
- **Path**: `/quizzes/existing_quiz_id`
- **User**: `user_uid`
- **Action**: Delete
- **Result**: `PERMISSION_DENIED` - Deletion of quiz logs is forbidden to maintain educational tracking integrity.

### Payload 7: Client-Spoofed Timestamps
- **Path**: `/users/user_uid`
- **User**: `user_uid`
- **Action**: Create
- **Payload**: `{ "uid": "user_uid", "name": "User", "email": "user@gmail.com", "createdAt": "2020-01-01T00:00:00Z" }`
- **Result**: `PERMISSION_DENIED` - Timestamps must match server-time (`request.time`).

### Payload 8: Denials of Wallet via ID Poisoning (Gigantic Path Entry)
- **Path**: `/users/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
- **User**: `authenticated_user`
- **Action**: Create
- **Result**: `PERMISSION_DENIED` - IDs must conform to regex patterns and not exceed size limitations.

### Payload 9: Unverified Email Write Block
- **Path**: `/users/user_uid`
- **User**: `unverified_user_uid` (where `email_verified == false`)
- **Action**: Create
- **Result**: `PERMISSION_DENIED` - Write access mandates email verification.

### Payload 10: Injecting Malicious Fields (Ghost Fields / Shadow Fields)
- **Path**: `/users/user_uid`
- **User**: `user_uid`
- **Action**: Create
- **Payload**: `{ "uid": "user_uid", "name": "User", "email": "user@gmail.com", "hacked_additional_field": 123 }`
- **Result**: `PERMISSION_DENIED` - Map keys are strictly typed and bounded using helper keys checking.

### Payload 11: Attempting to Inject Out-of-Bounds Stats (Streak Exploitation)
- **Path**: `/users/user_uid`
- **User**: `user_uid`
- **Action**: Update
- **Payload**: `{ "streak": 9999999 }`
- **Result**: `PERMISSION_DENIED` - Boundary constraints enforce realistic maximum limit values.

### Payload 12: Anonymous User Access Escape
- **Path**: `/users/anonymous_user_uid`
- **User**: Anonymous provider / unauthenticated request
- **Action**: Create
- **Result**: `PERMISSION_DENIED` - Only authenticated, verified email logins permitted.
