<script lang="ts">
	import ProgressRing from '$lib/components/ui/progress-ring.svelte';
	import StatCard from '$lib/components/ui/stat-card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import {
		Activity,
		Calendar,
		Heart,
		Zap,
		MapPin,
		Clock,
		TrendingUp,
		ChevronRight,
		Smartphone,
		Check,
		ArrowRight
	} from 'lucide-svelte';

	// Demo data for the interactive preview
	const demoProgress = 82;
	const demoDays = 247;
	const demoTarget = 300;

	// Animate stats on scroll
	let statsVisible = $state(false);
</script>

<svelte:head>
	<title>Running Days - Track Running Days, Not Streaks</title>
	<meta name="description" content="A simpler way to build lasting running habits. Track your yearly running goal without the pressure of maintaining streaks." />
</svelte:head>

<main class="relative z-10">
	<!-- Hero Section -->
	<section class="relative px-4 pt-16 pb-20 overflow-hidden">
		<!-- Extra glow behind hero -->
		<div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,oklch(0.72_0.2_25_/_0.15)_0%,transparent_70%)] pointer-events-none"></div>

		<div class="mx-auto max-w-4xl text-center relative">
			<!-- Badge -->
			<div class="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 backdrop-blur-sm px-4 py-1.5 mb-8 animate-in delay-1">
				<Activity class="size-4 text-[var(--accent-primary)]" />
				<span class="text-sm font-medium text-[var(--text-secondary)]">Simple goal tracking for runners</span>
			</div>

			<!-- Main Headline -->
			<h1 class="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--text-primary)] mb-6 animate-in delay-2">
				Track Running Days,
				<span class="bg-gradient-to-r from-[oklch(0.78_0.22_35)] via-[oklch(0.72_0.24_25)] to-[oklch(0.65_0.20_15)] bg-clip-text text-transparent"> Not Streaks</span>
			</h1>

			<!-- Subheadline -->
			<p class="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 animate-in delay-3">
				A simpler way to build lasting running habits. Set a yearly goal, sync with Apple Health, and watch your progress grow—without the pressure of maintaining streaks.
			</p>

			<!-- CTA Buttons -->
			<div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-in delay-4">
				<a href="https://app.running-days.com" class="w-full sm:w-auto">
					<Button class="w-full sm:w-auto px-8 py-3 text-base">
						Get Started Free
						<ArrowRight class="size-4 ml-2" />
					</Button>
				</a>
				<a href="/dashboard" class="w-full sm:w-auto">
					<Button variant="outline" class="w-full sm:w-auto px-8 py-3 text-base">
						View Demo
					</Button>
				</a>
			</div>

			<!-- Interactive Progress Ring Preview -->
			<div class="relative animate-in delay-5">
				<div class="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.72_0.2_25_/_0.2)_0%,transparent_60%)] blur-3xl"></div>
				<div class="relative inline-block">
					<ProgressRing
						value={demoProgress}
						size={260}
						strokeWidth={16}
						label={String(demoDays)}
						sublabel={`of ${demoTarget} days`}
					/>
				</div>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="px-4 py-20 bg-gradient-to-b from-transparent via-[var(--surface-base)]/50 to-transparent">
		<div class="mx-auto max-w-5xl">
			<div class="text-center mb-12">
				<h2 class="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-4">
					Why Running Days?
				</h2>
				<p class="text-[var(--text-secondary)] max-w-xl mx-auto">
					Streak-based goals create anxiety and guilt. We built something better.
				</p>
			</div>

			<div class="grid md:grid-cols-3 gap-6">
				<!-- Feature 1 -->
				<div class="glass-card p-6 group hover:-translate-y-1 transition-transform duration-300">
					<div class="size-12 rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.2_25_/_0.2)] to-[oklch(0.65_0.18_15_/_0.1)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
						<Heart class="size-6 text-[var(--accent-primary)]" />
					</div>
					<h3 class="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">
						No Streak Pressure
					</h3>
					<p class="text-sm text-[var(--text-muted)]">
						Miss a day? No problem. Your progress is about consistency over the year, not maintaining a fragile streak.
					</p>
				</div>

				<!-- Feature 2 -->
				<div class="glass-card p-6 group hover:-translate-y-1 transition-transform duration-300">
					<div class="size-12 rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.18_145_/_0.2)] to-[oklch(0.55_0.14_145_/_0.1)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
						<Calendar class="size-6 text-[oklch(0.72_0.18_145)]" />
					</div>
					<h3 class="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">
						65 Rest Days Built In
					</h3>
					<p class="text-sm text-[var(--text-muted)]">
						With a 300-day goal, you have 65 rest days per year. Take breaks guilt-free—they're part of the plan.
					</p>
				</div>

				<!-- Feature 3 -->
				<div class="glass-card p-6 group hover:-translate-y-1 transition-transform duration-300">
					<div class="size-12 rounded-2xl bg-gradient-to-br from-[oklch(0.70_0.15_280_/_0.2)] to-[oklch(0.50_0.12_280_/_0.1)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
						<Smartphone class="size-6 text-[oklch(0.70_0.15_280)]" />
					</div>
					<h3 class="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">
						Apple Health Sync
					</h3>
					<p class="text-sm text-[var(--text-muted)]">
						Automatic sync via Health Auto Export. Just run—we'll count the days for you.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- App Preview Section -->
	<section class="px-4 py-20">
		<div class="mx-auto max-w-5xl">
			<div class="grid lg:grid-cols-2 gap-12 items-center">
				<div>
					<h2 class="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-6">
						See your progress at a glance
					</h2>
					<p class="text-[var(--text-secondary)] mb-8">
						A beautiful dashboard that shows exactly where you stand. No clutter, no distractions—just the numbers that matter.
					</p>

					<div class="space-y-4">
						<div class="flex items-start gap-3">
							<div class="size-6 rounded-full bg-[oklch(0.72_0.18_145_/_0.2)] flex items-center justify-center flex-shrink-0 mt-0.5">
								<Check class="size-4 text-[oklch(0.72_0.18_145)]" />
							</div>
							<div>
								<p class="font-medium text-[var(--text-primary)]">Days ahead or behind pace</p>
								<p class="text-sm text-[var(--text-muted)]">Know exactly where you stand vs. your goal</p>
							</div>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-6 rounded-full bg-[oklch(0.72_0.18_145_/_0.2)] flex items-center justify-center flex-shrink-0 mt-0.5">
								<Check class="size-4 text-[oklch(0.72_0.18_145)]" />
							</div>
							<div>
								<p class="font-medium text-[var(--text-primary)]">Year-to-date statistics</p>
								<p class="text-sm text-[var(--text-muted)]">Distance, time, pace—all in one place</p>
							</div>
						</div>
						<div class="flex items-start gap-3">
							<div class="size-6 rounded-full bg-[oklch(0.72_0.18_145_/_0.2)] flex items-center justify-center flex-shrink-0 mt-0.5">
								<Check class="size-4 text-[oklch(0.72_0.18_145)]" />
							</div>
							<div>
								<p class="font-medium text-[var(--text-primary)]">Recent activity feed</p>
								<p class="text-sm text-[var(--text-muted)]">Your latest runs with key metrics</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Interactive Demo Preview -->
				<div class="relative">
					<div class="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.72_0.2_25_/_0.1)_0%,transparent_70%)] blur-2xl"></div>
					<div class="relative rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 backdrop-blur-sm p-6 shadow-2xl">
						<!-- Mini Dashboard Preview -->
						<div class="text-center mb-6">
							<div class="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-3 py-1 mb-4">
								<Calendar class="size-3 text-[var(--accent-primary)]" />
								<span class="text-xs text-[var(--text-secondary)]">2025 Goal</span>
								<span class="text-xs font-bold text-[var(--text-primary)]">300 days</span>
							</div>
							<ProgressRing
								value={demoProgress}
								size={180}
								strokeWidth={12}
								label={String(demoDays)}
								sublabel={`of ${demoTarget} days`}
							/>
							<div class="mt-4 inline-flex items-center gap-2 rounded-full bg-[oklch(0.72_0.18_145_/_0.15)] text-[oklch(0.72_0.18_145)] px-3 py-1.5 text-sm font-medium">
								<TrendingUp class="size-4" />
								<span>12 days ahead</span>
							</div>
						</div>

						<!-- Mini Stats Grid -->
						<div class="grid grid-cols-2 gap-3">
							<div class="rounded-xl bg-[var(--surface-overlay)] p-3">
								<div class="flex items-center gap-2 mb-1">
									<MapPin class="size-3 text-[var(--text-muted)]" />
									<span class="text-xs text-[var(--text-muted)]">Distance</span>
								</div>
								<div class="flex items-baseline gap-1">
									<span class="font-display text-xl font-bold text-[var(--text-primary)]">1,847</span>
									<span class="text-xs text-[var(--text-muted)]">km</span>
								</div>
							</div>
							<div class="rounded-xl bg-[var(--surface-overlay)] p-3">
								<div class="flex items-center gap-2 mb-1">
									<Clock class="size-3 text-[var(--text-muted)]" />
									<span class="text-xs text-[var(--text-muted)]">Time</span>
								</div>
								<div class="flex items-baseline gap-1">
									<span class="font-display text-xl font-bold text-[var(--text-primary)]">186</span>
									<span class="text-xs text-[var(--text-muted)]">hrs</span>
								</div>
							</div>
							<div class="rounded-xl bg-[var(--surface-overlay)] p-3">
								<div class="flex items-center gap-2 mb-1">
									<Zap class="size-3 text-[var(--text-muted)]" />
									<span class="text-xs text-[var(--text-muted)]">Avg Pace</span>
								</div>
								<div class="flex items-baseline gap-1">
									<span class="font-display text-xl font-bold text-[var(--text-primary)]">5:42</span>
									<span class="text-xs text-[var(--text-muted)]">/km</span>
								</div>
							</div>
							<div class="rounded-xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-primary)]/5 p-3 border border-[var(--accent-primary)]/20">
								<div class="flex items-center gap-2 mb-1">
									<Calendar class="size-3 text-[var(--accent-primary)]" />
									<span class="text-xs text-[var(--accent-primary)]">Days Left</span>
								</div>
								<div class="flex items-baseline gap-1">
									<span class="font-display text-xl font-bold text-[var(--accent-primary)]">53</span>
									<span class="text-xs text-[var(--accent-primary)]">to go</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- How It Works Section -->
	<section class="px-4 py-20 bg-gradient-to-b from-transparent via-[var(--surface-base)]/30 to-transparent">
		<div class="mx-auto max-w-4xl">
			<div class="text-center mb-12">
				<h2 class="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-4">
					How It Works
				</h2>
				<p class="text-[var(--text-secondary)]">
					Three simple steps to start tracking your running year.
				</p>
			</div>

			<div class="grid md:grid-cols-3 gap-8">
				<!-- Step 1 -->
				<div class="text-center">
					<div class="size-16 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[oklch(0.65_0.18_15)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--accent-primary)]/20">
						<span class="font-display text-2xl font-bold text-white">1</span>
					</div>
					<h3 class="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">
						Set Your Goal
					</h3>
					<p class="text-sm text-[var(--text-muted)]">
						Choose how many days you want to run this year. We recommend 300—ambitious but achievable.
					</p>
				</div>

				<!-- Step 2 -->
				<div class="text-center">
					<div class="size-16 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[oklch(0.65_0.18_15)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--accent-primary)]/20">
						<span class="font-display text-2xl font-bold text-white">2</span>
					</div>
					<h3 class="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">
						Connect Health
					</h3>
					<p class="text-sm text-[var(--text-muted)]">
						Use Health Auto Export to automatically sync your Apple Health running data.
					</p>
				</div>

				<!-- Step 3 -->
				<div class="text-center">
					<div class="size-16 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[oklch(0.65_0.18_15)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--accent-primary)]/20">
						<span class="font-display text-2xl font-bold text-white">3</span>
					</div>
					<h3 class="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">
						Run & Track
					</h3>
					<p class="text-sm text-[var(--text-muted)]">
						Just run! Your progress updates automatically. Check in anytime to see how you're doing.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Final CTA Section -->
	<section class="px-4 py-20">
		<div class="mx-auto max-w-2xl text-center">
			<h2 class="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-4">
				Ready to run more, stress less?
			</h2>
			<p class="text-[var(--text-secondary)] mb-8">
				Join runners who've discovered a better way to build lasting habits.
			</p>
			<a href="https://app.running-days.com">
				<Button class="px-10 py-4 text-lg">
					Start Tracking Free
					<ArrowRight class="size-5 ml-2" />
				</Button>
			</a>
		</div>
	</section>

	<!-- Footer -->
	<footer class="px-4 py-12 border-t border-[var(--border-subtle)]">
		<div class="mx-auto max-w-4xl">
			<div class="flex flex-col sm:flex-row items-center justify-between gap-6">
				<div class="flex items-center gap-2">
					<Activity class="size-5 text-[var(--accent-primary)]" />
					<span class="font-display font-bold text-[var(--text-primary)]">Running Days</span>
				</div>
				<p class="text-sm text-[var(--text-muted)] text-center">
					Made for runners who want to run more, not stress more.
				</p>
				<div class="flex items-center gap-6">
					<a href="https://github.com/acedergren/running-days" class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
						GitHub
					</a>
					<a href="/dashboard" class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
						Demo
					</a>
				</div>
			</div>
		</div>
	</footer>
</main>

<style>
	.glass-card {
		background: linear-gradient(135deg, oklch(from var(--surface-raised) l c h / 0.85) 0%, oklch(from var(--surface-raised) l c h / 0.7) 100%);
		backdrop-filter: blur(16px) saturate(1.2);
		border: 1px solid oklch(1 0 0 / 0.08);
		border-radius: 1.25rem;
		box-shadow: 0 4px 24px oklch(0 0 0 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.05);
	}
</style>
