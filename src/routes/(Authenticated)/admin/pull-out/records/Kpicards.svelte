<script lang="ts">
	import { TruckIcon, CalendarDaysIcon, AlertTriangleIcon, FileTextIcon } from '@lucide/svelte';
	import type { Summary } from './types.ts';
	import { peso } from './utils.ts';

	let { summary }: { summary: Summary } = $props();

	const cards = $derived([
		{
			title: 'Total Feeds',
			value: String(summary.total),
			note: `Across ${summary.batches} batches · ${summary.farms} farms`,
			icon: TruckIcon,
			iconCls: 'bg-red-50 text-red-700',
			valueCls: 'text-3xl text-gray-900'
		},
		{
			title: 'Today',
			value: String(summary.today),
			note: `${summary.week} scheduled in the next 7 days`,
			icon: CalendarDaysIcon,
			iconCls: 'bg-emerald-50 text-emerald-700',
			valueCls: 'text-3xl text-emerald-700'
		},
		{
			title: 'Overdue',
			value: String(summary.overdue),
			note: 'Past their pull-out date',
			icon: AlertTriangleIcon,
			iconCls: 'bg-rose-50 text-rose-700',
			valueCls: 'text-3xl text-rose-700'
		},
		{
			title: 'Total Value',
			value: peso(summary.totalAmount),
			note: 'Sum of all feed pull-out amounts',
			icon: FileTextIcon,
			iconCls: 'bg-amber-50 text-amber-700',
			valueCls: 'truncate text-2xl text-gray-900'
		}
	]);
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
	{#each cards as c (c.title)}
		<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
			<div class="flex items-start justify-between">
				<div class="min-w-0">
					<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">{c.title}</p>
					<p class="mt-2 font-bold {c.valueCls}">{c.value}</p>
				</div>
				<div class="rounded-lg p-2 {c.iconCls}">
					<c.icon class="h-5 w-5" />
				</div>
			</div>
			<p class="mt-2 text-xs text-gray-500">{c.note}</p>
		</div>
	{/each}
</div>
