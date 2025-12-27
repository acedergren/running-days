# Running Days Documentation

Welcome to the Running Days documentation. This guide covers everything from getting started to understanding the system architecture.

## Quick Links

| Document | Description |
|----------|-------------|
| [Getting Started](guides/getting-started.md) | Setup guide and first-time configuration |
| [Configuration](guides/configuration.md) | Environment variables and deployment options |
| [Webhook API](api/webhook.md) | Health Auto Export integration reference |
| [OpenAPI Spec](api/openapi.yaml) | Machine-readable API specification (OpenAPI 3.0) |
| [System Architecture](architecture/system-overview.md) | High-level system design with diagrams |
| [Data Flows](architecture/data-flows.md) | Detailed sequence and flow diagrams |
| [Database Schema](architecture/database-schema.md) | Tables, columns, and relationships |
| [UI Components](components/ui-components.md) | Component library reference |
| [Contributing](CONTRIBUTING.md) | Development workflow and code style guide |

## What is Running Days?

Running Days is a fitness tracking web application that counts **unique running days** toward a yearly goal. Unlike streak-based apps that create anxiety around maintaining consecutive days, Running Days focuses on consistency over the year.

### Key Philosophy

> **300 days of running** means 65 days of guilt-free rest.

The goal isn't perfection—it's sustainable habit building. Miss a day? No problem. You have buffer days built into your goal.

## Features

- **Apple Health Integration** - Automatic sync via Health Auto Export iOS app
- **Progress Visualization** - Beautiful progress rings inspired by Apple Fitness
- **Yearly Goal Tracking** - Set and track your running day target
- **Daily Aggregation** - Multiple runs per day count as one running day
- **Statistics Dashboard** - Distance, time, pace, and progress metrics
- **Insights & Charts** - Visualize your running patterns over time

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | SvelteKit 2, Svelte 5, Tailwind CSS 4 |
| Database | SQLite, Drizzle ORM |
| Visualization | LayerChart, Lucide Icons |
| Deployment | Node.js or Cloudflare Pages |

## Documentation Structure

```
docs/
├── README.md                  # This file
├── CONTRIBUTING.md            # Development workflow guide
├── api/
│   ├── webhook.md             # Webhook endpoint reference
│   └── openapi.yaml           # OpenAPI 3.0 specification
├── architecture/
│   ├── system-overview.md     # System diagrams and overview
│   ├── data-flows.md          # Detailed sequence diagrams
│   └── database-schema.md     # Database tables and types
├── components/
│   └── ui-components.md       # UI component library
└── guides/
    ├── getting-started.md     # Setup and first-time config
    └── configuration.md       # Environment and deployment
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `pnpm test`
5. Submit a pull request

## License

MIT License - see [LICENSE](../../../LICENSE) for details.
