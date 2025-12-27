import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import Card from './card.svelte';

describe('Card', () => {
  it('renders with default styling', () => {
    render(Card, { 'data-testid': 'card' });
    const card = screen.getByTestId('card');

    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('rounded-2xl');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('p-6');
  });

  it('applies custom className', () => {
    render(Card, { class: 'custom-class another-class', 'data-testid': 'card' });
    const card = screen.getByTestId('card');

    expect(card).toHaveClass('custom-class');
    expect(card).toHaveClass('another-class');
    expect(card).toHaveClass('rounded-2xl');
  });

  it('passes through additional attributes', () => {
    render(Card, {
      'data-testid': 'card',
      role: 'article',
      'aria-label': 'Card content'
    });

    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('role', 'article');
    expect(card).toHaveAttribute('aria-label', 'Card content');
  });

  it('applies transition classes for hover effects', () => {
    render(Card, { 'data-testid': 'card' });
    const card = screen.getByTestId('card');

    expect(card).toHaveClass('transition-all');
    expect(card).toHaveClass('duration-150');
  });
});
