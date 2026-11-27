<script lang="ts">
	import { SearchIcon, XIcon, SparklesIcon, ArrowUpIcon, ArrowDownIcon } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import type { PulloutStore } from './pullout-store.svelte.ts';
	import { INPUT_CLS, SORT_OPTIONS, WINDOW_OPTIONS } from './utils.ts';
	import FilterSelect from './FilterSelect.svelte';

	let { store }: { store: PulloutStore } = $props();

	const farmItems = $derived([
		{ value: 'all', label: 'All farms' },
		...store.farmOptions.map((f) => ({ value: f.id, label: `${f.name} (${f.code})` }))
	]);

	const dateCls = `h-10 w-[140px] rounded-lg border-gray-300 text-sm ${INPUT_CLS}`;
</script>

<div class="border-b border-gray-100 p-4">
	<div class="flex flex-wrap items-center gap-2">
		<div class="relative min-w-[220px] flex-1 sm:max-w-xs">
			<SearchIcon
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
			/>
			<Input
				bind:value={store.search}
				placeholder="Search feed, farm, batch, document…"
				class="h-10 rounded-lg border-gray-300 pl-9 {INPUT_CLS}"
				aria-label="Search pull-outs"
			/>
		</div>

		<FilterSelect
			bind:value={store.farmFilter}
			options={farmItems}
			label="Filter by farm"
			class="w-[170px]"
		/>
		<FilterSelect
			bind:value={store.windowFilter}
			options={WINDOW_OPTIONS}
			label="Filter by date window"
			class="w-[150px]"
		/>

		<div class="flex items-center gap-1.5">
			<Input
				type="date"
				bind:value={store.dateFrom}
				max={store.dateTo || undefined}
				class={dateCls}
				aria-label="Pull-out from date"
			/>
			<span class="text-xs text-gray-400">to</span>
			<Input
				type="date"
				bind:value={store.dateTo}
				min={store.dateFrom || undefined}
				class={dateCls}
				aria-label="Pull-out to date"
			/>
		</div>

		<div class="flex items-center">
			<FilterSelect
				bind:value={store.sortValue}
				options={SORT_OPTIONS}
				label="Sort order"
				class="w-[190px]"
			/>
		</div>

		<Button
			variant="outline"
			class="h-10 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
			onclick={store.autoSuggest}
			disabled={store.selectableCount === 0}
			title="Pick earliest-due rows up to 560 bags"
		>
			<SparklesIcon class="mr-1.5 h-4 w-4" />
			Auto-Suggest Load
		</Button>

		{#if store.hasFilters}
			<Button
				variant="ghost"
				class="h-10 text-gray-600 hover:text-red-700"
				onclick={store.clearFilters}
			>
				<XIcon class="mr-1 h-4 w-4" /> Clear
			</Button>
		{/if}
	</div>
</div>
