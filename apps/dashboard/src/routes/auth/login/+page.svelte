<script lang="ts">
	import { Activity, AlertCircle, Loader2 } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { page } from '$app/stores';

	let loading = $state(false);
	let error = $derived($page.url.searchParams.get('error'));

	function signInWithApple() {
		loading = true;
		// Redirect to server route that handles Apple Sign-In initiation
		window.location.href = '/auth/apple';
	}
</script>

<svelte:head>
	<title>Sign In - Running Days</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center px-4 py-12">
	<!-- Background effects -->
	<div class="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
		<div class="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[min(600px,120vw)] h-[min(600px,120vw)] bg-[radial-gradient(circle,oklch(0.65_0.25_25_/_0.15)_0%,transparent_60%)] blur-3xl"></div>
	</div>

	<div class="relative w-full max-w-md">
		<!-- Logo -->
		<div class="flex flex-col items-center mb-8">
			<div class="size-14 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[oklch(0.60_0.18_15)] flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/25 mb-4">
				<Activity class="size-7 text-white" />
			</div>
			<h1 class="font-display text-2xl font-bold text-[var(--text-primary)]">Running Days</h1>
			<p class="text-[var(--text-muted)] mt-1">Track your running year</p>
		</div>

		<!-- Login Card -->
		<div class="bg-[var(--surface-raised)]/80 backdrop-blur-xl border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8 shadow-xl">
			<h2 class="text-xl font-semibold text-[var(--text-primary)] mb-6 text-center">Sign in to your account</h2>

			{#if error}
				<div class="mb-6 p-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 flex items-start gap-3">
					<AlertCircle class="size-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
					<p class="text-sm text-[var(--color-error)]">
						{error === 'auth_failed' ? 'Authentication failed. Please try again.' : error}
					</p>
				</div>
			{/if}

			<!-- Apple Sign-In Button -->
			<Button
				onclick={signInWithApple}
				class="w-full h-12 bg-white hover:bg-gray-100 text-black border border-gray-300"
				disabled={loading}
			>
				{#if loading}
					<Loader2 class="size-5 animate-spin mr-2" />
					Connecting...
				{:else}
					<!-- Apple Logo SVG -->
					<svg class="size-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
						<path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
					</svg>
					Sign in with Apple
				{/if}
			</Button>

			<p class="mt-6 text-center text-xs text-[var(--text-muted)]">
				Your Apple ID is used securely for authentication only.
				<br />
				We never see your Apple password.
			</p>
		</div>

		<!-- Footer -->
		<p class="mt-8 text-center text-sm text-[var(--text-muted)]">
			Track your running days, not streaks.
		</p>
	</div>
</div>
