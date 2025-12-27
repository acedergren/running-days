# UI Components Reference

Running Days uses a custom component library built with Svelte 5 runes, Tailwind CSS 4, and the bioluminescence design system.

## Design System

### Color Tokens

The design system uses OKLCH color space for perceptual uniformity:

```css
/* Accent Colors */
--accent-primary: oklch(0.72 0.2 25);      /* Warm coral/orange */
--accent-primary-hover: oklch(0.78 0.22 25);
--accent-glow: oklch(0.72 0.2 25 / 0.4);

/* Surface Colors (Dark Theme) */
--surface-ground: oklch(0.05 0.005 60);    /* Deepest black */
--surface-base: oklch(0.08 0.005 60);
--surface-raised: oklch(0.12 0.01 60);
--surface-overlay: oklch(0.15 0.01 60);
--surface-elevated: oklch(0.20 0.01 60);

/* Text Colors */
--text-primary: oklch(0.98 0.01 60);       /* Near white */
--text-secondary: oklch(0.80 0.015 60);
--text-muted: oklch(0.65 0.015 60);

/* Status Colors */
--color-success: oklch(0.72 0.2 145);      /* Green */
--color-warning: oklch(0.82 0.18 85);      /* Yellow */
--color-error: oklch(0.65 0.25 25);        /* Red */
```

### Typography

```css
--font-display: "Space Grotesk";   /* Headlines & numbers */
--font-body: "Inter Variable";     /* Body text */
--font-mono: "JetBrains Mono";     /* Code & data */
```

---

## Components

### ProgressRing

An animated circular progress indicator inspired by Apple Fitness rings.

**Location:** `src/lib/components/ui/progress-ring.svelte`

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | required | Progress percentage (0-100) |
| `size` | `number` | `200` | SVG size in pixels |
| `strokeWidth` | `number` | `14` | Ring thickness in pixels |
| `class` | `string` | `""` | Additional CSS classes |
| `showLabel` | `boolean` | `true` | Show center label |
| `label` | `string` | `undefined` | Custom label text |
| `sublabel` | `string` | `undefined` | Secondary label below main |
| `animate` | `boolean` | `true` | Enable fill animation |

#### Usage

```svelte
<script>
  import ProgressRing from '$lib/components/ui/progress-ring.svelte';
</script>

<!-- Basic usage -->
<ProgressRing value={75} />

<!-- With custom label -->
<ProgressRing
  value={82}
  size={300}
  strokeWidth={18}
  label="247"
  sublabel="of 300 days"
/>

<!-- Minimal (no label) -->
<ProgressRing value={60} showLabel={false} size={100} />
```

#### Features

- **Gradient stroke** - Orange-to-coral gradient along the arc
- **Glow effect** - SVG filter for bioluminescent glow
- **Animated fill** - CSS animation when component mounts
- **Breathing cap** - Pulsing dot at the progress endpoint
- **Ambient glow** - Background radial gradient

#### Accessibility

- Uses semantic SVG with proper `viewBox`
- Labels are visible by default for screen readers
- Progress value is reflected in visual representation

---

### Button

A versatile button component with multiple variants.

**Location:** `src/lib/components/ui/button.svelte`

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `ButtonVariant` | `"default"` | Visual style |
| `size` | `ButtonSize` | `"default"` | Size preset |
| `class` | `string` | `""` | Additional CSS classes |
| `type` | `string` | `"button"` | HTML button type |
| `ref` | `HTMLButtonElement` | `null` | Bindable element reference |

#### Variants

| Variant | Description |
|---------|-------------|
| `default` | Primary action with gradient background |
| `secondary` | Subtle with border, for secondary actions |
| `ghost` | Minimal, text-only appearance |
| `outline` | Border with accent color |
| `destructive` | Red for dangerous actions |

#### Sizes

| Size | Height | Padding |
|------|--------|---------|
| `sm` | 32px | 12px horizontal |
| `default` | 40px | 16px horizontal |
| `lg` | 48px | 24px horizontal |
| `icon` | 40px | Square |

#### Usage

