<script lang="ts">
	import { EyeIcon, ClockIcon, CheckCircle2Icon } from '@lucide/svelte';
	import * as Table from '#lib/components/ui/table/index.ts';
	import type { PullOutRow } from './types.ts';
	import { REPORT_BASE, dateBadgeClass, dayLabel } from './utils.ts';
	import FarmBadge from './FarmBadge.svelte';

	let {
		row,
		selected,
		todayKey,
		ontoggle
	}: {
		row: PullOutRow;
		selected: boolean;
		todayKey: string;
		ontoggle: (r: PullOutRow) => void;
	} = $props();
</script>

<Table.Row
	class="group transition-colors hover:bg-amber-50/40 {selected ? 'bg-amber-50' : ''} {row.fulfilled
		? 'opacity-60'
		: ''}"
>
	<Table.Cell class="pl-4">
		<input
			type="checkbox"
			class="h-4 w-4 cursor-pointer rounded border-gray-300 accent-red-600"
			checked={selected}
			disabled={row.remainingQty <= 0}
			onchange={() => ontoggle(row)}
			aria-label="Select {row.feedName} for {row.farmName}"
		/>
	</Table.Cell>

	<Table.Cell>
		<span
			class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset {dateBadgeClass(
				row.dateKey,
				todayKey
			)}"
		>
			{#if row.dateKey}<ClockIcon class="h-3 w-3" />{/if}
			{row.dateLabel || 'Unassigned'}
		</span>
		<span class="ml-1 rounded bg-stone-200/70 px-1 py-0.5 font-mono text-[9px] text-gray-600">
			{dayLabel(row.day)}
		</span>
	</Table.Cell>

	<Table.Cell><FarmBadge name={row.farmName} code={row.farmCode} type={row.farmType} /></Table.Cell>

	<Table.Cell class="hidden font-mono text-xs text-gray-700 md:table-cell">
		{row.batchNumber}
	</Table.Cell>

	<Table.Cell class="font-semibold text-gray-900">
		{row.feedName}
		{#if row.label}<span class="ml-1 text-xs font-normal text-gray-500">{row.label}</span>{/if}
	</Table.Cell>

	<Table.Cell class="text-right text-sm tabular-nums">
		{#if row.fulfilled}
			<span
				class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200"
			>
				<CheckCircle2Icon class="h-3 w-3" />
				Fulfilled · {row.qtyNum}
			</span>
		{:else}
			<div class="flex flex-col items-end">
				<span class="font-semibold text-gray-900">
					{row.remainingQty}
					<span class="text-xs font-normal text-gray-500">/ {row.qtyNum} bags</span>
				</span>
				{#if row.dispatchedQty > 0}
					<span class="text-[10px] text-amber-700">{row.dispatchedQty} already dispatched</span>
				{/if}
			</div>
		{/if}
	</Table.Cell>

	<Table.Cell class="hidden xl:table-cell">
		<a
			href="{REPORT_BASE}/{row.documentId}"
			class="font-mono text-xs font-semibold text-red-700 hover:underline"
		>
			{row.documentId}
		</a>
	</Table.Cell>

	<Table.Cell>
		<div class="flex justify-end opacity-60 transition-opacity group-hover:opacity-100">
			<a
				href="{REPORT_BASE}/{row.documentId}"
				class="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-amber-100 hover:text-amber-800"
				aria-label="View report {row.documentId}"
			>
				<EyeIcon class="h-4 w-4" />
			</a>
		</div>
	</Table.Cell>
</Table.Row>
