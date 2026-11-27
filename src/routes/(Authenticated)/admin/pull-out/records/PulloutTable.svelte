<script lang="ts">
	import * as Table from '#lib/components/ui/table/index.ts';
	import type { PulloutStore } from './pullout-store.svelte.ts';
	import type { SortKey } from './types.ts';
	import EmptyState from './EmptyState.svelte';
	import PulloutRow from './PulloutRow.svelte';
	import SortHead from './SortHead.svelte';

	let { store }: { store: PulloutStore } = $props();

	const columns: { label: string; key?: SortKey; cls?: string }[] = [
		{ label: 'Pull-out date', key: 'date' },
		{ label: 'Farm', key: 'farm' },
		{ label: 'Batch', cls: 'hidden md:table-cell' },
		{ label: 'Feed', key: 'feed' },
		{ label: 'Qty', key: 'qty', cls: 'text-right' },
		{ label: 'Report', cls: 'hidden xl:table-cell' }
	];
</script>

<Table.Root>
	<Table.Header class="bg-stone-50">
		<Table.Row class="hover:bg-transparent">
			<Table.Head class="w-10 pl-4"><span class="sr-only">Select</span></Table.Head>
			{#each columns as c (c.label)}
				<SortHead
					label={c.label}
					key={c.key}
					class={c.cls}
					sortKey={store.sortKey}
					sortDir={store.sortDir}
					onsort={store.toggleSort}
				/>
			{/each}
			<Table.Head class="w-16"><span class="sr-only">Actions</span></Table.Head>
		</Table.Row>
	</Table.Header>

	<Table.Body>
		{#each store.paginated as row (row.id)}
			<PulloutRow
				{row}
				selected={store.selectedIds.has(row.id)}
				todayKey={store.todayKey}
				ontoggle={store.toggleRow}
			/>
		{:else}
			<Table.Row class="hover:bg-transparent">
				<Table.Cell colspan={8} class="py-16">
					<EmptyState filtered={store.hasFilters} onclear={store.clearFilters} />
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
