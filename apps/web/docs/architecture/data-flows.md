# Data Flow Documentation

Detailed data flow diagrams for the Running Days application.

## Workout Import Pipeline

### Complete Webhook Processing Flow

```mermaid
sequenceDiagram
    participant iOS as Health Auto Export
    participant API as /api/webhook
    participant Auth as Token Validator
    participant Filter as Workout Filter
    participant Proc as Workout Processor
    participant Agg as Daily Aggregator
    participant DB as SQLite

    iOS->>API: POST /api/webhook?token=xxx
    Note over iOS,API: JSON payload with workouts array

    API->>Auth: validateToken(token)
    alt Token Missing
        Auth-->>API: null
        API-->>iOS: 401 Missing webhook token
    else Token Invalid/Inactive
        Auth-->>API: null (not found or inactive)
        API-->>iOS: 401 Invalid or inactive token
    else Token Valid
        Auth-->>API: TokenRecord
        Auth->>DB: UPDATE last_used_at
    end

    API->>API: Parse JSON body
    alt Invalid JSON
        API-->>iOS: 400 Invalid JSON payload
    end

    API->>Filter: filterRunningWorkouts(workouts)
    Note over Filter: Checks: name.toLowerCase().includes('running') OR 'run'
    Filter-->>API: RunningWorkout[]

    alt No Running Workouts
        API-->>iOS: 200 { processed: 0, message: "No running workouts" }
    end

    loop Each Running Workout
        API->>DB: SELECT * FROM workouts WHERE id = ?
        alt Already Exists
            Note over API: Increment skipped counter
        else New Workout
            API->>Proc: processWorkout(rawWorkout)
            Note over Proc: Extract date, calculate pace, normalize units
            Proc-->>API: ProcessedWorkout

            API->>DB: INSERT INTO workouts

            API->>DB: SELECT * FROM daily_stats WHERE date = ?
            alt Day Exists
                API->>Agg: mergeDailyStats(existing, new)
                Note over Agg: Sum totals, recalculate averages, update bests
                Agg-->>API: MergedStats
                API->>DB: UPDATE daily_stats SET ...
            else New Day
                API->>Agg: createDailyStats(workout)
                Agg-->>API: NewDayStats
                API->>DB: INSERT INTO daily_stats
            end

            Note over API: Increment processed counter
        end
    end

    API-->>iOS: 200 { success: true, processed: N, skipped: M }
```

### Data Transformation Stages

```mermaid
flowchart TB
    subgraph Input["Health Auto Export Format"]
        RAW["{
          id: 'uuid',
          name: 'Outdoor Running',
          start: '2025-01-15T08:00:00Z',
          end: '2025-01-15T08:35:00Z',
          duration: 2100,
          distance: 7500,
          activeEnergy: 420,
          avgHeartRate: 152
        }"]
    end

    subgraph Transform["processWorkout()"]
        T1[Extract date from start time]
        T2[Map field names to schema]
        T3[Calculate pace if missing]
        T4[Add timestamps]
    end

    subgraph Output["Internal Workout Format"]
        PROC["{
          id: 'uuid',
          date: '2025-01-15',
          startTime: '2025-01-15T08:00:00Z',
          endTime: '2025-01-15T08:35:00Z',
          durationSeconds: 2100,
          distanceMeters: 7500,
          energyBurnedKcal: 420,
          avgHeartRate: 152,
          avgPaceSecondsPerKm: 280,
          source: 'health_auto_export',
          createdAt: '2025-01-15T08:36:00Z',
          updatedAt: '2025-01-15T08:36:00Z'
        }"]
    end

    RAW --> T1 --> T2 --> T3 --> T4 --> PROC
```

## Daily Aggregation Logic

### Multi-Workout Day Merging

```mermaid
flowchart LR
    subgraph Morning["Morning Run"]
        M_DIST["5.0 km"]
        M_DUR["25 min"]
        M_PACE["5:00/km"]
    end

    subgraph Evening["Evening Run"]
        E_DIST["3.0 km"]
        E_DUR["18 min"]
        E_PACE["6:00/km"]
    end

    subgraph Aggregated["Daily Stats"]
        A_COUNT["runCount: 2"]
        A_DIST["totalDistance: 8.0 km"]
        A_DUR["totalDuration: 43 min"]
        A_AVG["avgPace: 5:22/km<br/>(weighted by distance)"]
        A_LONG["longestRun: 5.0 km"]
        A_FAST["fastestPace: 5:00/km"]
    end

    Morning --> Aggregated
    Evening --> Aggregated
```

### Pace Calculation Formula

```
Average Pace (weighted) = Total Duration / Total Distance

Example:
- Run 1: 5km in 25min = 5:00/km (300 sec/km)
- Run 2: 3km in 18min = 6:00/km (360 sec/km)

Simple average: (300 + 360) / 2 = 330 sec/km = 5:30/km (WRONG)

Weighted average: (25 + 18 min) / (5 + 3 km)
                = 43 min / 8 km
                = 5.375 min/km
                = 5:22/km (CORRECT)
```

## Dashboard Data Loading

### Page Server Load Sequence

