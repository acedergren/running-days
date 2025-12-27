<script lang="ts">
	import { Chart, Svg, Axis, Spline, Area, Highlight, Tooltip } from 'layerchart';
	import { scaleTime, scaleLinear } from 'd3-scale';
	import { formatPace } from '@running-days/utils';

	type ChartDataPoint = {
		date: Date;
		pace: number;
		paceMin: number;
	};

	interface DataPoint {
		date: string;
		pace: number | null; // seconds per km
	}

	interface Props {
		data: DataPoint[];
		class?: string;
	}

	let { data, class: className }: Props = $props();

	// Filter out null pace values and transform for chart
	const chartData = $derived(
		data
			.filter((d) => d.pace !== null && d.pace > 0)
			.map((d) => ({
				date: new Date(d.date),
				pace: d.pace as number,
				// Convert to min/km for display (lower is better)
				paceMin: (d.pace as number) / 60
			}))
	);

	// Calculate domain with padding
	const paceExtent = $derived(() => {
		if (chartData.length === 0) return [4, 8];
		const paces = chartData.map((d) => d.paceMin);
		const min = Math.min(...paces);
		const max = Math.max(...paces);
		const padding = (max - min) * 0.1;
		return [Math.max(3, min - padding), max + padding];
	});
</script>

{#if chartData.length > 1}
	<div class={className}>
		<Chart
			data={chartData}
			x="date"
			xScale={scaleTime()}
			y="paceMin"
			yScale={scaleLinear()}
			yDomain={paceExtent()}
			yNice
			padding={{ left: 48, bottom: 32, right: 16, top: 16 }}
		>
			<Svg>
				<Axis
					placement="left"
					format={(d) => `${Math.floor(d)}:${String(Math.round((d % 1) * 60)).padStart(2, '0')}`}
					grid
					rule
					tickLabelProps={{
						class: 'text-xs fill-[var(--text-muted)]'
					}}
					gridProps={{
						class: 'stroke-[var(--border-subtle)]'
					}}
				/>
				<Axis
					placement="bottom"
					format={(d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
					rule
					tickLabelProps={{
						class: 'text-xs fill-[var(--text-muted)]'
					}}
				/>
				<Area
					line={{ class: 'stroke-2 stroke-[var(--accent-primary)]' }}
					class="fill-[var(--accent-primary)]/10"
				/>
				<Spline class="stroke-2 stroke-[var(--accent-primary)]" />
				<Highlight points lines />
			</Svg>
			<Tooltip.Root header={(d: ChartDataPoint) => d.date.toLocaleDateString()} let:data>
				<Tooltip.Item
					label="Pace"
					value={formatPace(1000 / (data.paceMin * 60))}
					valueAlign="right"
				/>
			</Tooltip.Root>
		</Chart>
	</div>
{:else}
	<div class="flex h-full items-center justify-center text-[var(--text-muted)]">
		<p>Not enough data for trend chart</p>
	</div>
{/if}
