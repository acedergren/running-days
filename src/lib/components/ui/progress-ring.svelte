<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface Props {
		value: number; // 0-100 percentage
		size?: number; // SVG size in pixels
		strokeWidth?: number;
		class?: string;
		showLabel?: boolean;
		label?: string;
		sublabel?: string;
	}

	let {
		value,
		size = 200,
		strokeWidth = 12,
		class: className,
		showLabel = true,
		label,
		sublabel
	}: Props = $props();

	const radius = $derived((size - strokeWidth) / 2);
	const circumference = $derived(2 * Math.PI * radius);
	const progress = $derived(Math.min(Math.max(value, 0), 100));
	const offset = $derived(circumference - (progress / 100) * circumference);
</script>

<div class={cn('relative inline-flex items-center justify-center', className)}>
	<svg
		width={size}
		height={size}
		class="progress-ring"
		viewBox={`0 0 ${size} ${size}`}
	>
		<!-- Background circle -->
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke="var(--border-subtle)"
			stroke-width={strokeWidth}
		/>
		<!-- Progress circle with gradient -->
		<defs>
			<linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="oklch(0.72 0.22 30)" />
				<stop offset="100%" stop-color="oklch(0.65 0.2 15)" />
			</linearGradient>
		</defs>
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke="url(#progress-gradient)"
			stroke-width={strokeWidth}
			stroke-dasharray={circumference}
			stroke-dashoffset={offset}
			class="progress-ring-circle"
		/>
	</svg>

	{#if showLabel}
		<div class="absolute inset-0 flex flex-col items-center justify-center">
			<span class="number-display text-4xl text-[var(--text-primary)]">
				{label ?? Math.round(progress)}
			</span>
			{#if sublabel}
				<span class="text-sm text-[var(--text-muted)]">{sublabel}</span>
			{/if}
		</div>
	{/if}
</div>
