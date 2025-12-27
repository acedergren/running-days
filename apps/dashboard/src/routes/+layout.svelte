<script lang="ts">
	import '../app.css';
	import type { LayoutData } from './$types';

	let { data, children } = $props();
</script>

<svelte:head>
	<title>Running Days Dashboard</title>
	<meta name="description" content="Track your running days toward your yearly goal" />
</svelte:head>

{@render children()}
