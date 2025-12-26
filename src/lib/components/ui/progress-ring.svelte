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
		animate?: boolean;
	}

	let {
		value,
		size = 200,
		strokeWidth = 14,
		class: className,
		showLabel = true,
		label,
		sublabel,
		animate = true
	}: Props = $props();

	const radius = $derived((size - strokeWidth) / 2);
	const circumference = $derived(2 * Math.PI * radius);
	const progress = $derived(Math.min(Math.max(value, 0), 100));
	const offset = $derived(circumference - (progress / 100) * circumference);
	const center = $derived(size / 2);

	// Generate unique gradient ID for this instance
	const gradientId = $derived(`ring-gradient-${Math.random().toString(36).slice(2, 9)}`);
	const glowId = $derived(`ring-glow-${Math.random().toString(36).slice(2, 9)}`);
</script>

<div class={cn('relative inline-flex items-center justify-center', className)}>
	<!-- Ambient glow layer -->
	<div
		class="absolute inset-0 rounded-full opacity-40 blur-2xl"
		style="background: radial-gradient(circle, oklch(0.72 0.2 25 / 0.5) 0%, transparent 70%);"
	></div>

	<svg
		width={size}
		height={size}
		class="progress-ring relative"
		viewBox={`0 0 ${size} ${size}`}
		style="--circumference: {circumference}; --target-offset: {offset};"
	>
		<defs>
			<!-- Gradient for progress arc -->
			<linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="oklch(0.78 0.22 35)" />
				<stop offset="50%" stop-color="oklch(0.72 0.24 25)" />
				<stop offset="100%" stop-color="oklch(0.65 0.20 15)" />
			</linearGradient>

			<!-- Glow filter -->
			<filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
				<feColorMatrix in="blur" type="matrix" values="
					1 0 0 0 0
					0 0.5 0 0 0
					0 0 0.3 0 0
					0 0 0 1 0
				" result="coloredBlur" />
				<feMerge>
					<feMergeNode in="coloredBlur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>

		<!-- Background track -->
		<circle
			cx={center}
			cy={center}
			r={radius}
			fill="none"
			stroke="oklch(0.2 0.02 25 / 0.4)"
			stroke-width={strokeWidth}
			class="progress-ring-bg"
		/>

		<!-- Subtle inner track highlight -->
		<circle
			cx={center}
			cy={center}
			r={radius - strokeWidth / 2 - 2}
			fill="none"
			stroke="oklch(0.15 0.01 25 / 0.3)"
			stroke-width="1"
		/>

		<!-- Progress arc with glow -->
		<circle
			cx={center}
			cy={center}
			r={radius}
			fill="none"
			stroke="url(#{gradientId})"
			stroke-width={strokeWidth}
			stroke-dasharray={circumference}
			stroke-dashoffset={animate ? circumference : offset}
			filter="url(#{glowId})"
			class="progress-ring-circle"
			style="--circumference: {circumference}; --target-offset: {offset};"
		/>

		<!-- Bright cap at the end of progress -->
		{#if progress > 2}
			<circle
				cx={center + radius * Math.cos((2 * Math.PI * progress / 100) - Math.PI / 2)}
				cy={center + radius * Math.sin((2 * Math.PI * progress / 100) - Math.PI / 2)}
				r={strokeWidth / 2 - 1}
				fill="oklch(0.9 0.15 30)"
				class="opacity-80"
				style="animation: breathe 2s ease-in-out infinite;"
			/>
		{/if}
	</svg>

	{#if showLabel}
		<div class="absolute inset-0 flex flex-col items-center justify-center z-10">
			<span class="hero-number">
				{label ?? Math.round(progress)}
			</span>
			{#if sublabel}
				<span class="mt-1 text-sm font-medium text-[var(--text-muted)]">{sublabel}</span>
			{/if}
		</div>
	{/if}
</div>
