<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { Activity } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';

	let { children } = $props();

	// Check if we're on the landing page
	const isLandingPage = $derived($page.url.pathname === '/');
</script>

<svelte:head>
	<title>Running Days</title>
	<meta name="description" content="Track your running goal - 300 days per year. A simpler way to build lasting running habits." />
</svelte:head>

<div class="min-h-screen bg-[var(--surface-ground)]">
	<!-- Navigation Header (only on landing page) -->
	{#if isLandingPage}
		<header class="fixed top-0 left-0 right-0 z-50 px-4 py-4">
			<nav class="mx-auto max-w-5xl flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]/80 backdrop-blur-xl px-4 py-2.5">
				<a href="/" class="flex items-center gap-2">
					<Activity class="size-5 text-[var(--accent-primary)]" />
					<span class="font-display font-bold text-[var(--text-primary)]">Running Days</span>
				</a>

				<div class="flex items-center gap-3">
					<a href="/dashboard" class="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hidden sm:block">
						Demo
					</a>
					<a href="https://app.running-days.com">
						<Button size="sm">
							Sign In
						</Button>
					</a>
				</div>
			</nav>
		</header>
		<!-- Spacer for fixed header -->
		<div class="h-20"></div>
	{/if}

	{@render children()}
</div>
