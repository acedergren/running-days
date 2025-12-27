# Running Days - Hosted (Privacy-First)

Multi-tenant hosted version of Running Days with HIPAA/GDPR compliance.

## Security & Privacy Principles

### Zero Trust Architecture
- Every request authenticated and authorized
- No implicit trust between services
- Principle of least privilege

### Data Isolation
- Row-level security enforced at application layer
- User ID required on every data access query
- No cross-user data access possible

### Encryption
- **At rest**: Oracle TDE (Transparent Data Encryption)
- **In transit**: TLS 1.3 only
- **Secrets**: OCI Vault for all credentials

### Audit Trail
- Every data access logged
- User ID, action, timestamp, IP address
- Immutable audit log retained for compliance

### User Rights (GDPR)
- **Data Portability**: Export all data via API
- **Right to Deletion**: Complete data erasure on request
- **Consent Management**: Explicit opt-in required
- **Data Minimization**: Only essential data collected

## Compliance

| Standard | Status | Notes |
|----------|--------|-------|
| GDPR | ✅ | Data portability, deletion, consent |
| HIPAA | ✅ | BAA available via OCI |
| SOC 2 | 🔄 | OCI platform certified |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   OCI WAF                        │
│              (DDoS, SQL Injection)              │
└─────────────────────┬───────────────────────────┘
                      │ HTTPS/TLS 1.3
┌─────────────────────▼───────────────────────────┐
│              OCI Load Balancer                   │
│                 (SSL Termination)               │
└─────────────────────┬───────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────┐
│         OCI Container Instances                  │
│    ┌─────────────────────────────────────┐      │
│    │      SvelteKit Application          │      │
│    │  ┌─────────────┐ ┌───────────────┐  │      │
│    │  │   Auth      │ │  Audit Log    │  │      │
│    │  │   Layer     │ │   Writer      │  │      │
│    │  └──────┬──────┘ └───────┬───────┘  │      │
│    │         │                │          │      │
│    │  ┌──────▼────────────────▼───────┐  │      │
│    │  │     Data Access Layer         │  │      │
│    │  │  (User ID enforced on all)    │  │      │
│    │  └──────────────┬────────────────┘  │      │
│    └─────────────────┼───────────────────┘      │
└──────────────────────┼──────────────────────────┘
                       │ mTLS
┌──────────────────────▼──────────────────────────┐
│         Oracle Autonomous Database               │
│  ┌────────────────────────────────────────────┐ │
│  │  TDE Encryption │ Automatic Backups        │ │
│  │  Audit Policies │ Network Isolation        │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## API Endpoints

### Privacy APIs
- `GET /api/user/export` - Export all user data (JSON)
- `DELETE /api/user/delete` - Delete all user data
- `GET /api/user/audit-log` - View access history

### Data APIs (all require authentication)
- `GET /api/stats` - User's running statistics
- `GET /api/runs` - User's runs
- `POST /api/webhook` - Ingest from Health Auto Export
