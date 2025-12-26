<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		value: string | number;
		unit?: string;
		icon?: Snippet;
		trend?: { value: number; isPositive: boolean };
		class?: string;
	}

	let { label, value, unit, icon, trend, class: className }: Props = $props();
</script>

<div class={cn('stat-card group', className)}>
	<div class="flex items-start justify-between">
		<span class="text-sm text-[var(--text-muted)]">{label}</span>
		{#if icon}
			<div class="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors">
				{@render icon()}
			</div>
		{/if}
	</div>

	<div class="mt-2 flex items-baseline gap-1">
		<span class="number-display text-3xl text-[var(--text-primary)]">{value}</span>
		{#if unit}
			<span class="text-sm text-[var(--text-muted)]">{unit}</span>
		{/if}
	</div>

	{#if trend}
		<div class="mt-2 flex items-center gap-1 text-xs">
			<span class={trend.isPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}>
				{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
			</span>
			<span class="text-[var(--text-muted)]">vs last week</span>
		</div>
	{/if}
</div>
