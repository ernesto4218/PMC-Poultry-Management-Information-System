<script lang="ts">
	// @ts-nocheck
	import { tick } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import ArrowDownWideNarrow from '@lucide/svelte/icons/arrow-down-wide-narrow';
	import X from '@lucide/svelte/icons/x';
	import * as Command from '#lib/components/ui/command/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { cn } from '#lib/utils.ts';
	import { formatNumber, formatDateShort } from '#lib/utils/format.ts';
	import TypeBadge from './type-badge.svelte';

	let {
		groups,
		selectedBatch,
		selectedFarm,
		onSelect
	}: {
		groups: any[];
		selectedBatch: any;
		selectedFarm: any;
		onSelect: (id: string) => void;
	} = $props();

	let open = $state(false);
	let triggerRef = $state<HTMLElement | null>(null);

	function handleSelect(id: string) {
		onSelect(id);
		open = false;
		tick().then(() => triggerRef?.focus());
	}

	// ---------- SORT + FILTER ----------
	const SORT_OPTIONS = [
		{ key: 'latest', label: 'Latest' },
		{ key: 'oldest', label: 'Oldest' },
		{ key: 'volume-desc', label: 'Most chicks' },
		{ key: 'volume-asc', label: 'Fewest chicks' },
		{ key: 'batch', label: 'Chick In No.' }
	];

	// Defaults: newest first, flat list
	let sortBy = $state('latest');
	let farmFilter = $state('all');
	let typeFilter = $state('all');
	let groupByFarm = $state(false);

	// dateSet is YYYY-MM-DD / ISO, so a string compare on the first 10 chars is safe and timezone-proof
	const dateKey = (b) => String(b.dateSet ?? '').slice(0, 10);
	const numeric = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

	const COMPARE = {
		latest: (a, b) =>
			dateKey(b.batch).localeCompare(dateKey(a.batch)) ||
			numeric(b.batch.batchNumber, a.batch.batchNumber),
		oldest: (a, b) =>
			dateKey(a.batch).localeCompare(dateKey(b.batch)) ||
			numeric(a.batch.batchNumber, b.batch.batchNumber),
		'volume-desc': (a, b) => Number(b.batch.volume) - Number(a.batch.volume),
		'volume-asc': (a, b) => Number(a.batch.volume) - Number(b.batch.volume),
		batch: (a, b) => numeric(a.batch.batchNumber, b.batch.batchNumber)
	};

	// Flat list of { batch, farm }
	const rows = $derived(groups.flatMap((g) => g.batches.map((batch) => ({ batch, farm: g.farm }))));

	const farmTypes = $derived([...new Set(groups.map((g) => g.farm.type).filter(Boolean))]);

	const filteredRows = $derived(
		rows
			.filter((r) => farmFilter === 'all' || r.farm.id === farmFilter)
			.filter((r) => typeFilter === 'all' || r.farm.type === typeFilter)
			.sort(COMPARE[sortBy])
	);

	// Newest batch overall (ignores filters) gets a "Latest" tag
	const newestBatchId = $derived([...rows].sort(COMPARE.latest)[0]?.batch.id);

	// Grouped view: farms ordered by their best-ranked batch under the current sort
	const filteredGroups = $derived.by(() => {
		const map = new Map();
		for (const r of filteredRows) {
			if (!map.has(r.farm.id)) map.set(r.farm.id, { farm: r.farm, batches: [] });
			map.get(r.farm.id).batches.push(r.batch);
		}
		return [...map.values()];
	});

	const isDirty = $derived(sortBy !== 'latest' || farmFilter !== 'all' || typeFilter !== 'all');

	function resetFilters() {
		sortBy = 'latest';
		farmFilter = 'all';
		typeFilter = 'all';
	}
</script>

