<script lang="ts">
	import { ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon } from '@lucide/svelte';
	import * as Table from '#lib/components/ui/table/index.ts';
	import type { SortKey } from './types';

	let {
		label,
		key,
		sortKey,
		sortDir,
		onsort,
		class: cls = ''
	}: {
		label: string;
		key?: SortKey; // omit for a non-sortable column
		sortKey: SortKey;
		sortDir: 'asc' | 'desc';
		onsort: (k: SortKey) => void;
		class?: string;
	} = $props();

	const active = $derived(key === sortKey);
</script>

<Table.Head class="text-xs font-semibold tracking-wide text-gray-500 uppercase {cls}">
	{#if key}
		<button
			type="button"
			onclick={() => onsort(key)}
			class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
			aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
		>
			{label}
			{#if active}
				{#if sortDir === 'asc'}<ArrowUpIcon class="h-3 w-3" />{:else}<ArrowDownIcon
						class="h-3 w-3"
					/>{/if}
			{:else}
				<ArrowUpDownIcon class="h-3 w-3 opacity-40" />
			{/if}
		</button>
	{:else}
		{label}
	{/if}
</Table.Head>
