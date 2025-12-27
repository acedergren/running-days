# Webhook API Reference

The Running Days webhook endpoint receives workout data from the **Health Auto Export** iOS app, which syncs Apple Health running data automatically.

## Endpoint

```
POST /api/webhook
```

## Authentication

Authentication is required via a webhook token. Tokens can be passed in two ways:

| Method | Example |
|--------|---------|
| Query Parameter | `POST /api/webhook?token=your-token-here` |
| Header | `X-Webhook-Token: your-token-here` |

### Token Management

Tokens are stored in the `webhook_tokens` table. Each token has:
- **name**: Human-readable identifier (e.g., "iPhone 15 Pro")
- **isActive**: Boolean flag to enable/disable tokens
- **lastUsedAt**: Timestamp of last successful use

## Request Format

### Headers

```http
Content-Type: application/json
```

### Body Schema

```typescript
interface HealthExportPayload {
  data: {
    workouts?: HealthExportWorkout[];
  };
}

interface HealthExportWorkout {
  id?: string;          // Optional UUID from Health Auto Export
  name: string;         // Workout type (e.g., "Running", "Outdoor Run")
  start: string;        // ISO 8601 datetime
  end: string;          // ISO 8601 datetime
  duration: number;     // Duration in seconds
  distance?: number;    // Distance in meters
  activeEnergy?: number; // Calories burned
  avgHeartRate?: number; // Average BPM
  maxHeartRate?: number; // Maximum BPM
}
```

### Example Request

```bash
curl -X POST "https://your-domain.com/api/webhook?token=your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "workouts": [
        {
          "id": "abc123-uuid",
          "name": "Outdoor Running",
          "start": "2025-01-15T08:00:00Z",
          "end": "2025-01-15T08:35:00Z",
          "duration": 2100,
          "distance": 7500,
          "activeEnergy": 420,
          "avgHeartRate": 152,
          "maxHeartRate": 175
        }
      ]
    }
  }'
```

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Processed 1 running workouts",
  "processed": 1,
  "skipped": 0
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for successful requests |
| `message` | string | Human-readable summary |
| `processed` | number | Count of newly imported workouts |
| `skipped` | number | Count of skipped workouts (duplicates or invalid) |

## Error Responses

### 401 Unauthorized

**Missing token:**
```json
{
  "message": "Missing webhook token"
}
```

**Invalid token:**
```json
{
  "message": "Invalid or inactive webhook token"
}
```

### 400 Bad Request

**Invalid JSON:**
```json
{
  "message": "Invalid JSON payload"
}
```

## Workout Processing Logic

### Filtering

Only workouts with names containing "running" or "run" (case-insensitive) are processed. Other workout types (cycling, swimming, etc.) are ignored.

**Accepted names:**
- "Running"
- "Outdoor Run"
- "Indoor Running"
- "Trail Run"

**Ignored names:**
- "Cycling"
- "Swimming"
- "Walking"

### Deduplication

Workouts are deduplicated by ID. If a workout with the same ID already exists, it is skipped. IDs are generated as `{start_datetime}-{duration}` if not provided by Health Auto Export.

### Daily Aggregation

Each day's workouts are aggregated into the `daily_stats` table:

| Metric | Aggregation |
|--------|-------------|
| `runCount` | Count of runs that day |
| `totalDistanceMeters` | Sum of all distances |
| `totalDurationSeconds` | Sum of all durations |
| `avgPaceSecondsPerKm` | Weighted average pace |
| `longestRunMeters` | Maximum single run distance |
| `fastestPaceSecondsPerKm` | Minimum (fastest) pace |

## Testing Connectivity

### GET Endpoint

```
GET /api/webhook
```

Returns basic status without authentication:

```json
{
  "status": "ok",
  "message": "Webhook endpoint active. Token required for POST."
}
```

With token validation:

```
GET /api/webhook?token=your-token
```

```json
{
  "status": "ok",
  "message": "Token valid",
  "tokenName": "iPhone 15 Pro"
}
```

## Health Auto Export Configuration

1. Install [Health Auto Export](https://apps.apple.com/app/health-auto-export-json-csv/id1115567069) from the App Store
2. Go to **Automations** → **Create New**
3. Select **REST API** as the export type
4. Configure:
   - **URL**: `https://your-domain.com/api/webhook?token=YOUR_TOKEN`
   - **Method**: POST
   - **Data Types**: Workouts
   - **Export Format**: JSON
5. Set your automation schedule (e.g., every hour, on workout completion)

## Rate Limits

There are currently no rate limits on the webhook endpoint. However, the database uses SQLite which handles concurrent writes via WAL mode.

## Security Considerations

- Tokens should be treated as secrets
- Use HTTPS in production
- Rotate tokens periodically
- Disable unused tokens via `isActive` flag
- Monitor `lastUsedAt` for suspicious activity