```svelte
<script>
  import Button from '$lib/components/ui/button.svelte';
  import { ArrowRight } from 'lucide-svelte';
</script>

<!-- Primary button -->
<Button>Get Started</Button>

<!-- With icon -->
<Button>
  Continue
  <ArrowRight class="size-4 ml-2" />
</Button>

<!-- Secondary variant -->
<Button variant="secondary">Cancel</Button>

<!-- Ghost variant (minimal) -->
<Button variant="ghost">Learn More</Button>

<!-- Large size -->
<Button size="lg" class="px-8">Sign Up Free</Button>
```

---

### Card

Container component with elevated surface styling.

**Location:** `src/lib/components/ui/card.svelte`

#### Usage

```svelte
<script>
  import Card from '$lib/components/ui/card.svelte';
</script>

<Card class="p-6">
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</Card>
```

#### Styling

- Uses `--surface-raised` background
- Subtle border with `--border-subtle`
- Rounded corners with `--radius-xl`

---

### StatCard

Displays a single statistic with label and optional icon.

**Location:** `src/lib/components/ui/stat-card.svelte`

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | required | Stat description |
| `value` | `string \| number` | required | Primary value |
| `unit` | `string` | `""` | Unit suffix |
| `icon` | `Component` | `undefined` | Lucide icon component |

#### Usage

```svelte
<script>
  import StatCard from '$lib/components/ui/stat-card.svelte';
  import { MapPin, Clock, Zap } from 'lucide-svelte';
</script>

<div class="grid grid-cols-3 gap-4">
  <StatCard
    label="Distance"
    value="1,847"
    unit="km"
    icon={MapPin}
  />
  <StatCard
    label="Time"
    value="186"
    unit="hrs"
    icon={Clock}
  />
  <StatCard
    label="Avg Pace"
    value="5:42"
    unit="/km"
    icon={Zap}
  />
</div>
```

---

## Chart Components

### DistanceBars

Bar chart showing daily distance over time.

**Location:** `src/lib/components/charts/distance-bars.svelte`

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `data` | `ChartDataPoint[]` | Array of date/distance pairs |

```typescript
interface ChartDataPoint {
  date: string;      // YYYY-MM-DD
  distance: number;  // Meters
}
```

### PaceTrend

Line chart showing pace trends over time.

**Location:** `src/lib/components/charts/pace-trend.svelte`

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `data` | `ChartDataPoint[]` | Array of date/pace pairs |

```typescript
interface ChartDataPoint {
  date: string;      // YYYY-MM-DD
  pace: number;      // Seconds per km
}
```

---

## CSS Utilities

### Animation Classes

```css
/* Staggered entrance */
.animate-in { animation: card-enter 0.5s ease-out forwards; }
.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
/* ... up to delay-5 */

/* Ring animations */
.progress-ring-circle { animation: ring-fill 1.2s ease-out forwards; }
.progress-ring-glow { animation: ring-pulse 3s ease-in-out infinite; }
```

### Glass Effect

```css
.glass-card {
  background: linear-gradient(135deg,
    oklch(from var(--surface-raised) l c h / 0.85) 0%,
    oklch(from var(--surface-raised) l c h / 0.7) 100%
  );
  backdrop-filter: blur(16px) saturate(1.2);
  border: 1px solid oklch(1 0 0 / 0.08);
}
```

---

## Utility Functions

### cn() - Class Name Merger

Combines class names with Tailwind merge support.

```typescript
import { cn } from '$lib/utils';

// Merge classes, later ones override conflicts
cn('px-4 py-2', 'px-8');  // → 'py-2 px-8'

// Conditional classes
cn('base-class', isActive && 'active-class');
```

---

## Best Practices

### Svelte 5 Runes

All components use Svelte 5 runes syntax:

```svelte
<script lang="ts">
  // Props with $props()
  let { value, size = 200 }: Props = $props();

  // Derived values with $derived()
  const radius = $derived((size - strokeWidth) / 2);

  // Reactive state with $state()
  let isHovered = $state(false);
</script>
```

### Responsive Design

Use Tailwind responsive prefixes:

```svelte
<div class="text-sm sm:text-base md:text-lg">
  Responsive text
</div>

<ProgressRing
  size={220}
  class="sm:hidden"
/>
<ProgressRing
  size={300}
  class="hidden sm:block"
/>
```

### Accessibility

- Use semantic HTML elements
- Include `aria-*` attributes where needed
- Ensure sufficient color contrast
- Support keyboard navigation
- Respect `prefers-reduced-motion`
