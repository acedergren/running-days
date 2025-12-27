<script lang="ts">
	import ProgressRing from '$lib/components/ui/progress-ring.svelte';
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
		ArrowRight,
		Flame,
		Target
	} from 'lucide-svelte';

	// App URL for CTAs
	const APP_URL = 'https://app.running-days.com';

	// Demo data for the interactive preview
	const demoProgress = 82;
	const demoDays = 247;
	const demoTarget = 300;

	// Animated counter state
	let displayDays = $state(0);
	let displayDistance = $state(0);
	let displayHours = $state(0);
	let heroVisible = $state(false);

	// Section visibility for scroll animations
	let philosophyVisible = $state(false);
	let dashboardVisible = $state(false);
	let stepsVisible = $state(false);
	let ctaVisible = $state(false);

	// Ripple effect state
	let ripples = $state<Array<{ id: number; x: number; y: number }>>([]);
	let rippleId = 0;

	// Animate numbers on mount
	$effect(() => {
		heroVisible = true;
		const duration = 2000;
		const steps = 60;
		const interval = duration / steps;

		let step = 0;
		const timer = setInterval(() => {
			step++;
			const progress = easeOutExpo(step / steps);
			displayDays = Math.round(demoDays * progress);
			displayDistance = Math.round(1847 * progress);
			displayHours = Math.round(186 * progress);

			if (step >= steps) {
				clearInterval(timer);
				displayDays = demoDays;
				displayDistance = 1847;
				displayHours = 186;
			}
		}, interval);

		return () => clearInterval(timer);
	});

	function easeOutExpo(x: number): number {
		return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
	}

	// Generate running trail particles
	const particles = Array.from({ length: 50 }, (_, i) => ({
		id: i,
		delay: Math.random() * 10,
		duration: 6 + Math.random() * 6,
		x: Math.random() * 100,
		y: Math.random() * 100,
		size: 2 + Math.random() * 4
	}));

	// Generate flowing energy lines for background
	const energyLines = Array.from({ length: 5 }, (_, i) => ({
		id: i,
		delay: i * 2,
		duration: 8 + i * 2
	}));

	// Intersection Observer for scroll animations
	function scrollReveal(node: HTMLElement, callback: (visible: boolean) => void) {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						callback(true);
					}
				});
			},
			{ threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
		);

		observer.observe(node);

		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	// Button ripple effect
	function createRipple(event: MouseEvent) {
		const button = event.currentTarget as HTMLElement;
		const rect = button.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const newRipple = { id: rippleId++, x, y };
		ripples = [...ripples, newRipple];

		setTimeout(() => {
			ripples = ripples.filter((r) => r.id !== newRipple.id);
		}, 600);
	}
</script>

<svelte:head>
	<title>Running Days - Track Running Days, Not Streaks</title>
	<meta name="description" content="A simpler way to build lasting running habits. Track your yearly running goal without the pressure of maintaining streaks." />
	<meta property="og:title" content="Running Days - Track Running Days, Not Streaks" />
	<meta property="og:description" content="A simpler way to build lasting running habits. Track your yearly running goal without the pressure of maintaining streaks." />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://www.running-days.com" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Running Days - Track Running Days, Not Streaks" />
	<meta name="twitter:description" content="A simpler way to build lasting running habits. Track your yearly running goal without the pressure of maintaining streaks." />
</svelte:head>

