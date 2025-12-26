<script lang="ts">
	import { Chart, Svg, Axis, Bars, Spline, Area, Highlight, Tooltip, Group } from 'layerchart';
	import { scaleBand, scaleLinear, scaleTime } from 'd3-scale';
	import { formatDistance, formatPace, formatDuration } from '$lib/utils';
	import { ArrowLeft, TrendingUp, Flame, Target, Calendar, MapPin, Clock, Zap, Trophy } from 'lucide-svelte';

	let { data } = $props();

	// Chart data types
	type MonthlyDataPoint = { month: string; distance: number; days: number; pace: number | null };
	type WeeklyDataPoint = { week: string; distance: number; days: number };
	type PaceDataPoint = { date: Date; pace: number };

	// Transform monthly data for charts
	const monthlyChartData = $derived(
		data.monthlyData.map((d): MonthlyDataPoint => ({
			month: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
			distance: (d.totalDistance ?? 0) / 1000,
			days: d.runningDays ?? 0,
			pace: d.avgPace ? d.avgPace / 60 : null
		}))
	);

	// Transform weekly data for trend chart
	const weeklyChartData = $derived(
		data.weeklyData.map((d, i): WeeklyDataPoint => ({
			week: `W${i + 1}`,
			distance: (d.totalDistance ?? 0) / 1000,
			days: d.runningDays ?? 0
		}))
	);

	// Pace trend data
	const paceTrendData = $derived(
		data.yearlyData
			.filter((d) => d.pace && d.pace > 0)
			.slice(-30)
			.map((d): PaceDataPoint => ({
				date: new Date(d.date),
				pace: (d.pace as number) / 60
			}))
	);

	// Calculate averages
	const avgDistancePerRun = $derived(
		data.stats.totalDays > 0 ? data.stats.totalDistance / data.stats.totalDays / 1000 : 0
	);
	const avgDurationPerRun = $derived(
		data.stats.totalDays > 0 ? data.stats.totalDuration / data.stats.totalDays : 0
	);
</script>

