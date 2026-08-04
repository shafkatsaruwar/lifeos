# Firebase security rules (replace Test Mode)

Firebase emails about Realtime Database access expiring mean the project is still on **Test Mode** rules (open to the internet, auto-deny after ~30 days).

LifeOS stores everything under `users/{uid}/…`. These rules keep signed-in users working and block everyone else.

## Publish Realtime Database rules (required — do this before the deadline)

1. Open [Firebase Console → LifeOS → Realtime Database → Rules](https://console.firebase.google.com/project/lifeos-45586/database/lifeos-45586-default-rtdb/rules)
2. Replace the entire rules document with the contents of [`database.rules.json`](./database.rules.json) (also pasted below)
3. Click **Publish**

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

After publishing, the expiry warning goes away and only the signed-in Google account can read/write their own data.

## Optional: Storage rules

If you use cloud file uploads, also set Storage rules from [`storage.rules`](./storage.rules):

[Firebase Console → Storage → Rules](https://console.firebase.google.com/project/lifeos-45586/storage/rules)

## CLI deploy (optional)

With the Firebase CLI logged into an account that owns `lifeos-45586`:

```bash
npx firebase-tools deploy --only database
npx firebase-tools deploy --only storage
```

Config lives in `firebase.json` and `.firebaserc`.

## Notes

- Dev **Test Login** (`test-user-dev`) has no Firebase Auth token, so cloud sync will fail under these rules (expected). Use Google sign-in to verify.
- Gmail / Outlook / iCloud API routes already write with the user’s ID token under `users/{uid}/…`, so they keep working.
