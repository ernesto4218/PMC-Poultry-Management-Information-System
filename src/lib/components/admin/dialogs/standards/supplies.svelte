<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Table from '#lib/components/ui/table/index.js';
	import {
		PlusIcon,
		ArchiveIcon,
		ArchiveRestoreIcon,
		HistoryIcon,
		PencilIcon,
		LoaderCircleIcon,
		AlertCircleIcon,
		PackageIcon,
		SearchIcon,
		XIcon,
		ChevronUpIcon,
		ChevronDownIcon,
		ChevronsUpDownIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		ListFilterIcon,
		FilterXIcon
	} from '@lucide/svelte';
	import { Input } from '#lib/components/ui/input/index.ts';
	import SuppliesDialog from './dialogs/supplies_dialog.svelte';
	import SuppliesHistoryDialog from './dialogs/supplies_history_dialog.svelte';
	import type { Item } from '#lib/types/standards/supplies/items.ts';

	let items = $state<Item[]>([]);
	let loading = $state(false);
	let errorMsg = $state('');

	let dialogOpen = $state(false);
	let editingItem = $state<Item | null>(null);

	let historyOpen = $state(false);
	let historyItem = $state<Item | null>(null);

	let view = $state<'active' | 'archived'>('active');
	let actionBusy = $state<string | null>(null);

	const activeCount = $derived(items.filter((i) => !i.isArchived).length);
	const archivedCount = $derived(items.filter((i) => i.isArchived).length);
	const visibleItems = $derived(
		items.filter((i) => (view === 'active' ? !i.isArchived : i.isArchived))
	);
	const colCount = $derived(view === 'archived' ? 10 : 9);

	// ---- Search / filter / sort / pagination (client-side) ----
	type SortKey =
		| 'itemName'
		| 'farmCode'
		| 'category'
		| 'perThousand'
		| 'standardPerFarm'
		| 'unit'
		| 'createdAt'
		| 'updatedAt'
		| 'archivedAt';

	const PAGE_SIZES = [10, 25, 50];

	let search = $state('');
	let sortKey = $state<SortKey>('itemName');
	let sortDir = $state<'asc' | 'desc'>('asc');
	let page = $state(1);
	let pageSize = $state(10);

	// ---- Filters ----
	let showFilters = $state(false);
	let farmFilter = $state('');
	let categoryFilter = $state('');
	let unitFilter = $state('');
	let perThousandMin = $state('');
	let perThousandMax = $state('');
	let stdFarmMin = $state('');
	let stdFarmMax = $state('');
	let dateFrom = $state('');
	let dateTo = $state('');

	// Options come from all items (both views) so a selected value never disappears on view switch.
	const farmOptions = $derived(
		[...new Set(items.map((i) => i.farmCode).filter(Boolean))].sort((a, b) =>
			a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
		)
	);
	const categoryOptions = $derived(
		[...new Set(items.map((i) => i.category).filter(Boolean))].sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: 'base' })
		)
	);
	const unitOptions = $derived(
		[...new Set(items.map((i) => i.unit).filter(Boolean))].sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: 'base' })
		)
	);

	const activeFilterCount = $derived(
		[
			farmFilter !== '',
			categoryFilter !== '',
			unitFilter !== '',
			perThousandMin !== '' || perThousandMax !== '',
			stdFarmMin !== '' || stdFarmMax !== '',
			dateFrom !== '' || dateTo !== ''
		].filter(Boolean).length
	);
	const hasFilters = $derived(activeFilterCount > 0 || search.trim() !== '');

	function clearFilters() {
		farmFilter = '';
		categoryFilter = '';
		unitFilter = '';
		perThousandMin = '';
		perThousandMax = '';
		stdFarmMin = '';
		stdFarmMax = '';
		dateFrom = '';
		dateTo = '';
		page = 1;
	}

	function toNum(v: string): number | null {
		if (v === '') return null;
		const n = Number(v);
		return Number.isNaN(n) ? null : n;
	}

	const filteredItems = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const ptMin = toNum(perThousandMin);
		const ptMax = toNum(perThousandMax);
		const sfMin = toNum(stdFarmMin);
		const sfMax = toNum(stdFarmMax);
		const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
		const to = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

		return visibleItems.filter((i) => {
			if (farmFilter && i.farmCode !== farmFilter) return false;
			if (categoryFilter && i.category !== categoryFilter) return false;
			if (unitFilter && i.unit !== unitFilter) return false;
			if (ptMin !== null && i.perThousand < ptMin) return false;
			if (ptMax !== null && i.perThousand > ptMax) return false;
			if (sfMin !== null && i.standardPerFarm < sfMin) return false;
			if (sfMax !== null && i.standardPerFarm > sfMax) return false;
			if (from !== null || to !== null) {
				//@ts-ignore
				const t = Date.parse(i.createdAt);
				if (Number.isNaN(t)) return false;
				if (from !== null && t < from) return false;
				if (to !== null && t > to) return false;
			}
			if (!q) return true;
			return [
				i.itemName,
				i.farmCode,
				i.category,
				i.unit,
				i.perThousand.toFixed(2),
				i.standardPerFarm.toFixed(2)
			].some((v) =>
				String(v ?? '')
					.toLowerCase()
					.includes(q)
			);
		});
	});

	const sortedItems = $derived.by(() => {
		const dir = sortDir === 'asc' ? 1 : -1;
		const key = sortKey;
		return [...filteredItems].sort((a, b) => {
			if (key === 'perThousand') return (a.perThousand - b.perThousand) * dir;
			if (key === 'standardPerFarm') return (a.standardPerFarm - b.standardPerFarm) * dir;
			if (key === 'archivedAt' || key === 'createdAt' || key === 'updatedAt') {
				const va = (a as any)[key] as string | null | undefined;
				const ta = va ? Date.parse(va) : NaN;
				const vb = (b as any)[key] as string | null | undefined;
				const tb = vb ? Date.parse(vb) : NaN;
				if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
				if (Number.isNaN(ta)) return 1;
				if (Number.isNaN(tb)) return -1;
				return (ta - tb) * dir;
			}
			return (
				String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, {
					numeric: true,
					sensitivity: 'base'
				}) * dir
			);
		});
	});

	const totalPages = $derived(Math.max(1, Math.ceil(sortedItems.length / pageSize)));
	const pagedItems = $derived(sortedItems.slice((page - 1) * pageSize, page * pageSize));
	const rangeStart = $derived(sortedItems.length === 0 ? 0 : (page - 1) * pageSize + 1);
	const rangeEnd = $derived(Math.min(page * pageSize, sortedItems.length));

	$effect(() => {
		if (page > totalPages) page = totalPages;
	});

	function setView(v: 'active' | 'archived') {
		view = v;
		page = 1;
		if (v === 'active' && sortKey === 'archivedAt') sortKey = 'itemName';
	}

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
		page = 1;
	}

	function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
		return sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
	}

	async function load() {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/standard/supplies?archived=1');
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? `Failed to load items (HTTP ${res.status}).`);
			}
			items = await res.json();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not load items.';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	function openAdd() {
		editingItem = null;
		dialogOpen = true;
	}

	function openEdit(item: Item) {
		if (item.isArchived) return;
		editingItem = item;
		dialogOpen = true;
	}

	function openHistory(item: Item) {
		historyItem = item;
		historyOpen = true;
	}

	async function handleSave(item: Item) {
		const isNew = !items.some((i) => i.id === item.id);
		const response = await fetch('/api/standard/supplies', {
			method: isNew ? 'POST' : 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(item)
		});
		let result: { error?: string } | null = null;
		try {
			result = await response.json();
		} catch {
			/* non-JSON body */
		}
		if (!response.ok) {
			throw new Error(result?.error ?? `Failed to save item (HTTP ${response.status}).`);
		}
		await load();
	}

	async function toggleArchive(item: Item) {
		if (actionBusy) return;
		actionBusy = item.id;
		errorMsg = '';
		const verb = item.isArchived ? 'restore' : 'archive';
		try {
			const res = await fetch('/api/standard/supplies', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: item.id,
					action: item.isArchived ? 'restore' : 'archive'
				})
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? `Failed to ${verb} item.`);
			}
			await load();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : `Could not ${verb} item.`;
		} finally {
			actionBusy = null;
		}
	}

	function formatShort(value?: string | Date | null) {
		if (!value) return '—';
		const d = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(d.getTime())) return '—';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function formatTime(value?: string | Date | null) {
		if (!value) return '';
		const d = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(d.getTime())) return '';
		return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function formatFull(value?: string | Date | null) {
		if (!value) return '';
		const d = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(d.getTime())) return '';
		return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
	}

	const iconBtn =
		'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';

	const headCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
	const selectCls =
		'h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:outline-none';
	const fieldInputCls =
		'h-9 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0';
	const labelCls = 'mb-1 block text-xs font-medium text-gray-600';
