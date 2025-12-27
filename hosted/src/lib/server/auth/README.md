# Authentication: Sign in with Apple

## Why Apple Sign-In?

1. **Privacy-first**: Apple hides user's real email (relay address)
2. **Seamless**: Users already trust Apple with health data
3. **Secure**: No password to store or leak
4. **Native**: Works perfectly with Health Auto Export app

## Flow

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   User Device   │         │  Apple Servers  │         │  Running Days   │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │  1. Tap "Sign in with Apple"                          │
         │─────────────────────────────────────────────────────▶│
         │                           │                           │
         │  2. Redirect to Apple     │                           │
         │◀──────────────────────────┼───────────────────────────│
         │                           │                           │
         │  3. Authenticate          │                           │
         │─────────────────────────▶│                           │
         │                           │                           │
         │  4. Authorization code    │                           │
         │◀──────────────────────────│                           │
         │                           │                           │
         │  5. Send code to backend  │                           │
         │─────────────────────────────────────────────────────▶│
         │                           │                           │
         │                           │  6. Exchange code for token
         │                           │◀──────────────────────────│
         │                           │                           │
         │                           │  7. Return identity token │
         │                           │─────────────────────────▶│
         │                           │                           │
         │  8. Create session, return JWT                        │
         │◀──────────────────────────────────────────────────────│
         │                           │                           │
```

## Data from Apple

| Field | Description | Stored |
|-------|-------------|--------|
| `sub` | Unique user ID (stable) | ✅ As user_id |
| `email` | Real or relay email | ✅ Encrypted |
| `name` | First/last name (first login only) | ❌ Not stored |

## Privacy Features

- **Email Relay**: Apple provides `xyz@privaterelay.appleid.com`
- **No Tracking**: Apple doesn't track sign-ins across apps
- **User Control**: Users can stop sharing email anytime

## Implementation

### Required Apple Developer Setup
1. Create App ID with "Sign in with Apple" capability
2. Create Service ID for web authentication
3. Generate private key for server-side token exchange
4. Configure return URLs

### Environment Variables
```
APPLE_CLIENT_ID=com.yourapp.service
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
```
