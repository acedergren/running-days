# Contributing to Running Days

Thank you for your interest in contributing to Running Days! This guide will help you get started.

## Development Setup

### Prerequisites

- **Node.js 22+** - [Download](https://nodejs.org/)
- **pnpm 9+** - `npm install -g pnpm`
- **Git** - For version control

### Getting Started

```bash
# Clone the repository
git clone https://github.com/acedergren/running-days.git
cd running-days

# Install dependencies
pnpm install

# Navigate to web app
cd apps/web

# Set up the database
pnpm run db:generate
pnpm run db:migrate

# Start development server
pnpm run dev
```

## Project Structure

```
running-days/
├── apps/
│   └── web/                 # SvelteKit web application
│       ├── src/
│       │   ├── lib/
│       │   │   ├── components/
│       │   │   │   ├── charts/      # Data visualizations
│       │   │   │   └── ui/          # Reusable UI components
│       │   │   ├── server/
│       │   │   │   └── db/          # Database connection & schema
│       │   │   ├── utils.ts         # Utility functions
│       │   │   └── workout-processor.ts
│       │   ├── routes/              # SvelteKit routes
│       │   └── app.css              # Design system tokens
│       ├── static/                  # Static assets
│       ├── drizzle/                 # Database migrations
│       └── docs/                    # Documentation
├── packages/                # Shared packages (if any)
└── pnpm-workspace.yaml
```

## Development Workflow

### Branch Naming

Use descriptive branch names:

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/description` | `feature/add-weekly-goals` |
| Bug fix | `fix/description` | `fix/pace-calculation` |
| Docs | `docs/description` | `docs/update-api-reference` |
| Refactor | `refactor/description` | `refactor/split-processor` |

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, no code change
- `refactor` - Code change that neither fixes nor adds
- `test` - Adding tests
- `chore` - Maintenance tasks

Examples:
```
feat(webhook): add support for heart rate zones
fix(dashboard): correct pace calculation for short runs
docs(api): add rate limiting documentation
```

## Code Style

### Svelte 5 Runes

Always use Svelte 5 runes syntax:

```svelte
<script lang="ts">
  // Props with $props()
  let { data, class: className }: Props = $props();

  // Reactive state with $state()
  let count = $state(0);

  // Derived values with $derived()
  const doubled = $derived(count * 2);

  // Side effects with $effect()
  $effect(() => {
    console.log('count changed:', count);
  });
</script>
```

### TypeScript

- Use strict TypeScript (`strict: true`)
- Define types for all props and function parameters
- Export types from component modules when needed

```typescript
// Good
function calculatePace(distance: number, duration: number): number {
  return duration / (distance / 1000);
}

// Avoid
function calculatePace(distance, duration) {
  return duration / (distance / 1000);
}
```

### CSS & Tailwind

- Use Tailwind utility classes
- Use OKLCH color space for custom colors
- Follow the design system tokens in `app.css`

```svelte
<!-- Good: Using design tokens -->
<div class="bg-surface-raised text-primary border-subtle">

<!-- Good: Using Tailwind utilities -->
<button class="px-4 py-2 rounded-lg hover:bg-accent-primary/10">

<!-- Avoid: Inline styles -->
<div style="background: #1a1a1a; color: white;">
```

### Component Structure

```svelte
<script lang="ts" module>
  // Module-level exports (types, variants, constants)
  import type { Snippet } from 'svelte';

  export interface Props {
    value: number;
    label?: string;
    children?: Snippet;
  }
</script>

<script lang="ts">
  // Component instance code
  let { value, label = 'Default', children }: Props = $props();

  // Derived values
  const formatted = $derived(value.toFixed(2));
</script>

<!-- Template -->
<div class="component">
  <span class="label">{label}</span>
  <span class="value">{formatted}</span>
  {#if children}
    {@render children()}
  {/if}
</div>
```

## Testing

### Running Tests

```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run with coverage
pnpm run test:coverage
```

### Writing Tests

Place tests next to source files with `.test.ts` suffix:

```
src/lib/
├── workout-processor.ts
├── workout-processor.test.ts
├── utils.ts
└── utils.test.ts
```

Example test:

```typescript
import { describe, it, expect } from 'vitest';
import { filterRunningWorkouts, calculatePaceSecondsPerKm } from './workout-processor';

describe('filterRunningWorkouts', () => {
  it('should filter only running workouts', () => {
    const workouts = [
      { name: 'Outdoor Running', duration: 1800 },
      { name: 'Cycling', duration: 3600 },
      { name: 'Morning Run', duration: 1200 },
    ];

    const result = filterRunningWorkouts(workouts);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Outdoor Running');
    expect(result[1].name).toBe('Morning Run');
  });
});

describe('calculatePaceSecondsPerKm', () => {
  it('should calculate pace correctly', () => {
    // 5km in 25 minutes = 5:00/km = 300 sec/km
    const pace = calculatePaceSecondsPerKm(5000, 1500);
    expect(pace).toBe(300);
  });

  it('should handle zero distance', () => {
    const pace = calculatePaceSecondsPerKm(0, 1000);
    expect(pace).toBe(0);
  });
});
```

## Database Changes

### Adding/Modifying Schema

1. Edit `src/lib/server/db/schema.ts`
2. Generate migration: `pnpm run db:generate`
3. Review generated migration in `drizzle/`
4. Apply migration: `pnpm run db:migrate`
5. Update `docs/architecture/database-schema.md`

### Migration Best Practices

- Keep migrations small and focused
- Add indexes for frequently queried columns
- Consider backward compatibility
- Test migrations on a copy of production data

## Pull Request Process

### Before Submitting

1. **Run checks:**
   ```bash
   pnpm run check    # Type checking
   pnpm test         # Run tests
   pnpm run build    # Ensure production build works
   ```

2. **Update documentation** if needed

3. **Test webhook integration** if API changes:
   ```bash
   curl -X POST "http://localhost:5173/api/webhook?token=test" \
     -H "Content-Type: application/json" \
     -d '{"data":{"workouts":[...]}}'
   ```

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How were these changes tested?

## Checklist
- [ ] Code follows project style
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. At least one approval required
2. All checks must pass
3. Squash merge preferred for clean history

## Design System

### Colors (OKLCH)

```css
/* Accent */
--accent-primary: oklch(0.72 0.2 25);     /* Coral/orange */

/* Surfaces (dark to light) */
--surface-ground: oklch(0.05 0.005 60);   /* Deepest */
--surface-base: oklch(0.08 0.005 60);
--surface-raised: oklch(0.12 0.01 60);
--surface-overlay: oklch(0.15 0.01 60);
--surface-elevated: oklch(0.20 0.01 60);  /* Highest */

/* Status */
--color-success: oklch(0.72 0.2 145);     /* Green */
--color-warning: oklch(0.82 0.18 85);     /* Yellow */
--color-error: oklch(0.65 0.25 25);       /* Red */
```

### Typography

| Use | Font |
|-----|------|
| Headlines, numbers | Space Grotesk |
| Body text | Inter Variable |
| Code, data | JetBrains Mono |

### Spacing

Use Tailwind's default spacing scale (4px base):
- `p-4` = 16px
- `gap-6` = 24px
- `mt-8` = 32px

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/acedergren/running-days/issues)
- **Discussions:** [GitHub Discussions](https://github.com/acedergren/running-days/discussions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
