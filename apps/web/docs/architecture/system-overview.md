# System Architecture

Running Days is a fitness tracking web application that counts unique running days toward a yearly goal. It integrates with Apple Health via the Health Auto Export iOS app.

## High-Level Architecture

```mermaid
graph TB
    subgraph "iOS Device"
        AH[Apple Health]
        HAE[Health Auto Export App]
    end

    subgraph "Running Days Application"
        subgraph "Frontend - SvelteKit"
            LP[Landing Page<br/>Marketing]
            DB[Dashboard<br/>Progress & Stats]
            IN[Insights<br/>Visualizations]
        end

        subgraph "API Layer"
            WH[Webhook Endpoint<br/>/api/webhook]
            MT[Metrics Endpoint<br/>/api/metrics]
        end

        subgraph "Business Logic"
            WP[Workout Processor<br/>Filtering & Transformation]
            DA[Daily Aggregator<br/>Stats Computation]
        end

        subgraph "Data Layer"
            ORM[Drizzle ORM]
            SQLite[(SQLite Database)]
        end
    end

    subgraph "Observability"
        PROM[Prometheus]
        GRAF[Grafana]
    end

    AH -->|Workouts| HAE
    HAE -->|HTTP POST| WH
    WH --> WP
    WP --> DA
    DA --> ORM
    ORM --> SQLite
    LP --> ORM
    DB --> ORM
    IN --> ORM
    MT --> PROM
    PROM --> GRAF

    style AH fill:#4CAF50,color:#fff
    style HAE fill:#2196F3,color:#fff
    style SQLite fill:#FF9800,color:#fff
```

## Component Descriptions

### Frontend (SvelteKit)

| Route | Purpose | Data Source |
|-------|---------|-------------|
| `/` | Landing page with marketing content | Static + demo data |
| `/dashboard` | Main dashboard with progress ring | `+page.server.ts` → Database |
| `/insights` | Detailed analytics and charts | `+page.server.ts` → Database |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhook` | POST | Receive workout data from Health Auto Export |
| `/api/webhook` | GET | Test webhook connectivity |
| `/api/metrics` | GET | Prometheus metrics for observability |

### Business Logic Layer

```mermaid
flowchart LR
    subgraph "workout-processor.ts"
        F[filterRunningWorkouts]
        P[processWorkout]
        A[aggregateDailyStats]
        M[mergeDailyStats]
    end

    RAW[Raw Workout] --> F
    F --> P
    P --> A
    A --> M
    M --> DB[(Database)]
```

#### Key Functions

| Function | Purpose |
|----------|---------|
| `filterRunningWorkouts()` | Filter to only running activities |
| `processWorkout()` | Transform Health Export format → internal format |
| `calculatePaceSecondsPerKm()` | Compute pace from duration/distance |
| `aggregateDailyStats()` | Aggregate multiple workouts per day |
| `mergeDailyStats()` | Merge new workout into existing day's stats |

## Data Flow

### Workout Import Flow

```mermaid
sequenceDiagram
    participant iOS as Health Auto Export
    participant API as /api/webhook
    participant WP as Workout Processor
    participant DB as SQLite

    iOS->>API: POST workout data
    API->>API: Validate token
    API->>WP: filterRunningWorkouts()
    WP-->>API: Running workouts only

    loop Each workout
        API->>DB: Check if exists
        alt New workout
            API->>WP: processWorkout()
            WP-->>API: Processed workout
            API->>DB: INSERT workout
            API->>DB: UPSERT daily_stats
        else Duplicate
            API->>API: Skip
        end
    end

    API-->>iOS: { processed: N, skipped: M }
```

### Dashboard Load Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Server as +page.server.ts
    participant DB as SQLite

    Browser->>Server: GET /dashboard
    Server->>DB: Get/create goal for year
    Server->>DB: Count running days
    Server->>DB: Aggregate year stats
    Server->>DB: Get recent runs (limit 10)
    Server->>DB: Get chart data (30 days)
    Server-->>Browser: Page data + HTML
```

## Database Schema

```mermaid
erDiagram
    workouts {
        text id PK
        text date
        text start_time
        text end_time
        int duration_seconds
        real distance_meters
        real energy_burned_kcal
        int avg_heart_rate
        int max_heart_rate
        real avg_pace_seconds_per_km
        text source
        text raw_payload
        text created_at
        text updated_at
    }

    daily_stats {
        text date PK
        int year
        int run_count
        real total_distance_meters
        int total_duration_seconds
        real avg_pace_seconds_per_km
        real longest_run_meters
        real fastest_pace_seconds_per_km
        text created_at
        text updated_at
    }

    goals {
        int id PK
        int year UK
        int target_days
        text created_at
        text updated_at
    }

    webhook_tokens {
        int id PK
        text token UK
        text name
        bool is_active
        text last_used_at
        text created_at
    }

    workouts ||--o{ daily_stats : "aggregates to"
    goals ||--o{ daily_stats : "tracks progress"
```

## Technology Stack

### Runtime
- **Node.js 22+** - JavaScript runtime
- **SvelteKit 2** - Full-stack framework
- **Svelte 5** - UI framework with runes

### Styling
- **Tailwind CSS 4** - Utility-first CSS
- **OKLCH Colors** - Perceptually uniform color space

### Database
- **SQLite** - Embedded database
- **better-sqlite3** - Synchronous SQLite driver
- **Drizzle ORM** - Type-safe SQL queries

### Visualization
- **LayerChart** - Svelte charting library
- **Lucide Icons** - Icon library

### Deployment Options
- **Node.js** - Traditional server deployment
- **Cloudflare Pages** - Edge deployment (static adapter)

## File Structure

```
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── charts/          # Data visualizations
│   │   │   └── ui/              # Reusable UI components
│   │   ├── server/
│   │   │   └── db/              # Database connection & schema
│   │   ├── utils.ts             # Utility functions
│   │   └── workout-processor.ts # Business logic
│   ├── routes/
│   │   ├── api/
│   │   │   └── webhook/         # Webhook endpoint
│   │   ├── dashboard/           # Main dashboard
│   │   ├── insights/            # Analytics page
│   │   └── +page.svelte         # Landing page
│   └── app.css                  # Design system tokens
├── static/                      # Static assets
├── drizzle/                     # Database migrations
└── docs/                        # Documentation
```

## Scalability Considerations

### Current Limitations
- **SQLite** - Single-writer, best for single-user or low-concurrency
- **No auth** - Currently designed for personal use

### Future Scaling Options
1. **PostgreSQL** - For multi-user support
2. **Redis** - For caching aggregated stats
3. **Auth** - Add authentication for multi-user
4. **Workers** - Background processing for heavy aggregations
