<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { tick } from 'svelte';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import type { Farm } from '#lib/types/farms.ts';
	import type { ChickBatch, ChickBatchWithFarm } from '#lib/types/chick-batches.ts';
	import {
		PlusIcon,
		SearchIcon,
		PencilIcon,
		Trash2Icon,
		InboxIcon,
		XIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		BirdIcon,
		MapPinIcon,
		EggIcon,
		CalendarDaysIcon,
		LayoutGridIcon,
		ListIcon,
		CopyIcon,
		TrendingUpIcon,
		ClockIcon,
		ArrowUpDownIcon,
		ArrowUpIcon,
		ArrowDownIcon,
		ChevronDownIcon,
		CheckIcon,
		BuildingIcon,
		// NEW icons
		SlidersHorizontalIcon,
		FilterXIcon,
		FileDownIcon
	} from '@lucide/svelte';
	import ChickBatchFormDialog from '#lib/components/chick-batch/ChickBatchFormDialog.svelte';
	import DeleteChickBatchDialog from '#lib/components/chick-batch/DeleteChickBatchDialog.svelte';
	import ChickBatchReportDialog from '#lib/components/chick-batch/ChickBatchReportDialog.svelte';

	//@ts-ignore
	let { data } = $props<{ data: { batches: ChickBatchWithFarm[]; farms: Farm[] } }>();

	type SortKey = 'date' | 'volume';
	type SortDir = 'asc' | 'desc';
	type SortValue = `${SortKey}-${SortDir}`;

	let rows = $state<ChickBatchWithFarm[]>(data.batches);
	let search = $state('');
	let farmFilter = $state('all');
	let viewMode = $state<'table' | 'grid'>('table');
	let sortValue = $state<SortValue>('date-desc');

	const sortKey = $derived(sortValue.split('-')[0] as SortKey);
	const sortDir = $derived(sortValue.split('-')[1] as SortDir);

	let pageSizeRaw = $state('10');
	let page = $state(1);
	const pageSize = $derived(Number(pageSizeRaw));

	let formOpen = $state(false);
	let editingBatch = $state<ChickBatch | null>(null);
	let deleteOpen = $state(false);
	let deleteTarget = $state<ChickBatchWithFarm | null>(null);

	// ---- Searchable farm filter ----------------------------------------
	let farmPickerOpen = $state(false);
	let farmSearch = $state('');
	let farmPickerEl: HTMLDivElement;
	let farmSearchEl: HTMLInputElement | undefined = $state();

	let exportOpen = $state(false);

	// ---- NEW: date preset filter ---------------------------------------
	type DatePreset = 'all' | 'today' | 'week' | 'last30' | 'month' | 'year' | 'custom';
	let datePreset = $state<DatePreset>('all');
	let dateFrom = $state('');
	let dateTo = $state('');

	// ---- NEW: advanced filters -----------------------------------------
	let volumeMin = $state('');
	let volumeMax = $state('');
	let farmTypeFilter = $state('all');
	let showAdvanced = $state(false);

	const datePresets: { value: DatePreset; label: string }[] = [
		{ value: 'all', label: 'All time' },
		{ value: 'today', label: 'Today' },
		{ value: 'week', label: 'Last 7 days' },
		{ value: 'last30', label: 'Last 30 days' },
		{ value: 'month', label: 'This month' },
		{ value: 'year', label: 'This year' },
		{ value: 'custom', label: 'Custom' }
	];

	// Distinct farm types present in the dataset (for the type filter dropdown)
	const farmTypes = $derived(
		[...new Set(data.farms.map((f) => f.type).filter((t): t is string => Boolean(t)))].sort()
	);

	// Resolved date window from the preset (null = no filter)
	const activeDateRange = $derived.by(() => {
		const pad = (n: number) => String(n).padStart(2, '0');
		const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		switch (datePreset) {
			case 'today':
				return { from: ymd(today), to: ymd(today) };
			case 'week': {
				const d = new Date(today);
				d.setDate(d.getDate() - 7);
				return { from: ymd(d), to: ymd(today) };
			}
			case 'last30': {
				const d = new Date(today);
				d.setDate(d.getDate() - 30);
				return { from: ymd(d), to: ymd(today) };
			}
			case 'month': {
				const d = new Date(today.getFullYear(), today.getMonth(), 1);
				return { from: ymd(d), to: ymd(today) };
			}
			case 'year': {
				const d = new Date(today.getFullYear(), 0, 1);
				return { from: ymd(d), to: ymd(today) };
			}
			case 'custom':
				return dateFrom || dateTo ? { from: dateFrom, to: dateTo } : null;
			default:
				return null;
		}
	});

	// Count of active advanced filters (for the badge on the Filters button)
	const advancedCount = $derived(
		(volumeMin ? 1 : 0) + (volumeMax ? 1 : 0) + (farmTypeFilter !== 'all' ? 1 : 0)
	);

	const exportFilters = $derived({
		search: search.trim(),
		farmId: farmFilter === 'all' ? null : farmFilter,
		farmLabel:
			farmFilter === 'all'
				? 'All Farms'
				: (data.farms.find((f) => f.id === farmFilter)?.name ?? 'All Farms'),
		sort: sortValue
	});

	$effect(() => {
		if (farmPickerOpen) {
			tick().then(() => farmSearchEl?.focus());
		}
	});

	const selectedFarmForFilter = $derived(data.farms.find((f) => f.id === farmFilter) ?? null);

	const filteredFarmsForFilter = $derived.by(() => {
		const q = farmSearch.trim().toLowerCase();
		if (!q) return data.farms;
		return data.farms.filter(
			(f) =>
				f.name.toLowerCase().includes(q) ||
				f.code.toLowerCase().includes(q) ||
				f.address.toLowerCase().includes(q)
		);
	});

	function toggleFarmPicker() {
		farmPickerOpen = !farmPickerOpen;
		if (!farmPickerOpen) farmSearch = '';
	}

	function selectFarmFilter(id: string) {
		farmFilter = id;
		farmPickerOpen = false;
		farmSearch = '';
	}

	function onWindowClick(e: MouseEvent) {
		if (!farmPickerOpen) return;
		if (farmPickerEl && !farmPickerEl.contains(e.target as Node)) {
			farmPickerOpen = false;
			farmSearch = '';
		}
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && farmPickerOpen) {
			farmPickerOpen = false;
			farmSearch = '';
		}
	}
	// ---------------------------------------------------------------------

	// ---- Live KPI totals (across ALL rows, not filtered) ---------------
	const totals = $derived.by(() => {
		let chicks = 0;
		const byFarm = new Map<
			string,
			{ name: string; code: string; chicks: number; batches: number }
		>();
		const now = new Date();
		const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		let thisMonthBatches = 0;
		let thisMonthChicks = 0;

		for (const b of rows) {
			chicks += b.volume;
			const cur = byFarm.get(b.farmId) ?? {
				name: b.farm.name,
				code: b.farm.code,
				chicks: 0,
				batches: 0
			};
			cur.chicks += b.volume;
			cur.batches += 1;
			byFarm.set(b.farmId, cur);

			if (b.dateSet.slice(0, 7) === thisMonthKey) {
				thisMonthBatches += 1;
				thisMonthChicks += b.volume;
			}
		}

		const topFarms = [...byFarm.entries()]
			.map(([id, v]) => ({ id, ...v }))
			.sort((a, b) => b.chicks - a.chicks)
			.slice(0, 4);

		return {
			batches: rows.length,
			chicks,
			thisMonthBatches,
			thisMonthChicks,
			avgPerBatch: rows.length ? Math.round(chicks / rows.length) : 0,
			byFarm: byFarm.size,
			topFarms,
			maxFarmChicks: topFarms[0]?.chicks ?? 0
		};
	});

	// ---- Filtering + sorting + pagination (updated with new filters) ---
	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const vMin = volumeMin ? Number(volumeMin) : null;
		const vMax = volumeMax ? Number(volumeMax) : null;

		const result = rows.filter((r) => {
			const matchesSearch =
				!q ||
				r.batchNumber.toLowerCase().includes(q) ||
				r.farm.name.toLowerCase().includes(q) ||
				r.farm.code.toLowerCase().includes(q) ||
				r.farm.address.toLowerCase().includes(q);

			const matchesFarm = farmFilter === 'all' || r.farmId === farmFilter;

			const matchesDate =
				!activeDateRange ||
				((!activeDateRange.from || r.dateSet.slice(0, 10) >= activeDateRange.from) &&
					(!activeDateRange.to || r.dateSet.slice(0, 10) <= activeDateRange.to));

			const matchesVolume =
				(vMin === null || r.volume >= vMin) && (vMax === null || r.volume <= vMax);

			const matchesType = farmTypeFilter === 'all' || r.farm.type === farmTypeFilter;

			return matchesSearch && matchesFarm && matchesDate && matchesVolume && matchesType;
		});

		result.sort((a, b) => {
			let cmp = 0;
			if (sortKey === 'date') {
				cmp = a.dateSet.slice(0, 10).localeCompare(b.dateSet.slice(0, 10));
			} else {
				cmp = a.volume - b.volume;
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});

		return result;
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const currentPage = $derived(Math.min(page, totalPages));
	const paginated = $derived(filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize));

	// Reset to page 1 whenever any filter changes
	$effect(() => {
		void search;
		void farmFilter;
		void pageSizeRaw;
		void sortValue;
		void datePreset;
		void dateFrom;
		void dateTo;
		void volumeMin;
		void volumeMax;
		void farmTypeFilter;
		page = 1;
	});

	const hasFilters = $derived(
		search.trim() !== '' ||
			farmFilter !== 'all' ||
			datePreset !== 'all' ||
			volumeMin !== '' ||
			volumeMax !== '' ||
			farmTypeFilter !== 'all'
	);

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortValue = `${key}-${sortDir === 'asc' ? 'desc' : 'asc'}` as SortValue;
		} else {
			sortValue = `${key}-desc` as SortValue;
		}
	}

	function sortLabel(v: SortValue): string {
		switch (v) {
			case 'date-desc':
				return 'Newest first';
			case 'date-asc':
				return 'Oldest first';
			case 'volume-desc':
				return 'Largest first';
			case 'volume-asc':
				return 'Smallest first';
		}
	}

	// ---- Actions --------------------------------------------------------
	function openAdd() {
		editingBatch = null;
		formOpen = true;
	}

	function openEdit(b: ChickBatchWithFarm) {
		editingBatch = {
			id: b.id,
			farmId: b.farmId,
			batchNumber: b.batchNumber,
			dateSet: b.dateSet,
			volume: b.volume,
			sequence: b.sequence
		};
		formOpen = true;
	}

	function goToPage(p: number) {
		page = Math.max(1, Math.min(p, totalPages));
	}

	async function handleSave(payload: {
		id?: string;
		farmId: string;
		dateSet: string;
		volume: number;
	}) {
		const isEdit = Boolean(payload.id);
		const response = await fetch('/api/chick-batches', {
			method: isEdit ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const result = await response.json();
		if (!response.ok) throw new Error(result.error || 'Failed to save the batch.');

		const saved = result.batch as ChickBatch;
		const farm = data.farms.find((f) => f.id === saved.farmId)!;
		const withFarm: ChickBatchWithFarm = {
			...saved,
			farm: {
				id: farm.id,
				name: farm.name,
				code: farm.code,
				address: farm.address,
				type: farm.type // NEW: required for farmTypeFilter to work on saved rows
			}
		};

		rows = isEdit ? rows.map((r) => (r.id === saved.id ? withFarm : r)) : [withFarm, ...rows];

		toast.success(`${isEdit ? 'Updated' : 'Added'} batch ${saved.batchNumber}`);
	}

	function askDelete(b: ChickBatchWithFarm) {
		deleteTarget = b;
		deleteOpen = true;
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		const removed = deleteTarget;
		try {
			const res = await fetch(`/api/chick-batches/delete/${removed.id}`, { method: 'DELETE' });
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Failed to delete the batch.');
			rows = rows.filter((r) => r.id !== removed.id);
			deleteOpen = false;
			toast.success(`Deleted batch ${removed.batchNumber}`);
		} catch (err: any) {
			toast.error(err.message || 'Could not delete the batch.');
		}
	}

	function clearFilters() {
		search = '';
		farmFilter = 'all';
		datePreset = 'all';
		dateFrom = '';
		dateTo = '';
		volumeMin = '';
		volumeMax = '';
		farmTypeFilter = 'all';
	}

	function resetAdvanced() {
		volumeMin = '';
		volumeMax = '';
		farmTypeFilter = 'all';
	}

	async function copyBatchNumber(bn: string) {
		try {
			await navigator.clipboard.writeText(bn);
			toast.success(`Copied ${bn}`);
		} catch {
			toast.error('Could not copy batch number.');
		}
	}

	// ---- Utilities ------------------------------------------------------
	function formatDate(dateStr: string): string {
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

	function ageDays(dateStr: string): number | null {
		if (!dateStr) return null;
		const clean = dateStr.slice(0, 10);
		const parts = clean.split('-');
		if (parts.length !== 3) return null;
		const [y, m, d] = parts.map(Number);
		if (!y || !m || !d) return null;
		const setDate = new Date(y, m - 1, d);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		setDate.setHours(0, 0, 0, 0);
		return Math.round((today.getTime() - setDate.getTime()) / 86400000);
	}

	function ageLabel(dateStr: string): string {
		const days = ageDays(dateStr);
		if (days === null) return '';
		if (days < 0) return `in ${Math.abs(days)}d`;
		if (days === 0) return 'today';
		if (days === 1) return '1 day';
		if (days < 100) return `${days} days`;
		return `${Math.floor(days / 30)} mo`;
	}

	function ageClass(dateStr: string): string {
		const days = ageDays(dateStr);
		if (days === null || days < 0) return 'bg-gray-100 text-gray-600 ring-gray-200';
		if (days <= 7) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
		if (days <= 21) return 'bg-amber-50 text-amber-700 ring-amber-200';
		return 'bg-stone-100 text-stone-600 ring-stone-200';
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<svelte:head>
	<title>Chick Batches | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Chick Management</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Chick Batches</h1>
				<p class="mt-1 text-sm text-gray-500">
					Track day-old chick batches per farm and watch their age.
				</p>
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
					variant="outline"
					onclick={() => (exportOpen = true)}
					disabled={rows.length === 0}
					class="h-10 rounded-lg border-gray-300 px-4 font-semibold text-gray-700 hover:bg-stone-50 disabled:opacity-50"
				>
					<FileDownIcon class="mr-2 h-4 w-4" />
					Export Report
				</Button>

				<Button
					onclick={openAdd}
					disabled={data.farms.length === 0}
					class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-600 active:scale-[0.98] disabled:opacity-50"
				>
					<PlusIcon class="mr-2 h-4 w-4" />
					Add Batch
				</Button>
			</div>
		</div>

		{#if data.farms.length === 0}
			<div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
				You need to add at least one farm before you can create a chick batch.
			</div>
		{/if}

		<!-- KPI CARDS -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
					Across {totals.byFarm}
					{totals.byFarm === 1 ? 'farm' : 'farms'}
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
				<p class="mt-2 text-xs text-gray-500">
					Avg {totals.avgPerBatch.toLocaleString()} per batch
				</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">This Month</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{totals.thisMonthBatches}</p>
					</div>
					<div class="rounded-lg bg-blue-50 p-2 text-blue-700">
						<CalendarDaysIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">
					{totals.thisMonthChicks.toLocaleString()} chicks set
				</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">By Farm</p>
				{#if totals.topFarms.length === 0}
					<p class="mt-3 text-xs text-gray-400">No batches yet</p>
				{:else}
					<div class="mt-3 space-y-2">
						{#each totals.topFarms as f (f.id)}
							{@const pct = totals.maxFarmChicks ? (f.chicks / totals.maxFarmChicks) * 100 : 0}
							<div class="flex items-center gap-2">
								<span class="w-20 shrink-0 truncate text-[11px] font-medium text-gray-700">
									{f.code}
								</span>
								<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
									<div
										class="h-full rounded-full bg-red-500 transition-all duration-300"
										style="width: {pct}%"
									></div>
								</div>
								<span class="w-10 shrink-0 text-right text-[11px] font-semibold text-gray-700">
									{f.chicks.toLocaleString()}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- CONTENT CARD -->
		<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
			<!-- Filter bar (EXTENDED) -->
			<div class="space-y-3 border-b border-gray-100 p-4">
				<!-- Row 1: primary filters -->
				<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div class="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
						<!-- Search -->
						<div class="relative w-full sm:max-w-xs">
							<SearchIcon
								class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
							/>
							<Input
								bind:value={search}
								placeholder="Search Chick In No., farm, or address…"
								class="h-10 rounded-lg border-gray-300 pl-9 {inputCls}"
								aria-label="Search batches"
							/>
						</div>

						<!-- Searchable farm picker -->
						<div class="relative w-full sm:w-[240px]" bind:this={farmPickerEl}>
							<button
								type="button"
								onclick={toggleFarmPicker}
								aria-haspopup="listbox"
								aria-expanded={farmPickerOpen}
								class="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 text-left text-sm shadow-xs transition-colors hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
							>
								<span class="flex min-w-0 flex-1 items-center gap-1.5">
									{#if selectedFarmForFilter}
										<BuildingIcon class="h-3.5 w-3.5 shrink-0 text-gray-400" />
										<span class="truncate font-medium text-gray-900">
											{selectedFarmForFilter.name}
										</span>
										<span class="shrink-0 font-mono text-[10px] text-gray-500">
											{selectedFarmForFilter.code}
										</span>
									{:else}
										<span class="text-gray-500">All farms</span>
									{/if}
								</span>
								<ChevronDownIcon
									class="h-4 w-4 shrink-0 text-gray-400 transition-transform {farmPickerOpen
										? 'rotate-180'
										: ''}"
								/>
							</button>

							{#if farmPickerOpen}
								<div
									class="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
								>
									<div class="border-b border-gray-100 p-2">
										<div class="relative">
											<SearchIcon
												class="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400"
											/>
											<Input
												bind:this={farmSearchEl}
												bind:value={farmSearch}
												placeholder="Search name, code, or address…"
												class="h-9 rounded-md border-gray-300 pl-8 text-sm {inputCls}"
												aria-label="Search farms"
											/>
										</div>
									</div>

									<ul class="max-h-60 overflow-y-auto py-1" role="listbox">
										<li role="option" aria-selected={farmFilter === 'all'}>
											<button
												type="button"
												onclick={() => selectFarmFilter('all')}
												class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors {farmFilter ===
												'all'
													? 'bg-amber-50'
													: 'hover:bg-stone-50'}"
											>
												<span class="font-medium text-gray-900">All farms</span>
												{#if farmFilter === 'all'}
													<CheckIcon class="h-4 w-4 text-red-700" />
												{/if}
											</button>
										</li>
										{#each filteredFarmsForFilter as f (f.id)}
											{@const isSelected = f.id === farmFilter}
											<li role="option" aria-selected={isSelected}>
												<button
													type="button"
													onclick={() => selectFarmFilter(f.id)}
													class="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors {isSelected
														? 'bg-amber-50'
														: 'hover:bg-stone-50'}"
												>
													<div class="flex min-w-0 flex-1 flex-col">
														<span class="truncate text-sm font-medium text-gray-900">
															{f.name}
														</span>
														<span class="truncate text-xs text-gray-500">
															{f.address || '—'}
														</span>
													</div>
													<span
														class="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600"
													>
														{f.code}
													</span>
													{#if isSelected}
														<CheckIcon class="h-4 w-4 shrink-0 text-red-700" />
													{/if}
												</button>
											</li>
										{:else}
											<li class="px-3 py-6 text-center text-sm text-gray-500">
												{#if farmSearch.trim()}
													No farms match "{farmSearch.trim()}"
												{:else}
													No farms available
												{/if}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>

						<!-- Sort -->
						<Select.Root type="single" bind:value={sortValue}>
							<Select.Trigger
								class="h-10 w-full rounded-lg border-gray-300 text-sm sm:w-[180px]"
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
								<Select.Item value="date-desc">Newest first</Select.Item>
								<Select.Item value="date-asc">Oldest first</Select.Item>
								<Select.Item value="volume-desc">Largest first</Select.Item>
								<Select.Item value="volume-asc">Smallest first</Select.Item>
							</Select.Content>
						</Select.Root>

						<!-- NEW: Advanced filters toggle -->
						<button
							type="button"
							onclick={() => (showAdvanced = !showAdvanced)}
							class="flex h-10 items-center gap-1.5 rounded-lg border bg-white px-3 text-sm font-semibold transition-colors {showAdvanced
								? 'border-red-200 bg-red-50 text-red-700'
								: 'border-gray-300 text-gray-700 hover:bg-stone-50'}"
							aria-expanded={showAdvanced}
						>
							<SlidersHorizontalIcon class="h-3.5 w-3.5" />
							Filters
							{#if advancedCount > 0}
								<span
									class="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white"
								>
									{advancedCount}
								</span>
							{/if}
						</button>
					</div>

					{#if hasFilters}
						<Button
							variant="ghost"
							class="h-10 shrink-0 text-gray-600 hover:text-red-700"
							onclick={clearFilters}
						>
							<FilterXIcon class="mr-1 h-4 w-4" />
							Clear filters
						</Button>
					{/if}
				</div>

				<!-- NEW: Row 2 — date presets -->
				<div class="flex flex-wrap items-center gap-1.5">
					<span class="mr-1 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
						Date
					</span>
					{#each datePresets as p (p.value)}
						<button
							type="button"
							onclick={() => (datePreset = p.value)}
							class="rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors {datePreset ===
							p.value
								? 'border-red-200 bg-red-50 text-red-700'
								: 'border-gray-200 bg-white text-gray-600 hover:bg-stone-50'}"
						>
							{p.label}
						</button>
					{/each}

					{#if datePreset === 'custom'}
						<div class="ml-1 flex items-center gap-1.5">
							<Input
								type="date"
								bind:value={dateFrom}
								class="h-8 w-[145px] rounded-md border-gray-300 text-xs {inputCls}"
								aria-label="From date"
							/>
							<span class="text-xs text-gray-400">to</span>
							<Input
								type="date"
								bind:value={dateTo}
								class="h-8 w-[145px] rounded-md border-gray-300 text-xs {inputCls}"
								aria-label="To date"
							/>
						</div>
					{/if}
				</div>

				<!-- NEW: Row 3 — advanced filters -->
				{#if showAdvanced}
					<div class="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
						<!-- Volume range -->
						<div class="flex items-center gap-1.5">
							<span class="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
								Volume
							</span>
							<Input
								type="number"
								min="0"
								bind:value={volumeMin}
								placeholder="Min"
								class="h-8 w-[90px] rounded-md border-gray-300 text-xs {inputCls}"
								aria-label="Minimum volume"
							/>
							<span class="text-xs text-gray-400">–</span>
							<Input
								type="number"
								min="0"
								bind:value={volumeMax}
								placeholder="Max"
								class="h-8 w-[90px] rounded-md border-gray-300 text-xs {inputCls}"
								aria-label="Maximum volume"
							/>
						</div>

						<!-- Farm type -->
						{#if farmTypes.length > 0}
							<div class="flex items-center gap-1.5">
								<span class="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
									Farm type
								</span>
								<Select.Root type="single" bind:value={farmTypeFilter}>
									<Select.Trigger
										class="h-8 w-[130px] rounded-md border-gray-300 text-xs"
										aria-label="Farm type"
									>
										{farmTypeFilter === 'all' ? 'All types' : farmTypeFilter}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="all">All types</Select.Item>
										{#each farmTypes as t (t)}
											<Select.Item value={t}>{t}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						{/if}

						{#if advancedCount > 0}
							<button
								type="button"
								onclick={resetAdvanced}
								class="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-700"
							>
								<XIcon class="h-3 w-3" />
								Reset advanced
							</button>
						{/if}
					</div>
				{/if}
			</div>

			{#if viewMode === 'table'}
				<!-- TABLE VIEW -->
				<Table.Root>
					<Table.Header class="bg-stone-50">
						<Table.Row class="hover:bg-transparent">
							<Table.Head class={thCls}>Chick In No.</Table.Head>
							<Table.Head class={thCls}>Farm</Table.Head>
							<Table.Head class={thCls}>
								<button
									type="button"
									onclick={() => toggleSort('date')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={sortKey === 'date'
										? sortDir === 'asc'
											? 'ascending'
											: 'descending'
										: 'none'}
								>
									Date set
									{#if sortKey === 'date'}
										{#if sortDir === 'desc'}
											<ArrowDownIcon class="h-3 w-3" />
										{:else}
											<ArrowUpIcon class="h-3 w-3" />
										{/if}
									{:else}
										<ArrowUpDownIcon class="h-3 w-3 opacity-40" />
									{/if}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} hidden sm:table-cell">
								<button
									type="button"
									onclick={() => toggleSort('volume')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={sortKey === 'volume'
										? sortDir === 'asc'
											? 'ascending'
											: 'descending'
										: 'none'}
								>
									Volume
									{#if sortKey === 'volume'}
										{#if sortDir === 'desc'}
											<ArrowDownIcon class="h-3 w-3" />
										{:else}
											<ArrowUpIcon class="h-3 w-3" />
										{/if}
									{:else}
										<ArrowUpDownIcon class="h-3 w-3 opacity-40" />
									{/if}
								</button>
							</Table.Head>
							<Table.Head class="w-24"><span class="sr-only">Actions</span></Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#each paginated as row (row.id)}
							<Table.Row class="group transition-colors hover:bg-amber-50/40">
								<Table.Cell>
									<div class="flex items-center gap-1">
										<span class="font-mono text-xs font-semibold text-gray-900">
											{row.batchNumber}
										</span>
										<button
											type="button"
											onclick={() => copyBatchNumber(row.batchNumber)}
											class="rounded p-0.5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-stone-100 hover:text-gray-600"
											aria-label="Copy batch number"
											title="Copy batch number"
										>
											<CopyIcon class="h-3 w-3" />
										</button>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-col">
										<span class="font-semibold text-gray-900">{row.farm.name}</span>
										<span class="flex items-center gap-1 text-xs text-gray-500">
											<MapPinIcon class="h-3 w-3 shrink-0" />
											<span class="truncate">{row.farm.address || '—'}</span>
										</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-col gap-1">
										<span class="text-sm text-gray-700">{formatDate(row.dateSet)}</span>
										<span
											class="inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset {ageClass(
												row.dateSet
											)}"
										>
											<ClockIcon class="h-2.5 w-2.5" />
											{ageLabel(row.dateSet)}
										</span>
									</div>
								</Table.Cell>
								<Table.Cell class="hidden sm:table-cell">
									<span
										class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset"
									>
										<BirdIcon class="h-3 w-3" />
										{row.volume.toLocaleString()}
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
											aria-label="Edit {row.batchNumber}"
											onclick={() => openEdit(row)}
										>
											<PencilIcon class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-gray-500 hover:bg-red-100 hover:text-red-700"
											aria-label="Delete {row.batchNumber}"
											onclick={() => askDelete(row)}
										>
											<Trash2Icon class="h-4 w-4" />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell colspan={5} class="py-16">
									<div class="mx-auto flex max-w-sm flex-col items-center text-center">
										<div
											class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
										>
											<InboxIcon class="h-6 w-6" />
										</div>
										{#if hasFilters}
											<p class="font-semibold text-gray-900">No matching batches</p>
											<p class="mt-1 text-sm text-gray-500">
												Try a different search term or clear your filters.
											</p>
											<Button variant="outline" class="mt-4" onclick={clearFilters}
												>Clear filters</Button
											>
										{:else}
											<p class="font-semibold text-gray-900">No chick batches yet</p>
											<p class="mt-1 text-sm text-gray-500">Add your first batch to get started.</p>
											<Button
												class="mt-4 bg-red-700 text-white hover:bg-red-600"
												onclick={openAdd}
												disabled={data.farms.length === 0}
											>
												<PlusIcon class="mr-2 h-4 w-4" />
												Add Batch
											</Button>
										{/if}
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				<!-- GRID VIEW -->
				<div class="p-4">
					{#if paginated.length === 0}
						<div class="flex flex-col items-center py-16 text-center">
							<div
								class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
							>
								<InboxIcon class="h-6 w-6" />
							</div>
							{#if hasFilters}
								<p class="font-semibold text-gray-900">No matching batches</p>
								<p class="mt-1 text-sm text-gray-500">
									Try a different search term or clear your filters.
								</p>
								<Button variant="outline" class="mt-4" onclick={clearFilters}>Clear filters</Button>
							{:else}
								<p class="font-semibold text-gray-900">No chick batches yet</p>
								<p class="mt-1 text-sm text-gray-500">Add your first batch to get started.</p>
								<Button
									class="mt-4 bg-red-700 text-white hover:bg-red-600"
									onclick={openAdd}
									disabled={data.farms.length === 0}
								>
									<PlusIcon class="mr-2 h-4 w-4" />
									Add Batch
								</Button>
							{/if}
						</div>
					{:else}
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{#each paginated as row (row.id)}
								<div
									class="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
								>
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-1">
												<span class="truncate font-mono text-xs font-semibold text-gray-900">
													{row.batchNumber}
												</span>
												<button
													type="button"
													onclick={() => copyBatchNumber(row.batchNumber)}
													class="rounded p-0.5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-stone-100 hover:text-gray-600"
													aria-label="Copy batch number"
													title="Copy batch number"
												>
													<CopyIcon class="h-3 w-3" />
												</button>
											</div>
											<h3 class="mt-2 truncate text-base font-bold text-gray-900">
												{row.farm.name}
											</h3>
											<p class="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
												<MapPinIcon class="h-3 w-3 shrink-0" />
												<span class="truncate">{row.farm.address || '—'}</span>
											</p>
										</div>
										<div class="flex gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
											<Button
												variant="ghost"
												size="icon"
												class="h-7 w-7 text-gray-500 hover:bg-amber-100 hover:text-amber-800"
												aria-label="Edit {row.batchNumber}"
												onclick={() => openEdit(row)}
											>
												<PencilIcon class="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-7 w-7 text-gray-500 hover:bg-red-100 hover:text-red-700"
												aria-label="Delete {row.batchNumber}"
												onclick={() => askDelete(row)}
											>
												<Trash2Icon class="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>

									<div class="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
										<div>
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Volume
											</p>
											<p class="mt-0.5 flex items-center gap-1 text-sm font-bold text-gray-900">
												<BirdIcon class="h-3 w-3 text-amber-600" />
												{row.volume.toLocaleString()}
											</p>
										</div>
										<div class="col-span-2">
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Date set
											</p>
											<p
												class="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-gray-900"
											>
												{formatDate(row.dateSet)}
												<span
													class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset {ageClass(
														row.dateSet
													)}"
												>
													{ageLabel(row.dateSet)}
												</span>
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
							{filtered.length === 1 ? 'batch' : 'batches'}
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

<ChickBatchFormDialog
	bind:open={formOpen}
	batch={editingBatch}
	farms={data.farms}
	batches={rows}
	onsave={handleSave}
/>
<DeleteChickBatchDialog bind:open={deleteOpen} batch={deleteTarget} onconfirm={confirmDelete} />

<ChickBatchReportDialog bind:open={exportOpen} batches={filtered} filters={exportFilters} />
