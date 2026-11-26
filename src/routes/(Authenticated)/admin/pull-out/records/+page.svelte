<script lang="ts">
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import {
		SearchIcon,
		EyeIcon,
		InboxIcon,
		XIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		FileTextIcon,
		ClockIcon,
		AlertTriangleIcon,
		CalendarDaysIcon,
		TruckIcon,
		ArrowUpDownIcon,
		ArrowUpIcon,
		ArrowDownIcon
	} from '@lucide/svelte';

	import type { PullOutRow } from './+page.server.ts';
	import Pulloutdialog from '#lib/components/pull-out/pulloutdialog.svelte';

	const REPORT_BASE = '/admin/budget-placement/reports';

	type SortValue =
		| 'date-asc'
		| 'date-desc'
		| 'farm-asc'
		| 'farm-desc'
		| 'feed-asc'
		| 'feed-desc'
		| 'amount-desc'
		| 'amount-asc'
		| 'qty-desc'
		| 'qty-asc';
	type DateWindow =
		'all' | 'today' | 'tomorrow' | 'next-7' | 'next-30' | 'overdue' | 'this-month' | 'no-date';

	//@ts-ignore
	let { data } = $props<{ data: { pullouts: PullOutRow[] } }>();

	const rows = $derived<PullOutRow[]>(data.pullouts ?? []);

	let search = $state('');
	let farmFilter = $state('all');
	let windowFilter = $state<DateWindow>('all');
	let dateFrom = $state('');
	let dateTo = $state('');
	let sortValue = $state<SortValue>('date-asc');

	let pageSizeRaw = $state('25');
	let page = $state(1);
	const pageSize = $derived(Number(pageSizeRaw));

	// ── date helpers (Manila) ──────────────────────────────────────────────
	const dayKey = (d: Date | string) =>
		new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

	function daysBetween(aKey: string, bKey: string): number {
		const [ay, am, ad] = aKey.split('-').map(Number);
		const [by, bm, bd] = bKey.split('-').map(Number);
		return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
	}

	const todayKey = $derived(dayKey(new Date()));

	function dayLabel(day: number | null): string {
		if (day == null) return '—';
		if (day === 0) return 'D0';
		return day > 0 ? `D+${day}` : `D${day}`;
	}

	const peso = (n: number) =>
		'₱' +
		Number(n).toLocaleString('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});

	// ── KPI summary ────────────────────────────────────────────────────────
	const summary = $derived.by(() => {
		let total = 0;
		let today = 0;
		let overdue = 0;
		let week = 0;
		let totalAmount = 0;
		const farms = new Set<string>();
		const batches = new Set<string>();

		for (const r of rows) {
			total++;
			totalAmount += r.amountNum;
			farms.add(r.farmId);
			batches.add(r.chickBatchId);

			if (r.dateKey === todayKey) today++;
			else if (r.dateKey && r.dateKey < todayKey) overdue++;
			else if (r.dateKey) {
				const diff = daysBetween(todayKey, r.dateKey);
				if (diff >= 1 && diff <= 7) week++;
			}
		}
		return { total, today, overdue, week, totalAmount, farms: farms.size, batches: batches.size };
	});

	// ── farm options ───────────────────────────────────────────────────────
	const farmOptions = $derived.by(() => {
		const m = new Map<string, { id: string; name: string; code: string; type: string | null }>();
		for (const r of rows) {
			if (!m.has(r.farmId)) {
				m.set(r.farmId, {
					id: r.farmId,
					name: r.farmName,
					code: r.farmCode,
					type: r.farmType
				});
			}
		}
		return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
	});

	const TYPE_STYLES: Record<string, string> = {
		CCS: 'bg-blue-50 text-blue-700 ring-blue-200',
		CON: 'bg-red-50 text-red-700 ring-red-200'
	};
	const typeStyle = (t: string | null | undefined) =>
		TYPE_STYLES[(t ?? '').toUpperCase()] ?? 'bg-gray-100 text-gray-600 ring-gray-200';

	function matchesWindow(dateKey: string, w: DateWindow): boolean {
		if (w === 'all') return true;
		if (w === 'no-date') return !dateKey;
		if (!dateKey) return false;
		if (w === 'today') return dateKey === todayKey;
		if (w === 'tomorrow')
			return (
				dateKey ===
				(() => {
					const d = new Date(todayKey + 'T00:00:00+08:00');
					d.setDate(d.getDate() + 1);
					return dayKey(d);
				})()
			);
		const diff = daysBetween(todayKey, dateKey);
		if (w === 'overdue') return diff < 0;
		if (w === 'next-7') return diff >= 0 && diff <= 7;
		if (w === 'next-30') return diff >= 0 && diff <= 30;
		if (w === 'this-month') return dateKey.slice(0, 7) === todayKey.slice(0, 7);
		return true;
	}

	// ── filtering + sorting + pagination ──────────────────────────────────
	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();

		const out = rows.filter((r) => {
			if (
				q &&
				!r.documentId.toLowerCase().includes(q) &&
				!r.farmName.toLowerCase().includes(q) &&
				!r.farmCode.toLowerCase().includes(q) &&
				!r.batchNumber.toLowerCase().includes(q) &&
				!r.feedName.toLowerCase().includes(q)
			) {
				return false;
			}
			if (farmFilter !== 'all' && r.farmId !== farmFilter) return false;
			if (!matchesWindow(r.dateKey, windowFilter)) return false;
			if (dateFrom && (!r.dateKey || r.dateKey < dateFrom)) return false;
			if (dateTo && (!r.dateKey || r.dateKey > dateTo)) return false;
			return true;
		});

		const [key, dir] = sortValue.split('-') as [string, 'asc' | 'desc'];

		out.sort((a, b) => {
			let cmp = 0;
			switch (key) {
				case 'date':
					cmp = (a.dateKey || '9999').localeCompare(b.dateKey || '9999');
					break;
				case 'farm':
					cmp = a.farmCode.localeCompare(b.farmCode);
					break;
				case 'feed':
					cmp = a.feedName.localeCompare(b.feedName);
					break;
				case 'amount':
					cmp = a.amountNum - b.amountNum;
					break;
				case 'qty':
					cmp = a.qtyNum - b.qtyNum;
					break;
			}
			return dir === 'asc' ? cmp : -cmp;
		});

		return out;
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const currentPage = $derived(Math.min(page, totalPages));
	const paginated = $derived(filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize));

	$effect(() => {
		void search;
		void farmFilter;
		void windowFilter;
		void dateFrom;
		void dateTo;
		void sortValue;
		void pageSizeRaw;
		page = 1;
	});

	const hasFilters = $derived(
		search.trim() !== '' ||
			farmFilter !== 'all' ||
			windowFilter !== 'all' ||
			dateFrom !== '' ||
			dateTo !== ''
	);

	function clearFilters() {
		search = '';
		farmFilter = 'all';
		windowFilter = 'all';
		dateFrom = '';
		dateTo = '';
	}

	function toggleSort(key: 'date' | 'farm' | 'feed' | 'amount' | 'qty') {
		const [curKey, curDir] = sortValue.split('-') as [string, 'asc' | 'desc'];
		if (curKey === key) {
			sortValue = `${key}-${curDir === 'asc' ? 'desc' : 'asc'}` as SortValue;
		} else {
			const defaultDir = key === 'amount' || key === 'qty' ? 'desc' : 'asc';
			sortValue = `${key}-${defaultDir}` as SortValue;
		}
	}

	function ariaSort(key: 'date' | 'farm' | 'feed' | 'amount' | 'qty') {
		const [curKey, curDir] = sortValue.split('-');
		if (curKey !== key) return 'none';
		return curDir === 'asc' ? 'ascending' : 'descending';
	}

	function goToPage(p: number) {
		page = Math.max(1, Math.min(p, totalPages));
	}

	function dateBadgeClass(dateKey: string): string {
		if (!dateKey) return 'bg-gray-100 text-gray-500 ring-gray-200';
		if (dateKey < todayKey) return 'bg-rose-50 text-rose-700 ring-rose-200';
		if (dateKey === todayKey) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
		const diff = daysBetween(todayKey, dateKey);
		if (diff <= 7) return 'bg-amber-50 text-amber-700 ring-amber-200';
		return 'bg-stone-100 text-gray-700 ring-stone-200';
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
	const iconLink =
		'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-amber-100 hover:text-amber-800';

	let truckDialogOpen = $state(false);
	let truckRow = $state<PullOutRow | null>(null);

	function openTruckDialog(row: PullOutRow) {
		truckRow = row;
		truckDialogOpen = true;
	}

	function handleTruckSave(payload: unknown) {
		console.log('truck arrival', payload); // replace with your form action / fetch
	}
</script>

<svelte:head>
	<title>Pull-out Records | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER -->
		<div>
			<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Records</p>
			<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Pull-out Records</h1>
			<p class="mt-1 text-sm text-gray-500">
				Every feed scheduled to be pulled out, derived from saved budget placements.
			</p>
		</div>

		<!-- KPI CARDS -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Total Feeds</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{summary.total}</p>
					</div>
					<div class="rounded-lg bg-red-50 p-2 text-red-700">
						<TruckIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">
					Across {summary.batches} batches · {summary.farms} farms
				</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Today</p>
						<p class="mt-2 text-3xl font-bold text-emerald-700">{summary.today}</p>
					</div>
					<div class="rounded-lg bg-emerald-50 p-2 text-emerald-700">
						<CalendarDaysIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">{summary.week} scheduled in the next 7 days</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Overdue</p>
						<p class="mt-2 text-3xl font-bold text-rose-700">{summary.overdue}</p>
					</div>
					<div class="rounded-lg bg-rose-50 p-2 text-rose-700">
						<AlertTriangleIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Past their pull-out date</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Total Value</p>
						<p class="mt-2 truncate text-2xl font-bold text-gray-900">
							{peso(summary.totalAmount)}
						</p>
					</div>
					<div class="rounded-lg bg-amber-50 p-2 text-amber-700">
						<FileTextIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Sum of all feed pull-out amounts</p>
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
							placeholder="Search feed, farm, batch, document…"
							class="h-10 rounded-lg border-gray-300 pl-9 {inputCls}"
							aria-label="Search pull-outs"
						/>
					</div>

					<Select.Root type="single" bind:value={farmFilter}>
						<Select.Trigger
							class="h-10 w-[170px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by farm"
						>
							<span class="truncate">
								{farmFilter === 'all'
									? 'All farms'
									: (farmOptions.find((f) => f.id === farmFilter)?.name ?? 'All farms')}
							</span>
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

					<Select.Root type="single" bind:value={windowFilter}>
						<Select.Trigger
							class="h-10 w-[150px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by date window"
						>
							{#if windowFilter === 'all'}Any date
							{:else if windowFilter === 'today'}Today
							{:else if windowFilter === 'tomorrow'}Tomorrow
							{:else if windowFilter === 'next-7'}Next 7 days
							{:else if windowFilter === 'next-30'}Next 30 days
							{:else if windowFilter === 'overdue'}Overdue
							{:else if windowFilter === 'this-month'}This month
							{:else if windowFilter === 'no-date'}No date
							{/if}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">Any date</Select.Item>
							<Select.Item value="today">Today</Select.Item>
							<Select.Item value="tomorrow">Tomorrow</Select.Item>
							<Select.Item value="next-7">Next 7 days</Select.Item>
							<Select.Item value="next-30">Next 30 days</Select.Item>
							<Select.Item value="overdue">Overdue</Select.Item>
							<Select.Item value="this-month">This month</Select.Item>
							<Select.Item value="no-date">No date</Select.Item>
						</Select.Content>
					</Select.Root>

					<div class="flex items-center gap-1.5">
						<Input
							type="date"
							bind:value={dateFrom}
							max={dateTo || undefined}
							class="h-10 w-[140px] rounded-lg border-gray-300 text-sm {inputCls}"
							aria-label="Pull-out from date"
						/>
						<span class="text-xs text-gray-400">to</span>
						<Input
							type="date"
							bind:value={dateTo}
							min={dateFrom || undefined}
							class="h-10 w-[140px] rounded-lg border-gray-300 text-sm {inputCls}"
							aria-label="Pull-out to date"
						/>
					</div>

					<Select.Root type="single" bind:value={sortValue}>
						<Select.Trigger
							class="h-10 w-[200px] rounded-lg border-gray-300 text-sm"
							aria-label="Sort order"
						>
							<span class="flex items-center gap-1.5">
								{sortValue.endsWith('asc') ? '' : ''}
								{sortValue.endsWith('asc') ? '' : ''}
								{#if sortValue.endsWith('asc')}
									<ArrowUpIcon class="h-3.5 w-3.5 text-gray-500" />
								{:else}
									<ArrowDownIcon class="h-3.5 w-3.5 text-gray-500" />
								{/if}
								{#if sortValue === 'date-asc'}Earliest first
								{:else if sortValue === 'date-desc'}Latest first
								{:else if sortValue === 'farm-asc'}Farm (A–Z)
								{:else if sortValue === 'farm-desc'}Farm (Z–A)
								{:else if sortValue === 'feed-asc'}Feed (A–Z)
								{:else if sortValue === 'feed-desc'}Feed (Z–A)
								{:else if sortValue === 'amount-desc'}Highest amount
								{:else if sortValue === 'amount-asc'}Lowest amount
								{:else if sortValue === 'qty-desc'}Highest qty
								{:else if sortValue === 'qty-asc'}Lowest qty
								{/if}
							</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="date-asc">Earliest first</Select.Item>
							<Select.Item value="date-desc">Latest first</Select.Item>
							<Select.Item value="farm-asc">Farm (A–Z)</Select.Item>
							<Select.Item value="farm-desc">Farm (Z–A)</Select.Item>
							<Select.Item value="feed-asc">Feed (A–Z)</Select.Item>
							<Select.Item value="feed-desc">Feed (Z–A)</Select.Item>
							<Select.Item value="amount-desc">Highest amount</Select.Item>
							<Select.Item value="amount-asc">Lowest amount</Select.Item>
							<Select.Item value="qty-desc">Highest qty</Select.Item>
							<Select.Item value="qty-asc">Lowest qty</Select.Item>
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
			{#snippet sortIcon(key: 'date' | 'farm' | 'feed' | 'amount' | 'qty')}
				{#if ariaSort(key) === 'ascending'}
					<ArrowUpIcon class="h-3 w-3" />
				{:else if ariaSort(key) === 'descending'}
					<ArrowDownIcon class="h-3 w-3" />
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
						<p class="font-semibold text-gray-900">No matching pull-outs</p>
						<p class="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
						<Button variant="outline" class="mt-4" onclick={clearFilters}>Clear filters</Button>
					{:else}
						<p class="font-semibold text-gray-900">No pull-outs yet</p>
						<p class="mt-1 text-sm text-gray-500">
							Save a budget placement with FEEDS entries and they will appear here.
						</p>
					{/if}
				</div>
			{/snippet}

			<Table.Root>
				<Table.Header class="bg-stone-50">
					<Table.Row class="hover:bg-transparent">
						<Table.Head class={thCls}>
							<button
								type="button"
								onclick={() => toggleSort('date')}
								class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
								aria-sort={ariaSort('date')}
							>
								Pull-out date
								{@render sortIcon('date')}
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
						<Table.Head class="{thCls} hidden md:table-cell">Batch</Table.Head>
						<Table.Head class={thCls}>
							<button
								type="button"
								onclick={() => toggleSort('feed')}
								class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
								aria-sort={ariaSort('feed')}
							>
								Feed
								{@render sortIcon('feed')}
							</button>
						</Table.Head>
						<Table.Head class="{thCls} text-right">
							<button
								type="button"
								onclick={() => toggleSort('qty')}
								class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
								aria-sort={ariaSort('qty')}
							>
								Qty
								{@render sortIcon('qty')}
							</button>
						</Table.Head>

						<Table.Head class="{thCls} hidden xl:table-cell">Report</Table.Head>
						<Table.Head class="w-16"><span class="sr-only">Actions</span></Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each paginated as row (row.id)}
						<Table.Row class="group transition-colors hover:bg-amber-50/40">
							<Table.Cell>
								<span
									class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset {dateBadgeClass(
										row.dateKey
									)}"
								>
									{#if row.dateKey}
										<ClockIcon class="h-3 w-3" />
									{/if}
									{row.dateLabel || 'Unassigned'}
								</span>
								<span
									class="ml-1 rounded bg-stone-200/70 px-1 py-0.5 font-mono text-[9px] text-gray-600"
								>
									{dayLabel(row.day)}
								</span>
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
							<Table.Cell class="font-semibold text-gray-900">
								{row.feedName}
								{#if row.label}
									<span class="ml-1 text-xs font-normal text-gray-500">{row.label}</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-right text-sm text-gray-700 tabular-nums">
								{row.qty} bags
							</Table.Cell>

							<Table.Cell class="hidden xl:table-cell">
								<a
									href="{REPORT_BASE}/{row.documentId}"
									class="font-mono text-xs font-semibold text-red-700 hover:underline"
								>
									{row.documentId}
								</a>
							</Table.Cell>
							<Table.Cell class="flex flex-row gap-2">
								<div class="flex justify-end opacity-60 transition-opacity group-hover:opacity-100">
									<button
										type="button"
										class={iconLink}
										onclick={() => openTruckDialog(row)}
										aria-label="Assign truck for {row.feedName}"
									>
										<TruckIcon class="h-4 w-4" />
									</button>
								</div>
								<div class="flex justify-end opacity-60 transition-opacity group-hover:opacity-100">
									<a
										href="{REPORT_BASE}/{row.documentId}"
										class={iconLink}
										aria-label="View report {row.documentId}"
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
							{filtered.length === 1 ? 'feed' : 'feeds'}
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
									<Select.Item value="25">25</Select.Item>
									<Select.Item value="50">50</Select.Item>
									<Select.Item value="100">100</Select.Item>
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

<Pulloutdialog bind:open={truckDialogOpen} row={truckRow} onsubmit={handleTruckSave} />
