<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href="https://www.running-days.com" />
</svelte:head>

{@render children()}
