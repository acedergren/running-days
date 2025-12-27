import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import ProgressRing from './progress-ring.svelte';

describe('ProgressRing', () => {
  it('renders with default props', () => {
    const { container } = render(ProgressRing, { value: 50 });

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '200');
    expect(svg).toHaveAttribute('height', '200');
  });

  it('renders with custom size', () => {
    const { container } = render(ProgressRing, { value: 50, size: 150 });

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '150');
    expect(svg).toHaveAttribute('height', '150');
  });

  it('displays label when showLabel is true (default)', () => {
    render(ProgressRing, { value: 75 });

    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(ProgressRing, { value: 75, showLabel: false });

    expect(screen.queryByText('75')).not.toBeInTheDocument();
  });

  it('displays custom label', () => {
    render(ProgressRing, { value: 50, label: '150' });

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.queryByText('50')).not.toBeInTheDocument();
  });

  it('displays sublabel', () => {
    render(ProgressRing, { value: 50, sublabel: 'of 300 days' });

    expect(screen.getByText('of 300 days')).toBeInTheDocument();
  });

  it('clamps value at 0', () => {
    render(ProgressRing, { value: -10 });

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('clamps value at 100', () => {
    render(ProgressRing, { value: 150 });

    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders SVG circles for background and progress', () => {
    const { container } = render(ProgressRing, { value: 50 });

    const circles = container.querySelectorAll('circle');
    // Should have: background track, inner highlight, progress arc, and optional cap
    expect(circles.length).toBeGreaterThanOrEqual(3);
  });

  it('includes gradient definitions in SVG', () => {
    const { container } = render(ProgressRing, { value: 50 });

    const gradients = container.querySelectorAll('linearGradient');
    expect(gradients.length).toBeGreaterThanOrEqual(1);
  });

  it('includes glow filter in SVG', () => {
    const { container } = render(ProgressRing, { value: 50 });

    const filters = container.querySelectorAll('filter');
    expect(filters.length).toBeGreaterThanOrEqual(1);
  });

  it('applies custom className', () => {
    const { container } = render(ProgressRing, {
      value: 50,
      class: 'my-ring-class'
    });

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('my-ring-class');
  });

  it('renders progress cap when value > 2', () => {
    const { container } = render(ProgressRing, { value: 50 });

    // The progress cap is a small circle at the end of the arc
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(4);
  });

  it('does not render progress cap when value <= 2', () => {
    const { container } = render(ProgressRing, { value: 1 });

    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(3);
  });

  it('respects custom strokeWidth', () => {
    const { container } = render(ProgressRing, {
      value: 50,
      strokeWidth: 20
    });

    const progressCircle = container.querySelector('.progress-ring-circle');
    expect(progressCircle).toHaveAttribute('stroke-width', '20');
  });
});