</script>

<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
	<!-- Toolbar -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
		<div
			class="inline-flex rounded-lg bg-gray-100 p-1"
			role="tablist"
			aria-label="Item status filter"
		>
			{#each [{ key: 'active', label: 'Active', count: activeCount }, { key: 'archived', label: 'Archived', count: archivedCount }] as tab (tab.key)}
				{@const selected = view === tab.key}
				<button
					type="button"
					role="tab"
					aria-selected={selected}
					onclick={() => setView(tab.key as 'active' | 'archived')}
					class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all
						{selected ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
				>
					{tab.label}
					<span
						class="min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums
							{selected ? 'bg-red-50 text-red-700' : 'bg-gray-200 text-gray-600'}"
					>
						{tab.count}
					</span>
				</button>
			{/each}
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<div class="relative">
				<SearchIcon
					class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
				/>
				<Input
					type="search"
					bind:value={search}
					oninput={() => (page = 1)}
					placeholder="Search supplies…"
					aria-label="Search supplies"
					autocomplete="off"
					class="h-10 w-full pr-9 pl-9 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0 sm:w-64 [&::-webkit-search-cancel-button]:hidden"
				/>
				{#if search}
					<button
						type="button"
						aria-label="Clear search"
						onclick={() => {
							search = '';
							page = 1;
						}}
						class="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
					>
						<XIcon class="h-4 w-4" />
					</button>
				{/if}
			</div>

			<Button
				variant="outline"
				onclick={() => (showFilters = !showFilters)}
				aria-expanded={showFilters}
				aria-controls="supplies-filters"
				class="h-10 gap-2 rounded-lg {activeFilterCount > 0 || showFilters
					? 'border-red-300 text-red-700'
					: ''}"
			>
				<ListFilterIcon class="h-4 w-4" />
				Filters
				{#if activeFilterCount > 0}
					<span
						class="min-w-5 rounded-full bg-red-700 px-1.5 py-0.5 text-center text-xs text-white tabular-nums"
					>
						{activeFilterCount}
					</span>
				{/if}
			</Button>

			{#if loading && items.length > 0}
				<LoaderCircleIcon class="h-4 w-4 animate-spin text-gray-400" aria-label="Refreshing" />
			{/if}
			<Button
				onclick={openAdd}
				class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-600 active:scale-[0.98]"
			>
				<PlusIcon class="mr-2 h-4 w-4" />
				Add Item
			</Button>
		</div>
	</div>

	{#if showFilters}
		<div id="supplies-filters" class="border-b border-gray-100 bg-gray-50/60 px-4 py-3">
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<div>
					<label for="sup-filter-farm" class={labelCls}>Farm code</label>
					<select
						id="sup-filter-farm"
						bind:value={farmFilter}
						onchange={() => (page = 1)}
						class={selectCls}
					>
						<option value="">All farm codes</option>
						{#each farmOptions as f (f)}<option value={f}>{f}</option>{/each}
					</select>
				</div>

				<div>
					<label for="sup-filter-category" class={labelCls}>Category</label>
					<select
						id="sup-filter-category"
						bind:value={categoryFilter}
						onchange={() => (page = 1)}
						class={selectCls}
					>
						<option value="">All categories</option>
						{#each categoryOptions as c (c)}<option value={c}>{c}</option>{/each}
					</select>
				</div>

				<div>
					<label for="sup-filter-unit" class={labelCls}>Unit</label>
					<select
						id="sup-filter-unit"
						bind:value={unitFilter}
						onchange={() => (page = 1)}
						class={selectCls}
					>
						<option value="">All units</option>
						{#each unitOptions as u (u)}<option value={u}>{u}</option>{/each}
					</select>
				</div>

				<div>
					<span class={labelCls}>Per 1,000</span>
					<div class="flex items-center gap-2">
						<Input
							type="number"
							min="0"
							step="0.01"
							inputmode="decimal"
							placeholder="Min"
							aria-label="Minimum per 1,000"
							bind:value={perThousandMin}
							oninput={() => (page = 1)}
							class={fieldInputCls}
						/>
						<span class="text-gray-400">–</span>
						<Input
							type="number"
							min="0"
							step="0.01"
							inputmode="decimal"
							placeholder="Max"
							aria-label="Maximum per 1,000"
							bind:value={perThousandMax}
							oninput={() => (page = 1)}
							class={fieldInputCls}
						/>
					</div>
				</div>

				<div>
					<span class={labelCls}>Std / Farm</span>
					<div class="flex items-center gap-2">
						<Input
							type="number"
							min="0"
							step="0.01"
							inputmode="decimal"
							placeholder="Min"
							aria-label="Minimum standard per farm"
							bind:value={stdFarmMin}
							oninput={() => (page = 1)}
							class={fieldInputCls}
						/>
						<span class="text-gray-400">–</span>
						<Input
							type="number"
							min="0"
							step="0.01"
							inputmode="decimal"
							placeholder="Max"
							aria-label="Maximum standard per farm"
							bind:value={stdFarmMax}
							oninput={() => (page = 1)}
							class={fieldInputCls}
						/>
					</div>
				</div>

				<div>
					<span class={labelCls}>Date added</span>
					<div class="flex items-center gap-2">
						<Input
							type="date"
							aria-label="Added from"
							bind:value={dateFrom}
							max={dateTo || undefined}
							onchange={() => (page = 1)}
							class={fieldInputCls}
						/>
						<span class="text-gray-400">–</span>
						<Input
							type="date"
							aria-label="Added to"
							bind:value={dateTo}
							min={dateFrom || undefined}
							onchange={() => (page = 1)}
							class={fieldInputCls}
						/>
					</div>
				</div>
			</div>

			{#if activeFilterCount > 0}
				<div class="mt-3 flex justify-end">
					<button
						type="button"
						onclick={clearFilters}
						class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none"
					>
						<FilterXIcon class="h-3.5 w-3.5" />
						Clear all filters
					</button>
				</div>
			{/if}
		</div>
	{/if}

	{#if errorMsg}
		<div
			role="alert"
			class="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
		>
			<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" />
			<span>{errorMsg}</span>
		</div>
	{/if}

	{#snippet sortBtn(key: SortKey, label: string, end: boolean = false)}
		<button
			type="button"
			onclick={() => toggleSort(key)}
			class="group inline-flex items-center gap-1 uppercase transition-colors hover:text-gray-900 focus-visible:text-gray-900 focus-visible:outline-none {end
				? 'flex-row-reverse'
				: ''} {sortKey === key ? 'text-gray-900' : ''}"
		>
			{label}
			{#if sortKey === key}
				{#if sortDir === 'asc'}
					<ChevronUpIcon class="h-3.5 w-3.5 text-red-700" />
				{:else}
					<ChevronDownIcon class="h-3.5 w-3.5 text-red-700" />
				{/if}
			{:else}
				<ChevronsUpDownIcon class="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500" />
			{/if}
		</button>
	{/snippet}

	<!-- Table -->
	<Table.Root>
		<Table.Header class="bg-gray-50/80">
			<Table.Row class="hover:bg-transparent">
				<Table.Head class="{headCls} pl-4" aria-sort={ariaSort('itemName')}>
					{@render sortBtn('itemName', 'Item')}
				</Table.Head>
				<Table.Head class={headCls} aria-sort={ariaSort('farmCode')}>
					{@render sortBtn('farmCode', 'Farm code')}
				</Table.Head>
				<Table.Head class={headCls} aria-sort={ariaSort('category')}>
					{@render sortBtn('category', 'Category')}
				</Table.Head>
				<Table.Head class="{headCls} text-end" aria-sort={ariaSort('perThousand')}>
					{@render sortBtn('perThousand', 'Per 1,000', true)}
				</Table.Head>
				<Table.Head class="{headCls} text-end" aria-sort={ariaSort('standardPerFarm')}>
					{@render sortBtn('standardPerFarm', 'Std / Farm', true)}
				</Table.Head>
				<Table.Head class={headCls} aria-sort={ariaSort('unit')}>
					{@render sortBtn('unit', 'Unit')}
				</Table.Head>
				<Table.Head class="{headCls} hidden md:table-cell" aria-sort={ariaSort('createdAt')}>
					{@render sortBtn('createdAt', 'Added')}
				</Table.Head>
				<Table.Head class="{headCls} hidden lg:table-cell" aria-sort={ariaSort('updatedAt')}>
					{@render sortBtn('updatedAt', 'Updated')}
				</Table.Head>
				{#if view === 'archived'}
					<Table.Head class={headCls} aria-sort={ariaSort('archivedAt')}>
						{@render sortBtn('archivedAt', 'Archived on')}
					</Table.Head>
				{/if}
				<Table.Head class="{headCls} pr-4 text-end">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#if loading && items.length === 0}
				{#each Array(4) as _}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={colCount} class="px-4 py-3">
							<div class="h-6 animate-pulse rounded bg-gray-100"></div>
						</Table.Cell>
					</Table.Row>
				{/each}
			{:else}
				{#each pagedItems as item (item.id)}
					<Table.Row
						class="transition-colors {item.isArchived ? 'bg-gray-50/50' : ''} hover:bg-red-50/30"
					>
						<Table.Cell
							class="pl-4 font-medium {item.isArchived ? 'text-gray-500' : 'text-gray-900'}"
						>
							{item.itemName}
						</Table.Cell>
						<Table.Cell>
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-gray-700 ring-1 ring-gray-200 ring-inset"
							>
								<span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
								{item.farmCode}
							</span>
						</Table.Cell>
						<Table.Cell>
							<span
								class="inline-flex rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700"
							>
								{item.category}
							</span>
						</Table.Cell>
						<Table.Cell class="text-end font-medium text-gray-900 tabular-nums">
							{item.perThousand.toFixed(2)}
						</Table.Cell>
						<Table.Cell class="text-end font-medium text-gray-900 tabular-nums">
							{item.standardPerFarm.toFixed(2)}
						</Table.Cell>
						<Table.Cell>
							<span
								class="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
							>
								{item.unit}
							</span>
						</Table.Cell>
						<Table.Cell
							class="hidden text-sm text-gray-500 md:table-cell"
							title={formatFull(item.createdAt)}
						>
							<div class="flex flex-col leading-tight whitespace-nowrap">
								<span class="text-gray-700">{formatShort(item.createdAt)}</span>
								<span class="text-xs text-gray-400">{formatTime(item.createdAt)}</span>
							</div>
						</Table.Cell>
						<Table.Cell
							class="hidden text-sm text-gray-500 lg:table-cell"
							title={formatFull(item.updatedAt)}
						>
							<div class="flex flex-col leading-tight whitespace-nowrap">
								<span class="text-gray-700">{formatShort(item.updatedAt)}</span>
								<span class="text-xs text-gray-400">{formatTime(item.updatedAt)}</span>
							</div>
						</Table.Cell>
						{#if view === 'archived'}
							<Table.Cell class="text-sm text-gray-500"
								><div class="flex flex-col leading-tight whitespace-nowrap">
									<span class="text-gray-700">{formatShort(item.archivedAt)}</span>
									<span class="text-xs text-gray-400">{formatTime(item.archivedAt)}</span>
								</div></Table.Cell
							>
						{/if}
						<Table.Cell class="pr-4 text-end">
							<div class="inline-flex items-center gap-0.5">
								{#if !item.isArchived}
									<button
										type="button"
										title="Edit"
										aria-label="Edit {item.itemName}"
										onclick={() => openEdit(item)}
										class="{iconBtn} hover:bg-gray-100 hover:text-gray-900"
									>
										<PencilIcon class="h-4 w-4" />
									</button>
								{/if}
								<button
									type="button"
									title="History"
									aria-label="View history for {item.itemName}"
									onclick={() => openHistory(item)}
									class="{iconBtn} hover:bg-gray-100 hover:text-gray-900"
								>
									<HistoryIcon class="h-4 w-4" />
								</button>
								{#if item.isArchived}
									<button
										type="button"
										title="Restore"
										aria-label="Restore {item.itemName}"
										disabled={actionBusy === item.id}
										onclick={() => toggleArchive(item)}
										class="{iconBtn} text-emerald-700 hover:bg-emerald-50"
									>
										{#if actionBusy === item.id}
											<LoaderCircleIcon class="h-4 w-4 animate-spin" />
										{:else}
											<ArchiveRestoreIcon class="h-4 w-4" />
										{/if}
									</button>
								{:else}
									<button
										type="button"
										title="Archive"
										aria-label="Archive {item.itemName}"
										disabled={actionBusy === item.id}
										onclick={() => toggleArchive(item)}
										class="{iconBtn} text-amber-700 hover:bg-amber-50"
									>
										{#if actionBusy === item.id}
											<LoaderCircleIcon class="h-4 w-4 animate-spin" />
										{:else}
											<ArchiveIcon class="h-4 w-4" />
										{/if}
									</button>
								{/if}
							</div>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={colCount} class="py-14">
							<div class="flex flex-col items-center gap-2 text-center">
								<span class="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
									<PackageIcon class="h-5 w-5 text-gray-400" />
								</span>
								<p class="text-sm font-medium text-gray-700">
									{hasFilters
										? 'No matching supplies'
										: view === 'active'
											? 'No active supplies'
											: 'No archived supplies'}
								</p>
								<p class="text-xs text-gray-500">
									{#if hasFilters}
										Try a different search term or adjust your filters.
									{:else if view === 'active'}
										Click “Add Item” to create one.
									{:else}
										Archived supplies can be restored from here.
									{/if}
								</p>
								{#if activeFilterCount > 0}
									<button
										type="button"
										onclick={clearFilters}
										class="mt-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
									>
										<FilterXIcon class="h-3.5 w-3.5" />
										Clear all filters
									</button>
								{/if}
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			{/if}
		</Table.Body>
	</Table.Root>

	<!-- Footer -->
	<div
		class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-2.5 text-xs text-gray-500"
	>
		<p aria-live="polite">
			{#if sortedItems.length === 0}
				No {view} supplies{hasFilters ? ' match your search or filters' : ''}
			{:else}
				Showing <span class="font-medium text-gray-700 tabular-nums">{rangeStart}–{rangeEnd}</span>
				of <span class="font-medium text-gray-700 tabular-nums">{sortedItems.length}</span>
				{view}
				{sortedItems.length === 1 ? 'item' : 'items'}
				{#if filteredItems.length !== visibleItems.length}
					(filtered from {visibleItems.length})
				{/if}
			{/if}
		</p>

		<div class="flex items-center gap-4">
			<label class="flex items-center gap-2">
				<span>Rows per page</span>
				<select
					bind:value={pageSize}
					onchange={() => (page = 1)}
					class="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:outline-none"
				>
					{#each PAGE_SIZES as size (size)}
						<option value={size}>{size}</option>
					{/each}
				</select>
			</label>

			<div class="flex items-center gap-2">
				<span class="tabular-nums">Page {page} of {totalPages}</span>
				<div class="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon"
						class="h-8 w-8"
						aria-label="Previous page"
						disabled={page <= 1}
						onclick={() => (page = Math.max(1, page - 1))}
					>
						<ChevronLeftIcon class="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						class="h-8 w-8"
						aria-label="Next page"
						disabled={page >= totalPages}
						onclick={() => (page = Math.min(totalPages, page + 1))}
					>
						<ChevronRightIcon class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	</div>

	<SuppliesDialog bind:open={dialogOpen} item={editingItem} {items} onsave={handleSave} />
	<SuppliesHistoryDialog bind:open={historyOpen} item={historyItem} />
</div>
