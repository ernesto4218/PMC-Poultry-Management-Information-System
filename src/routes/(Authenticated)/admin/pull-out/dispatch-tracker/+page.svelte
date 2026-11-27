<script lang="ts">
	import type { PageData } from './$types';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import {
		SearchIcon,
		XIcon,
		InboxIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		ChevronsDownUpIcon,
		ChevronsUpDownIcon,
		ArrowUpDownIcon,
		ArrowUpIcon,
		ArrowDownIcon,
		TruckIcon,
		PackageIcon,
		AlertTriangleIcon,
		PhoneIcon,
		StickyNoteIcon,
		CalendarDaysIcon,
		ReceiptIcon,
		PencilLineIcon,
		BanknoteIcon,
		PackageCheckIcon,
		CheckIcon,
		UserCheck
	} from '@lucide/svelte';
	import DeliveryDialog from './DeliveryDialog.svelte';
	import type { TrackedDispatch } from '#lib/services/dispatch.service.ts';

	type SortKey = 'date' | 'plate' | 'driver' | 'status' | 'load' | 'due';
	type Focus = 'all' | 'attention' | 'over' | 'awaiting' | 'pastdue';

	let { data }: { data: PageData } = $props();

	const trips = $derived(data.trips ?? []);

	// ---- State ---------------------------------------------------------
	let search = $state('');
	let searchEl = $state<HTMLInputElement | null>(null);
	let statusFilter = $state('all');
	let focus = $state<Focus>('all');
	let dateFilter = $state('');
	let sortValue = $state('date-desc');
	let pageSizeRaw = $state('10');
	let page = $state(1);
	let dialogOpen = $state(false);
	let editingTripId = $state<string | null>(null);
	let expandedIds = $state<Set<string>>(new Set());
	const pageSize = $derived(Number(pageSizeRaw));

	const editingTrip = $derived<TrackedDispatch | null>(
		trips.find((t) => t.id === editingTripId) ?? null
	);

	const sortKey = $derived(sortValue.split('-')[0] as SortKey);
	const sortDir = $derived(sortValue.endsWith('-asc') ? 'asc' : 'desc');

	// ---- Styling maps --------------------------------------------------
	const statusStyles: Record<string, string> = {
		dispatched: 'bg-sky-50 text-sky-700 ring-sky-200',
		in_transit: 'bg-sky-50 text-sky-700 ring-sky-200',
		'in transit': 'bg-sky-50 text-sky-700 ring-sky-200',
		completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		draft: 'bg-amber-50 text-amber-700 ring-amber-200'
	};
	const statusDot: Record<string, string> = {
		dispatched: 'bg-sky-500',
		in_transit: 'bg-sky-500',
		completed: 'bg-emerald-500',
		delivered: 'bg-emerald-500',
		draft: 'bg-amber-500'
	};
	const statusBadge = (s: string) =>
		statusStyles[s.toLowerCase()] ?? 'bg-gray-100 text-gray-600 ring-gray-200';
	const statusLabel = (s: string) => s.replaceAll('_', ' ');

	// ---- Date helpers ----------------------------------------------------
	// Parse 'YYYY-MM-DD' as a LOCAL date so it never shifts a day with timezones.
	function parseDay(d: unknown): Date | null {
		if (d === null || d === undefined || d === '') return null;
		const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
		if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
		const x = d instanceof Date ? d : new Date(d as string);
		return Number.isNaN(x.getTime()) ? null : x;
	}
	function dayKey(d: unknown): string {
		const p = parseDay(d);
		if (!p) return '';
		const mm = String(p.getMonth() + 1).padStart(2, '0');
		const dd = String(p.getDate()).padStart(2, '0');
		return `${p.getFullYear()}-${mm}-${dd}`;
	}
	function formatDay(d: unknown, withYear = true): string {
		const p = parseDay(d);
		if (!p) return '—';
		return p.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			...(withYear ? { year: 'numeric' } : {})
		});
	}
	function daysUntil(d: unknown): number | null {
		const p = parseDay(d);
		if (!p) return null;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return Math.round((p.getTime() - today.getTime()) / 86_400_000);
	}

	const peso = new Intl.NumberFormat('en-PH', {
		style: 'currency',
		currency: 'PHP',
		maximumFractionDigits: 2
	});
	const formatPeso = (n: number | null | undefined) =>
		n === null || n === undefined ? '—' : peso.format(n);

	// ---- Trip helpers ----------------------------------------------------
	const isOver = (t: { totalBags: number; truckCapacity: number }) => t.totalBags > t.truckCapacity;
	const loadRatio = (t: { totalBags: number; truckCapacity: number }) =>
		t.totalBags / Math.max(1, t.truckCapacity);

	function meter(total: number, capacity: number) {
		const cap = Math.max(1, capacity);
		const scale = Math.max(total, cap);
		const over = Math.max(0, total - cap);
		return {
			pct: Math.round((total / cap) * 100),
			over,
			within: (Math.min(total, cap) / scale) * 100,
			overWidth: (over / scale) * 100,
			capMark: (cap / scale) * 100
		};
	}

	function progress(t: TrackedDispatch) {
		const steps = [
			{ label: 'Dispatched', done: t.status !== 'draft' },
			{ label: 'Arrived', done: !!t.arrivalDate },
			{ label: 'DR received', done: !!t.drReceivedDate },
			{ label: 'Invoiced', done: !!t.saleInvoiceNumber }
		];
		const doneCount = steps.filter((s) => s.done).length;
		const next = steps.find((s) => !s.done)?.label ?? null;
		return { steps, doneCount, next };
	}

	function dueInfo(t: TrackedDispatch) {
		const n = daysUntil(t.dueDate);
		if (n === null) return null;
		if (n < 0)
			return {
				tone: 'overdue',
				label: `Overdue ${Math.abs(n)}d`,
				cls: 'bg-red-50 text-red-700 ring-red-200'
			};
		if (n === 0)
			return { tone: 'soon', label: 'Due today', cls: 'bg-amber-50 text-amber-700 ring-amber-200' };
		if (n <= 7)
			return {
				tone: 'soon',
				label: `Due in ${n}d`,
				cls: 'bg-amber-50 text-amber-700 ring-amber-200'
			};
		return {
			tone: 'ok',
			label: `Due ${formatDay(t.dueDate, false)}`,
			cls: 'bg-stone-100 text-gray-600 ring-stone-200'
		};
	}

	const isAwaiting = (t: TrackedDispatch) => t.status === 'dispatched' && !t.arrivalDate;
	const isPastDue = (t: TrackedDispatch) => dueInfo(t)?.tone === 'overdue';

	const initials = (name: string) =>
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase())
			.join('') || '?';

	function openDelivery(trip: TrackedDispatch) {
		editingTripId = trip.id;
		dialogOpen = true;
	}

	// ---- KPI ------------------------------------------------------------
	const totalTrips = $derived(trips.length);
	const totalBags = $derived(trips.reduce((s, t) => s + t.totalBags, 0));
	const awaitingCount = $derived(trips.filter(isAwaiting).length);
	const overCount = $derived(trips.filter(isOver).length);
	const pastDueCount = $derived(trips.filter(isPastDue).length);
	const billedTotal = $derived(trips.reduce((s, t) => s + (t.amount ?? 0), 0));
	const attentionCount = $derived(
		trips.filter((t) => isOver(t) || isAwaiting(t) || isPastDue(t)).length
	);

	// ---- Tabs & chips ---------------------------------------------------
	const statusTabs = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const t of trips) if (t.status) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
		return [
			{ value: 'all', label: 'All', count: trips.length },
			...[...counts].map(([value, count]) => ({ value, label: statusLabel(value), count }))
		];
	});

	const focusChips = $derived([
		{ value: 'all' as Focus, label: 'Everything', count: trips.length, tone: '' },
		{ value: 'attention' as Focus, label: 'Needs attention', count: attentionCount, tone: 'amber' },
		{ value: 'over' as Focus, label: 'Over capacity', count: overCount, tone: 'red' },
		{ value: 'awaiting' as Focus, label: 'Awaiting arrival', count: awaitingCount, tone: 'sky' },
		{ value: 'pastdue' as Focus, label: 'Past due', count: pastDueCount, tone: 'red' }
	]);

	// ---- Filter / sort / paginate ----------------------------------------
	const filteredTrips = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const result = trips.filter((trip) => {
			if (statusFilter !== 'all' && trip.status !== statusFilter) return false;
			if (focus === 'over' && !isOver(trip)) return false;
			if (focus === 'awaiting' && !isAwaiting(trip)) return false;
			if (focus === 'pastdue' && !isPastDue(trip)) return false;
			if (focus === 'attention' && !(isOver(trip) || isAwaiting(trip) || isPastDue(trip)))
				return false;
			if (dateFilter && dayKey(trip.dispatchDate) !== dateFilter) return false;
			if (!q) return true;

			const headerMatch = [
				trip.tripCode,
				trip.plateNumber,
				trip.driverName,
				trip.notes,
				trip.supplierDrNumber,
				trip.saleInvoiceNumber,
				dayKey(trip.dispatchDate)
			]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q));
			if (headerMatch) return true;

			return trip.items.some((item) =>
				[
					item.farmName,
					item.farmCode,
					item.batchNumber,
					item.feedName,
					item.productName,
					item.supplierName
				]
					.filter(Boolean)
					.some((v) => String(v).toLowerCase().includes(q))
			);
		});

		result.sort((a, b) => {
			let cmp = 0;
			switch (sortKey) {
				case 'date':
					cmp = dayKey(a.dispatchDate).localeCompare(dayKey(b.dispatchDate));
					break;
				case 'plate':
					cmp = a.plateNumber.localeCompare(b.plateNumber);
					break;
				case 'driver':
					cmp = (a.driverName ?? '').localeCompare(b.driverName ?? '');
					break;
				case 'status':
					cmp = a.status.localeCompare(b.status);
					break;
				case 'load':
					cmp = loadRatio(a) - loadRatio(b);
					break;
				case 'due': {
					const av = dayKey(a.dueDate);
					const bv = dayKey(b.dueDate);
					if (!av && !bv) return 0;
					if (!av) return 1; // trips without a due date always sink to the bottom
					if (!bv) return -1;
					cmp = av.localeCompare(bv);
					break;
				}
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});
		return result;
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filteredTrips.length / pageSize)));
	const currentPage = $derived(Math.min(page, totalPages));
	const paginatedTrips = $derived(
		filteredTrips.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	$effect(() => {
		void search;
		void statusFilter;
		void focus;
		void dateFilter;
		void sortValue;
		void pageSizeRaw;
		page = 1;
	});

	const hasFilters = $derived(
		search.trim() !== '' || statusFilter !== 'all' || focus !== 'all' || dateFilter !== ''
	);
	const anyOpen = $derived(filteredTrips.some((t) => expandedIds.has(t.id)));

	// ---- Sorting helpers --------------------------------------------------
	function toggleSort(key: SortKey) {
		if (sortKey === key) sortValue = `${key}-${sortDir === 'asc' ? 'desc' : 'asc'}`;
		else sortValue = `${key}-${key === 'date' || key === 'load' ? 'desc' : 'asc'}`;
	}
	const sortLabels: Record<string, string> = {
		'date-desc': 'Newest first',
		'date-asc': 'Oldest first',
		'due-asc': 'Due soonest',
		'due-desc': 'Due latest',
		'plate-asc': 'Plate (A–Z)',
		'plate-desc': 'Plate (Z–A)',
		'driver-asc': 'Driver (A–Z)',
		'driver-desc': 'Driver (Z–A)',
		'status-asc': 'Status (A–Z)',
		'status-desc': 'Status (Z–A)',
		'load-desc': 'Fullest load',
		'load-asc': 'Lightest load'
	};
	const sortLabel = (v: string) => sortLabels[v] ?? v;
	function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
		if (sortKey !== key) return 'none';
		return sortDir === 'asc' ? 'ascending' : 'descending';
	}

	// ---- Actions ---------------------------------------------------------
	function toggleExpand(id: string) {
		const next = new Set(expandedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedIds = next;
	}
	function setAllExpanded(expand: boolean) {
		const next = new Set(expandedIds);
		for (const t of filteredTrips) {
			if (expand) next.add(t.id);
			else next.delete(t.id);
		}
		expandedIds = next;
	}
	const goToPage = (p: number) => (page = Math.max(1, Math.min(p, totalPages)));
	function clearFilters() {
		search = '';
		statusFilter = 'all';
		focus = 'all';
		dateFilter = '';
	}

	function onWindowKey(e: KeyboardEvent) {
		const el = e.target as HTMLElement | null;
		const typing =
			el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
		if (e.key === '/' && !typing && !dialogOpen) {
			e.preventDefault();
			searchEl?.focus();
		}
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
	const pillCls =
		'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset';
	const chipTone: Record<string, string> = {
		'': 'text-gray-500',
		amber: 'text-amber-700',
		red: 'text-red-700',
		sky: 'text-sky-700'
	};
</script>

<svelte:head>
	<title>Dispatch Tracker | Puting Manok Corporation</title>
</svelte:head>

<svelte:window onkeydown={onWindowKey} />

{#snippet sortIcon(key: SortKey)}
	{#if sortKey === key}
		{#if sortDir === 'asc'}
			<ArrowUpIcon class="h-3 w-3 text-red-700" />
		{:else}
			<ArrowDownIcon class="h-3 w-3 text-red-700" />
		{/if}
	{:else}
		<ArrowUpDownIcon class="h-3 w-3 opacity-40" />
	{/if}
{/snippet}

{#snippet field(label: string, value: string | null, mono: boolean)}
	<div class="flex items-baseline justify-between gap-3 py-1.5">
		<dt class="text-xs text-gray-500">{label}</dt>
		<dd class="text-right text-sm {mono ? 'font-mono' : ''}">
			{#if value}
				<span class="font-medium text-gray-900">{value}</span>
			{:else}
				<span class="text-gray-400">Not yet</span>
			{/if}
		</dd>
	</div>
{/snippet}

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-[1400px] space-y-6">
		<!-- HEADER -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Logistics</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Dispatch Tracker</h1>
				<p class="mt-1 max-w-xl text-sm text-gray-500">
					Follow each truck from dispatch to delivery receipt and billing, all in one place.
				</p>
			</div>
			<Button
				variant="outline"
				onclick={() => setAllExpanded(!anyOpen)}
				disabled={filteredTrips.length === 0}
				class="h-10 rounded-lg border-gray-300 bg-white font-semibold text-gray-700 shadow-sm"
			>
				{#if anyOpen}
					<ChevronsDownUpIcon class="mr-2 h-4 w-4" />
					Collapse all
				{:else}
					<ChevronsUpDownIcon class="mr-2 h-4 w-4" />
					Expand all
				{/if}
			</Button>
		</div>

		<!-- KPI CARDS -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
						<TruckIcon class="h-5 w-5" />
					</div>
					<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Trips</p>
				</div>
				<p class="mt-4 text-3xl font-bold tracking-tight text-gray-900">{totalTrips}</p>
				<p class="mt-1 text-xs text-gray-500">
					{#if overCount > 0}
						<span class="font-medium text-red-700">{overCount} over capacity</span>
					{:else}
						All within truck capacity
					{/if}
				</p>
			</div>

			<div class="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"
					>
						<PackageIcon class="h-5 w-5" />
					</div>
					<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Bags loaded</p>
				</div>
				<p class="mt-4 text-3xl font-bold tracking-tight text-gray-900">
					{totalBags.toLocaleString()}
				</p>
				<p class="mt-1 text-xs text-gray-500">Across all active trips</p>
			</div>

			<div class="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
						<PackageCheckIcon class="h-5 w-5" />
					</div>
					<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
						Awaiting arrival
					</p>
				</div>
				<p class="mt-4 text-3xl font-bold tracking-tight text-gray-900">{awaitingCount}</p>
				<p class="mt-1 text-xs text-gray-500">Dispatched, no arrival date yet</p>
			</div>

			<div class="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"
					>
						<BanknoteIcon class="h-5 w-5" />
					</div>
					<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Billed</p>
				</div>
				<p class="mt-4 text-3xl font-bold tracking-tight text-gray-900">
					{formatPeso(billedTotal)}
				</p>
				<p class="mt-1 text-xs text-gray-500">
					{#if pastDueCount > 0}
						<span class="font-medium text-red-700">{pastDueCount} past due date</span>
					{:else}
						Nothing past its due date
					{/if}
				</p>
			</div>
		</div>

		<!-- CONTENT CARD -->
		<div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
			<!-- Status tabs -->
			<div class="overflow-none border-b border-gray-100 px-4 pt-3">
				<div class="flex w-fit gap-1">
					{#each statusTabs as tab (tab.value)}
						<button
							type="button"
							onclick={() => (statusFilter = tab.value)}
							aria-pressed={statusFilter === tab.value}
							class="relative flex h-10 items-center gap-2 px-3 text-sm font-semibold whitespace-nowrap capitalize transition-colors {statusFilter ===
							tab.value
								? 'text-gray-900'
								: 'text-gray-500 hover:text-gray-700'}"
						>
							{#if tab.value !== 'all'}
								<span class="h-2 w-2 rounded-full {statusDot[tab.value] ?? 'bg-gray-400'}"></span>
							{/if}
							{tab.label}
							<span
								class="rounded-full bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-500"
							>
								{tab.count}
							</span>
							{#if statusFilter === tab.value}
								<span class="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-red-700"></span>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<!-- Filter bar -->
			<div class="space-y-3 border-b border-gray-100 p-4">
				<div class="flex flex-wrap items-center gap-2">
					<div class="relative min-w-[220px] flex-1 sm:max-w-sm">
						<SearchIcon
							class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
						/>
						<Input
							bind:ref={searchEl}
							bind:value={search}
							placeholder="Search plate, driver, farm, batch, DR # or invoice…"
							class="h-10 rounded-lg border-gray-300 bg-stone-50/60 pr-9 pl-9 {inputCls}"
							aria-label="Search"
						/>
						{#if search}
							<button
								type="button"
								class="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-gray-700"
								onclick={() => (search = '')}
								aria-label="Clear search"
							>
								<XIcon class="h-4 w-4" />
							</button>
						{:else}
							<kbd
								class="pointer-events-none absolute top-1/2 right-2.5 hidden h-5 -translate-y-1/2 items-center rounded border border-gray-200 bg-white px-1.5 font-mono text-[10px] text-gray-400 sm:flex"
							>
								/
							</kbd>
						{/if}
					</div>

					<Input
						type="date"
						bind:value={dateFilter}
						class="h-10 w-[160px] rounded-lg border-gray-300 text-sm {inputCls}"
						aria-label="Filter by dispatch date"
					/>

					<Select.Root type="single" bind:value={sortValue}>
						<Select.Trigger
							class="h-10 w-[180px] rounded-lg border-gray-300 text-sm"
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
							{#each Object.entries(sortLabels) as [value, label] (value)}
								<Select.Item {value}>{label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					{#if hasFilters}
						<Button
							variant="ghost"
							class="h-10 text-gray-600 hover:text-red-700"
							onclick={clearFilters}
						>
							<XIcon class="mr-1 h-4 w-4" />
							Reset
						</Button>
					{/if}
				</div>

				<!-- Quick filters -->
				<div class="flex flex-wrap items-center gap-2">
					{#each focusChips as chip (chip.value)}
						<button
							type="button"
							onclick={() => (focus = chip.value)}
							aria-pressed={focus === chip.value}
							class="inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors {focus ===
							chip.value
								? 'border-red-200 bg-red-50 text-red-800'
								: 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-stone-50'}"
						>
							{chip.label}
							<span
								class="font-mono text-[11px] {focus === chip.value
									? 'text-red-700'
									: chipTone[chip.tone]}"
							>
								{chip.count}
							</span>
						</button>
					{/each}
				</div>
			</div>

			<Table.Root>
				<Table.Header class="bg-stone-50/80">
					<Table.Row class="hover:bg-transparent">
						<Table.Head class="w-10"><span class="sr-only">Expand</span></Table.Head>
						<Table.Head class={thCls}>
							<button
								type="button"
								onclick={() => toggleSort('plate')}
								class="inline-flex items-center gap-1 hover:text-gray-700"
								aria-sort={ariaSort('plate')}
							>
								Truck / Trip {@render sortIcon('plate')}
							</button>
						</Table.Head>
						<Table.Head class="{thCls} hidden md:table-cell">
							<button
								type="button"
								onclick={() => toggleSort('driver')}
								class="inline-flex items-center gap-1 hover:text-gray-700"
								aria-sort={ariaSort('driver')}
							>
								Driver {@render sortIcon('driver')}
							</button>
						</Table.Head>
						<Table.Head class="{thCls} hidden sm:table-cell">
							<button
								type="button"
								onclick={() => toggleSort('date')}
								class="inline-flex items-center gap-1 hover:text-gray-700"
								aria-sort={ariaSort('date')}
							>
								Dispatched {@render sortIcon('date')}
							</button>
						</Table.Head>
						<Table.Head class={thCls}>
							<button
								type="button"
								onclick={() => toggleSort('status')}
								class="inline-flex items-center gap-1 hover:text-gray-700"
								aria-sort={ariaSort('status')}
							>
								Status {@render sortIcon('status')}
							</button>
						</Table.Head>
						<Table.Head class={thCls}>
							<button
								type="button"
								onclick={() => toggleSort('load')}
								class="inline-flex items-center gap-1 hover:text-gray-700"
								aria-sort={ariaSort('load')}
							>
								Load {@render sortIcon('load')}
							</button>
						</Table.Head>
						<Table.Head class="{thCls} hidden lg:table-cell">Delivery</Table.Head>
						<Table.Head class="{thCls} hidden xl:table-cell">
							<button
								type="button"
								onclick={() => toggleSort('due')}
								class="inline-flex items-center gap-1 hover:text-gray-700"
								aria-sort={ariaSort('due')}
							>
								Billing {@render sortIcon('due')}
							</button>
						</Table.Head>
						<Table.Head class="{thCls} text-right"><span class="sr-only">Actions</span></Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each paginatedTrips as trip (trip.id)}
						{@const m = meter(trip.totalBags, trip.truckCapacity)}
						{@const over = m.over > 0}
						{@const open = expandedIds.has(trip.id)}
						{@const prog = progress(trip)}
						{@const due = dueInfo(trip)}

						<Table.Row
							class="group cursor-pointer transition-colors hover:bg-stone-50 {open
								? 'bg-stone-50'
								: ''}"
							onclick={() => toggleExpand(trip.id)}
						>
							<Table.Cell class="w-10 pr-0">
								<button
									type="button"
									class="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
									aria-expanded={open}
									aria-controls="trip-{trip.id}"
									aria-label="{open ? 'Hide' : 'Show'} details for {trip.plateNumber}"
									onclick={(e) => {
										e.stopPropagation();
										toggleExpand(trip.id);
									}}
								>
									<ChevronRightIcon
										class="h-4 w-4 transition-transform {open ? 'rotate-90 text-red-700' : ''}"
									/>
								</button>
							</Table.Cell>

							<Table.Cell>
								<div class="font-semibold text-gray-900">{trip.plateNumber}</div>
								<div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
									<Badge variant="secondary" class="font-mono">{trip.tripCode}</Badge>
									<span>{trip.items.length} {trip.items.length === 1 ? 'line' : 'lines'}</span>
								</div>
							</Table.Cell>

							<Table.Cell class="hidden md:table-cell">
								<div class="flex items-center gap-2.5">
									<span class="text-sm text-gray-800">{trip.driverName || '—'}</span>
								</div>
							</Table.Cell>

							<Table.Cell class="hidden text-sm text-gray-600 sm:table-cell">
								{formatDay(trip.dispatchDate)}
							</Table.Cell>

							<Table.Cell>
								<span class="{pillCls} capitalize {statusBadge(trip.status)}">
									<span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
									{statusLabel(trip.status)}
								</span>
							</Table.Cell>

							<Table.Cell>
								<div class="w-40">
									<div class="mb-1 flex items-baseline justify-between gap-2">
										<span
											class="font-mono text-sm font-bold {over ? 'text-red-700' : 'text-gray-900'}"
										>
											{trip.totalBags.toLocaleString()}
											<span class="text-xs font-normal text-gray-500">
												/ {trip.truckCapacity.toLocaleString()}
											</span>
										</span>
										<span
											class="inline-flex items-center gap-1 font-mono text-[11px] font-semibold {over
												? 'text-red-700'
												: 'text-gray-500'}"
										>
											{#if over}
												<AlertTriangleIcon class="h-3 w-3" />
												+{m.over.toLocaleString()}
											{:else}
												{m.pct}%
											{/if}
										</span>
									</div>
									<div
										class="relative h-1.5 w-full overflow-hidden rounded-full bg-stone-100"
										role="img"
										aria-label="{m.pct}% of truck capacity"
									>
										<div
											class="absolute inset-y-0 left-0 rounded-full {over
												? 'bg-red-600'
												: m.pct > 90
													? 'bg-amber-500'
													: 'bg-emerald-500'}"
											style="width: {m.within}%"
										></div>
										{#if over}
											<div
												class="absolute inset-y-0 bg-[repeating-linear-gradient(45deg,#dc2626_0_3px,#fca5a5_3px_6px)]"
												style="left: {m.within}%; width: {m.overWidth}%"
											></div>
											<div
												class="absolute inset-y-0 w-0.5 bg-white"
												style="left: calc({m.capMark}% - 1px)"
											></div>
										{/if}
									</div>
								</div>
							</Table.Cell>

							<!-- Delivery progress -->
							<Table.Cell class="hidden lg:table-cell">
								<div class="w-36">
									<div class="flex gap-1" role="img" aria-label="{prog.doneCount} of 4 steps done">
										{#each prog.steps as step (step.label)}
											<span
												title={step.label}
												class="h-1.5 flex-1 rounded-full {step.done
													? 'bg-emerald-500'
													: 'bg-stone-200'}"
											></span>
										{/each}
									</div>
									<p class="mt-1.5 text-xs">
										{#if prog.next}
											<span class="text-gray-500">Next:</span>
											<span class="font-medium text-gray-700">{prog.next}</span>
										{:else}
											<span class="inline-flex items-center gap-1 font-medium text-emerald-700">
												<CheckIcon class="h-3 w-3" /> Complete
											</span>
										{/if}
									</p>
								</div>
							</Table.Cell>

							<!-- Billing -->
							<Table.Cell class="hidden xl:table-cell">
								{#if trip.amount !== null || trip.saleInvoiceNumber}
									<div class="font-mono text-sm font-bold text-gray-900">
										{formatPeso(trip.amount)}
									</div>
									<div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
										{#if trip.saleInvoiceNumber}
											<span class="font-mono">{trip.saleInvoiceNumber}</span>
										{/if}
										{#if due}
											<span class="{pillCls} {due.cls}">{due.label}</span>
										{/if}
									</div>
								{:else}
									<span class="text-xs text-gray-400">Not invoiced</span>
								{/if}
							</Table.Cell>

							<Table.Cell class="text-right">
								<Button
									variant="outline"
									size="sm"
									class="h-8 rounded-lg  bg-white px-2.5 text-xs font-semibold text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
									aria-label="Update delivery details for {trip.plateNumber}"
									onclick={(e: MouseEvent) => {
										e.stopPropagation();
										openDelivery(trip);
									}}
								>
									<PencilLineIcon class="h-3.5 w-3.5" />
								</Button>
							</Table.Cell>
						</Table.Row>

						{#if open}
							<Table.Row id="trip-{trip.id}" class="bg-stone-50 hover:bg-stone-50">
								<Table.Cell colspan={9} class="p-0">
									<div class="space-y-4 px-4 py-4 sm:pl-14">
										<!-- Detail cards -->
										<div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
											<div class="rounded-xl border border-gray-200 bg-white p-4">
												<div class="mb-1 flex items-center gap-2">
													<CalendarDaysIcon class="h-4 w-4 text-red-700" />
													<h4 class="text-sm font-semibold text-gray-900">Delivery</h4>
												</div>
												<dl class="divide-y divide-gray-100">
													{@render field(
														'Date arrival',
														trip.arrivalDate ? formatDay(trip.arrivalDate) : null,
														false
													)}
													{@render field('Supplier DR #', trip.supplierDrNumber, true)}
													{@render field(
														'Date DR received',
														trip.drReceivedDate ? formatDay(trip.drReceivedDate) : null,
														false
													)}
												</dl>
											</div>

											<div class="rounded-xl border border-gray-200 bg-white p-4">
												<div class="mb-1 flex items-center gap-2">
													<ReceiptIcon class="h-4 w-4 text-red-700" />
													<h4 class="text-sm font-semibold text-gray-900">Billing</h4>
												</div>
												<dl class="divide-y divide-gray-100">
													{@render field(
														'Forwarded to accounting',
														trip.forwardedAccountingDate
															? formatDay(trip.forwardedAccountingDate)
															: null,
														false
													)}
													{@render field('Sale invoice #', trip.saleInvoiceNumber, true)}
													{@render field(
														'Amount',
														trip.amount !== null ? formatPeso(trip.amount) : null,
														true
													)}
													{@render field(
														'Due date',
														trip.dueDate ? formatDay(trip.dueDate) : null,
														false
													)}
												</dl>
											</div>

											<div class="flex flex-col rounded-xl border border-gray-200 bg-white p-4">
												<div class="mb-1 flex items-center gap-2">
													<UserCheck />
													<h4 class="text-sm font-semibold text-gray-900">Driver & notes</h4>
												</div>
												<dl class="divide-y divide-gray-100">
													{@render field('Driver', trip.driverName, false)}
													<div class="flex items-baseline justify-between gap-3 py-1.5">
														<dt class="flex items-center gap-1 text-xs text-gray-500">
															<PhoneIcon class="h-3 w-3" /> Phone
														</dt>
														<dd class="text-sm font-medium text-gray-900">
															{#if trip.driverPhone}
																<a href="tel:{trip.driverPhone}" class="hover:text-red-700">
																	{trip.driverPhone}
																</a>
															{:else}
																<span class="font-normal text-gray-400">Not on file</span>
															{/if}
														</dd>
													</div>
												</dl>
												{#if trip.notes}
													<p
														class="mt-2 flex gap-2 rounded-lg bg-amber-50/70 p-2.5 text-xs text-amber-900"
													>
														<StickyNoteIcon class="mt-0.5 h-3.5 w-3.5 shrink-0" />
														{trip.notes}
													</p>
												{/if}
											</div>
										</div>

										<!-- Loads -->
										<div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
											<div
												class="flex items-center justify-between border-b border-gray-100 px-4 py-2.5"
											>
												<h4 class="text-sm font-semibold text-gray-900">
													Loaded feed
													<span class="ml-1 font-mono text-xs font-normal text-gray-400">
														{trip.items.length}
													</span>
												</h4>
												<Button
													variant="ghost"
													size="sm"
													class="h-7 text-xs font-semibold text-red-700 hover:bg-red-50 hover:text-red-800"
													onclick={() => openDelivery(trip)}
												>
													<PencilLineIcon class="mr-1.5 h-3.5 w-3.5" />
													Edit details
												</Button>
											</div>

											{#if trip.items.length === 0}
												<p class="px-4 py-6 text-center text-sm text-gray-500">
													No load lines recorded for this trip.
												</p>
											{:else}
												<Table.Root>
													<Table.Header>
														<Table.Row class="hover:bg-transparent">
															<Table.Head class="{thCls} h-9">Farm</Table.Head>
															<Table.Head class="{thCls} h-9">Batch</Table.Head>
															<Table.Head class="{thCls} h-9">Feed</Table.Head>
															<Table.Head class="{thCls} hidden h-9 md:table-cell">
																Stock source
															</Table.Head>
															<Table.Head class="{thCls} h-9 text-right">Bags loaded</Table.Head>
														</Table.Row>
													</Table.Header>
													<Table.Body>
														{#each trip.items as item (item.id)}
															{@const diff = item.loadedQty - item.scheduledQty}
															<Table.Row>
																<Table.Cell class="py-2">
																	<span class="font-semibold text-gray-900">
																		{item.farmName || '—'}
																		{#if item.farmCode}
																			<Badge variant="secondary" class="ml-2">{item.farmCode}</Badge
																			>
																		{/if}
																	</span>
																</Table.Cell>
																<Table.Cell class="py-2 font-mono text-xs text-gray-700">
																	{item.batchNumber || '—'}
																</Table.Cell>
																<Table.Cell class="py-2 text-sm font-medium text-gray-900">
																	{item.feedName}
																</Table.Cell>
																<Table.Cell class="hidden py-2 text-xs text-gray-600 md:table-cell">
																	{#if item.supplierName || item.productName}
																		{[item.supplierName, item.productName]
																			.filter(Boolean)
																			.join(' · ')}
																	{:else}
																		<span class="text-gray-400">—</span>
																	{/if}
																</Table.Cell>
																<Table.Cell class="py-2 text-right whitespace-nowrap">
																	<span class="font-mono text-sm font-bold text-gray-900">
																		{item.loadedQty.toLocaleString()}
																	</span>
																	<span class="font-mono text-xs text-gray-400">
																		/ {item.scheduledQty.toLocaleString()}
																	</span>
																	{#if diff < 0}
																		<span
																			class="{pillCls} ml-2 bg-amber-50 text-amber-700 ring-amber-200"
																		>
																			{Math.abs(diff).toLocaleString()} short
																		</span>
																	{:else if diff > 0}
																		<span
																			class="{pillCls} ml-2 bg-red-50 text-red-700 ring-red-200"
																		>
																			{diff.toLocaleString()} extra
																		</span>
																	{/if}
																</Table.Cell>
															</Table.Row>
														{/each}
													</Table.Body>
												</Table.Root>
											{/if}
										</div>
									</div>
								</Table.Cell>
							</Table.Row>
						{/if}
					{:else}
						<Table.Row class="hover:bg-transparent">
							<Table.Cell colspan={9} class="py-16">
								<div class="mx-auto flex max-w-sm flex-col items-center text-center">
									<div
										class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"
									>
										<InboxIcon class="h-6 w-6" />
									</div>
									{#if hasFilters}
										<p class="font-semibold text-gray-900">No matching dispatches</p>
										<p class="mt-1 text-sm text-gray-500">
											Nothing fits the current search or filters. Try loosening them.
										</p>
										<Button variant="outline" class="mt-4" onclick={clearFilters}>
											Reset filters
										</Button>
									{:else}
										<p class="font-semibold text-gray-900">No dispatches yet</p>
										<p class="mt-1 text-sm text-gray-500">
											Dispatched trucks and their loads will show up here.
										</p>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>

			<!-- Pagination -->
			{#if filteredTrips.length > 0}
				<div
					class="flex flex-col gap-3 border-t border-gray-100 bg-stone-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex flex-wrap items-center gap-4 text-xs text-gray-500">
						<span>
							Showing
							<span class="font-semibold text-gray-700">{(currentPage - 1) * pageSize + 1}</span>
							–
							<span class="font-semibold text-gray-700">
								{Math.min(currentPage * pageSize, filteredTrips.length)}
							</span>
							of <span class="font-semibold text-gray-700">{filteredTrips.length}</span>
							trips
						</span>
						<div class="flex items-center gap-2">
							<span class="text-gray-400">Rows per page</span>
							<Select.Root type="single" bind:value={pageSizeRaw}>
								<Select.Trigger
									class="h-8 w-[72px] rounded-md border-gray-300 bg-white text-xs"
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
							class="h-8 w-8 rounded-md border-gray-300 bg-white"
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
							class="h-8 w-8 rounded-md border-gray-300 bg-white"
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

<DeliveryDialog bind:open={dialogOpen} trip={editingTrip} />
