# CLAUDE.md - Development Guide for Claude Code

## Project Overview

Running Days is a fitness tracking web app that counts unique running days toward a yearly goal of 300. It integrates with Apple Health via the Health Auto Export iOS app webhook.

## Tech Stack

- **SvelteKit 2** with **Svelte 5** (using runes: `$state`, `$derived`, `$effect`, `$props`)
- **Tailwind CSS 4** with `@tailwindcss/vite` plugin
- **SQLite** via `better-sqlite3` with **Drizzle ORM**
- **LayerChart** for data visualizations
- **bits-ui** for accessible UI primitives
- **lucide-svelte** for icons

## Key Patterns

### Svelte 5 Runes

```svelte
<script lang="ts">
  // Props with $props()
  let { data, class: className }: Props = $props();

  // Reactive state with $state()
  let count = $state(0);

  // Derived values with $derived()
  const doubled = $derived(count * 2);

  // Snippets replace slots
  {#snippet icon()}<Icon />{/snippet}
</script>
```

### Component File Structure

```svelte
<script lang="ts" module>
  // Module-level exports (types, variants)
  export const buttonVariants = tv({ ... });
</script>

<script lang="ts">
  // Component instance code
  let { ...props } = $props();
</script>

<!-- Template -->
```

### Database Access

- Schema defined in `src/lib/server/db/schema.ts`
- Use `db.query.tableName.findFirst/findMany()` for simple queries
- Use `db.select().from().where()` for complex queries
- All database code must be in `+page.server.ts` or `+server.ts` files

### Design System

- **Colors**: OKLCH color space for perceptual uniformity
- **Theme**: Dark mode with orange/coral accent (`--accent-primary: oklch(0.72 0.2 25)`)
- **Surfaces**: Ground → Base → Raised → Overlay → Elevated
- **Typography**: Inter (body), Space Grotesk (display), JetBrains Mono (code)

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run check        # Type check
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio
```

## File Locations

| Purpose | Location |
|---------|----------|
| Database schema | `src/lib/server/db/schema.ts` |
| UI components | `src/lib/components/ui/` |
| Charts | `src/lib/components/charts/` |
| Utilities | `src/lib/utils.ts` |
| Workout processing | `src/lib/workout-processor.ts` |
| API routes | `src/routes/api/` |
| Design tokens | `src/app.css` |
| Tests | `src/lib/*.test.ts` |

## Important Notes

1. **Server-only code**: Database access must be in files with `.server.ts` or in `+server.ts`
2. **Webhook security**: Always validate tokens in `/api/webhook`
3. **OKLCH colors**: Use `oklch(lightness chroma hue)` format in CSS
4. **Tailwind 4**: Uses `@import "tailwindcss"` not individual imports
5. **PWA**: Manifest at `static/manifest.json`, requires icon files
6. **Testing**: Use Vitest for unit tests. Place tests next to source files with `.test.ts` suffix

## Testing Webhook Locally

```bash
# Create a test token (run in Node REPL or script)
import { db, webhookTokens } from './src/lib/server/db';
await db.insert(webhookTokens).values({
  token: 'test-token-123',
  name: 'Development'
});

# Test with curl
curl -X POST "http://localhost:5173/api/webhook?token=test-token-123" \
  -H "Content-Type: application/json" \
  -d '{"data":{"workouts":[{"name":"Running","start":"2024-01-15T08:00:00Z","end":"2024-01-15T08:30:00Z","duration":1800,"distance":5000}]}}'
```
