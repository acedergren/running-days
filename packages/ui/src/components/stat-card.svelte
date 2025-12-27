<script lang="ts">
	import { cn } from '@running-days/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		value: string | number;
		unit?: string;
		icon?: Snippet;
		trend?: { value: number; isPositive: boolean };
		accent?: boolean;
		class?: string;
	}

	let { label, value, unit, icon, trend, accent = false, class: className }: Props = $props();
</script>

<div class={cn(
	'stat-card group relative',
	accent && 'border-[oklch(0.72_0.2_25_/_0.3)]',
	className
)}>
	<!-- Accent gradient overlay for highlighted cards -->
	{#if accent}
		<div class="absolute inset-0 rounded-xl bg-gradient-to-br from-[oklch(0.72_0.2_25_/_0.1)] to-transparent pointer-events-none"></div>
	{/if}

	<div class="relative z-10">
		<!-- Label row with icon -->
		<div class="flex items-center justify-between mb-3">
			<span class="stat-label">{label}</span>
			{#if icon}
				<div class="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors duration-200">
					{@render icon()}
				</div>
			{/if}
		</div>

		<!-- Value -->
		<div class="flex items-baseline gap-1">
			<span class={cn(
				'stat-value transition-colors duration-200',
				accent && 'text-[var(--accent-primary)]'
			)}>
				{value}
			</span>
			{#if unit}
				<span class="stat-unit">{unit}</span>
			{/if}
		</div>

		<!-- Trend indicator -->
		{#if trend}
			<div class="mt-3 flex items-center gap-2">
				<span class={cn(
					'inline-flex items-center gap-1 text-xs font-semibold',
					trend.isPositive ? 'text-[oklch(0.75_0.18_145)]' : 'text-[oklch(0.75_0.18_25)]'
				)}>
					<svg
						class={cn('size-3', !trend.isPositive && 'rotate-180')}
						viewBox="0 0 12 12"
						fill="none"
					>
						<path
							d="M6 2L10 7H2L6 2Z"
							fill="currentColor"
						/>
					</svg>
					{Math.abs(trend.value)}%
				</span>
				<span class="text-xs text-[var(--text-muted)]">vs last week</span>
			</div>
		{/if}
	</div>
</div>
