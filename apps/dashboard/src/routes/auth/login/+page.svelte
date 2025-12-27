<script lang="ts">
	import { enhance } from '$app/forms';
	import { Activity, Mail, Lock, AlertCircle, Loader2 } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
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

			{#if form?.error}
				<div class="mb-6 p-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 flex items-start gap-3">
					<AlertCircle class="size-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
					<p class="text-sm text-[var(--color-error)]">{form.error}</p>
				</div>
			{/if}

			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						loading = false;
						await update();
					};
				}}
				class="space-y-5"
			>
				<!-- Email -->
				<div>
					<label for="email" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
						Email address
					</label>
					<div class="relative">
						<Mail class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[var(--text-muted)]" />
						<input
							type="email"
							id="email"
							name="email"
							required
							autocomplete="email"
							value={form?.email ?? ''}
							class="w-full h-11 pl-11 pr-4 rounded-lg bg-[var(--surface-overlay)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all"
							placeholder="you@example.com"
						/>
					</div>
				</div>

				<!-- Password -->
				<div>
					<label for="password" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
						Password
					</label>
					<div class="relative">
						<Lock class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[var(--text-muted)]" />
						<input
							type="password"
							id="password"
							name="password"
							required
							autocomplete="current-password"
							class="w-full h-11 pl-11 pr-4 rounded-lg bg-[var(--surface-overlay)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all"
							placeholder="Enter your password"
						/>
					</div>
				</div>

				<!-- Submit -->
				<Button type="submit" class="w-full h-11" disabled={loading}>
					{#if loading}
						<Loader2 class="size-4 animate-spin" />
						Signing in...
					{:else}
						Sign in
					{/if}
				</Button>
			</form>
		</div>

		<!-- Footer -->
		<p class="mt-8 text-center text-sm text-[var(--text-muted)]">
			Track your running days, not streaks.
		</p>
	</div>
</div>
