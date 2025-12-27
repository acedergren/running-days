<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		ArrowLeft,
		Settings,
		Target,
		Calendar,
		Save,
		Plus,
		CheckCircle,
		AlertCircle,
		Loader2
	} from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let savingCurrentYear = $state(false);
	let savingNextYear = $state(false);

	// Default values for forms
	let currentYearTarget = $state(data.currentGoal?.targetDays ?? 300);
	let nextYearTarget = $state(data.nextYearGoal?.targetDays ?? 300);
</script>

<svelte:head>
	<title>Settings - Running Days</title>
</svelte:head>

<main class="relative z-10 min-h-screen pb-12">
	<!-- Header -->
	<header
		class="sticky top-0 z-20 backdrop-blur-xl bg-[var(--surface-ground)]/80 border-b border-[var(--border-subtle)]"
	>
		<div class="mx-auto max-w-lg px-4 py-4 flex items-center gap-4">
			<a
				href="/"
				class="flex items-center justify-center size-10 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-colors"
			>
				<ArrowLeft class="size-5" />
			</a>
			<div>
				<h1 class="font-display text-xl font-bold text-[var(--text-primary)]">Settings</h1>
				<p class="text-sm text-[var(--text-muted)]">Manage your running goals</p>
			</div>
		</div>
	</header>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div class="px-4 pt-6">
			<div class="mx-auto max-w-lg">
				<div
					class="p-4 rounded-lg bg-[oklch(0.45_0.15_145)]/20 border border-[oklch(0.6_0.15_145)]/30 flex items-start gap-3"
				>
					<CheckCircle class="size-5 text-[oklch(0.7_0.15_145)] flex-shrink-0 mt-0.5" />
					<p class="text-sm text-[oklch(0.8_0.12_145)]">{form.message}</p>
				</div>
			</div>
		</div>
	{/if}

	{#if form?.error}
		<div class="px-4 pt-6">
			<div class="mx-auto max-w-lg">
				<div
					class="p-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 flex items-start gap-3"
				>
					<AlertCircle class="size-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
					<p class="text-sm text-[var(--color-error)]">{form.error}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Current Year Goal -->
	<section class="px-4 pt-8 pb-6">
		<div class="mx-auto max-w-lg">
			<div class="flex items-center gap-2 mb-4">
				<Calendar class="size-5 text-[var(--accent-primary)]" />
				<h2 class="font-display text-lg font-semibold text-[var(--text-primary)]">
					{data.currentYear} Goal
				</h2>
			</div>

			{#if data.currentGoal}
				<form
					method="POST"
					action="?/updateGoal"
					use:enhance={() => {
						savingCurrentYear = true;
						return async ({ update }) => {
							savingCurrentYear = false;
							await update();
						};
					}}
					class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6"
				>
					<input type="hidden" name="year" value={data.currentYear} />

					<div class="space-y-4">
						<div>
							<label
								for="currentYearTarget"
								class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
							>
								Target Running Days
							</label>
							<div class="relative">
								<Target
									class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[var(--text-muted)]"
								/>
								<input
									type="number"
									id="currentYearTarget"
									name="targetDays"
									min="1"
									max="366"
									bind:value={currentYearTarget}
									class="w-full h-11 pl-11 pr-4 rounded-lg bg-[var(--surface-overlay)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all"
								/>
							</div>
							<p class="mt-2 text-xs text-[var(--text-muted)]">
								Currently set to {data.currentGoal.targetDays} days
							</p>
						</div>

						<Button type="submit" class="w-full h-11" disabled={savingCurrentYear}>
							{#if savingCurrentYear}
								<Loader2 class="size-4 animate-spin" />
								Saving...
							{:else}
								<Save class="size-4" />
								Save Changes
							{/if}
						</Button>
					</div>
				</form>
			{:else}
				<form
					method="POST"
					action="?/createGoal"
					use:enhance={() => {
						savingCurrentYear = true;
						return async ({ update }) => {
							savingCurrentYear = false;
							await update();
						};
					}}
					class="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-raised)]/50 p-6"
				>
					<input type="hidden" name="year" value={data.currentYear} />

					<div class="text-center mb-6">
						<div
							class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--surface-overlay)]"
						>
							<Target class="size-6 text-[var(--text-muted)]" />
						</div>
						<p class="font-medium text-[var(--text-secondary)]">No goal set for {data.currentYear}</p>
						<p class="mt-1 text-sm text-[var(--text-muted)]">Set a target to start tracking</p>
					</div>

					<div class="space-y-4">
						<div>
							<label
								for="newCurrentYearTarget"
								class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
							>
								Target Running Days
							</label>
							<input
								type="number"
								id="newCurrentYearTarget"
								name="targetDays"
								min="1"
								max="366"
								value="300"
								class="w-full h-11 px-4 rounded-lg bg-[var(--surface-overlay)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all"
							/>
						</div>

						<Button type="submit" class="w-full h-11" disabled={savingCurrentYear}>
							{#if savingCurrentYear}
								<Loader2 class="size-4 animate-spin" />
								Creating...
							{:else}
								<Plus class="size-4" />
								Create Goal
							{/if}
						</Button>
					</div>
				</form>
			{/if}
		</div>
	</section>

	<div class="divider-glow mx-auto max-w-lg"></div>

	<!-- Next Year Goal -->
	<section class="px-4 py-6">
		<div class="mx-auto max-w-lg">
			<div class="flex items-center gap-2 mb-4">
				<Calendar class="size-5 text-[oklch(0.75_0.15_200)]" />
				<h2 class="font-display text-lg font-semibold text-[var(--text-primary)]">
					{data.nextYear} Goal
				</h2>
				<span
					class="ml-auto text-xs px-2 py-0.5 rounded-full bg-[oklch(0.75_0.15_200)]/20 text-[oklch(0.8_0.12_200)]"
				>
					Plan Ahead
				</span>
			</div>

			{#if data.nextYearGoal}
				<form
					method="POST"
					action="?/updateGoal"
					use:enhance={() => {
						savingNextYear = true;
						return async ({ update }) => {
							savingNextYear = false;
							await update();
						};
					}}
					class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6"
				>
					<input type="hidden" name="year" value={data.nextYear} />

					<div class="space-y-4">
						<div>
							<label
								for="nextYearTarget"
								class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
							>
								Target Running Days
							</label>
							<div class="relative">
								<Target
									class="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-[var(--text-muted)]"
								/>
								<input
									type="number"
									id="nextYearTarget"
									name="targetDays"
									min="1"
									max="366"
									bind:value={nextYearTarget}
									class="w-full h-11 pl-11 pr-4 rounded-lg bg-[var(--surface-overlay)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all"
								/>
							</div>
							<p class="mt-2 text-xs text-[var(--text-muted)]">
								Currently set to {data.nextYearGoal.targetDays} days
							</p>
						</div>

						<Button type="submit" variant="secondary" class="w-full h-11" disabled={savingNextYear}>
							{#if savingNextYear}
								<Loader2 class="size-4 animate-spin" />
								Saving...
							{:else}
								<Save class="size-4" />
								Save Changes
							{/if}
						</Button>
					</div>
				</form>
			{:else}
				<form
					method="POST"
					action="?/createGoal"
					use:enhance={() => {
						savingNextYear = true;
						return async ({ update }) => {
							savingNextYear = false;
							await update();
						};
					}}
					class="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-raised)]/50 p-6"
				>
					<input type="hidden" name="year" value={data.nextYear} />

					<div class="text-center mb-6">
						<div
							class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--surface-overlay)]"
						>
							<Plus class="size-6 text-[var(--text-muted)]" />
						</div>
						<p class="font-medium text-[var(--text-secondary)]">Plan for {data.nextYear}</p>
						<p class="mt-1 text-sm text-[var(--text-muted)]">Get a head start on next year</p>
					</div>

					<div class="space-y-4">
						<div>
							<label
								for="newNextYearTarget"
								class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
							>
								Target Running Days
							</label>
							<input
								type="number"
								id="newNextYearTarget"
								name="targetDays"
								min="1"
								max="366"
								value="300"
								class="w-full h-11 px-4 rounded-lg bg-[var(--surface-overlay)] border border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition-all"
							/>
						</div>

						<Button type="submit" variant="secondary" class="w-full h-11" disabled={savingNextYear}>
							{#if savingNextYear}
								<Loader2 class="size-4 animate-spin" />
								Creating...
							{:else}
								<Plus class="size-4" />
								Create {data.nextYear} Goal
							{/if}
						</Button>
					</div>
				</form>
			{/if}
		</div>
	</section>

	<!-- Account Section -->
	<section class="px-4 py-6">
		<div class="mx-auto max-w-lg">
			<div class="flex items-center gap-2 mb-4">
				<Settings class="size-5 text-[var(--text-muted)]" />
				<h2 class="font-display text-lg font-semibold text-[var(--text-primary)]">Account</h2>
			</div>

			<div class="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
				<form action="/auth/logout" method="POST">
					<button
						type="submit"
						class="w-full text-left px-4 py-3 rounded-lg hover:bg-[var(--surface-overlay)] text-[var(--color-error)] transition-colors"
					>
						Sign out
					</button>
				</form>
			</div>
		</div>
	</section>
</main>