<main class="relative z-10 overflow-x-hidden">
	<!-- ============================================================
	     IMMERSIVE BACKGROUND - Running Route Energy Flow
	     ============================================================ -->
	<div class="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
		<!-- Animated SVG energy flow lines -->
		<svg class="absolute inset-0 w-full h-full" preserveAspectRatio="none">
			<defs>
				<linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stop-color="oklch(0.72 0.2 25 / 0)" />
					<stop offset="50%" stop-color="oklch(0.72 0.2 25 / 0.4)" />
					<stop offset="100%" stop-color="oklch(0.72 0.2 25 / 0)" />
				</linearGradient>
				<filter id="energyGlow">
					<feGaussianBlur stdDeviation="3" result="blur" />
					<feMerge>
						<feMergeNode in="blur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>

			{#each energyLines as line (line.id)}
				<path
					class="energy-line"
					d="M-100,{150 + line.id * 180} Q400,{100 + line.id * 150} 900,{200 + line.id * 160} T1900,{180 + line.id * 140}"
					fill="none"
					stroke="url(#energyGradient)"
					stroke-width="2"
					filter="url(#energyGlow)"
					style="animation-delay: {line.delay}s; animation-duration: {line.duration}s;"
				/>
			{/each}
		</svg>

		<!-- Gradient mesh orbs -->
		<div class="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[min(800px,150vw)] h-[min(800px,150vw)] bg-[radial-gradient(circle,oklch(0.65_0.25_25_/_0.2)_0%,transparent_60%)] blur-3xl animate-pulse-slow"></div>
		<div class="absolute bottom-[-10%] left-[-10%] w-[min(600px,100vw)] h-[min(600px,100vw)] bg-[radial-gradient(circle,oklch(0.55_0.18_35_/_0.12)_0%,transparent_60%)] blur-3xl animate-drift"></div>
		<div class="absolute top-[40%] right-[-15%] w-[min(500px,80vw)] h-[min(500px,80vw)] bg-[radial-gradient(circle,oklch(0.50_0.15_15_/_0.1)_0%,transparent_60%)] blur-3xl animate-drift-reverse"></div>

		<!-- Animated particles -->
		{#each particles as particle (particle.id)}
			<div
				class="particle absolute rounded-full"
				style="
					left: {particle.x}%;
					top: {particle.y}%;
					width: {particle.size}px;
					height: {particle.size}px;
					animation: float {particle.duration}s ease-in-out {particle.delay}s infinite;
					background: radial-gradient(circle, oklch(0.8 0.2 25) 0%, oklch(0.6 0.15 25 / 0) 70%);
				"
			></div>
		{/each}
	</div>

	<!-- ============================================================
	     HERO SECTION - Immersive, Mobile-First
	     ============================================================ -->
	<section class="relative min-h-[100svh] flex flex-col justify-center overflow-hidden px-4 sm:px-6 py-12 sm:py-16">
		<!-- Horizon Line -->
		<div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-primary)]/30 to-transparent"></div>

		<div class="mx-auto max-w-6xl w-full relative">
			<!-- Top Badge -->
			<div
				class="text-center mb-6 sm:mb-8"
				class:animate-fade-in-up={heroVisible}
				class:opacity-0={!heroVisible}
				style="animation-delay: 0.2s;"
			>
				<div class="inline-flex items-center gap-2 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 backdrop-blur-sm px-4 sm:px-5 py-2">
					<Flame class="size-4 text-[var(--accent-primary)] animate-pulse" />
					<span class="text-xs sm:text-sm font-semibold text-[var(--accent-primary)]">Your Year. Your Pace. Your Way.</span>
				</div>
			</div>

			<!-- Main Hero Grid -->
			<div class="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
				<!-- Left: Copy -->
				<div class="text-center lg:text-left order-2 lg:order-1">
					<!-- Main Headline -->
					<h1
						class="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.9] tracking-tight mb-4 sm:mb-6"
						class:animate-fade-in-up={heroVisible}
						class:opacity-0={!heroVisible}
						style="animation-delay: 0.3s;"
					>
						<span class="block text-[var(--text-primary)]">Track</span>
						<span class="block text-[var(--text-primary)]">Running Days,</span>
						<span class="block hero-gradient-text">Not Streaks.</span>
					</h1>

					<!-- Subheadline -->
					<p
						class="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-8 leading-relaxed"
						class:animate-fade-in-up={heroVisible}
						class:opacity-0={!heroVisible}
						style="animation-delay: 0.5s;"
					>
						Set a yearly goal. Sync with Apple Health. Run on your terms—without the guilt of breaking streaks.
					</p>

					<!-- CTA Buttons -->
					<div
						class="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 sm:gap-4 mb-8 sm:mb-12"
						class:animate-fade-in-up={heroVisible}
						class:opacity-0={!heroVisible}
						style="animation-delay: 0.6s;"
					>
						<a href={APP_URL} class="w-full sm:w-auto">
							<button
								class="glow-button w-full sm:w-auto relative overflow-hidden px-6 sm:px-8 py-3 sm:py-4 text-base font-semibold text-white rounded-lg"
								onclick={createRipple}
							>
								<span class="relative z-10 flex items-center justify-center gap-2">
									Start Free
									<ArrowRight class="size-5" />
								</span>
								{#each ripples as ripple (ripple.id)}
									<span
										class="ripple absolute rounded-full bg-white/30"
										style="left: {ripple.x}px; top: {ripple.y}px;"
									></span>
								{/each}
							</button>
						</a>
						<a href={APP_URL} class="w-full sm:w-auto">
							<Button variant="ghost" class="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base hover:bg-[var(--accent-primary)]/10 transition-all duration-300">
								View Demo
								<ChevronRight class="size-5" />
							</Button>
						</a>
					</div>

					<!-- Live Stats Bar -->
					<div
						class="grid grid-cols-3 gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-center lg:justify-start sm:gap-6 md:gap-10"
						class:animate-fade-in-up={heroVisible}
						class:opacity-0={!heroVisible}
						style="animation-delay: 0.8s;"
					>
						<div class="text-center lg:text-left">
							<div class="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] tabular-nums">
								{displayDistance.toLocaleString()}<span class="text-sm sm:text-lg text-[var(--text-muted)] ml-0.5 sm:ml-1">km</span>
							</div>
							<div class="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--text-muted)] mt-1">Distance</div>
						</div>
						<div class="hidden sm:block w-px h-10 bg-[var(--border-subtle)]"></div>
						<div class="text-center lg:text-left">
							<div class="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] tabular-nums">
								{displayHours}<span class="text-sm sm:text-lg text-[var(--text-muted)] ml-0.5 sm:ml-1">hrs</span>
							</div>
							<div class="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--text-muted)] mt-1">Time</div>
						</div>
						<div class="hidden sm:block w-px h-10 bg-[var(--border-subtle)]"></div>
						<div class="text-center lg:text-left">
							<div class="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--accent-primary)] tabular-nums">
								5:42<span class="text-sm sm:text-lg text-[var(--text-muted)] ml-0.5 sm:ml-1">/km</span>
							</div>
							<div class="text-[10px] sm:text-xs uppercase tracking-wider text-[var(--text-muted)] mt-1">Pace</div>
						</div>
					</div>
				</div>

				<!-- Right: Hero Ring -->
				<div
					class="relative order-1 lg:order-2 flex justify-center"
					class:animate-scale-in={heroVisible}
					class:opacity-0={!heroVisible}
					style="animation-delay: 0.4s;"
				>
					<!-- Massive ambient glow behind ring -->
					<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
						<div class="w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] md:w-[450px] md:h-[450px] bg-[radial-gradient(circle,oklch(0.72_0.25_25_/_0.35)_0%,transparent_60%)] blur-3xl animate-breathe"></div>
					</div>

					<!-- Ring Container -->
					<div class="relative hero-ring-container">
						<!-- Outer decorative ring -->
						<div class="absolute inset-0 flex items-center justify-center">
							<div class="w-[250px] h-[250px] sm:w-[320px] sm:h-[320px] md:w-[380px] md:h-[380px] rounded-full border border-[var(--accent-primary)]/10 animate-spin-slow"></div>
						</div>

						<!-- Secondary decorative ring -->
						<div class="absolute inset-0 flex items-center justify-center">
							<div class="w-[270px] h-[270px] sm:w-[350px] sm:h-[350px] md:w-[420px] md:h-[420px] rounded-full border border-dashed border-[var(--accent-primary)]/5 animate-spin-reverse"></div>
						</div>

						<!-- Progress Ring - Responsive size -->
						<div class="block sm:hidden">
							<ProgressRing
								value={demoProgress}
								size={220}
								strokeWidth={14}
								label={String(displayDays)}
								sublabel={`of ${demoTarget} days`}
								class="relative z-10"
							/>
						</div>
						<div class="hidden sm:block md:hidden">
							<ProgressRing
								value={demoProgress}
								size={260}
								strokeWidth={16}
								label={String(displayDays)}
								sublabel={`of ${demoTarget} days`}
								class="relative z-10"
							/>
						</div>
						<div class="hidden md:block">
							<ProgressRing
								value={demoProgress}
								size={300}
								strokeWidth={18}
								label={String(displayDays)}
								sublabel={`of ${demoTarget} days`}
								class="relative z-10"
							/>
						</div>

						<!-- Status Badge -->
						<div class="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
							<div class="status-badge inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-[oklch(0.72_0.18_145_/_0.2)] border border-[oklch(0.72_0.18_145_/_0.3)] text-[oklch(0.80_0.16_145)] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold shadow-lg backdrop-blur-sm">
								<TrendingUp class="size-3 sm:size-4" />
								<span>12 days ahead</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Scroll Indicator -->
		<div class="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 animate-bounce-slow opacity-50">
			<div class="w-5 h-8 sm:w-6 sm:h-10 rounded-full border-2 border-[var(--text-muted)] flex items-start justify-center p-1 sm:p-1.5">
				<div class="w-1 h-2 sm:w-1.5 sm:h-2.5 rounded-full bg-[var(--text-muted)] animate-scroll-down"></div>
			</div>
		</div>
	</section>

	<!-- ============================================================
	     VALUE PROPOSITION - Scroll-triggered reveal
	     ============================================================ -->
	<section
		class="px-4 sm:px-6 py-16 sm:py-24 relative overflow-hidden"
		use:scrollReveal={(v) => (philosophyVisible = v)}
	>
		<div class="absolute inset-0 bg-gradient-to-b from-[var(--surface-base)]/60 via-transparent to-[var(--surface-base)]/60"></div>

		<div class="mx-auto max-w-5xl relative">
			<!-- Bold Statement -->
			<div
				class="text-center mb-12 sm:mb-20"
				class:animate-fade-in-up={philosophyVisible}
				class:opacity-0={!philosophyVisible}
			>
				<p class="text-xs sm:text-sm uppercase tracking-[0.2em] text-[var(--accent-primary)] font-semibold mb-3 sm:mb-4">The Philosophy</p>
				<h2 class="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] leading-tight max-w-3xl mx-auto">
					Streaks create anxiety.<br />
					<span class="text-[var(--text-muted)]">We built something kinder.</span>
				</h2>
			</div>

			<div class="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
				<!-- Feature 1 -->
				<div
					class="feature-card group relative"
					class:animate-fade-in-up={philosophyVisible}
					class:opacity-0={!philosophyVisible}
					style="animation-delay: 0.1s;"
				>
					<div class="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/10 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
					<div class="absolute inset-0 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 feature-glow"></div>
					<div class="relative p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]/50 backdrop-blur-sm group-hover:border-[var(--accent-primary)]/40 transition-all duration-300">
						<div class="size-12 sm:size-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.2_25)] to-[oklch(0.60_0.18_15)] flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-[var(--accent-primary)]/20 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-[var(--accent-primary)]/40 transition-all duration-300">
							<Heart class="size-6 sm:size-7 text-white" />
						</div>
						<h3 class="font-display text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-2 sm:mb-3">
							Miss a day? No guilt.
						</h3>
						<p class="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
							Your progress is about the year, not yesterday. Take rest days without losing momentum.
						</p>
					</div>
				</div>

				<!-- Feature 2 -->
				<div
					class="feature-card group relative"
					class:animate-fade-in-up={philosophyVisible}
					class:opacity-0={!philosophyVisible}
					style="animation-delay: 0.2s;"
				>
					<div class="absolute inset-0 bg-gradient-to-br from-[oklch(0.72_0.18_145)]/10 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
					<div class="absolute inset-0 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 feature-glow-green"></div>
					<div class="relative p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]/50 backdrop-blur-sm group-hover:border-[oklch(0.72_0.18_145)]/40 transition-all duration-300">
						<div class="size-12 sm:size-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.18_145)] to-[oklch(0.55_0.14_145)] flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-[oklch(0.72_0.18_145)]/20 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-[oklch(0.72_0.18_145)]/40 transition-all duration-300">
							<Target class="size-6 sm:size-7 text-white" />
						</div>
						<h3 class="font-display text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-2 sm:mb-3">
							65 rest days built in.
						</h3>
						<p class="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
							300-day goal means 65 free rest days per year. Recovery is part of the plan.
						</p>
					</div>
				</div>

				<!-- Feature 3 -->
				<div
					class="feature-card group relative sm:col-span-2 md:col-span-1"
					class:animate-fade-in-up={philosophyVisible}
					class:opacity-0={!philosophyVisible}
					style="animation-delay: 0.3s;"
				>
					<div class="absolute inset-0 bg-gradient-to-br from-[oklch(0.70_0.15_280)]/10 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
					<div class="absolute inset-0 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 feature-glow-purple"></div>
					<div class="relative p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]/50 backdrop-blur-sm group-hover:border-[oklch(0.70_0.15_280)]/40 transition-all duration-300">
						<div class="size-12 sm:size-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[oklch(0.70_0.15_280)] to-[oklch(0.50_0.12_280)] flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-[oklch(0.70_0.15_280)]/20 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-[oklch(0.70_0.15_280)]/40 transition-all duration-300">
							<Smartphone class="size-6 sm:size-7 text-white" />
						</div>
						<h3 class="font-display text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-2 sm:mb-3">
							Zero manual logging.
						</h3>
						<p class="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
							Syncs with Apple Health automatically. Just run—we count the days for you.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ============================================================
	     APP PREVIEW - Scroll-triggered with enhanced interactions
	     ============================================================ -->
	<section
		class="px-4 sm:px-6 py-16 sm:py-24 relative"
		use:scrollReveal={(v) => (dashboardVisible = v)}
	>
		<div class="mx-auto max-w-6xl">
			<div class="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
				<div
					class:animate-fade-in-left={dashboardVisible}
					class:opacity-0={!dashboardVisible}
				>
					<p class="text-xs sm:text-sm uppercase tracking-[0.2em] text-[var(--accent-primary)] font-semibold mb-3 sm:mb-4">The Dashboard</p>
					<h2 class="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4 sm:mb-6 leading-tight">
						Everything you need.<br />Nothing you don't.
					</h2>
					<p class="text-base sm:text-lg text-[var(--text-secondary)] mb-8 sm:mb-10 leading-relaxed">
						A clean, focused view of your running year. See where you stand at a glance—no clutter, no noise.
					</p>

					<div class="space-y-4 sm:space-y-5">
						{#each [
							{ title: 'Days ahead or behind pace', desc: 'Know exactly where you stand vs. your goal' },
							{ title: 'Year-to-date statistics', desc: 'Distance, time, pace—all in one place' },
							{ title: 'Recent activity feed', desc: 'Your latest runs with key metrics' }
						] as item, i}
							<div
								class="flex items-start gap-3 sm:gap-4 group check-item"
								class:animate-fade-in-left={dashboardVisible}
								class:opacity-0={!dashboardVisible}
								style="animation-delay: {0.2 + i * 0.1}s;"
							>
								<div class="size-7 sm:size-8 rounded-full bg-[oklch(0.72_0.18_145_/_0.15)] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[oklch(0.72_0.18_145_/_0.3)] group-hover:shadow-lg group-hover:shadow-[oklch(0.72_0.18_145)]/20 transition-all duration-300">
									<Check class="size-3.5 sm:size-4 text-[oklch(0.78_0.16_145)]" />
								</div>
								<div>
									<p class="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">{item.title}</p>
									<p class="text-xs sm:text-sm text-[var(--text-muted)]">{item.desc}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Interactive Demo Preview -->
				<div
					class="relative"
					class:animate-fade-in-right={dashboardVisible}
					class:opacity-0={!dashboardVisible}
					style="animation-delay: 0.3s;"
				>
					<!-- Glow -->
					<div class="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.72_0.2_25_/_0.15)_0%,transparent_60%)] blur-3xl"></div>

					<!-- Phone-like frame with hover glow -->
					<div class="phone-frame relative rounded-[1.75rem] sm:rounded-[2.5rem] border border-[var(--border-subtle)] bg-[var(--surface-raised)]/90 backdrop-blur-xl p-1.5 sm:p-2 shadow-2xl shadow-black/30">
						<!-- Inner screen -->
						<div class="rounded-[1.5rem] sm:rounded-[2rem] bg-[var(--surface-base)] p-4 sm:p-6 overflow-hidden">
							<!-- Header -->
							<div class="flex items-center justify-between mb-4 sm:mb-6">
								<div>
									<p class="text-[10px] sm:text-xs text-[var(--text-muted)]">Welcome back</p>
									<p class="font-display font-bold text-sm sm:text-base text-[var(--text-primary)]">Your Running Year</p>
								</div>
								<div class="flex items-center gap-1.5 sm:gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-2 sm:px-3 py-1 sm:py-1.5">
									<Calendar class="size-2.5 sm:size-3 text-[var(--accent-primary)]" />
									<span class="text-[10px] sm:text-xs font-bold text-[var(--text-primary)]">2025</span>
								</div>
							</div>

							<!-- Mini Ring -->
							<div class="flex justify-center mb-4 sm:mb-6">
								<div class="block sm:hidden">
									<ProgressRing
										value={demoProgress}
										size={110}
										strokeWidth={8}
										label={String(demoDays)}
										sublabel={`of ${demoTarget}`}
									/>
								</div>
								<div class="hidden sm:block">
									<ProgressRing
										value={demoProgress}
										size={140}
										strokeWidth={10}
										label={String(demoDays)}
										sublabel={`of ${demoTarget}`}
									/>
								</div>
							</div>

							<!-- Status -->
							<div class="flex justify-center mb-4 sm:mb-6">
								<div class="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-[oklch(0.72_0.18_145_/_0.15)] text-[oklch(0.78_0.16_145)] px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium">
									<TrendingUp class="size-3 sm:size-4" />
									<span>12 days ahead</span>
								</div>
							</div>

							<!-- Mini Stats Grid -->
							<div class="grid grid-cols-2 gap-2 sm:gap-3">
								{#each [
									{ icon: MapPin, label: 'Distance', value: '1,847', unit: 'km' },
									{ icon: Clock, label: 'Time', value: '186', unit: 'hrs' },
									{ icon: Zap, label: 'Avg Pace', value: '5:42', unit: '/km' },
									{ icon: Calendar, label: 'Days Left', value: '53', unit: 'to go', accent: true }
								] as stat}
									{@const Icon = stat.icon}
									<div class="stat-mini rounded-lg sm:rounded-xl p-2 sm:p-3 {stat.accent ? 'bg-gradient-to-br from-[var(--accent-primary)]/15 to-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20' : 'bg-[var(--surface-overlay)]'} transition-all duration-300 hover:scale-[1.02]">
										<div class="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
											<Icon class="size-2.5 sm:size-3 {stat.accent ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}" />
											<span class="text-[9px] sm:text-xs {stat.accent ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}">{stat.label}</span>
										</div>
										<div class="flex items-baseline gap-0.5 sm:gap-1">
											<span class="font-display text-base sm:text-lg font-bold {stat.accent ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}">{stat.value}</span>
											<span class="text-[9px] sm:text-xs {stat.accent ? 'text-[var(--accent-primary)]/70' : 'text-[var(--text-muted)]'}">{stat.unit}</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ============================================================
	     HOW IT WORKS - Scroll-triggered with connected steps
	     ============================================================ -->
	<section
		class="px-4 sm:px-6 py-16 sm:py-24 relative overflow-hidden"
		use:scrollReveal={(v) => (stepsVisible = v)}
	>
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--surface-base)]/40 to-transparent"></div>

		<div class="mx-auto max-w-4xl relative">
			<div
				class="text-center mb-10 sm:mb-16"
				class:animate-fade-in-up={stepsVisible}
				class:opacity-0={!stepsVisible}
			>
				<p class="text-xs sm:text-sm uppercase tracking-[0.2em] text-[var(--accent-primary)] font-semibold mb-3 sm:mb-4">Getting Started</p>
				<h2 class="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
					Three steps. That's it.
				</h2>
			</div>

			<div class="grid md:grid-cols-3 gap-8 sm:gap-10 md:gap-12">
				{#each [
					{ num: '1', title: 'Set Your Goal', desc: 'Choose your yearly target. We recommend 300—ambitious but achievable with built-in rest.' },
					{ num: '2', title: 'Connect Health', desc: 'Link via Health Auto Export. Your Apple Health running data syncs automatically.' },
					{ num: '3', title: 'Run & Track', desc: 'Just run! Your progress updates in real-time. Check in whenever you want.' }
				] as step, i}
					<div
						class="text-center group step-card"
						class:animate-fade-in-up={stepsVisible}
						class:opacity-0={!stepsVisible}
						style="animation-delay: {0.1 + i * 0.15}s;"
					>
						<!-- Number -->
						<div class="relative inline-flex mb-4 sm:mb-6">
							<div class="step-number size-16 sm:size-20 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[oklch(0.60_0.18_15)] flex items-center justify-center shadow-xl shadow-[var(--accent-primary)]/25 group-hover:shadow-2xl group-hover:shadow-[var(--accent-primary)]/50 transition-all duration-500">
								<span class="font-display text-2xl sm:text-3xl font-bold text-white">{step.num}</span>
							</div>
							<!-- Connector line -->
							{#if i < 2}
								<div class="hidden md:block absolute top-1/2 left-full w-[calc(100%+1.5rem)] sm:w-[calc(100%+2rem)] h-px bg-gradient-to-r from-[var(--accent-primary)]/50 to-transparent -translate-y-1/2"></div>
							{/if}
						</div>
						<h3 class="font-display text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-2 sm:mb-3">{step.title}</h3>
						<p class="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ============================================================
	     FINAL CTA - Scroll-triggered with emphasis
	     ============================================================ -->
	<section
		class="px-4 sm:px-6 py-20 sm:py-32 relative overflow-hidden"
		use:scrollReveal={(v) => (ctaVisible = v)}
	>
		<!-- Background glow -->
		<div class="absolute inset-0 pointer-events-none">
			<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(800px,150vw)] h-[min(400px,80vw)] bg-[radial-gradient(ellipse,oklch(0.65_0.2_25_/_0.25)_0%,transparent_60%)] blur-3xl"></div>
		</div>

		<div
			class="mx-auto max-w-2xl text-center relative"
			class:animate-fade-in-up={ctaVisible}
			class:opacity-0={!ctaVisible}
		>
			<h2 class="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4 sm:mb-6 leading-tight">
				Ready to run more,<br />stress less?
			</h2>
			<p class="text-base sm:text-lg text-[var(--text-secondary)] mb-8 sm:mb-10">
				Join runners who've discovered a kinder way to build lasting habits.
			</p>
			<a href={APP_URL}>
				<button
					class="glow-button-large relative overflow-hidden px-10 sm:px-12 py-4 sm:py-5 text-base sm:text-lg font-semibold text-white rounded-xl"
					onclick={createRipple}
				>
					<span class="relative z-10 flex items-center justify-center gap-2">
						Start Tracking Free
						<ArrowRight class="size-5" />
					</span>
					{#each ripples as ripple (ripple.id)}
						<span
							class="ripple absolute rounded-full bg-white/30"
							style="left: {ripple.x}px; top: {ripple.y}px;"
						></span>
					{/each}
				</button>
			</a>
		</div>
	</section>

	<!-- ============================================================
	     FOOTER
	     ============================================================ -->
	<footer class="px-4 sm:px-6 py-8 sm:py-12 border-t border-[var(--border-subtle)]">
		<div class="mx-auto max-w-4xl">
			<div class="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
				<div class="flex items-center gap-2 sm:gap-3">
					<div class="size-7 sm:size-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[oklch(0.60_0.18_15)] flex items-center justify-center">
						<Activity class="size-3.5 sm:size-4 text-white" />
					</div>
					<span class="font-display font-bold text-sm sm:text-base text-[var(--text-primary)]">Running Days</span>
				</div>
				<p class="text-xs sm:text-sm text-[var(--text-muted)] text-center">
					Made for runners who want to run more, not stress more.
				</p>
				<div class="flex items-center gap-4 sm:gap-6">
					<a href="https://github.com/acedergren/running-days" class="text-xs sm:text-sm text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">
						GitHub
					</a>
					<a href={APP_URL} class="text-xs sm:text-sm text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">
						App
					</a>
				</div>
			</div>
		</div>
	</footer>
</main>

<style>
	/* ================================================================
	   HERO GRADIENT TEXT
	   ================================================================ */
	.hero-gradient-text {
		background: linear-gradient(135deg, oklch(0.82 0.22 40) 0%, oklch(0.72 0.24 25) 50%, oklch(0.62 0.20 10) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	/* ================================================================
	   SCROLL-TRIGGERED ANIMATIONS
	   ================================================================ */
	@keyframes fade-in-up {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fade-in-left {
		from {
			opacity: 0;
			transform: translateX(-40px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@keyframes fade-in-right {
		from {
			opacity: 0;
			transform: translateX(40px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@keyframes scale-in {
		from {
			opacity: 0;
			transform: scale(0.85);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.animate-fade-in-up {
		animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	.animate-fade-in-left {
		animation: fade-in-left 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	.animate-fade-in-right {
		animation: fade-in-right 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	.animate-scale-in {
		animation: scale-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	/* ================================================================
	   ENERGY FLOW LINES (Running Route SVG)
	   ================================================================ */
	@keyframes energy-flow {
		0% {
			stroke-dashoffset: 2000;
			opacity: 0;
		}
		10% {
			opacity: 0.6;
		}
		90% {
			opacity: 0.6;
		}
		100% {
			stroke-dashoffset: 0;
			opacity: 0;
		}
	}

	.energy-line {
		stroke-dasharray: 2000;
		stroke-dashoffset: 2000;
		animation: energy-flow 12s ease-in-out infinite;
	}

	/* ================================================================
	   PARTICLE & ORB ANIMATIONS
	   ================================================================ */
	@keyframes float {
		0%, 100% {
			transform: translateY(0) translateX(0);
			opacity: 0.15;
		}
		25% {
			transform: translateY(-25px) translateX(12px);
			opacity: 0.35;
		}
		50% {
			transform: translateY(-12px) translateX(-8px);
			opacity: 0.2;
		}
		75% {
			transform: translateY(-35px) translateX(8px);
			opacity: 0.3;
		}
	}

	@keyframes pulse-slow {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.6; transform: scale(1.08); }
	}
	.animate-pulse-slow {
		animation: pulse-slow 10s ease-in-out infinite;
	}

	@keyframes drift {
		0%, 100% { transform: translate(0, 0); }
		50% { transform: translate(40px, -30px); }
	}
	@keyframes drift-reverse {
		0%, 100% { transform: translate(0, 0); }
		50% { transform: translate(-30px, 40px); }
	}
	.animate-drift {
		animation: drift 25s ease-in-out infinite;
	}
	.animate-drift-reverse {
		animation: drift-reverse 30s ease-in-out infinite;
	}

	@keyframes breathe-glow {
		0%, 100% { transform: scale(1); opacity: 0.7; }
		50% { transform: scale(1.03); opacity: 1; }
	}
	.animate-breathe {
		animation: breathe-glow 5s ease-in-out infinite;
	}

	@keyframes spin-slow {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	.animate-spin-slow {
		animation: spin-slow 80s linear infinite;
	}

	@keyframes spin-reverse {
		from { transform: rotate(360deg); }
		to { transform: rotate(0deg); }
	}
	.animate-spin-reverse {
		animation: spin-reverse 120s linear infinite;
	}

	/* ================================================================
	   SCROLL INDICATOR
	   ================================================================ */
	@keyframes bounce-slow {
		0%, 100% { transform: translateX(-50%) translateY(0); }
		50% { transform: translateX(-50%) translateY(-10px); }
	}
	.animate-bounce-slow {
		animation: bounce-slow 2.5s ease-in-out infinite;
	}

	@keyframes scroll-down {
		0%, 100% { transform: translateY(0); opacity: 1; }
		50% { transform: translateY(8px); opacity: 0.2; }
	}
	.animate-scroll-down {
		animation: scroll-down 1.8s ease-in-out infinite;
	}

	/* ================================================================
	   BUTTON GLOW & RIPPLE EFFECTS
	   ================================================================ */
	.glow-button {
		background: linear-gradient(135deg, oklch(0.72 0.22 30) 0%, oklch(0.62 0.2 15) 100%);
		box-shadow:
			0 4px 20px oklch(0.72 0.2 25 / 0.35),
			0 0 0 0 oklch(0.72 0.2 25 / 0);
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.glow-button:hover {
		transform: translateY(-2px);
		box-shadow:
			0 8px 30px oklch(0.72 0.2 25 / 0.5),
			0 0 40px oklch(0.72 0.2 25 / 0.2);
	}

	.glow-button:active {
		transform: translateY(0);
	}

	.glow-button-large {
		background: linear-gradient(135deg, oklch(0.72 0.22 30) 0%, oklch(0.62 0.2 15) 100%);
		box-shadow:
			0 6px 30px oklch(0.72 0.2 25 / 0.4),
			0 0 0 0 oklch(0.72 0.2 25 / 0);
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.glow-button-large:hover {
		transform: translateY(-3px) scale(1.02);
		box-shadow:
			0 12px 50px oklch(0.72 0.2 25 / 0.6),
			0 0 60px oklch(0.72 0.2 25 / 0.25);
	}

	@keyframes ripple-expand {
		from {
			width: 0;
			height: 0;
			opacity: 0.5;
		}
		to {
			width: 300px;
			height: 300px;
			opacity: 0;
		}
	}

	.ripple {
		transform: translate(-50%, -50%);
		animation: ripple-expand 0.6s ease-out forwards;
		pointer-events: none;
	}

	/* ================================================================
	   FEATURE CARD GLOW EFFECTS
	   ================================================================ */
	.feature-glow {
		box-shadow: 0 0 40px oklch(0.72 0.2 25 / 0.15);
	}

	.feature-glow-green {
		box-shadow: 0 0 40px oklch(0.72 0.18 145 / 0.15);
	}

	.feature-glow-purple {
		box-shadow: 0 0 40px oklch(0.70 0.15 280 / 0.15);
	}

	.feature-card:hover .feature-glow,
	.feature-card:hover .feature-glow-green,
	.feature-card:hover .feature-glow-purple {
		animation: glow-pulse 2s ease-in-out infinite;
	}

	@keyframes glow-pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	/* ================================================================
	   PHONE FRAME HOVER
	   ================================================================ */
	.phone-frame {
		transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.phone-frame:hover {
		transform: translateY(-8px) scale(1.01);
		box-shadow:
			0 30px 60px oklch(0 0 0 / 0.4),
			0 0 40px oklch(0.72 0.2 25 / 0.1);
	}

	/* ================================================================
	   STEP NUMBER GLOW
	   ================================================================ */
	.step-number {
		transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.step-card:hover .step-number {
		transform: scale(1.1);
		box-shadow:
			0 10px 40px oklch(0.72 0.2 25 / 0.5),
			0 0 30px oklch(0.72 0.2 25 / 0.3);
	}

	/* ================================================================
	   STATUS BADGE GLOW
	   ================================================================ */
	.status-badge {
		transition: all 0.3s ease;
	}

	.hero-ring-container:hover .status-badge {
		box-shadow: 0 0 20px oklch(0.72 0.18 145 / 0.4);
	}

	/* ================================================================
	   MINI STAT HOVER
	   ================================================================ */
	.stat-mini:hover {
		box-shadow: 0 0 15px oklch(0.72 0.2 25 / 0.15);
	}

	/* ================================================================
	   PARTICLE BASE
	   ================================================================ */
	.particle {
		will-change: transform, opacity;
		pointer-events: none;
	}

	/* ================================================================
	   REDUCED MOTION
	   ================================================================ */
	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}

		.energy-line,
		.particle,
		.animate-drift,
		.animate-drift-reverse,
		.animate-spin-slow,
		.animate-spin-reverse,
		.animate-pulse-slow,
		.animate-breathe {
			animation: none !important;
		}
	}
</style>
