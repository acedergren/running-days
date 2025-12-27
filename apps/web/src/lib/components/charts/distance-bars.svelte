<script lang="ts">
	import { Chart, Svg, Axis, Bars, Highlight, Tooltip } from 'layerchart';
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { formatDistance } from '@running-days/utils';

	type ChartDataPoint = {
		date: string;
		dateLabel: string;
		distanceKm: number;
	};

	interface DataPoint {
		date: string;
		distance: number; // meters
	}

	interface Props {
		data: DataPoint[];
		class?: string;
	}

	let { data, class: className }: Props = $props();

	// Transform data for chart
	const chartData = $derived(
		data.map((d) => ({
			date: d.date,
			dateLabel: new Date(d.date).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric'
			}),
			distanceKm: d.distance / 1000
		}))
	);
</script>

{#if chartData.length > 0}
	<div class={className}>
		<Chart
			data={chartData}
			x="dateLabel"
			xScale={scaleBand().padding(0.3)}
			y="distanceKm"
			yScale={scaleLinear()}
			yDomain={[0, null]}
			yNice
			padding={{ left: 48, bottom: 48, right: 16, top: 16 }}
		>
			<Svg>
				<Axis
					placement="left"
					format={(d) => `${d.toFixed(0)}`}
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
					rule
					tickLabelProps={{
						class: 'text-xs fill-[var(--text-muted)]',
						rotate: -45,
						textAnchor: 'end'
					}}
				/>
				<Bars
					radius={4}
					fill="var(--accent-primary)"
					strokeWidth={0}
				/>
				<Highlight area />
			</Svg>
			<Tooltip.Root header={(d: ChartDataPoint) => d.dateLabel} let:data>
				<Tooltip.Item
					label="Distance"
					value={`${formatDistance(data.distanceKm * 1000)} km`}
					valueAlign="right"
				/>
			</Tooltip.Root>
		</Chart>
	</div>
{:else}
	<div class="flex h-full items-center justify-center text-[var(--text-muted)]">
		<p>No distance data available</p>
	</div>
{/if}
