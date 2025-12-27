<script lang="ts">
	import ProgressRing from '$lib/components/ui/progress-ring.svelte';
	import StatCard from '$lib/components/ui/stat-card.svelte';
	import { formatDistance, formatDuration, formatPace } from '$lib/utils';
	import { Calendar, MapPin, Clock, Zap, TrendingUp, ChevronRight, LogOut } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Calculate year progress (check if Feb 29 exists to detect leap year)
	const daysInYear = $derived(
		new Date(data.goal.year, 1, 29).getDate() === 29 ? 366 : 365
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
	const yearProgress = $derived(Math.round((dayOfYear / daysInYear) * 100));

	// Motivational message based on progress
	const motivationalMessage = $derived(() => {
		if (aheadBehind >= 10) return "You're crushing it!";
		if (aheadBehind >= 5) return "Ahead of pace, keep going!";
		if (aheadBehind >= 0) return "Right on track!";
		if (aheadBehind >= -5) return "Almost there, you got this!";
		return "Time to lace up!";
	});
</script>

<svelte:head>
	<title>Dashboard - Running Days</title>
</svelte:head>

<main class="relative z-10 min-h-screen">
	<!-- Header with logout -->
	<header class="px-4 pt-6 pb-2">
		<div class="mx-auto max-w-lg flex items-center justify-between">
			<div class="flex items-center gap-2">
				<div class="size-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[oklch(0.60_0.18_15)] flex items-center justify-center">
					<MapPin class="size-4 text-white" />
				</div>
				<span class="font-display font-bold text-[var(--text-primary)]">Running Days</span>
			</div>
			<form action="/auth/logout" method="POST">
				<button type="submit" class="p-2 rounded-lg hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Sign out">
					<LogOut class="size-5" />
				</button>
			</form>
		</div>
	</header>

	<!-- Hero Section - The Big Number -->
	<section class="px-4 pt-6 pb-8">
		<div class="mx-auto max-w-lg text-center">
			<!-- Year badge -->
			<div class="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-1.5 mb-6 animate-in delay-1">
				<Calendar class="size-4 text-[var(--accent-primary)]" />
				<span class="text-sm font-medium text-[var(--text-secondary)]">{data.goal.year} Goal</span>
				<span class="text-sm font-bold text-[var(--text-primary)]">{data.goal.targetDays} days</span>
			</div>

			<!-- Main Progress Ring -->
			<div class="flex justify-center animate-in delay-2">
				<ProgressRing
					value={data.progress.percentComplete}
					size={280}
					strokeWidth={18}
					label={String(data.progress.daysCompleted)}
					sublabel={`of ${data.goal.targetDays} days`}
				/>
			</div>

			<!-- Status Pill -->
			<div class="mt-8 flex flex-col items-center gap-3 animate-in delay-3">
				{#if aheadBehind >= 0}
					<div class="status-pill status-pill-success">
						<TrendingUp class="size-4" />
						<span>{aheadBehind} days ahead of pace</span>
					</div>
				{:else}
					<div class="status-pill status-pill-warning">
						<TrendingUp class="size-4 rotate-180" />
						<span>{Math.abs(aheadBehind)} days behind pace</span>
					</div>
				{/if}

				<p class="text-sm text-[var(--text-muted)]">
					{motivationalMessage()}
				</p>
			</div>
		</div>
	</section>

	<!-- Year Progress Bar -->
	<section class="px-4 pb-8">
		<div class="mx-auto max-w-lg">
			<div class="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
				<span>Jan 1</span>
				<span class="font-medium text-[var(--text-secondary)]">Day {dayOfYear} of {daysInYear}</span>
				<span>Dec 31</span>
			</div>
			<div class="h-2 rounded-full bg-[var(--surface-raised)] overflow-hidden">
				<div
					class="h-full rounded-full bg-gradient-to-r from-[oklch(0.5_0.1_25)] to-[oklch(0.4_0.08_25)] transition-all duration-500"
					style="width: {yearProgress}%"
				></div>
			</div>
		</div>
	</section>

	<div class="divider-glow mx-auto max-w-lg"></div>

	<!-- Stats Grid - Clickable to Insights -->
	<section class="px-4 py-6 animate-in delay-4">
		<div class="mx-auto max-w-lg">
			<div class="flex items-center justify-between mb-4">
				<h2 class="section-header mb-0">Year Stats</h2>
				<a
					href="/insights"
					class="text-xs font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors flex items-center gap-1"
				>
					View insights
					<ChevronRight class="size-3" />
				</a>
			</div>
			<a href="/insights" class="block">
				<div class="grid grid-cols-2 gap-3">
					<StatCard
						label="Distance"
						value={formatDistance(data.stats.totalDistanceKm * 1000)}
						unit="km"
					>
						{#snippet icon()}<MapPin class="size-4" />{/snippet}
					</StatCard>

					<StatCard
						label="Time"
						value={data.stats.totalDurationHours.toFixed(0)}
						unit="hrs"
					>
						{#snippet icon()}<Clock class="size-4" />{/snippet}
					</StatCard>

					<StatCard
						label="Avg Pace"
						value={data.stats.avgPaceMinPerKm ? formatPace((1000 / 60) / data.stats.avgPaceMinPerKm) : '--:--'}
						unit="/km"
					>
						{#snippet icon()}<Zap class="size-4" />{/snippet}
					</StatCard>

					<StatCard
						label="Days Left"
						value={data.progress.daysRemaining}
						unit="to go"
						accent
					>
						{#snippet icon()}<Calendar class="size-4" />{/snippet}
					</StatCard>
				</div>
			</a>
		</div>
	</section>

	<!-- Recent Runs -->
	<section class="px-4 py-6 pb-12 animate-in delay-5">
		<div class="mx-auto max-w-lg">
			<h2 class="section-header">Recent Runs</h2>

			{#if data.recentRuns.length === 0}
				<div class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-8 text-center">
					<div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--surface-overlay)]">
						<MapPin class="size-6 text-[var(--text-muted)]" />
					</div>
					<p class="font-medium text-[var(--text-secondary)]">No runs recorded yet</p>
					<p class="mt-1 text-sm text-[var(--text-muted)]">
						Connect Health Auto Export to start tracking
					</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each data.recentRuns.slice(0, 5) as run, i}
						<div class="activity-card" style="animation-delay: {0.5 + i * 0.05}s">
							<div>
								<p class="font-medium text-[var(--text-primary)]">
									{new Date(run.date).toLocaleDateString('en-US', {
										weekday: 'short',
										month: 'short',
										day: 'numeric'
									})}
								</p>
								<div class="mt-1 flex items-center gap-3 text-sm text-[var(--text-muted)]">
									<span class="flex items-center gap-1">
										<MapPin class="size-3" />
										{formatDistance(run.distanceMeters)} km
									</span>
									<span class="flex items-center gap-1">
										<Clock class="size-3" />
										{formatDuration(run.durationSeconds)}
									</span>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<span class="pace-badge">
									{formatPace(run.distanceMeters / run.durationSeconds)}
								</span>
								<ChevronRight class="size-4 text-[var(--text-muted)]" />
							</div>
						</div>
					{/each}
				</div>

				{#if data.recentRuns.length > 5}
					<button class="mt-4 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]">
						View all {data.recentRuns.length} runs
					</button>
				{/if}
			{/if}
		</div>
	</section>

	<!-- Settings link -->
	<section class="px-4 pb-8">
		<div class="mx-auto max-w-lg">
			<a
				href="/settings"
				class="block rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 hover:bg-[var(--surface-overlay)] transition-colors"
			>
				<div class="flex items-center justify-between">
					<span class="font-medium text-[var(--text-secondary)]">Manage your goal</span>
					<ChevronRight class="size-4 text-[var(--text-muted)]" />
				</div>
			</a>
		</div>
	</section>
</main>
