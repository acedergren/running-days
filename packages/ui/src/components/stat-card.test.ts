import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import StatCard from './stat-card.svelte';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(StatCard, { label: 'Days Completed', value: 150 });

    expect(screen.getByText('Days Completed')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(StatCard, { label: 'Status', value: 'On Track' });

    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('On Track')).toBeInTheDocument();
  });

  it('renders with unit', () => {
    render(StatCard, { label: 'Distance', value: 42, unit: 'km' });

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('km')).toBeInTheDocument();
  });

  it('renders positive trend indicator', () => {
    render(StatCard, {
      label: 'Progress',
      value: 100,
      trend: { value: 15, isPositive: true }
    });

    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('renders negative trend indicator', () => {
    render(StatCard, {
      label: 'Progress',
      value: 100,
      trend: { value: 10, isPositive: false }
    });

    expect(screen.getByText('10%')).toBeInTheDocument();
  });

  it('applies accent styling when accent is true', () => {
    const { container } = render(StatCard, {
      label: 'Featured',
      value: 200,
      accent: true
    });

    const card = container.querySelector('.stat-card');
    expect(card).toHaveClass('border-[oklch(0.72_0.2_25_/_0.3)]');
  });

  it('does not apply accent styling by default', () => {
    const { container } = render(StatCard, {
      label: 'Normal',
      value: 100
    });

    const card = container.querySelector('.stat-card');
    expect(card).not.toHaveClass('border-[oklch(0.72_0.2_25_/_0.3)]');
  });

  it('applies custom className', () => {
    const { container } = render(StatCard, {
      label: 'Custom',
      value: 50,
      class: 'my-custom-class'
    });

    const card = container.querySelector('.stat-card');
    expect(card).toHaveClass('my-custom-class');
  });

  it('does not render trend when not provided', () => {
    render(StatCard, { label: 'Simple', value: 100 });

    expect(screen.queryByText('vs last week')).not.toBeInTheDocument();
  });

  it('does not render unit when not provided', () => {
    const { container } = render(StatCard, { label: 'No Unit', value: 100 });

    const unitElement = container.querySelector('.stat-unit');
    expect(unitElement).not.toBeInTheDocument();
  });
});
