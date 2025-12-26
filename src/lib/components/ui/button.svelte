<script lang="ts" module>
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { tv, type VariantProps } from 'tailwind-variants';

	export const buttonVariants = tv({
		base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-ground)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
		variants: {
			variant: {
				default:
					'bg-[var(--gradient-accent)] text-white shadow-md hover:brightness-110 active:scale-[0.98]',
				secondary:
					'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-overlay)]',
				ghost:
					'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5',
				outline:
					'border border-[var(--accent-primary)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10',
				destructive:
					'bg-[var(--color-error)] text-white hover:brightness-110'
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-8 px-3 text-xs',
				lg: 'h-12 px-6 text-base',
				icon: 'h-10 w-10 p-0'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> & {
		variant?: ButtonVariant;
		size?: ButtonSize;
	};
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		type = 'button',
		children,
		...restProps
	}: ButtonProps = $props();
</script>

<button
	bind:this={ref}
	class={cn(buttonVariants({ variant, size }), className)}
	{type}
	{...restProps}
>
	{@render children?.()}
</button>
