<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Running Days</title>
	<meta name="description" content="Track your running goal - 300 days per year" />
</svelte:head>

<div class="min-h-screen bg-[var(--surface-ground)]">
	{@render children()}
</div>
