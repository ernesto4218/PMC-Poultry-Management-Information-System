<script lang="ts">
	import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.ts';

	import FilterSelect from './FilterSelect.svelte';
	import type { PulloutStore } from './pullout-store.svelte';
	import { PAGE_SIZE_OPTIONS } from './utils';

	let { store }: { store: PulloutStore } = $props();

	const from = $derived(
		store.filtered.length === 0 ? 0 : (store.currentPage - 1) * store.pageSize + 1
	);
	const to = $derived(Math.min(store.currentPage * store.pageSize, store.filtered.length));
</script>

{#if store.rows.length > 0}
	<div
		class="flex flex-col gap-3 border-t border-gray-100 bg-stone-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="flex flex-wrap items-center gap-4 text-xs text-gray-500">
			<span>
				Showing <b class="text-gray-700">{from}</b>–<b class="text-gray-700">{to}</b> of
				<b class="text-gray-700">{store.filtered.length}</b>
				{store.filtered.length === 1 ? 'feed' : 'feeds'}
				{#if store.filtered.length !== store.rows.length}
					<span class="text-gray-400">(filtered from {store.rows.length})</span>
				{/if}
			</span>

			<div class="flex items-center gap-2">
				<span class="text-gray-400">Rows per page</span>
				<FilterSelect
					bind:value={store.pageSizeRaw}
					options={PAGE_SIZE_OPTIONS}
					label="Rows per page"
					class="h-8 w-[72px] rounded-md text-xs"
				/>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="icon"
				class="h-8 w-8 rounded-md border-gray-300"
				disabled={store.currentPage <= 1}
				onclick={() => store.goToPage(store.currentPage - 1)}
				aria-label="Previous page"
			>
				<ChevronLeftIcon class="h-4 w-4" />
			</Button>
			<span class="min-w-[80px] text-center text-xs font-medium text-gray-700">
				Page {store.currentPage} of {store.totalPages}
			</span>
			<Button
				variant="outline"
				size="icon"
				class="h-8 w-8 rounded-md border-gray-300"
				disabled={store.currentPage >= store.totalPages}
				onclick={() => store.goToPage(store.currentPage + 1)}
				aria-label="Next page"
			>
				<ChevronRightIcon class="h-4 w-4" />
			</Button>
		</div>
	</div>
{/if}
