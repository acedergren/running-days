# Privacy & Data Handling Policy

## What Data We Collect

| Data Type | Purpose | Retention | Encrypted |
|-----------|---------|-----------|-----------|
| Email address | Authentication & account recovery | Until deletion | ✅ Yes |
| Running workouts | Core app functionality | Until deletion | ✅ Yes |
| Workout metrics (distance, pace, duration) | Statistics & insights | Until deletion | ✅ Yes |
| Heart rate (if provided) | Health insights | Until deletion | ✅ Yes |
| Webhook tokens | API authentication | Until revoked | ✅ Yes |

## What We DON'T Collect

- ❌ Location/GPS data
- ❌ Device identifiers
- ❌ Third-party tracking
- ❌ Advertising data
- ❌ Analytics beyond basic usage

## How Your Data is Protected

### Encryption
- **In Transit**: All connections use TLS 1.3
- **At Rest**: Oracle TDE (Transparent Data Encryption) with AES-256
- **Backups**: Encrypted with separate keys

### Isolation
- Your data is completely isolated from other users
- Every database query includes your user ID
- No admin can access your data without audit logging

### Access Control
- Only you can access your data via authenticated API
- No shared databases or tables between users
- Row-level security enforced at application layer

## Your Rights

### Export Your Data (GDPR Article 20)
```bash
# Download all your data
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.running-days.app/api/user/export
```

Returns JSON with all your:
- Profile information
- All workouts
- Goals and settings
- Audit log of access

### Delete Your Data (GDPR Article 17)
```bash
# Permanently delete all your data
curl -X DELETE -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.running-days.app/api/user/delete
```

This will:
- Delete all workouts
- Delete all goals and settings
- Delete your account
- Anonymize (not delete) audit logs for compliance

### View Access History
```bash
# See who accessed your data
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.running-days.app/api/user/audit-log
```

## Data Flow Transparency

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR DEVICE                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Health Auto Export App                              │    │
│  │  (Running data from Apple Health)                    │    │
│  └────────────────────────┬────────────────────────────┘    │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTPS POST (TLS 1.3)
                            │ Your webhook token
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    OUR SERVERS                               │
│                                                              │
│  1. Request authenticated with YOUR token                   │
│  2. Data validated (no malicious content)                   │
│  3. Workout extracted and stored in YOUR isolated partition │
│  4. Access logged in audit trail                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Oracle Autonomous Database                          │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │  YOUR DATA (user_id = abc123)                 │  │    │
│  │  │  - workouts table                              │  │    │
│  │  │  - goals table                                 │  │    │
│  │  │  - daily_stats table                           │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │  OTHER USER DATA (user_id = xyz789)           │  │    │
│  │  │  [COMPLETELY ISOLATED - NO ACCESS]            │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Open Source

Our code is open source. You can audit exactly how we handle your data:
- https://github.com/your-org/running-days

## Contact

Questions about privacy? Email: privacy@running-days.app

## Changes to This Policy

We will notify you via email before any changes to data handling practices.

Last updated: 2024-12-26