```mermaid
sequenceDiagram
    participant Browser
    participant Load as +page.server.ts load()
    participant DB as SQLite
    participant Cache as Response

    Browser->>Load: GET /dashboard

    par Parallel Queries
        Load->>DB: Get goal for current year
        Note over DB: SELECT * FROM goals WHERE year = 2025
        DB-->>Load: Goal { targetDays: 300 }
    and
        Load->>DB: Count running days this year
        Note over DB: SELECT COUNT(*) FROM daily_stats WHERE year = 2025
        DB-->>Load: runningDays: 247
    and
        Load->>DB: Aggregate year totals
        Note over DB: SELECT SUM(distance), SUM(duration), AVG(pace) FROM daily_stats WHERE year = 2025
        DB-->>Load: YearStats
    and
        Load->>DB: Recent runs
        Note over DB: SELECT * FROM workouts ORDER BY start_time DESC LIMIT 10
        DB-->>Load: RecentWorkouts[]
    and
        Load->>DB: Chart data (30 days)
        Note over DB: SELECT date, distance FROM daily_stats WHERE date >= 30_days_ago
        DB-->>Load: ChartData[]
    end

    Load->>Load: Calculate derived values
    Note over Load: progress%, daysAhead/Behind, daysRemaining

    Load-->>Browser: PageData
```

### Derived Calculations

```mermaid
flowchart TB
    subgraph Inputs
        RD[runningDays: 247]
        TD[targetDays: 300]
        DOY[dayOfYear: 300]
        DIY[daysInYear: 365]
    end

    subgraph Calculations
        C1["progress = (247 / 300) * 100 = 82.3%"]
        C2["expectedByNow = (300 / 365) * 300 = 247"]
        C3["daysAhead = 247 - 247 = 0 (on pace)"]
        C4["requiredPace = (300 - 247) / (365 - 300) = 0.82/day"]
    end

    subgraph Display
        D1["Progress Ring: 82%"]
        D2["Status: On Pace"]
        D3["Days Left: 65"]
    end

    Inputs --> Calculations --> Display
```

## Insights Page Data Flow

### Chart Data Aggregation

```mermaid
sequenceDiagram
    participant Browser
    participant Load as +page.server.ts
    participant DB as SQLite

    Browser->>Load: GET /insights

    Load->>DB: Get all daily_stats for year
    DB-->>Load: DailyStats[]

    Load->>Load: Transform for charts
    Note over Load: Group by week, month<br/>Calculate moving averages<br/>Identify trends

    Load->>DB: Get workout details for selected range
    DB-->>Load: Workouts[]

    Load-->>Browser: {
        dailyDistance: [...],
        weeklyTotals: [...],
        monthlyProgress: [...],
        paceTrend: [...],
        workouts: [...]
    }
```

### Chart Data Transformations

| Chart | Source | Transformation |
|-------|--------|----------------|
| Distance Bars | `daily_stats.total_distance_meters` | Convert to km, filter to range |
| Pace Trend | `daily_stats.avg_pace_seconds_per_km` | Convert to min:sec format |
| Weekly Totals | `daily_stats` | Group by ISO week, sum distances |
| Monthly Progress | `daily_stats` | Group by month, count days |
| Calendar Heatmap | `daily_stats.date` | Map dates to intensity values |

## Token Authentication Flow

```mermaid
flowchart TB
    REQ[Incoming Request] --> CHECK{Token Provided?}

    CHECK -->|Query param| QP["?token=xxx"]
    CHECK -->|Header| HD["X-Webhook-Token: xxx"]
    CHECK -->|Neither| FAIL1[401 Missing token]

    QP --> LOOKUP
    HD --> LOOKUP

    LOOKUP[DB Lookup by token] --> FOUND{Found?}

    FOUND -->|No| FAIL2[401 Invalid token]
    FOUND -->|Yes| ACTIVE{is_active?}

    ACTIVE -->|No| FAIL3[401 Inactive token]
    ACTIVE -->|Yes| UPDATE[Update last_used_at]

    UPDATE --> SUCCESS[Continue Processing]
```

## Error Handling

### Error Response Mapping

| Scenario | Status | Response |
|----------|--------|----------|
| No token in request | 401 | `{ message: "Missing webhook token" }` |
| Token not found | 401 | `{ message: "Invalid or inactive webhook token" }` |
| Token marked inactive | 401 | `{ message: "Invalid or inactive webhook token" }` |
| Malformed JSON | 400 | `{ message: "Invalid JSON payload" }` |
| No workouts in payload | 200 | `{ success: true, processed: 0, message: "No running workouts in payload" }` |
| All duplicates | 200 | `{ success: true, processed: 0, skipped: N }` |

### Database Error Handling

```mermaid
flowchart TB
    OP[Database Operation] --> TRY{Try}

    TRY -->|Success| OK[Return Result]
    TRY -->|Constraint Violation| DUP[Handle Duplicate]
    TRY -->|Other Error| ERR[Log & Return 500]

    DUP --> SKIP[Skip & Continue]
```

## Performance Considerations

### Query Optimization

| Query | Index Used | Notes |
|-------|------------|-------|
| Lookup workout by ID | Primary Key | O(1) lookup |
| Daily stats by date | Primary Key | O(1) lookup |
| Daily stats by year | `daily_stats_year_idx` | Fast range scan |
| Workouts by date | `workouts_date_idx` | Fast range scan |
| Recent workouts | Table scan | Consider adding start_time index |

### Batch Processing

For large imports (historical data):

```mermaid
flowchart LR
    BATCH[1000 workouts] --> CHUNK[Chunk into 100s]
    CHUNK --> TX[Transaction per chunk]
    TX --> COMMIT[Commit & Continue]
    COMMIT --> NEXT[Next Chunk]
```