{#snippet batchItem(batch, farm, showFarm)}
	<Command.Item
		value={batch.id}
		keywords={[batch.batchNumber, farm.name, farm.code, farm.type, batch.dateSet]}
		onSelect={() => handleSelect(batch.id)}
		class="items-start gap-2 py-2"
	>
		<Check
			class={cn(
				'mt-0.5 size-4 shrink-0 text-red-700',
				selectedBatch?.id !== batch.id && 'text-transparent'
			)}
		/>

		<div class="flex min-w-0 flex-1 flex-col gap-0.5">
			<div class="flex items-center gap-2">
				<span class="truncate font-mono text-sm font-semibold text-gray-900">
					{batch.batchNumber}
				</span>

				<TypeBadge type={farm.type} />

				{#if batch.id === newestBatchId}
					<span
						class="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"
					>
						Latest
					</span>
				{/if}
			</div>

			<div class="flex items-center gap-1.5 text-xs text-gray-500">
				<CalendarPlus class="size-3 shrink-0" />
				<span>{formatDateShort(batch.dateSet)}</span>
				<span aria-hidden="true">·</span>
				<span>{formatNumber(batch.volume)} chicks</span>
				{#if showFarm}
					<span aria-hidden="true">·</span>
					<span class="truncate">{farm.name}</span>
				{/if}
			</div>
		</div>
	</Command.Item>
{/snippet}

<Popover.Root bind:open>
	<Popover.Trigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				{...props}
				id="batch-select"
				variant="outline"
				role="combobox"
				aria-expanded={open}
				class="h-auto min-h-10 w-full justify-between bg-white py-2 text-left font-normal sm:w-[440px]"
			>
				{#if selectedBatch}
					<span class="flex min-w-0 flex-col items-start gap-0.5">
						<span class="flex items-center gap-2">
							<span class="truncate font-mono font-semibold text-gray-900">
								{selectedBatch.batchNumber}
							</span>

							<TypeBadge type={selectedFarm?.type} />
						</span>

						<span class="truncate text-xs text-gray-500">
							{selectedFarm?.name} ·
							{formatNumber(selectedBatch.volume)} chicks ·
							{formatDateShort(selectedBatch.dateSet)}
						</span>
					</span>
				{:else}
					<span class="text-gray-500">Select a chick batch…</span>
				{/if}

				<ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-[var(--bits-popover-anchor-width)] min-w-[340px] p-0" align="start">
		<Command.Root>
			<Command.Input placeholder="Search by Chick In No., farm, or date…" />

			<!-- SORT + FILTER BAR -->
			<div class="space-y-2 border-b bg-gray-50/60 px-3 py-2">
				<div class="flex flex-wrap items-center gap-1.5">
					<ArrowDownWideNarrow class="size-3.5 text-gray-400" />
					{#each SORT_OPTIONS as opt (opt.key)}
						<button
							type="button"
							onclick={() => (sortBy = opt.key)}
							aria-pressed={sortBy === opt.key}
							class={cn(
								'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
								sortBy === opt.key
									? 'border-red-700 bg-red-700 text-white'
									: 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
							)}
						>
							{opt.label}
						</button>
					{/each}
				</div>

				<div class="flex items-center gap-2">
					<select
						bind:value={farmFilter}
						aria-label="Filter by farm"
						class="h-7 min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 text-xs"
					>
						<option value="all">All farms</option>
						{#each groups as g (g.farm.id)}
							<option value={g.farm.id}>{g.farm.name} · {g.farm.code}</option>
						{/each}
					</select>

					<select
						bind:value={typeFilter}
						aria-label="Filter by farm type"
						class="h-7 w-28 rounded-md border border-gray-200 bg-white px-2 text-xs"
					>
						<option value="all">All types</option>
						{#each farmTypes as t (t)}
							<option value={t}>{t}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-center justify-between text-xs text-gray-500">
					<label class="flex cursor-pointer items-center gap-1.5">
						<input type="checkbox" bind:checked={groupByFarm} class="size-3.5 accent-red-700" />
						Group by farm
					</label>
					<span class="flex items-center gap-2">
						{filteredRows.length} of {rows.length} batches
						{#if isDirty}
							<button
								type="button"
								onclick={resetFilters}
								class="inline-flex items-center gap-0.5 text-red-700 hover:underline"
							>
								<X class="size-3" /> Reset
							</button>
						{/if}
					</span>
				</div>
			</div>

			<Command.List class="max-h-[320px]">
				<Command.Empty>No batch found.</Command.Empty>

				{#if groupByFarm}
					{#each filteredGroups as g (g.farm.id)}
						<Command.Group heading={`${g.farm.name} · ${g.farm.code}`}>
							{#each g.batches as batch (batch.id)}
								{@render batchItem(batch, g.farm, false)}
							{/each}
						</Command.Group>
					{/each}
				{:else}
					<Command.Group>
						{#each filteredRows as r (r.batch.id)}
							{@render batchItem(r.batch, r.farm, true)}
						{/each}
					</Command.Group>
				{/if}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
