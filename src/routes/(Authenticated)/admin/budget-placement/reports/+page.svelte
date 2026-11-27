<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Checkbox } from '#lib/components/ui/checkbox/index.js';
	import {
		SearchIcon,
		EyeIcon,
		InboxIcon,
		XIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		BuildingIcon,
		FileTextIcon,
		CircleCheckIcon,
		BanIcon,
		LayoutGridIcon,
		ListIcon,
		CalendarDaysIcon,
		ArrowUpDownIcon,
		ArrowUpIcon,
		ArrowDownIcon,
		TriangleAlertIcon
	} from '@lucide/svelte';

	const BASE = '/admin/budget-placement/reports';

	type Report = {
		id: string;
		documentId: string;
		farmId: string | null;
		farmCode: string;
		farmName: string;
		chickBatchId: string;
		batchNumber: string;
		volume: number;
		grandTotal: number;
		status: string;
		createdBy: string | null;
		createdAt: Date | string;
		farmType: string | null;
	};
	type SortKey = 'doc' | 'farm' | 'batch' | 'volume' | 'total' | 'saved' | 'status';
	type SortDir = 'asc' | 'desc';
	type StatusFilter = 'all' | 'active' | 'void';
	type VolumeFilter = 'all' | 'small' | 'mid' | 'large';
	type SavedFilter = 'all' | 'today' | 'last-7' | 'last-30' | 'this-month' | 'this-year';

	//@ts-ignore
	let { data } = $props<{ data: { reports: Report[] } }>();

	const rows = $derived<Report[]>(data.reports ?? []);

	let search = $state('');
	let farmFilter = $state('all');
	let statusFilter = $state<StatusFilter>('active');
	let volumeFilter = $state<VolumeFilter>('all');
	let savedFilter = $state<SavedFilter>('all');
	let dateFrom = $state('');
	let dateTo = $state('');
	let viewMode = $state<'table' | 'grid'>('table');
	let sortValue = $state('saved-desc');

	const sortKey = $derived(sortValue.split('-')[0] as SortKey);
	const sortDir = $derived((sortValue.split('-')[1] === 'asc' ? 'asc' : 'desc') as SortDir);
	const TYPE_STYLES: Record<string, string> = {
		CCS: 'bg-blue-50 text-blue-700 ring-blue-200',
		CON: 'bg-red-50 text-red-700 ring-red-200'
	};

	let pageSizeRaw = $state('10');
	let page = $state(1);
	const pageSize = $derived(Number(pageSizeRaw));

	// ---- Bulk selection state --------------------------------------------
	let selectedIds = $state<Set<string>>(new Set());
	let bulkVoidOpen = $state(false);
	let bulkVoiding = $state(false);

	const selectedCount = $derived(selectedIds.size);

	function toggleSelect(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next; // reassign so Svelte tracks it
	}

	function clearSelection() {
		selectedIds = new Set();
	}

	// ---- Date helpers (everything is compared in Manila time) ------------
	const dayKey = (d: Date | string) =>
		new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

	function daysBetween(aKey: string, bKey: string): number {
		const [ay, am, ad] = aKey.split('-').map(Number);
		const [by, bm, bd] = bKey.split('-').map(Number);
		return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
	}

	const todayKey = $derived(dayKey(new Date()));

	function typeStyle(t: string | null | undefined): string {
		return TYPE_STYLES[(t ?? '').toUpperCase()] ?? 'bg-gray-100 text-gray-600 ring-gray-200';
	}

	function matchesSaved(createdAt: Date | string, filter: SavedFilter): boolean {
		if (filter === 'all') return true;
		const key = dayKey(createdAt);
		const diff = daysBetween(key, todayKey);
		switch (filter) {
			case 'today':
				return diff === 0;
			case 'last-7':
				return diff >= 0 && diff <= 7;
			case 'last-30':
				return diff >= 0 && diff <= 30;
			case 'this-month':
				return key.slice(0, 7) === todayKey.slice(0, 7);
			case 'this-year':
				return key.slice(0, 4) === todayKey.slice(0, 4);
		}
	}

	function formatDateTime(d: Date | string): string {
		return new Date(d).toLocaleString('en-PH', {
			timeZone: 'Asia/Manila',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	const peso = (n: number) =>
		'₱' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

	// ---- Farm options + KPI data -----------------------------------------
	const farmOptions = $derived.by(() => {
		const m = new Map<string, { id: string; name: string; code: string; type: string | null }>();
		for (const r of rows) {
			if (!r.farmId) continue;
			if (!m.has(r.farmId)) {
				m.set(r.farmId, { id: r.farmId, name: r.farmName, code: r.farmCode, type: r.farmType });
			}
		}
		return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
	});

	const farmFilterLabel = $derived(
		farmFilter === 'all'
			? 'All farms'
			: (farmOptions.find((f) => f.id === farmFilter)?.name ?? 'All farms')
	);

	const totals = $derived.by(() => {
		let active = 0;
		let voided = 0;
		let thisMonth = 0;
		for (const r of rows) {
			if (r.status === 'void') voided++;
			else active++;
			if (dayKey(r.createdAt).slice(0, 7) === todayKey.slice(0, 7)) thisMonth++;
		}
		return { all: rows.length, active, voided, thisMonth };
	});

	const topFarms = $derived.by(() => {
		const m = new Map<string, { name: string; code: string; type: string | null; count: number }>();
		for (const r of rows) {
			if (!r.farmId) continue;
			const cur = m.get(r.farmId) ?? {
				name: r.farmName,
				code: r.farmCode,
				type: r.farmType,
				count: 0
			};
			cur.count++;
			m.set(r.farmId, cur);
		}
		return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 4);
	});
	const topMax = $derived(Math.max(1, ...topFarms.map((f) => f.count)));

	// ---- Filtering + sorting + pagination --------------------------------
	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase().replace(/^doc-/, '');

		const result = rows.filter((r) => {
			if (
				q &&
				!r.documentId.toLowerCase().includes(q) &&
				!r.batchNumber.toLowerCase().includes(q) &&
				!r.farmName.toLowerCase().includes(q) &&
				!r.farmCode.toLowerCase().includes(q)
			) {
				return false;
			}
			if (farmFilter !== 'all' && r.farmId !== farmFilter) return false;

			if (statusFilter !== 'all' && r.status !== statusFilter) return false;

			if (volumeFilter === 'small' && r.volume >= 20000) return false;
			if (volumeFilter === 'mid' && (r.volume < 20000 || r.volume >= 40000)) return false;
			if (volumeFilter === 'large' && r.volume < 40000) return false;

			if (!matchesSaved(r.createdAt, savedFilter)) return false;

			const key = dayKey(r.createdAt);
			if (dateFrom && key < dateFrom) return false;
			if (dateTo && key > dateTo) return false;

			return true;
		});

		result.sort((a, b) => {
			let cmp = 0;
			switch (sortKey) {
				case 'doc':
					cmp = a.documentId.localeCompare(b.documentId);
					break;
				case 'farm':
					cmp = a.farmName.localeCompare(b.farmName);
					break;
				case 'batch':
					cmp = a.batchNumber.localeCompare(b.batchNumber, undefined, { numeric: true });
					break;
				case 'volume':
					cmp = a.volume - b.volume;
					break;
				case 'total':
					cmp = a.grandTotal - b.grandTotal;
					break;
				case 'saved':
					cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
					break;
				case 'status':
					cmp = a.status.localeCompare(b.status);
					break;
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});

		return result;
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const currentPage = $derived(Math.min(page, totalPages));
	const paginated = $derived(filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize));

	// ---- Header checkbox helpers (operate on the *filtered* non-void rows) ----
	const selectableFiltered = $derived(filtered.filter((r) => r.status !== 'void'));
	const allFilteredSelected = $derived(
		selectableFiltered.length > 0 && selectableFiltered.every((r) => selectedIds.has(r.documentId))
	);
	const someFilteredSelected = $derived(
		!allFilteredSelected && selectableFiltered.some((r) => selectedIds.has(r.documentId))
	);

	const headerChecked = $derived(
		allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false
	);

	function toggleSelectAll() {
		const next = new Set(selectedIds);
		if (allFilteredSelected) {
			for (const r of selectableFiltered) next.delete(r.documentId);
		} else {
			for (const r of selectableFiltered) next.add(r.documentId);
		}
		selectedIds = next;
	}

	$effect(() => {
		void search;
		void farmFilter;
		void statusFilter;
		void volumeFilter;
		void savedFilter;
		void dateFrom;
		void dateTo;
		void pageSizeRaw;
		void sortValue;
		page = 1;
	});

	const hasFilters = $derived(
		search.trim() !== '' ||
			farmFilter !== 'all' ||
			statusFilter !== 'all' ||
			volumeFilter !== 'all' ||
			savedFilter !== 'all' ||
			dateFrom !== '' ||
			dateTo !== ''
	);

	function clearFilters() {
		search = '';
		farmFilter = 'all';
		statusFilter = 'all';
		volumeFilter = 'all';
		savedFilter = 'all';
		dateFrom = '';
		dateTo = '';
	}

	// ---- Sorting helpers --------------------------------------------------
	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortValue = `${key}-${sortDir === 'asc' ? 'desc' : 'asc'}`;
		} else {
			const dir: SortDir =
				key === 'doc' || key === 'farm' || key === 'batch' || key === 'status' ? 'asc' : 'desc';
			sortValue = `${key}-${dir}`;
		}
	}

	function sortLabel(v: string): string {
		switch (v) {
			case 'saved-desc':
				return 'Newest saved';
			case 'saved-asc':
				return 'Oldest saved';
			case 'doc-asc':
				return 'Document ID (low–high)';
			case 'doc-desc':
				return 'Document ID (high–low)';
			case 'farm-asc':
				return 'Farm (A–Z)';
			case 'farm-desc':
				return 'Farm (Z–A)';
			case 'batch-asc':
				return 'Batch (A–Z)';
			case 'batch-desc':
				return 'Batch (Z–A)';
			case 'volume-desc':
				return 'Highest volume';
			case 'volume-asc':
				return 'Lowest volume';
			case 'total-desc':
				return 'Highest budget';
			case 'total-asc':
				return 'Lowest budget';
			case 'status-asc':
				return 'Status (A–Z)';
			case 'status-desc':
				return 'Status (Z–A)';
			default:
				return v;
		}
	}

	function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
		if (sortKey !== key) return 'none';
		return sortDir === 'asc' ? 'ascending' : 'descending';
	}

	function goToPage(p: number) {
		page = Math.max(1, Math.min(p, totalPages));
	}

	const statusBadge = (s: string) =>
		s === 'void'
			? 'bg-red-50 text-red-700 ring-red-200'
			: 'bg-emerald-50 text-emerald-700 ring-emerald-200';

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
	const iconLink =
		'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-amber-100 hover:text-amber-800';