<main class="relative z-10 min-h-screen pb-12">
	<!-- Header -->
	<header class="sticky top-0 z-20 backdrop-blur-xl bg-[var(--surface-ground)]/80 border-b border-[var(--border-subtle)]">
		<div class="mx-auto max-w-2xl px-4 py-4 flex items-center gap-4">
			<a
				href="/"
				class="flex items-center justify-center size-10 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors"
			>
				<ArrowLeft class="size-5" />
			</a>
			<div>
				<h1 class="font-display text-xl font-bold text-[var(--text-primary)]">Insights</h1>
				<p class="text-sm text-[var(--text-muted)]">Deep dive into your running data</p>
			</div>
		</div>
	</header>

	<!-- Highlight Stats -->
	<section class="px-4 pt-8 pb-6">
		<div class="mx-auto max-w-2xl">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
				<div class="stat-card">
					<div class="flex items-center gap-2 mb-2">
						<Flame class="size-4 text-[var(--accent-primary)]" />
						<span class="stat-label">Current Streak</span>
					</div>
					<div class="flex items-baseline gap-1">
						<span class="stat-value text-[var(--accent-primary)]">{data.stats.currentStreak}</span>
						<span class="stat-unit">days</span>
					</div>
				</div>

				<div class="stat-card">
					<div class="flex items-center gap-2 mb-2">
						<Trophy class="size-4 text-[oklch(0.8_0.18_85)]" />
						<span class="stat-label">Longest Streak</span>
					</div>
					<div class="flex items-baseline gap-1">
						<span class="stat-value">{data.stats.longestStreak}</span>
						<span class="stat-unit">days</span>
					</div>
				</div>

				<div class="stat-card">
					<div class="flex items-center gap-2 mb-2">
						<MapPin class="size-4 text-[oklch(0.75_0.15_200)]" />
						<span class="stat-label">Avg Distance</span>
					</div>
					<div class="flex items-baseline gap-1">
						<span class="stat-value">{avgDistancePerRun.toFixed(1)}</span>
						<span class="stat-unit">km/run</span>
					</div>
				</div>

				<div class="stat-card">
					<div class="flex items-center gap-2 mb-2">
						<Clock class="size-4 text-[oklch(0.75_0.15_280)]" />
						<span class="stat-label">Avg Duration</span>
					</div>
					<div class="flex items-baseline gap-1">
						<span class="stat-value">{Math.round(avgDurationPerRun / 60)}</span>
						<span class="stat-unit">min/run</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<div class="divider-glow mx-auto max-w-2xl"></div>

	<!-- Monthly Distance Chart -->
	<section class="px-4 py-6">
		<div class="mx-auto max-w-2xl">
			<h2 class="section-header flex items-center gap-2">
				<TrendingUp class="size-4" />
				Monthly Distance
			</h2>
			<div class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
				{#if monthlyChartData.length > 0}
					<div class="h-64">
						<Chart
							data={monthlyChartData}
							x="month"
							xScale={scaleBand().padding(0.3)}
							y="distance"
							yScale={scaleLinear()}
							yDomain={[0, null]}
							yNice
							padding={{ left: 48, bottom: 40, right: 16, top: 16 }}
						>
							<Svg>
								<Axis
									placement="left"
									format={(d) => `${d.toFixed(0)}`}
									grid
									rule
									tickLabelProps={{
										class: 'text-xs fill-[var(--text-muted)]'
									}}
									gridProps={{
										class: 'stroke-[var(--border-subtle)]'
									}}
								/>
								<Axis
									placement="bottom"
									rule
									tickLabelProps={{
										class: 'text-xs fill-[var(--text-muted)]'
									}}
								/>
								<Bars
									radius={6}
									fill="url(#bar-gradient)"
									strokeWidth={0}
								/>
								<defs>
									<linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stop-color="oklch(0.75 0.22 30)" />
										<stop offset="100%" stop-color="oklch(0.60 0.18 20)" />
									</linearGradient>
								</defs>
								<Highlight area />
							</Svg>
							<Tooltip.Root header={(d: MonthlyDataPoint) => d.month} let:data>
								<Tooltip.Item
									label="Distance"
									value={`${data.distance.toFixed(1)} km`}
									valueAlign="right"
								/>
								<Tooltip.Item
									label="Running Days"
									value={`${data.days} days`}
									valueAlign="right"
								/>
							</Tooltip.Root>
						</Chart>
					</div>
				{:else}
					<div class="h-64 flex items-center justify-center text-[var(--text-muted)]">
						Not enough data yet
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Running Days by Month -->
	<section class="px-4 py-6">
		<div class="mx-auto max-w-2xl">
			<h2 class="section-header flex items-center gap-2">
				<Calendar class="size-4" />
				Running Days by Month
			</h2>
			<div class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
				{#if monthlyChartData.length > 0}
					<div class="h-64">
						<Chart
							data={monthlyChartData}
							x="month"
							xScale={scaleBand().padding(0.3)}
							y="days"
							yScale={scaleLinear()}
							yDomain={[0, 31]}
							padding={{ left: 48, bottom: 40, right: 16, top: 16 }}
						>
							<Svg>
								<Axis
									placement="left"
									format={(d) => `${d}`}
									grid
									rule
									tickLabelProps={{
										class: 'text-xs fill-[var(--text-muted)]'
									}}
									gridProps={{
										class: 'stroke-[var(--border-subtle)]'
									}}
								/>
								<Axis
									placement="bottom"
									rule
									tickLabelProps={{
										class: 'text-xs fill-[var(--text-muted)]'
									}}
								/>
								<Bars
									radius={6}
									fill="url(#days-gradient)"
									strokeWidth={0}
								/>
								<defs>
									<linearGradient id="days-gradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stop-color="oklch(0.72 0.18 145)" />
										<stop offset="100%" stop-color="oklch(0.55 0.14 145)" />
									</linearGradient>
								</defs>
								<Highlight area />
							</Svg>
							<Tooltip.Root header={(d: MonthlyDataPoint) => d.month} let:data>
								<Tooltip.Item
									label="Running Days"
									value={`${data.days} days`}
									valueAlign="right"
								/>
							</Tooltip.Root>
						</Chart>
					</div>
				{:else}
					<div class="h-64 flex items-center justify-center text-[var(--text-muted)]">
						Not enough data yet
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Pace Trend -->
	<section class="px-4 py-6">
		<div class="mx-auto max-w-2xl">
			<h2 class="section-header flex items-center gap-2">
				<Zap class="size-4" />
				Pace Trend (Last 30 Runs)
			</h2>
			<div class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
				{#if paceTrendData.length > 1}
					<div class="h-64">
						<Chart
							data={paceTrendData}
							x="date"
							xScale={scaleTime()}
							y="pace"
							yScale={scaleLinear()}
							yNice
							padding={{ left: 48, bottom: 40, right: 16, top: 16 }}
						>
							<Svg>
								<Axis
									placement="left"
									format={(d) => `${Math.floor(d)}:${String(Math.round((d % 1) * 60)).padStart(2, '0')}`}
									grid
									rule
									tickLabelProps={{
										class: 'text-xs fill-[var(--text-muted)]'
									}}
									gridProps={{
										class: 'stroke-[var(--border-subtle)]'
									}}
								/>
								<Axis
									placement="bottom"
									format={(d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
									rule
									tickLabelProps={{
										class: 'text-xs fill-[var(--text-muted)]'
									}}
								/>
								<Area
									line={{ class: 'stroke-2 stroke-[var(--accent-primary)]' }}
									class="fill-[var(--accent-primary)]/15"
								/>
								<Spline class="stroke-2 stroke-[var(--accent-primary)]" />
								<Highlight points lines />
							</Svg>
							<Tooltip.Root header={(d: PaceDataPoint) => d.date.toLocaleDateString()} let:data>
								<Tooltip.Item
									label="Pace"
									value={`${Math.floor(data.pace)}:${String(Math.round((data.pace % 1) * 60)).padStart(2, '0')} /km`}
									valueAlign="right"
								/>
							</Tooltip.Root>
						</Chart>
					</div>
				{:else}
					<div class="h-64 flex items-center justify-center text-[var(--text-muted)]">
						Not enough pace data yet
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Weekly Volume -->
	<section class="px-4 py-6">
		<div class="mx-auto max-w-2xl">
			<h2 class="section-header flex items-center gap-2">
				<Target class="size-4" />
				Weekly Volume (Last 12 Weeks)
			</h2>
			<div class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
				{#if weeklyChartData.length > 0}
					<div class="h-64">
						<Chart
							data={weeklyChartData}
							x="week"
							xScale={scaleBand().padding(0.2)}
							y="distance"
							yScale={scaleLinear()}
							yDomain={[0, null]}
							yNice
							padding={{ left: 48, bottom: 40, right: 16, top: 16 }}
						>
							<Svg>
								<Axis
									placement="left"
									format={(d) => `${d.toFixed(0)}`}
									grid
									rule
									tickLabelProps={{
										class: 'text-xs fill-[var(--text-muted)]'
									}}
									gridProps={{
										class: 'stroke-[var(--border-subtle)]'
									}}
								/>
								<Axis
									placement="bottom"
									rule
									tickLabelProps={{
										class: 'text-xs fill-[var(--text-muted)]'
									}}
								/>
								<Bars
									radius={4}
									fill="url(#weekly-gradient)"
									strokeWidth={0}
								/>
								<defs>
									<linearGradient id="weekly-gradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stop-color="oklch(0.70 0.15 280)" />
										<stop offset="100%" stop-color="oklch(0.50 0.12 280)" />
									</linearGradient>
								</defs>
								<Highlight area />
							</Svg>
							<Tooltip.Root header={(d: WeeklyDataPoint) => d.week} let:data>
								<Tooltip.Item
									label="Distance"
									value={`${data.distance.toFixed(1)} km`}
									valueAlign="right"
								/>
								<Tooltip.Item
									label="Days"
									value={`${data.days} runs`}
									valueAlign="right"
								/>
							</Tooltip.Root>
						</Chart>
					</div>
				{:else}
					<div class="h-64 flex items-center justify-center text-[var(--text-muted)]">
						Not enough data yet
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Personal Bests -->
	<section class="px-4 py-6">
		<div class="mx-auto max-w-2xl">
			<h2 class="section-header flex items-center gap-2">
				<Trophy class="size-4" />
				Personal Bests This Year
			</h2>
			<div class="grid grid-cols-2 gap-3">
				<div class="rounded-2xl border border-[oklch(0.8_0.18_85_/_0.3)] bg-gradient-to-br from-[oklch(0.8_0.18_85_/_0.1)] to-transparent p-5">
					<div class="text-sm text-[var(--text-muted)] mb-1">Longest Run</div>
					<div class="flex items-baseline gap-1">
						<span class="font-display text-3xl font-bold text-[oklch(0.85_0.16_85)]">
							{formatDistance(data.stats.bestDistance)}
						</span>
						<span class="text-[var(--text-muted)]">km</span>
					</div>
				</div>

				<div class="rounded-2xl border border-[var(--accent-primary)]/30 bg-gradient-to-br from-[var(--accent-primary)]/10 to-transparent p-5">
					<div class="text-sm text-[var(--text-muted)] mb-1">Fastest Pace</div>
					<div class="flex items-baseline gap-1">
						<span class="font-display text-3xl font-bold text-[var(--accent-primary)]">
							{data.stats.bestPace ? formatPace(1000 / data.stats.bestPace) : '--'}
						</span>
						<span class="text-[var(--text-muted)]">/km</span>
					</div>
				</div>
			</div>
		</div>
	</section>
</main>
