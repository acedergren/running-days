<script lang="ts">
	import ProgressRing from '$lib/components/ui/progress-ring.svelte';
	import StatCard from '$lib/components/ui/stat-card.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import { formatDistance, formatDuration, formatPace, ordinal } from '$lib/utils';
	import { Calendar, Clock, Flame, TrendingUp, Activity } from 'lucide-svelte';

	let { data } = $props();

	const daysInYear = $derived(
		new Date(data.goal.year, 11, 31).getDate() === 31 ? 365 : 366
	);
	const dayOfYear = $derived(
		Math.floor(
			(Date.now() - new Date(data.goal.year, 0, 0).getTime()) / (1000 * 60 * 60 * 24)
		)
	);
	const onTrackDays = $derived(
		Math.round((dayOfYear / daysInYear) * data.goal.targetDays)
	);
	const aheadBehind = $derived(data.progress.daysCompleted - onTrackDays);
</script>

<main class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Header -->
	<header class="mb-8 text-center">
		<h1 class="font-display text-4xl font-bold text-[var(--text-primary)]">
			Running Days
		</h1>
		<p class="mt-2 text-[var(--text-muted)]">
			{data.goal.year} Goal: {data.goal.targetDays} days
		</p>
	</header>

	<!-- Main Progress Ring -->
	<section class="mb-8 flex flex-col items-center">
		<ProgressRing
			value={data.progress.percentComplete}
			size={240}
			strokeWidth={16}
			label={String(data.progress.daysCompleted)}
			sublabel={`of ${data.goal.targetDays} days`}
			class="glow-accent"
		/>

		<div class="mt-6 flex items-center gap-2 text-sm">
			{#if aheadBehind >= 0}
				<span class="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-muted)] px-3 py-1 text-[var(--color-success)]">
					<TrendingUp class="size-4" />
					{aheadBehind} days ahead
				</span>
			{:else}
				<span class="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning-muted)] px-3 py-1 text-[var(--color-warning)]">
					<TrendingUp class="size-4 rotate-180" />
					{Math.abs(aheadBehind)} days behind
				</span>
			{/if}
			<span class="text-[var(--text-muted)]">
				Day {dayOfYear} of {daysInYear}
			</span>
		</div>
	</section>

	<!-- Stats Grid -->
	<section class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
		<StatCard
			label="Total Distance"
			value={formatDistance(data.stats.totalDistanceKm * 1000)}
			unit="km"
		>
			{#snippet icon()}<Activity class="size-5" />{/snippet}
		</StatCard>

		<StatCard
			label="Total Time"
			value={data.stats.totalDurationHours.toFixed(1)}
			unit="hrs"
		>
			{#snippet icon()}<Clock class="size-5" />{/snippet}
		</StatCard>

		<StatCard
			label="Avg Pace"
			value={formatPace((1000 / 60) / (data.stats.avgPaceMinPerKm || 6))}
			unit="/km"
		>
			{#snippet icon()}<Flame class="size-5" />{/snippet}
		</StatCard>

		<StatCard
			label="Days Left"
			value={data.progress.daysRemaining}
			unit="days"
		>
			{#snippet icon()}<Calendar class="size-5" />{/snippet}
		</StatCard>
	</section>

	<!-- Recent Activity -->
	<section>
		<h2 class="mb-4 font-display text-xl font-semibold text-[var(--text-primary)]">
			Recent Runs
		</h2>

		{#if data.recentRuns.length === 0}
			<Card class="text-center py-12">
				<p class="text-[var(--text-muted)]">No runs recorded yet.</p>
				<p class="mt-2 text-sm text-[var(--text-muted)]">
					Connect Health Auto Export to start tracking!
				</p>
			</Card>
		{:else}
			<div class="space-y-3">
				{#each data.recentRuns as run}
					<Card class="flex items-center justify-between py-4">
						<div>
							<p class="font-medium text-[var(--text-primary)]">
								{new Date(run.date).toLocaleDateString('en-US', {
									weekday: 'short',
									month: 'short',
									day: 'numeric'
								})}
							</p>
							<p class="text-sm text-[var(--text-muted)]">
								{formatDistance(run.distanceMeters)} km · {formatDuration(run.durationSeconds)}
							</p>
						</div>
						<div class="text-right">
							<p class="font-mono text-lg text-[var(--accent-primary)]">
								{formatPace(run.distanceMeters / run.durationSeconds)}
							</p>
							<p class="text-xs text-[var(--text-muted)]">min/km</p>
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	</section>
</main>
