<script lang="ts">
	import { cn } from '@running-days/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		class: className,
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div
	class={cn(
		'rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 shadow-sm transition-all duration-150',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
