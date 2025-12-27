import { render, screen } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import Button from './button.svelte';
import { buttonVariants } from './button.svelte';

describe('Button', () => {
  it('renders with default props', () => {
    render(Button);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  it('renders with submit type', () => {
    render(Button, { type: 'submit' });
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const onclick = vi.fn();

    render(Button, { onclick });

    const button = screen.getByRole('button');
    await user.click(button);

    expect(onclick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is true', async () => {
    const user = userEvent.setup();
    const onclick = vi.fn();

    render(Button, { disabled: true, onclick });

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onclick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(Button, { class: 'my-custom-class' });
    const button = screen.getByRole('button');
    expect(button).toHaveClass('my-custom-class');
  });

  it('passes through additional attributes', () => {
    render(Button, { 'aria-label': 'Custom label', 'data-testid': 'custom-button' });
    const button = screen.getByTestId('custom-button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
  });
});

describe('buttonVariants', () => {
  it('generates default variant classes', () => {
    const classes = buttonVariants({ variant: 'default', size: 'default' });
    expect(classes).toContain('bg-[var(--gradient-accent)]');
    expect(classes).toContain('h-10');
    expect(classes).toContain('px-4');
  });

  it('generates secondary variant classes', () => {
    const classes = buttonVariants({ variant: 'secondary' });
    expect(classes).toContain('bg-[var(--surface-raised)]');
    expect(classes).toContain('border');
  });

  it('generates ghost variant classes', () => {
    const classes = buttonVariants({ variant: 'ghost' });
    expect(classes).toContain('hover:bg-white/5');
  });

  it('generates outline variant classes', () => {
    const classes = buttonVariants({ variant: 'outline' });
    expect(classes).toContain('border-[var(--accent-primary)]');
  });

  it('generates destructive variant classes', () => {
    const classes = buttonVariants({ variant: 'destructive' });
    expect(classes).toContain('bg-[var(--color-error)]');
  });

  it('generates small size classes', () => {
    const classes = buttonVariants({ size: 'sm' });
    expect(classes).toContain('h-8');
    expect(classes).toContain('px-3');
    expect(classes).toContain('text-xs');
  });

  it('generates large size classes', () => {
    const classes = buttonVariants({ size: 'lg' });
    expect(classes).toContain('h-12');
    expect(classes).toContain('px-6');
  });

  it('generates icon size classes', () => {
    const classes = buttonVariants({ size: 'icon' });
    expect(classes).toContain('h-10');
    expect(classes).toContain('w-10');
    expect(classes).toContain('p-0');
  });
});
