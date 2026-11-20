<script lang="ts">
	import { toast } from 'svelte-sonner';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { farmTypes, type Farm } from '#lib/types/farms.ts';
	import {
		PlusIcon,
		SearchIcon,
		PencilIcon,
		Trash2Icon,
		InboxIcon,
		XIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		BuildingIcon,
		BirdIcon,
		EggIcon,
		LayoutGridIcon,
		ListIcon,
		MapPinIcon,
		CalendarDaysIcon,
		TrendingUpIcon,
		ArrowUpDownIcon,
		ArrowUpIcon,
		ArrowDownIcon
	} from '@lucide/svelte';
	import FarmFormDialog from '#lib/components/admin/dialogs/farms/FarmFormDialog.svelte';
	import DeleteFarmDialog from '#lib/components/admin/dialogs/farms/DeleteFarmDialog.svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';

	type FarmStat = { batches: number; chicks: number; lastSet: string | null };
	type SortKey = 'name' | 'type' | 'batches' | 'chicks' | 'last';
	type SortDir = 'asc' | 'desc';
	type BatchFilter = 'all' | 'none' | 'few' | 'some' | 'many';
	type ChickFilter = 'all' | 'none' | 'low' | 'mid' | 'high';
	type LastSetFilter = 'all' | 'this-month' | 'last-30' | 'this-year' | 'not-set';

	//@ts-ignore
	let { data } = $props<{
		data: {
			farms: Farm[];
			memories: { id: string; name: string }[];
			farmStats: Record<string, FarmStat>;
			totals: { farms: number; batches: number; chicks: number };
		};
	}>();

	let rows = $state<Farm[]>(data.farms);
	let search = $state('');
	let typeFilter = $state('all');
	let batchFilter = $state<BatchFilter>('all');
	let chickFilter = $state<ChickFilter>('all');
	let lastSetFilter = $state<LastSetFilter>('all');
	let viewMode = $state<'table' | 'grid'>('table');
	let sortValue = $state<string>('name-asc');

	const sortKey = $derived(sortValue.split('-')[0] as SortKey);
	const sortDir = $derived(sortValue.split('-')[1] === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

	let pageSizeRaw = $state('10');
	let page = $state(1);
	const pageSize = $derived(Number(pageSizeRaw));

	let formOpen = $state(false);
	let editingFarm = $state<Farm | null>(null);
	let deleteOpen = $state(false);
	let deleteTarget = $state<Farm | null>(null);

	// ---- Memory lookup ---------------------------------------------------
	const memoryNameById = $derived(
		new Map<string, string>((data.memories ?? []).map((m) => [m.id, m.name]))
	);

	// ---- Farm type styling ----------------------------------------------
	const farmTypeStyles: Record<string, string> = {
		CON: 'bg-red-50 text-red-700 ring-red-200',
		CCS: 'bg-blue-50 text-blue-700 ring-blue-200'
	};
	const fallbackTypeStyle = 'bg-gray-100 text-gray-600 ring-gray-200';
	function typeBadgeClass(type: string) {
		return farmTypeStyles[type] ?? fallbackTypeStyle;
	}

	const farmTypeBarColors: Record<string, string> = {
		CON: 'bg-red-500',
		CCS: 'bg-blue-500'
	};
	function typeBarClass(type: string) {
		return farmTypeBarColors[type] ?? 'bg-gray-400';
	}

	// ---- Per-farm stats -------------------------------------------------
	const farmStats = $derived<Record<string, FarmStat>>(data.farmStats ?? {});
	function statsFor(farmId: string): FarmStat {
		return farmStats[farmId] ?? { batches: 0, chicks: 0, lastSet: null };
	}

	// Live KPI totals
	const totals = $derived.by(() => {
		let batches = 0;
		let chicks = 0;
		for (const f of rows) {
			const s = statsFor(f.id);
			batches += s.batches;
			chicks += s.chicks;
		}
		return { farms: rows.length, batches, chicks };
	});

	const typeCounts = $derived.by(() => {
		const m: Record<string, number> = {};
		for (const f of rows) if (f.type) m[f.type] = (m[f.type] ?? 0) + 1;
		return m;
	});

	const farmsWithBatches = $derived(rows.filter((f) => statsFor(f.id).batches > 0).length);

	// ---- Last-set filter helpers ----------------------------------------
	function daysSince(dateStr: string | null): number | null {
		if (!dateStr) return null;
		const clean = dateStr.slice(0, 10);
		const parts = clean.split('-');
		if (parts.length !== 3) return null;
		const [y, m, d] = parts.map(Number);
		if (!y || !m || !d) return null;
		const then = new Date(y, m - 1, d);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return Math.round((today.getTime() - then.getTime()) / 86400000);
	}

	function matchesLastSet(lastSet: string | null, filter: LastSetFilter): boolean {
		if (filter === 'all') return true;
		if (filter === 'not-set') return lastSet === null;
		if (lastSet === null) return false;

		const clean = lastSet.slice(0, 10);
		const now = new Date();

		switch (filter) {
			case 'this-month': {
				const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
				return clean.slice(0, 7) === key;
			}
			case 'last-30': {
				const days = daysSince(clean);
				return days !== null && days >= 0 && days <= 30;
			}
			case 'this-year':
				return clean.slice(0, 4) === String(now.getFullYear());
		}
	}

	// ---- Filtering + sorting + pagination -------------------------------
	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();

		const result = rows.filter((r) => {
			// 1. Search
			const matchesSearch =
				!q ||
				r.name.toLowerCase().includes(q) ||
				r.code.toLowerCase().includes(q) ||
				r.address.toLowerCase().includes(q);
			if (!matchesSearch) return false;

			// 2. Type
			if (typeFilter !== 'all' && r.type !== typeFilter) return false;

			const s = statsFor(r.id);

			// 3. Batches bucket
			if (batchFilter !== 'all') {
				if (batchFilter === 'none' && s.batches !== 0) return false;
				if (batchFilter === 'few' && (s.batches < 1 || s.batches > 5)) return false;
				if (batchFilter === 'some' && (s.batches < 6 || s.batches > 20)) return false;
				if (batchFilter === 'many' && s.batches < 21) return false;
			}

			// 4. Chicks bucket
			if (chickFilter !== 'all') {
				if (chickFilter === 'none' && s.chicks !== 0) return false;
				if (chickFilter === 'low' && (s.chicks < 1 || s.chicks > 500)) return false;
				if (chickFilter === 'mid' && (s.chicks < 501 || s.chicks > 2000)) return false;
				if (chickFilter === 'high' && s.chicks < 2001) return false;
			}

			// 5. Last-set date
			if (!matchesLastSet(s.lastSet, lastSetFilter)) return false;

			return true;
		});

		// Sort
		result.sort((a, b) => {
			// Farms with no `lastSet` always sink to the bottom, regardless of direction
			if (sortKey === 'last') {
				const la = statsFor(a.id).lastSet ?? '';
				const lb = statsFor(b.id).lastSet ?? '';
				if (!la && !lb) return 0;
				if (!la) return 1;
				if (!lb) return -1;
				const cmp = la.slice(0, 10).localeCompare(lb.slice(0, 10));
				return sortDir === 'asc' ? cmp : -cmp;
			}

			let cmp = 0;
			switch (sortKey) {
				case 'name':
					cmp = a.name.localeCompare(b.name);
					break;
				case 'type':
					cmp = (a.type || '').localeCompare(b.type || '');
					break;
				case 'batches':
					cmp = statsFor(a.id).batches - statsFor(b.id).batches;
					break;
				case 'chicks':
					cmp = statsFor(a.id).chicks - statsFor(b.id).chicks;
					break;
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});

		return result;
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const currentPage = $derived(Math.min(page, totalPages));
	const paginated = $derived(filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize));

	$effect(() => {
		void search;
		void typeFilter;
		void batchFilter;
		void chickFilter;
		void lastSetFilter;
		void pageSizeRaw;
		void sortValue;
		page = 1;
	});

	const hasFilters = $derived(
		search.trim() !== '' ||
			typeFilter !== 'all' ||
			batchFilter !== 'all' ||
			chickFilter !== 'all' ||
			lastSetFilter !== 'all'
	);

	// ---- Sorting helpers -----------------------------------------------
	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortValue = `${key}-${sortDir === 'asc' ? 'desc' : 'asc'}`;
		} else {
			const dir: SortDir = key === 'name' || key === 'type' ? 'asc' : 'desc';
			sortValue = `${key}-${dir}`;
		}
	}

	function sortLabel(v: string): string {
		switch (v) {
			case 'name-asc':
				return 'Name (A–Z)';
			case 'name-desc':
				return 'Name (Z–A)';
			case 'type-asc':
				return 'Type (A–Z)';
			case 'type-desc':
				return 'Type (Z–A)';
			case 'batches-desc':
				return 'Most batches';
			case 'batches-asc':
				return 'Fewest batches';
			case 'chicks-desc':
				return 'Most chicks';
			case 'chicks-asc':
				return 'Fewest chicks';
			case 'last-desc':
				return 'Newest set';
			case 'last-asc':
				return 'Oldest set';
			default:
				return v;
		}
	}

	function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
		if (sortKey !== key) return 'none';
		return sortDir === 'asc' ? 'ascending' : 'descending';
	}

	// ---- Actions --------------------------------------------------------
	function openAdd() {
		editingFarm = null;
		formOpen = true;
	}
	function openEdit(farm: Farm) {
		editingFarm = farm;
		formOpen = true;
	}
	function goToPage(p: number) {
		page = Math.max(1, Math.min(p, totalPages));
	}

	async function handleSave(farm: Farm) {
		const isEdit = rows.some((r) => r.id === farm.id);
		const response = await fetch('/api/farms', {
			method: isEdit ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(farm)
		});
		const result = await response.json();
		if (!response.ok) throw new Error(result.error || 'Failed to save the farm.');

		const savedFarm: Farm = result.farm;
		rows = isEdit ? rows.map((r) => (r.id === savedFarm.id ? savedFarm : r)) : [...rows, savedFarm];
		toast.success(`${isEdit ? 'Updated' : 'Added'} ${savedFarm.name}`);
	}

	function askDelete(farm: Farm) {
		deleteTarget = farm;
		deleteOpen = true;
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		const removed = deleteTarget;
		try {
			const res = await fetch(`/api/farms/delete/${removed.id}`, { method: 'DELETE' });
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Failed to delete the farm.');
			rows = rows.filter((r) => r.id !== removed.id);
			deleteOpen = false;
			toast.success(`Deleted ${removed.name}`);
		} catch (err: any) {
			toast.error(err.message || 'Could not delete the farm.');
		}
	}

	function clearFilters() {
		search = '';
		typeFilter = 'all';
		batchFilter = 'all';
		chickFilter = 'all';
		lastSetFilter = 'all';
	}

	// ---- Utilities ------------------------------------------------------
	function formatDate(dateStr: string | null | undefined): string {
		if (!dateStr) return '—';
		const clean = dateStr.slice(0, 10);
		const parts = clean.split('-');
		if (parts.length !== 3) return dateStr;
		const [y, m, d] = parts.map(Number);
		if (!y || !m || !d) return dateStr;
		return new Date(y, m - 1, d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
</script>

<svelte:head>
	<title>Farms | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Farm Management</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Farms</h1>
				<p class="mt-1 text-sm text-gray-500">Manage farm sites and track their production.</p>
			</div>

			<div class="flex items-center gap-2">
				<div class="flex rounded-lg border border-gray-200 bg-white p-1">
					<button
						type="button"
						onclick={() => (viewMode = 'table')}
						class="flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors {viewMode ===
						'table'
							? 'bg-stone-100 text-gray-900'
							: 'text-gray-500 hover:text-gray-700'}"
						aria-label="Table view"
					>
						<ListIcon class="h-3.5 w-3.5" />
						Table
					</button>
					<button
						type="button"
						onclick={() => (viewMode = 'grid')}
						class="flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors {viewMode ===
						'grid'
							? 'bg-stone-100 text-gray-900'
							: 'text-gray-500 hover:text-gray-700'}"
						aria-label="Grid view"
					>
						<LayoutGridIcon class="h-3.5 w-3.5" />
						Grid
					</button>
				</div>

				<Button
					onclick={openAdd}
					class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-600 active:scale-[0.98]"
				>
					<PlusIcon class="mr-2 h-4 w-4" />
					Add Farm
				</Button>
			</div>
		</div>

		<!-- KPI CARDS -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Total Farms</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{totals.farms}</p>
					</div>
					<div class="rounded-lg bg-red-50 p-2 text-red-700">
						<BuildingIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">{farmsWithBatches} with active batches</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
							Total Batches
						</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{totals.batches}</p>
					</div>
					<div class="rounded-lg bg-amber-50 p-2 text-amber-700">
						<BirdIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 flex items-center gap-1 text-xs text-gray-500">
					<TrendingUpIcon class="h-3 w-3" />
					Across all farms
				</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Total Chicks</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">
							{totals.chicks.toLocaleString()}
						</p>
					</div>
					<div class="rounded-lg bg-emerald-50 p-2 text-emerald-700">
						<EggIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Sum across all batches</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">By Type</p>
				<div class="mt-3 space-y-2">
					{#each farmTypes as t (t)}
						{@const count = typeCounts[t] ?? 0}
						{@const pct = totals.farms ? (count / totals.farms) * 100 : 0}
						<div class="flex items-center gap-2">
							<span class="w-16 shrink-0 font-mono text-[10px] font-semibold text-gray-600">
								{t}
							</span>
							<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
								<div
									class="h-full rounded-full transition-all duration-300 {typeBarClass(t)}"
									style="width: {pct}%"
								></div>
							</div>
							<span class="w-6 shrink-0 text-right text-xs font-semibold text-gray-700">
								{count}
							</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- CONTENT CARD -->
		<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
			<!-- Filter bar -->
			<div class="border-b border-gray-100 p-4">
				<div class="flex flex-wrap items-center gap-2">
					<!-- Search -->
					<div class="relative min-w-[220px] flex-1 sm:max-w-xs">
						<SearchIcon
							class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
						/>
						<Input
							bind:value={search}
							placeholder="Search farm, code, or address…"
							class="h-10 rounded-lg border-gray-300 pl-9 {inputCls}"
							aria-label="Search farms"
						/>
					</div>

					<!-- Type filter -->
					<Select.Root type="single" bind:value={typeFilter}>
						<Select.Trigger
							class="h-10 w-[150px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by farm type"
						>
							{typeFilter === 'all' ? 'All types' : typeFilter}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All types</Select.Item>
							{#each farmTypes as t (t)}
								<Select.Item value={t}>{t}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					<!-- Batches filter -->
					<Select.Root type="single" bind:value={batchFilter}>
						<Select.Trigger
							class="h-10 w-[150px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by batch count"
						>
							{#if batchFilter === 'all'}
								All batches
							{:else if batchFilter === 'none'}
								No batches
							{:else if batchFilter === 'few'}
								1–5 batches
							{:else if batchFilter === 'some'}
								6–20 batches
							{:else}
								20+ batches
							{/if}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All batches</Select.Item>
							<Select.Item value="none">No batches</Select.Item>
							<Select.Item value="few">1–5 batches</Select.Item>
							<Select.Item value="some">6–20 batches</Select.Item>
							<Select.Item value="many">20+ batches</Select.Item>
						</Select.Content>
					</Select.Root>

					<!-- Chicks filter -->
					<Select.Root type="single" bind:value={chickFilter}>
						<Select.Trigger
							class="h-10 w-[150px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by chick volume"
						>
							{#if chickFilter === 'all'}
								All chicks
							{:else if chickFilter === 'none'}
								No chicks
							{:else if chickFilter === 'low'}
								1–500
							{:else if chickFilter === 'mid'}
								501–2,000
							{:else}
								2,000+
							{/if}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All chicks</Select.Item>
							<Select.Item value="none">No chicks</Select.Item>
							<Select.Item value="low">1–500</Select.Item>
							<Select.Item value="mid">501–2,000</Select.Item>
							<Select.Item value="high">2,000+</Select.Item>
						</Select.Content>
					</Select.Root>

					<!-- Last set filter -->
					<Select.Root type="single" bind:value={lastSetFilter}>
						<Select.Trigger
							class="h-10 w-[160px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by last set date"
						>
							{#if lastSetFilter === 'all'}
								Any last set
							{:else if lastSetFilter === 'this-month'}
								This month
							{:else if lastSetFilter === 'last-30'}
								Last 30 days
							{:else if lastSetFilter === 'this-year'}
								This year
							{:else}
								Not set
							{/if}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">Any last set</Select.Item>
							<Select.Item value="this-month">This month</Select.Item>
							<Select.Item value="last-30">Last 30 days</Select.Item>
							<Select.Item value="this-year">This year</Select.Item>
							<Select.Item value="not-set">Not set</Select.Item>
						</Select.Content>
					</Select.Root>

					<!-- Sort -->
					<Select.Root type="single" bind:value={sortValue}>
						<Select.Trigger
							class="h-10 w-[170px] rounded-lg border-gray-300 text-sm"
							aria-label="Sort order"
						>
							<span class="flex items-center gap-1.5">
								{#if sortDir === 'asc'}
									<ArrowUpIcon class="h-3.5 w-3.5 text-gray-500" />
								{:else}
									<ArrowDownIcon class="h-3.5 w-3.5 text-gray-500" />
								{/if}
								{sortLabel(sortValue)}
							</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="name-asc">Name (A–Z)</Select.Item>
							<Select.Item value="name-desc">Name (Z–A)</Select.Item>
							<Select.Item value="type-asc">Type (A–Z)</Select.Item>
							<Select.Item value="type-desc">Type (Z–A)</Select.Item>
							<Select.Item value="batches-desc">Most batches</Select.Item>
							<Select.Item value="batches-asc">Fewest batches</Select.Item>
							<Select.Item value="chicks-desc">Most chicks</Select.Item>
							<Select.Item value="chicks-asc">Fewest chicks</Select.Item>
							<Select.Item value="last-desc">Newest set</Select.Item>
							<Select.Item value="last-asc">Oldest set</Select.Item>
						</Select.Content>
					</Select.Root>

					{#if hasFilters}
						<Button
							variant="ghost"
							class="h-10 text-gray-600 hover:text-red-700"
							onclick={clearFilters}
						>
							<XIcon class="mr-1 h-4 w-4" />
							Clear
						</Button>
					{/if}
				</div>
			</div>

			<!-- Sort-icon snippet -->
			{#snippet sortIcon(key: SortKey)}
				{#if sortKey === key}
					{#if sortDir === 'asc'}
						<ArrowUpIcon class="h-3 w-3" />
					{:else}
						<ArrowDownIcon class="h-3 w-3" />
					{/if}
				{:else}
					<ArrowUpDownIcon class="h-3 w-3 opacity-40" />
				{/if}
			{/snippet}

			{#if viewMode === 'table'}
				<Table.Root>
					<Table.Header class="bg-stone-50">
						<Table.Row class="hover:bg-transparent">
							<Table.Head class={thCls}>
								<button
									type="button"
									onclick={() => toggleSort('name')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('name')}
								>
									Farm
									{@render sortIcon('name')}
								</button>
							</Table.Head>
							<Table.Head class={thCls}>
								<button
									type="button"
									onclick={() => toggleSort('type')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('type')}
								>
									Type
									{@render sortIcon('type')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} hidden lg:table-cell">Staff</Table.Head>
							<Table.Head class="{thCls} hidden md:table-cell">
								<button
									type="button"
									onclick={() => toggleSort('batches')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('batches')}
								>
									Batches
									{@render sortIcon('batches')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} hidden lg:table-cell">
								<button
									type="button"
									onclick={() => toggleSort('chicks')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('chicks')}
								>
									Chicks
									{@render sortIcon('chicks')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} hidden xl:table-cell">
								<button
									type="button"
									onclick={() => toggleSort('last')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('last')}
								>
									Last set
									{@render sortIcon('last')}
								</button>
							</Table.Head>
							<Table.Head class="w-24"><span class="sr-only">Actions</span></Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#each paginated as row (row.id)}
							{@const s = statsFor(row.id)}
							<Table.Row class="group transition-colors hover:bg-amber-50/40">
								<Table.Cell>
									<div class="flex flex-col">
										<span class="font-semibold text-gray-900"
											>{row.name} <Badge variant="secondary" class="ml-2">{row.code}</Badge>
										</span>
										<span class="mt-2 flex items-center gap-1 text-xs text-gray-500">
											<MapPinIcon class="h-3 w-3 shrink-0" />
											<span class="truncate">{row.address || '—'}</span>
										</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-2">
										{#if row.type}
											<span
												class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ring-inset {typeBadgeClass(
													row.type
												)}"
											>
												<span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
												{row.type}
											</span>
										{:else}
											<span class="text-xs text-gray-400">—</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell class="hidden text-sm font-medium text-gray-700 lg:table-cell">
									{row.staff ?? 0}
									{#if row.particularsMemoryId}
										<span class="mt-1 block text-xs font-normal text-gray-500">
											{memoryNameById.get(row.particularsMemoryId) ?? '—'}
										</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="hidden md:table-cell">
									<span
										class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800"
									>
										<BirdIcon class="h-3 w-3" />
										{s.batches}
									</span>
								</Table.Cell>
								<Table.Cell class="hidden text-sm font-medium text-gray-700 lg:table-cell">
									{s.chicks > 0 ? s.chicks.toLocaleString() : '—'}
								</Table.Cell>
								<Table.Cell class="hidden text-xs text-gray-500 xl:table-cell">
									<span class="inline-flex items-center gap-1">
										<CalendarDaysIcon class="h-3 w-3" />
										{formatDate(s.lastSet)}
									</span>
								</Table.Cell>
								<Table.Cell>
									<div
										class="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100"
									>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-gray-500 hover:bg-amber-100 hover:text-amber-800"
											aria-label="Edit {row.name}"
											onclick={() => openEdit(row)}
										>
											<PencilIcon class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-gray-500 hover:bg-red-100 hover:text-red-700"
											aria-label="Delete {row.name}"
											onclick={() => askDelete(row)}
										>
											<Trash2Icon class="h-4 w-4" />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell colspan={7} class="py-16">
									<div class="mx-auto flex max-w-sm flex-col items-center text-center">
										<div
											class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
										>
											<InboxIcon class="h-6 w-6" />
										</div>
										{#if hasFilters}
											<p class="font-semibold text-gray-900">No matching farms</p>
											<p class="mt-1 text-sm text-gray-500">
												Try adjusting your search or filters.
											</p>
											<Button variant="outline" class="mt-4" onclick={clearFilters}
												>Clear filters</Button
											>
										{:else}
											<p class="font-semibold text-gray-900">No farms yet</p>
											<p class="mt-1 text-sm text-gray-500">
												Add your first farm site to get started.
											</p>
											<Button class="mt-4 bg-red-700 text-white hover:bg-red-600" onclick={openAdd}>
												<PlusIcon class="mr-2 h-4 w-4" />
												Add Farm
											</Button>
										{/if}
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				<div class="p-4">
					{#if paginated.length === 0}
						<div class="flex flex-col items-center py-16 text-center">
							<div
								class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
							>
								<InboxIcon class="h-6 w-6" />
							</div>
							{#if hasFilters}
								<p class="font-semibold text-gray-900">No matching farms</p>
								<p class="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
								<Button variant="outline" class="mt-4" onclick={clearFilters}>Clear filters</Button>
							{:else}
								<p class="font-semibold text-gray-900">No farms yet</p>
								<p class="mt-1 text-sm text-gray-500">Add your first farm site to get started.</p>
								<Button class="mt-4 bg-red-700 text-white hover:bg-red-600" onclick={openAdd}>
									<PlusIcon class="mr-2 h-4 w-4" />
									Add Farm
								</Button>
							{/if}
						</div>
					{:else}
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{#each paginated as farm (farm.id)}
								{@const s = statsFor(farm.id)}
								<div
									class="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
								>
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<div class="flex flex-wrap items-center gap-1.5">
												{#if farm.type}
													<span
														class="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-inset {typeBadgeClass(
															farm.type
														)}"
													>
														{farm.type}
													</span>
												{/if}
												<span class="font-mono text-[11px] text-gray-500">{farm.code}</span>
											</div>
											<h3 class="mt-2 truncate text-base font-bold text-gray-900">
												{farm.name}
											</h3>
											{#if farm.address}
												<p class="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
													<MapPinIcon class="h-3 w-3 shrink-0" />
													<span class="truncate">{farm.address}</span>
												</p>
											{/if}
											<p class="mt-1 text-xs text-gray-500">
												{farm.staff ?? 0} staff
												{#if farm.particularsMemoryId}
													· {memoryNameById.get(farm.particularsMemoryId) ?? '—'}
												{/if}
											</p>
										</div>
										<div class="flex gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
											<Button
												variant="ghost"
												size="icon"
												class="h-7 w-7 text-gray-500 hover:bg-amber-100 hover:text-amber-800"
												aria-label="Edit {farm.name}"
												onclick={() => openEdit(farm)}
											>
												<PencilIcon class="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-7 w-7 text-gray-500 hover:bg-red-100 hover:text-red-700"
												aria-label="Delete {farm.name}"
												onclick={() => askDelete(farm)}
											>
												<Trash2Icon class="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>

									<div class="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
										<div>
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Batches
											</p>
											<p class="mt-0.5 text-sm font-bold text-gray-900">{s.batches}</p>
										</div>
										<div>
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Chicks
											</p>
											<p class="mt-0.5 text-sm font-bold text-gray-900">
												{s.chicks.toLocaleString()}
											</p>
										</div>
										<div>
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Last set
											</p>
											<p class="mt-0.5 truncate text-sm font-bold text-gray-900">
												{formatDate(s.lastSet)}
											</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Pagination -->
			{#if rows.length > 0}
				<div
					class="flex flex-col gap-3 border-t border-gray-100 bg-stone-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex flex-wrap items-center gap-4 text-xs text-gray-500">
						<span>
							Showing
							<span class="font-semibold text-gray-700">
								{filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
							</span>
							–
							<span class="font-semibold text-gray-700">
								{Math.min(currentPage * pageSize, filtered.length)}
							</span>
							of
							<span class="font-semibold text-gray-700">{filtered.length}</span>
							{filtered.length === 1 ? 'farm' : 'farms'}
							{#if filtered.length !== rows.length}
								<span class="text-gray-400">(filtered from {rows.length})</span>
							{/if}
						</span>

						<div class="flex items-center gap-2">
							<span class="text-gray-400">Rows per page</span>
							<Select.Root type="single" bind:value={pageSizeRaw}>
								<Select.Trigger
									class="h-8 w-[72px] rounded-md border-gray-300 text-xs"
									aria-label="Rows per page"
								>
									{pageSizeRaw}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="10">10</Select.Item>
									<Select.Item value="15">15</Select.Item>
									<Select.Item value="20">20</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>
					</div>

					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							size="icon"
							class="h-8 w-8 rounded-md border-gray-300"
							disabled={currentPage <= 1}
							onclick={() => goToPage(currentPage - 1)}
							aria-label="Previous page"
						>
							<ChevronLeftIcon class="h-4 w-4" />
						</Button>
						<span class="min-w-[80px] text-center text-xs font-medium text-gray-700">
							Page {currentPage} of {totalPages}
						</span>
						<Button
							variant="outline"
							size="icon"
							class="h-8 w-8 rounded-md border-gray-300"
							disabled={currentPage >= totalPages}
							onclick={() => goToPage(currentPage + 1)}
							aria-label="Next page"
						>
							<ChevronRightIcon class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<FarmFormDialog
	bind:open={formOpen}
	farm={editingFarm}
	memories={data.memory ?? []}
	farms={rows}
	onsave={handleSave}
/>
<DeleteFarmDialog bind:open={deleteOpen} farm={deleteTarget} onconfirm={confirmDelete} />