</script>

<svelte:head>
	<title>Budget Reports | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Records</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Budget Reports</h1>
				<p class="mt-1 text-sm text-gray-500">
					Saved budget placement snapshots, exactly as they were printed.
				</p>
			</div>

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
		</div>

		<!-- KPI CARDS (unchanged) -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
							Total Reports
						</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{totals.all}</p>
					</div>
					<div class="rounded-lg bg-red-50 p-2 text-red-700">
						<FileTextIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">{totals.thisMonth} saved this month</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Active</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{totals.active}</p>
					</div>
					<div class="rounded-lg bg-emerald-50 p-2 text-emerald-700">
						<CircleCheckIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Valid on record</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Voided</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{totals.voided}</p>
					</div>
					<div class="rounded-lg bg-amber-50 p-2 text-amber-700">
						<BanIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Kept for the audit trail</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Top Farms</p>
				<div class="mt-3 space-y-2">
					{#each topFarms as f (f.code)}
						<div class="flex items-center gap-2">
							<span
								class="w-16 shrink-0 truncate font-mono text-[10px] font-semibold text-gray-600"
							>
								{f.code}
							</span>
							<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
								<div
									class="h-full rounded-full bg-red-500 transition-all duration-300"
									style="width: {(f.count / topMax) * 100}%"
								></div>
							</div>
							<span class="w-6 shrink-0 text-right text-xs font-semibold text-gray-700"
								>{f.count}</span
							>
						</div>
					{:else}
						<p class="text-xs text-gray-400">No reports yet</p>
					{/each}
				</div>
			</div>
		</div>

		<!-- CONTENT CARD -->
		<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
			<!-- Filter bar (unchanged) -->
			<div class="border-b border-gray-100 p-4">
				<div class="flex flex-wrap items-center gap-2">
					<div class="relative min-w-[220px] flex-1 sm:max-w-xs">
						<SearchIcon
							class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
						/>
						<Input
							bind:value={search}
							placeholder="Scan or search document ID, batch, farm…"
							class="h-10 rounded-lg border-gray-300 pl-9 {inputCls}"
							aria-label="Search reports"
						/>
					</div>

					<Select.Root type="single" bind:value={farmFilter}>
						<Select.Trigger
							class="h-10 w-[170px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by farm"
						>
							<span class="truncate">{farmFilterLabel}</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All farms</Select.Item>
							{#each farmOptions as f (f.id)}
								<Select.Item value={f.id}>
									<span class="flex items-center gap-2">
										<span>{f.name} ({f.code})</span>
										{#if f.type}
											<span
												class="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ring-1 ring-inset {typeStyle(
													f.type
												)}"
											>
												{f.type}
											</span>
										{/if}
									</span>
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					<Select.Root type="single" bind:value={statusFilter}>
						<Select.Trigger
							class="h-10 w-[140px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by status"
						>
							{statusFilter === 'all'
								? 'All status'
								: statusFilter === 'active'
									? 'Active'
									: 'Voided'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All status</Select.Item>
							<Select.Item value="active">Active</Select.Item>
							<Select.Item value="void">Voided</Select.Item>
						</Select.Content>
					</Select.Root>

					<Select.Root type="single" bind:value={volumeFilter}>
						<Select.Trigger
							class="h-10 w-[160px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by volume"
						>
							{#if volumeFilter === 'all'}All volumes
							{:else if volumeFilter === 'small'}Under 20,000
							{:else if volumeFilter === 'mid'}20,000–39,999
							{:else}40,000+{/if}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All volumes</Select.Item>
							<Select.Item value="small">Under 20,000</Select.Item>
							<Select.Item value="mid">20,000–39,999</Select.Item>
							<Select.Item value="large">40,000+</Select.Item>
						</Select.Content>
					</Select.Root>

					<Select.Root type="single" bind:value={savedFilter}>
						<Select.Trigger
							class="h-10 w-[160px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by saved date"
						>
							{#if savedFilter === 'all'}Any date
							{:else if savedFilter === 'today'}Today
							{:else if savedFilter === 'last-7'}Last 7 days
							{:else if savedFilter === 'last-30'}Last 30 days
							{:else if savedFilter === 'this-month'}This month
							{:else}This year{/if}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">Any date</Select.Item>
							<Select.Item value="today">Today</Select.Item>
							<Select.Item value="last-7">Last 7 days</Select.Item>
							<Select.Item value="last-30">Last 30 days</Select.Item>
							<Select.Item value="this-month">This month</Select.Item>
							<Select.Item value="this-year">This year</Select.Item>
						</Select.Content>
					</Select.Root>

					<div class="flex items-center gap-1.5">
						<Input
							type="date"
							bind:value={dateFrom}
							max={dateTo || undefined}
							class="h-10 w-[140px] rounded-lg border-gray-300 text-sm {inputCls}"
							aria-label="Saved from date"
						/>
						<span class="text-xs text-gray-400">to</span>
						<Input
							type="date"
							bind:value={dateTo}
							min={dateFrom || undefined}
							class="h-10 w-[140px] rounded-lg border-gray-300 text-sm {inputCls}"
							aria-label="Saved to date"
						/>
					</div>

					<Select.Root type="single" bind:value={sortValue}>
						<Select.Trigger
							class="h-10 w-[200px] rounded-lg border-gray-300 text-sm"
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
							<Select.Item value="saved-desc">Newest saved</Select.Item>
							<Select.Item value="saved-asc">Oldest saved</Select.Item>
							<Select.Item value="doc-asc">Document ID (low–high)</Select.Item>
							<Select.Item value="doc-desc">Document ID (high–low)</Select.Item>
							<Select.Item value="farm-asc">Farm (A–Z)</Select.Item>
							<Select.Item value="farm-desc">Farm (Z–A)</Select.Item>
							<Select.Item value="batch-asc">Batch (A–Z)</Select.Item>
							<Select.Item value="batch-desc">Batch (Z–A)</Select.Item>
							<Select.Item value="volume-desc">Highest volume</Select.Item>
							<Select.Item value="volume-asc">Lowest volume</Select.Item>
							<Select.Item value="total-desc">Highest budget</Select.Item>
							<Select.Item value="total-asc">Lowest budget</Select.Item>
							<Select.Item value="status-asc">Status (A–Z)</Select.Item>
							<Select.Item value="status-desc">Status (Z–A)</Select.Item>
						</Select.Content>
					</Select.Root>

					{#if hasFilters}
						<Button
							variant="ghost"
							class="h-10 text-gray-600 hover:text-red-700"
							onclick={clearFilters}
						>
							<XIcon class="mr-1 h-4 w-4" /> Clear
						</Button>
					{/if}
				</div>
			</div>

			<!-- NEW: BULK ACTION BAR -->
			{#if selectedCount > 0}
				<div
					class="flex flex-wrap items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5"
				>
					<p class="text-sm font-semibold text-red-900">
						{selectedCount}
						{selectedCount === 1 ? 'report' : 'reports'} selected
					</p>
					<div class="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							class="text-red-800 hover:bg-red-100"
							onclick={clearSelection}
						>
							Clear
						</Button>
						<Button
							size="sm"
							class="bg-red-700 text-white hover:bg-red-600"
							onclick={() => (bulkVoidOpen = true)}
						>
							<BanIcon class="mr-1.5 h-4 w-4" />
							Void selected
						</Button>
					</div>
				</div>
			{/if}

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

			{#snippet emptyState()}
				<div class="mx-auto flex max-w-sm flex-col items-center text-center">
					<div
						class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
					>
						<InboxIcon class="h-6 w-6" />
					</div>
					{#if hasFilters}
						<p class="font-semibold text-gray-900">No matching reports</p>
						<p class="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
						<Button variant="outline" class="mt-4" onclick={clearFilters}>Clear filters</Button>
					{:else}
						<p class="font-semibold text-gray-900">No reports yet</p>
						<p class="mt-1 text-sm text-gray-500">
							A report is saved the first time you print or download a budget placement.
						</p>
					{/if}
				</div>
			{/snippet}

			{#if viewMode === 'table'}
				<Table.Root>
					<Table.Header class="bg-stone-50">
						<Table.Row class="hover:bg-transparent">
							<!-- NEW: Select-all -->
							<Table.Head class="w-10 pr-0">
								<Checkbox
									checked={headerChecked}
									onCheckedChange={toggleSelectAll}
									disabled={selectableFiltered.length === 0}
									aria-label="Select all visible reports"
								/>
							</Table.Head>
							<Table.Head class={thCls}>
								<button
									type="button"
									onclick={() => toggleSort('doc')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('doc')}
								>
									Document
									{@render sortIcon('doc')}
								</button>
							</Table.Head>
							<Table.Head class={thCls}>
								<button
									type="button"
									onclick={() => toggleSort('farm')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('farm')}
								>
									Farm
									{@render sortIcon('farm')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} hidden md:table-cell">
								<button
									type="button"
									onclick={() => toggleSort('batch')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('batch')}
								>
									Batch
									{@render sortIcon('batch')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} hidden md:table-cell">
								<button
									type="button"
									onclick={() => toggleSort('volume')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('volume')}
								>
									Volume
									{@render sortIcon('volume')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} hidden md:table-cell">
								<button
									type="button"
									onclick={() => toggleSort('total')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('total')}
								>
									Budget
									{@render sortIcon('total')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} hidden lg:table-cell">
								<button
									type="button"
									onclick={() => toggleSort('saved')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('saved')}
								>
									Saved
									{@render sortIcon('saved')}
								</button>
							</Table.Head>
							<Table.Head class={thCls}>
								<button
									type="button"
									onclick={() => toggleSort('status')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('status')}
								>
									Status
									{@render sortIcon('status')}
								</button>
							</Table.Head>
							<Table.Head class="w-16"><span class="sr-only">Actions</span></Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#each paginated as row (row.id)}
							<Table.Row class="group transition-colors hover:bg-amber-50/40">
								<!-- NEW: Row checkbox -->
								<Table.Cell class="w-10 pr-0">
									<Checkbox
										checked={selectedIds.has(row.documentId)}
										onCheckedChange={() => toggleSelect(row.documentId)}
										disabled={row.status === 'void'}
										aria-label="Select {row.documentId}"
									/>
								</Table.Cell>
								<Table.Cell>
									<a
										href="{BASE}/{row.documentId}"
										class="font-mono text-sm font-semibold hover:underline {row.status === 'void'
											? 'text-gray-400 line-through'
											: 'text-red-700'}"
									>
										{row.documentId}
									</a>
								</Table.Cell>
								<Table.Cell>
									<span
										class="inline-flex flex-wrap items-center gap-1.5 font-semibold text-gray-900"
									>
										{row.farmName}
										<Badge variant="secondary">{row.farmCode}</Badge>
										{#if row.farmType}
											<span
												class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset {typeStyle(
													row.farmType
												)}"
											>
												{row.farmType}
											</span>
										{/if}
									</span>
								</Table.Cell>
								<Table.Cell class="hidden font-mono text-xs text-gray-700 md:table-cell">
									{row.batchNumber}
								</Table.Cell>
								<Table.Cell
									class="hidden text-sm font-medium text-gray-700 tabular-nums md:table-cell"
								>
									{row.volume.toLocaleString('en-US')}
								</Table.Cell>
								<Table.Cell
									class="hidden text-sm font-semibold text-gray-900 tabular-nums md:table-cell"
								>
									{peso(row.grandTotal)}
								</Table.Cell>
								<Table.Cell class="hidden text-xs text-gray-500 lg:table-cell">
									<span class="inline-flex items-center gap-1">
										<CalendarDaysIcon class="h-3 w-3" />
										{formatDateTime(row.createdAt)}
									</span>
								</Table.Cell>
								<Table.Cell>
									<span
										class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset {statusBadge(
											row.status
										)}"
									>
										<span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
										{row.status}
									</span>
								</Table.Cell>
								<Table.Cell>
									<div
										class="flex justify-end opacity-60 transition-opacity group-hover:opacity-100"
									>
										<a
											href="{BASE}/{row.documentId}"
											class={iconLink}
											aria-label="View {row.documentId}"
										>
											<EyeIcon class="h-4 w-4" />
										</a>
									</div>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell colspan={9} class="py-16">
									{@render emptyState()}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				<div class="p-4">
					{#if paginated.length === 0}
						<div class="py-16">{@render emptyState()}</div>
					{:else}
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{#each paginated as row (row.id)}
								<a
									href="{BASE}/{row.documentId}"
									class="group relative block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
								>
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<div class="flex flex-wrap items-center gap-1.5">
												<span
													class="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ring-inset {statusBadge(
														row.status
													)}"
												>
													{row.status}
												</span>
												<span class="font-mono text-[11px] text-gray-500">{row.farmCode}</span>
												{#if row.farmType}
													<span
														class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset {typeStyle(
															row.farmType
														)}"
													>
														{row.farmType}
													</span>
												{/if}
											</div>
											<h3
												class="mt-2 truncate font-mono text-base font-bold {row.status === 'void'
													? 'text-gray-400 line-through'
													: 'text-gray-900'}"
											>
												{row.documentId}
											</h3>
											<p class="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
												<BuildingIcon class="h-3 w-3 shrink-0" />
												<span class="truncate">{row.farmName} · {row.batchNumber}</span>
											</p>
										</div>

										<div role="presentation" onclick={(e) => e.stopPropagation()}>
											<Checkbox
												checked={selectedIds.has(row.documentId)}
												onCheckedChange={() => toggleSelect(row.documentId)}
												disabled={row.status === 'void'}
												aria-label="Select {row.documentId}"
											/>
										</div>
									</div>

									<div class="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
										<div>
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Volume
											</p>
											<p class="mt-0.5 text-sm font-bold text-gray-900">
												{row.volume.toLocaleString('en-US')}
											</p>
										</div>
										<div>
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Budget
											</p>
											<p class="mt-0.5 truncate text-sm font-bold text-gray-900">
												{peso(row.grandTotal)}
											</p>
										</div>
										<div>
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Saved
											</p>
											<p class="mt-0.5 truncate text-sm font-bold text-gray-900">
												{formatDateTime(row.createdAt)}
											</p>
										</div>
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Pagination (unchanged) -->
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
							{filtered.length === 1 ? 'report' : 'reports'}
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
									<Select.Item value="20">20</Select.Item>
									<Select.Item value="50">50</Select.Item>
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

<!-- NEW: BULK VOID CONFIRMATION -->
<Dialog.Root bind:open={bulkVoidOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<div
				class="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-700"
			>
				<TriangleAlertIcon class="h-5 w-5" />
			</div>
			<Dialog.Title>
				Void {selectedCount}
				{selectedCount === 1 ? 'budget report' : 'budget reports'}?
			</Dialog.Title>
			<Dialog.Description>
				The selected reports will be marked as void. They stay on record for the audit trail and
				print with a VOID mark. This can't be undone.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/void"
			use:enhance={() => {
				bulkVoiding = true;
				return async ({ result, update }) => {
					await update();
					bulkVoiding = false;

					if (result.type === 'success') {
						const voided = (result.data as { voided?: number } | null)?.voided ?? selectedCount;
						const requested =
							(result.data as { requested?: number } | null)?.requested ?? selectedCount;

						bulkVoidOpen = false;
						clearSelection();

						if (voided === 0) {
							toast.info('Those reports were already void.');
						} else if (voided < requested) {
							toast.success(
								`${voided} of ${requested} reports voided (${requested - voided} were already void).`
							);
						} else {
							toast.success(`${voided} ${voided === 1 ? 'report' : 'reports'} voided`);
						}
					} else {
						toast.error('Could not void the reports. Please try again.');
					}
				};
			}}
		>
			{#each [...selectedIds] as documentId (documentId)}
				<input type="hidden" name="documentIds" value={documentId} />
			{/each}
			<Dialog.Footer class="gap-2 sm:gap-2">
				<Button
					type="button"
					variant="outline"
					disabled={bulkVoiding}
					onclick={() => (bulkVoidOpen = false)}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={bulkVoiding}
					class="bg-red-700 font-semibold text-white hover:bg-red-600"
				>
					{bulkVoiding ? 'Voiding…' : `Void ${selectedCount}`}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
