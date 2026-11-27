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
		ClipboardListIcon,
		UserIcon
	} from '@lucide/svelte';

	type SortKey = 'date' | 'plate' | 'driver' | 'status' | 'load';

	let { data }: { data: PageData } = $props();

	const trips = $derived(data.trips ?? []);

	// ---- State ---------------------------------------------------------
	let search = $state('');
	let statusFilter = $state('all');
	let loadFilter = $state<'all' | 'over' | 'ok'>('all');
	let dateFilter = $state('');
	let sortValue = $state('date-desc');
	let pageSizeRaw = $state('10');
	let page = $state(1);
	const pageSize = $derived(Number(pageSizeRaw));

	// Rows start collapsed; open the trips whose loads you want to see.
	let expandedIds = $state<Set<string>>(new Set());

	const sortKey = $derived(sortValue.split('-')[0] as SortKey);
	const sortDir = $derived(sortValue.endsWith('-asc') ? 'asc' : 'desc');

	// ---- Styling maps --------------------------------------------------
	const statusStyles: Record<string, string> = {
		dispatched: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		in_transit: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		'in transit': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		completed: 'bg-blue-50 text-blue-700 ring-blue-200',
		delivered: 'bg-blue-50 text-blue-700 ring-blue-200',
		draft: 'bg-amber-50 text-amber-700 ring-amber-200'
	};
	function statusBadge(s: string) {
		return statusStyles[s.toLowerCase()] ?? 'bg-gray-100 text-gray-600 ring-gray-200';
	}
	const statusLabel = (s: string) => s.replaceAll('_', ' ');

	// ---- Helpers -------------------------------------------------------
	const isOver = (t: { totalBags: number; truckCapacity: number }) => t.totalBags > t.truckCapacity;
	const loadRatio = (t: { totalBags: number; truckCapacity: number }) =>
		t.totalBags / Math.max(1, t.truckCapacity);

	// The bar scales to whichever is larger (load or capacity), so an overloaded
	// truck visibly runs past its capacity mark.
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

	function formatDate(d: string | Date | null | undefined): string {
		if (!d) return '—';
		const clean = String(d).slice(0, 10);
		const parts = clean.split('-');
		if (parts.length !== 3) return String(d);
		const [y, m, day] = parts.map(Number);
		if (!y || !m || !day) return String(d);
		return new Date(y, m - 1, day).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// ---- KPI ------------------------------------------------------------
	const totalTrips = $derived(trips.length);
	const totalBags = $derived(trips.reduce((s, t) => s + t.totalBags, 0));
	const totalLines = $derived(trips.reduce((s, t) => s + t.items.length, 0));
	const overCount = $derived(trips.filter(isOver).length);

	// ---- Status tabs (with counts) ---------------------------------------
	const statusTabs = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const t of trips) {
			if (t.status) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
		}
		return [
			{ value: 'all', label: 'All', count: trips.length },
			...[...counts].map(([value, count]) => ({ value, label: statusLabel(value), count }))
		];
	});

	// ---- Filter / sort / paginate ----------------------------------------
	const filteredTrips = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const result = trips.filter((trip) => {
			if (statusFilter !== 'all' && trip.status !== statusFilter) return false;
			if (loadFilter === 'over' && !isOver(trip)) return false;
			if (loadFilter === 'ok' && isOver(trip)) return false;
			if (dateFilter && String(trip.dispatchDate).slice(0, 10) !== dateFilter) return false;
			if (!q) return true;

			const headerMatch = [
				trip.tripCode,
				trip.plateNumber,
				trip.driverName,
				trip.notes,
				trip.dispatchDate
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
					cmp = String(a.dispatchDate).localeCompare(String(b.dispatchDate));
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
		void loadFilter;
		void dateFilter;
		void sortValue;
		void pageSizeRaw;
		page = 1;
	});

	const hasFilters = $derived(
		search.trim() !== '' || statusFilter !== 'all' || loadFilter !== 'all' || dateFilter !== ''
	);

	const anyOpen = $derived(filteredTrips.some((t) => expandedIds.has(t.id)));

	// ---- Sorting helpers --------------------------------------------------
	function toggleSort(key: SortKey) {
		if (sortKey === key) sortValue = `${key}-${sortDir === 'asc' ? 'desc' : 'asc'}`;
		else sortValue = `${key}-${key === 'date' || key === 'load' ? 'desc' : 'asc'}`;
	}
	function sortLabel(v: string): string {
		const m: Record<string, string> = {
			'date-desc': 'Newest first',
			'date-asc': 'Oldest first',
			'plate-asc': 'Plate (A–Z)',
			'plate-desc': 'Plate (Z–A)',
			'driver-asc': 'Driver (A–Z)',
			'driver-desc': 'Driver (Z–A)',
			'status-asc': 'Status (A–Z)',
			'status-desc': 'Status (Z–A)',
			'load-desc': 'Fullest load',
			'load-asc': 'Lightest load'
		};
		return m[v] ?? v;
	}
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
	function goToPage(p: number) {
		page = Math.max(1, Math.min(p, totalPages));
	}
	function clearFilters() {
		search = '';
		statusFilter = 'all';
		loadFilter = 'all';
		dateFilter = '';
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
	const pillCls =
		'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ring-inset';
</script>

<svelte:head>
	<title>Dispatch Tracker | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Logistics</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Dispatch Tracker</h1>
				<p class="mt-1 text-sm text-gray-500">
					Track dispatched trucks, their drivers, and the feed loaded on each trip.
				</p>
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					onclick={() => setAllExpanded(!anyOpen)}
					disabled={filteredTrips.length === 0}
					class="h-10 rounded-lg border-gray-300 font-semibold text-gray-700"
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
		</div>

		<!-- KPI CARDS -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Trips</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{totalTrips}</p>
					</div>
					<div class="rounded-lg bg-red-50 p-2 text-red-700">
						<TruckIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Trucks dispatched</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Bags Loaded</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{totalBags.toLocaleString()}</p>
					</div>
					<div class="rounded-lg bg-blue-50 p-2 text-blue-700">
						<PackageIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Total bags across all trips</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Load Lines</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{totalLines.toLocaleString()}</p>
					</div>
					<div class="rounded-lg bg-emerald-50 p-2 text-emerald-700">
						<ClipboardListIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Farm and feed entries</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
							Over Capacity
						</p>
						<p class="mt-2 text-3xl font-bold {overCount > 0 ? 'text-red-700' : 'text-gray-900'}">
							{overCount}
						</p>
					</div>
					<div class="rounded-lg bg-amber-50 p-2 text-amber-700">
						<AlertTriangleIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Trips above truck capacity</p>
			</div>
		</div>

		<!-- STATUS TABS -->
		<div class="max-w-full overflow-x-auto">
			<div class="flex w-fit rounded-lg border border-gray-200 bg-white p-1">
				{#each statusTabs as tab (tab.value)}
					<button
						type="button"
						onclick={() => (statusFilter = tab.value)}
						aria-pressed={statusFilter === tab.value}
						class="flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold whitespace-nowrap capitalize transition-colors {statusFilter ===
						tab.value
							? 'bg-stone-100 text-gray-900'
							: 'text-gray-500 hover:text-gray-700'}"
					>
						{tab.label}
						<span class="font-mono text-[11px] text-gray-400">{tab.count}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- CONTENT CARD -->
		<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
			<!-- Filter bar -->
			<div class="border-b border-gray-100 p-4">
				<div class="flex flex-wrap items-center gap-2">
					<div class="relative min-w-[220px] flex-1 sm:max-w-xs">
						<SearchIcon
							class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
						/>
						<Input
							bind:value={search}
							placeholder="Search plate, driver, farm, batch, or feed…"
							class="h-10 rounded-lg border-gray-300 pl-9 {inputCls}"
							aria-label="Search"
						/>
					</div>

					<Select.Root type="single" bind:value={loadFilter}>
						<Select.Trigger
							class="h-10 w-[160px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by load"
						>
							{#if loadFilter === 'all'}
								All loads
							{:else if loadFilter === 'over'}
								Over capacity
							{:else}
								Within capacity
							{/if}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All loads</Select.Item>
							<Select.Item value="over">Over capacity</Select.Item>
							<Select.Item value="ok">Within capacity</Select.Item>
						</Select.Content>
					</Select.Root>

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
							<Select.Item value="date-desc">Newest first</Select.Item>
							<Select.Item value="date-asc">Oldest first</Select.Item>
							<Select.Item value="plate-asc">Plate (A–Z)</Select.Item>
							<Select.Item value="plate-desc">Plate (Z–A)</Select.Item>
							<Select.Item value="driver-asc">Driver (A–Z)</Select.Item>
							<Select.Item value="driver-desc">Driver (Z–A)</Select.Item>
							<Select.Item value="status-asc">Status (A–Z)</Select.Item>
							<Select.Item value="status-desc">Status (Z–A)</Select.Item>
							<Select.Item value="load-desc">Fullest load</Select.Item>
							<Select.Item value="load-asc">Lightest load</Select.Item>
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

			<Table.Root>
				<Table.Header class="bg-stone-50">
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
						<Table.Head class="{thCls} hidden lg:table-cell">Lines</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each paginatedTrips as trip (trip.id)}
						{@const m = meter(trip.totalBags, trip.truckCapacity)}
						{@const over = m.over > 0}
						{@const open = expandedIds.has(trip.id)}

						<Table.Row
							class="group cursor-pointer transition-colors hover:bg-amber-50/40 {open
								? 'bg-amber-50/30'
								: ''}"
							onclick={() => toggleExpand(trip.id)}
						>
							<Table.Cell class="w-10 pr-0">
								<button
									type="button"
									class="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
									aria-expanded={open}
									aria-controls="trip-{trip.id}"
									aria-label="{open ? 'Hide' : 'Show'} loads for {trip.plateNumber}"
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
								<span class="font-semibold text-gray-900">
									{trip.plateNumber}
									<Badge variant="secondary" class="ml-2 font-mono">{trip.tripCode}</Badge>
								</span>
							</Table.Cell>

							<Table.Cell class="hidden text-sm text-gray-700 md:table-cell">
								<span class="inline-flex items-center gap-1.5">
									<UserIcon class="h-3.5 w-3.5 text-gray-400" />
									{trip.driverName || '—'}
								</span>
							</Table.Cell>

							<Table.Cell class="hidden text-xs text-gray-600 sm:table-cell">
								{formatDate(trip.dispatchDate)}
							</Table.Cell>

							<Table.Cell>
								<span class="{pillCls} capitalize {statusBadge(trip.status)}">
									<span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
									{statusLabel(trip.status)}
								</span>
							</Table.Cell>

							<Table.Cell>
								<div class="w-44">
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
												+{m.over.toLocaleString()} over
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
											class="absolute inset-y-0 left-0 {over
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

							<Table.Cell class="hidden text-sm text-gray-700 lg:table-cell">
								{trip.items.length}
							</Table.Cell>
						</Table.Row>

						{#if open}
							<Table.Row id="trip-{trip.id}" class="bg-stone-50/70 hover:bg-stone-50/70">
								<Table.Cell colspan={7} class="p-0">
									{#if trip.driverPhone || trip.notes}
										<div
											class="flex flex-wrap gap-x-6 gap-y-1 border-b border-gray-100 px-4 py-2.5 text-xs text-gray-600 sm:pl-14"
										>
											<span class="md:hidden">
												Driver: <span class="font-medium text-gray-900">{trip.driverName}</span>
											</span>
											{#if trip.driverPhone}
												<span>
													Phone: <span class="font-medium text-gray-900">{trip.driverPhone}</span>
												</span>
											{/if}
											{#if trip.notes}
												<span>Notes: {trip.notes}</span>
											{/if}
										</div>
									{/if}

									{#if trip.items.length === 0}
										<p class="px-4 py-4 text-sm text-gray-500 sm:pl-14">
											No load lines recorded for this trip.
										</p>
									{:else}
										<Table.Root>
											<Table.Header>
												<Table.Row class="hover:bg-transparent">
													<Table.Head class="{thCls} h-9 sm:pl-14">Farm</Table.Head>
													<Table.Head class="{thCls} h-9">Batch</Table.Head>
													<Table.Head class="{thCls} h-9">Feed</Table.Head>
													<Table.Head class="{thCls} hidden h-9 md:table-cell"
														>Stock source</Table.Head
													>
													<Table.Head class="{thCls} h-9 text-right">Bags loaded</Table.Head>
												</Table.Row>
											</Table.Header>
											<Table.Body>
												{#each trip.items as item (item.id)}
													{@const diff = item.loadedQty - item.scheduledQty}
													<Table.Row class="bg-white">
														<Table.Cell class="py-2 sm:pl-14">
															<span class="font-semibold text-gray-900">
																{item.farmName || '—'}
																{#if item.farmCode}
																	<Badge variant="secondary" class="ml-2">{item.farmCode}</Badge>
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
																{[item.supplierName, item.productName].filter(Boolean).join(' · ')}
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
																<span class="{pillCls} ml-2 bg-red-50 text-red-700 ring-red-200">
																	{diff.toLocaleString()} extra
																</span>
															{/if}
														</Table.Cell>
													</Table.Row>
												{/each}
											</Table.Body>
										</Table.Root>
									{/if}
								</Table.Cell>
							</Table.Row>
						{/if}
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
										<p class="font-semibold text-gray-900">No matching dispatches</p>
										<p class="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
										<Button variant="outline" class="mt-4" onclick={clearFilters}>
											Clear filters
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
					class="flex flex-col gap-3 border-t border-gray-100 bg-stone-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex flex-wrap items-center gap-4 text-xs text-gray-500">
						<span>
							Showing
							<span class="font-semibold text-gray-700">
								{(currentPage - 1) * pageSize + 1}
							</span>
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
