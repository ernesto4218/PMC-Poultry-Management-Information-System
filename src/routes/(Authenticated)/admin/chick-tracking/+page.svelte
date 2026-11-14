<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import type { ChickBatchWithFarm } from '#lib/types/chick-batches.ts';
	import type { MedicineEntry } from '#lib/types/medicine.ts';
	import {
		BirdIcon,
		EggIcon,
		PillIcon,
		AlertCircleIcon,
		CheckCircle2Icon,
		ClockIcon,
		MapPinIcon,
		CalendarDaysIcon,
		ArrowRightIcon,
		SearchIcon,
		InboxIcon,
		ShieldCheckIcon,
		SparklesIcon,
		PlusIcon,
		XIcon,
		SyringeIcon,
		DropletIcon,
		EyeIcon,
		WindIcon,
		FeatherIcon,
		LeafIcon
	} from '@lucide/svelte';

	type BatchStatus = 'on-track' | 'at-risk' | 'critical' | 'complete';
	type StatusFilter = 'all' | BatchStatus;

	interface BatchOverview {
		batch: ChickBatchWithFarm;
		currentDay: number;
		completedCount: number;
		totalEntries: number;
		completionPct: number;
		overdue: MedicineEntry[];
		today: MedicineEntry[];
		upcoming: MedicineEntry[];
		nextDue: MedicineEntry | null;
		status: BatchStatus;
		daysRemaining: number;
	}

	interface FlattenedEntry extends MedicineEntry {
		batchId: string;
		batchNumber: string;
		farmName: string;
		currentDay: number;
		daysOverdue?: number;
		daysAway?: number;
	}

	//@ts-ignore
	let { data } = $props<{
		data: {
			overview: BatchOverview[];
			active: BatchOverview[];
			complete: BatchOverview[];
			overdueAll: FlattenedEntry[];
			upcomingAll: FlattenedEntry[];
			totals: {
				batches: number;
				activeBatches: number;
				completedBatches: number;
				totalChicks: number;
				compliance: number;
				totalCompleted: number;
				totalPossible: number;
				totalOverdue: number;
			};
		};
	}>();

	let search = $state('');
	let statusFilter = $state<StatusFilter>('all');

	const filteredActive = $derived(
		data.active.filter((o) => {
			const q = search.trim().toLowerCase();
			const matchesSearch =
				!q ||
				o.batch.batchNumber.toLowerCase().includes(q) ||
				o.batch.farm.name.toLowerCase().includes(q) ||
				o.batch.farm.code.toLowerCase().includes(q);
			const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
			return matchesSearch && matchesStatus;
		})
	);

	const hasFilters = $derived(search.trim() !== '' || statusFilter !== 'all');

	function clearFilters() {
		search = '';
		statusFilter = 'all';
	}

	// ---- Style helpers --------------------------------------------------
	function statusPill(s: BatchStatus): string {
		switch (s) {
			case 'on-track':
				return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
			case 'at-risk':
				return 'bg-amber-50 text-amber-800 ring-amber-200';
			case 'critical':
				return 'bg-red-50 text-red-700 ring-red-200';
			case 'complete':
				return 'bg-stone-100 text-stone-600 ring-stone-200';
		}
	}
	function statusLabel(s: BatchStatus): string {
		switch (s) {
			case 'on-track':
				return 'On track';
			case 'at-risk':
				return 'At risk';
			case 'critical':
				return 'Critical';
			case 'complete':
				return 'Complete';
		}
	}
	function statusBarColor(s: BatchStatus): string {
		switch (s) {
			case 'on-track':
				return 'bg-emerald-500';
			case 'at-risk':
				return 'bg-amber-500';
			case 'critical':
				return 'bg-red-500';
			case 'complete':
				return 'bg-stone-400';
		}
	}

	function routeIcon(r: MedicineEntry['route']) {
		switch (r) {
			case 'injection':
				return SyringeIcon;
			case 'water':
				return DropletIcon;
			case 'eye-drop':
				return EyeIcon;
			case 'spray':
				return WindIcon;
			case 'wing-web':
				return FeatherIcon;
			case 'feed':
				return LeafIcon;
		}
	}
	function categoryClass(c: MedicineEntry['category']): string {
		switch (c) {
			case 'vaccine':
				return 'bg-blue-50 text-blue-700 ring-blue-200';
			case 'vitamin':
				return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
			case 'antibiotic':
				return 'bg-red-50 text-red-700 ring-red-200';
			case 'coccidiostat':
				return 'bg-amber-50 text-amber-800 ring-amber-200';
			case 'electrolyte':
				return 'bg-purple-50 text-purple-700 ring-purple-200';
			default:
				return 'bg-stone-100 text-stone-600 ring-stone-200';
		}
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
</script>

<svelte:head>
	<title>Chick Management | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Chick Management</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Tracking Overview</h1>
				<p class="mt-1 text-sm text-gray-500">
					Live view of every batch's cycle and medicine progress.
				</p>
			</div>

			<div class="flex items-center gap-2">
				<a
					href="/admin/chick-batch"
					class="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-stone-50"
				>
					<BirdIcon class="h-4 w-4" />
					All Batches
				</a>
				<a
					href="/admin/chick-batches"
					class="inline-flex h-10 items-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white shadow-sm shadow-red-900/20 transition-colors hover:bg-red-600 active:scale-[0.98]"
				>
					<PlusIcon class="h-4 w-4" />
					Add Batch
				</a>
			</div>
		</div>

		<!-- KPI CARDS — uniform structure -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<!-- Active batches -->
			<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
				<div class="flex items-start justify-between gap-2">
					<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Active Batches</p>
					<div class="rounded-lg bg-amber-50 p-2 text-amber-700">
						<BirdIcon class="h-4 w-4" />
					</div>
				</div>
				<p class="mt-3 text-3xl font-bold text-gray-900">{data.totals.activeBatches}</p>
				<p class="mt-1 text-xs text-gray-500">
					{data.totals.completedBatches} completed cycle{data.totals.completedBatches === 1
						? ''
						: 's'}
				</p>
			</div>

			<!-- Chicks in cycle -->
			<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
				<div class="flex items-start justify-between gap-2">
					<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
						Chicks in Cycle
					</p>
					<div class="rounded-lg bg-emerald-50 p-2 text-emerald-700">
						<EggIcon class="h-4 w-4" />
					</div>
				</div>
				<p class="mt-3 text-3xl font-bold text-gray-900">
					{data.totals.totalChicks.toLocaleString()}
				</p>
				<p class="mt-1 text-xs text-gray-500">Across active batches</p>
			</div>

			<!-- Compliance -->
			<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
				<div class="flex items-start justify-between gap-2">
					<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Compliance</p>
					<div class="rounded-lg bg-blue-50 p-2 text-blue-700">
						<PillIcon class="h-4 w-4" />
					</div>
				</div>
				<p class="mt-3 text-3xl font-bold text-gray-900">{data.totals.compliance}%</p>
				<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
					<div
						class="h-full rounded-full bg-emerald-500 transition-all duration-300"
						style="width: {data.totals.compliance}%"
					></div>
				</div>
				<p class="mt-2 text-xs text-gray-500">
					{data.totals.totalCompleted} of {data.totals.totalPossible} medicines done
				</p>
			</div>

			<!-- Needs attention -->
			<div
				class="rounded-xl border bg-white p-5 shadow-sm {data.totals.totalOverdue > 0
					? 'border-red-200'
					: 'border-gray-200'}"
			>
				<div class="flex items-start justify-between gap-2">
					<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
						Needs Attention
					</p>
					<div
						class="rounded-lg p-2 {data.totals.totalOverdue > 0
							? 'bg-red-50 text-red-700'
							: 'bg-stone-100 text-gray-500'}"
					>
						<AlertCircleIcon class="h-4 w-4" />
					</div>
				</div>
				<p
					class="mt-3 text-3xl font-bold {data.totals.totalOverdue > 0
						? 'text-red-600'
						: 'text-gray-900'}"
				>
					{data.totals.totalOverdue}
				</p>
				<p
					class="mt-1 text-xs {data.totals.totalOverdue > 0
						? 'font-medium text-red-600'
						: 'text-gray-500'}"
				>
					{data.totals.totalOverdue > 0 ? 'Overdue medicines' : 'All caught up'}
				</p>
			</div>
		</div>

		<!-- ACTIVE BATCHES -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<!-- Section header -->
			<div class="border-b border-gray-100 p-4">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-center gap-2">
						<div class="rounded-md bg-amber-50 p-1.5 text-amber-700">
							<BirdIcon class="h-4 w-4" />
						</div>
						<h2 class="text-sm font-bold text-gray-900">
							Active Batches
							<span class="ml-1 font-mono text-xs font-medium text-gray-500">
								{filteredActive.length}/{data.active.length}
							</span>
						</h2>
					</div>

					{#if hasFilters}
						<Button
							variant="ghost"
							class="h-8 self-start text-xs text-gray-600 hover:text-red-700 sm:self-auto"
							onclick={clearFilters}
						>
							<XIcon class="mr-1 h-3.5 w-3.5" />
							Clear
						</Button>
					{/if}
				</div>

				<!-- Filters row -->
				<div class="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center">
					<div class="relative w-full lg:max-w-xs">
						<SearchIcon
							class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
						/>
						<Input
							bind:value={search}
							placeholder="Search batch #, farm, or code…"
							class="h-9 rounded-lg border-gray-300 pl-9 text-sm {inputCls}"
							aria-label="Search batches"
						/>
					</div>

					<div class="flex flex-wrap gap-1">
						{#each [{ key: 'all', label: 'All', count: data.active.length }, { key: 'on-track', label: 'On track', count: data.active.filter((b) => b.status === 'on-track').length }, { key: 'at-risk', label: 'At risk', count: data.active.filter((b) => b.status === 'at-risk').length }, { key: 'critical', label: 'Critical', count: data.active.filter((b) => b.status === 'critical').length }] as f (f.key)}
							<button
								type="button"
								onclick={() => (statusFilter = f.key as StatusFilter)}
								class="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors {statusFilter ===
								f.key
									? 'bg-stone-900 text-white'
									: 'bg-stone-100 text-gray-600 hover:bg-stone-200'}"
							>
								{f.label}
								<span
									class="rounded-full px-1.5 py-0.5 text-[10px] font-bold {statusFilter === f.key
										? 'bg-white/20 text-white'
										: 'bg-white text-gray-700'}"
								>
									{f.count}
								</span>
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Batch cards -->
			<div class="p-4">
				{#if filteredActive.length === 0}
					<div class="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
						>
							<InboxIcon class="h-6 w-6" />
						</div>
						{#if hasFilters}
							<p class="font-semibold text-gray-900">No matching batches</p>
							<p class="mt-1 text-sm text-gray-500">
								Try a different search or clear your filters.
							</p>
							<Button variant="outline" class="mt-4" onclick={clearFilters}>Clear filters</Button>
						{:else}
							<p class="font-semibold text-gray-900">No active batches</p>
							<p class="mt-1 text-sm text-gray-500">All batches have completed their cycle.</p>
						{/if}
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
						{#each filteredActive as o (o.batch.id)}
							<div
								class="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
							>
								<!-- Body -->
								<div class="space-y-3 p-4">
									<!-- Row 1: batch # + status -->
									<div class="flex items-start justify-between gap-2">
										<span class="truncate font-mono text-xs font-semibold text-gray-900">
											{o.batch.batchNumber}
										</span>
										<span
											class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {statusPill(
												o.status
											)}"
										>
											{statusLabel(o.status)}
										</span>
									</div>

									<!-- Row 2: farm -->
									<div class="min-w-0">
										<h3 class="truncate text-sm font-bold text-gray-900">
											{o.batch.farm.name}
										</h3>
										<p class="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
											<MapPinIcon class="h-3 w-3 shrink-0" />
											<span class="truncate">{o.batch.farm.address || '—'}</span>
										</p>
									</div>

									<!-- Row 3: day + volume -->
									<div class="flex items-baseline justify-between gap-2">
										<div class="flex items-baseline gap-1">
											<span class="text-2xl font-bold text-gray-900">
												Day {Math.min(o.currentDay, 34)}
											</span>
											<span class="text-xs text-gray-400">of 34</span>
										</div>
										<span class="flex items-center gap-1 text-xs font-medium text-gray-600">
											<BirdIcon class="h-3 w-3 text-amber-600" />
											{o.batch.volume.toLocaleString()}
										</span>
									</div>

									<!-- Row 4: progress -->
									<div>
										<div class="h-2 overflow-hidden rounded-full bg-stone-100">
											<div
												class="h-full rounded-full transition-all duration-300 {statusBarColor(
													o.status
												)}"
												style="width: {o.completionPct}%"
											></div>
										</div>
										<div class="mt-1.5 flex justify-between text-[11px] text-gray-500">
											<span>{o.completedCount}/{o.totalEntries} medicines</span>
											<span class="font-semibold text-gray-700">{o.completionPct}%</span>
										</div>
									</div>

									<!-- Row 5: alerts (conditional) -->
									{#if o.overdue.length > 0 || o.today.length > 0}
										<div class="flex flex-wrap gap-1.5">
											{#if o.overdue.length > 0}
												<span
													class="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700"
												>
													<AlertCircleIcon class="h-2.5 w-2.5" />
													{o.overdue.length} overdue
												</span>
											{/if}
											{#if o.today.length > 0}
												<span
													class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
												>
													<ClockIcon class="h-2.5 w-2.5" />
													{o.today.length} today
												</span>
											{/if}
										</div>
									{/if}
								</div>

								<!-- Footer: next due + open -->
								<div
									class="flex items-center justify-between gap-2 border-t border-gray-100 bg-stone-50/60 px-4 py-2.5"
								>
									{#if o.nextDue}
										{@const Icon = routeIcon(o.nextDue.route)}
										<div class="min-w-0 flex-1">
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Next due
											</p>
											<p class="truncate text-xs font-semibold text-gray-900">
												{o.nextDue.name}
											</p>
											<p
												class="flex items-center gap-1 text-[10px] {o.nextDue.day < o.currentDay
													? 'font-medium text-red-600'
													: o.nextDue.day === o.currentDay
														? 'font-medium text-amber-700'
														: 'text-gray-500'}"
											>
												<Icon class="h-2.5 w-2.5" />
												Day {o.nextDue.day}
												{#if o.nextDue.day < o.currentDay}
													· {o.currentDay - o.nextDue.day}d overdue
												{:else if o.nextDue.day === o.currentDay}
													· today
												{:else}
													· in {o.nextDue.day - o.currentDay}d
												{/if}
											</p>
										</div>
									{:else}
										<div class="flex items-center gap-1.5 text-xs text-emerald-700">
											<SparklesIcon class="h-3.5 w-3.5" />
											<span class="font-semibold">All medicines done</span>
										</div>
									{/if}

									<a
										href="/admin/medicine-tracking?batch={o.batch.id}"
										class="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-white px-2.5 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-stone-100 hover:text-gray-900"
									>
										Open
										<ArrowRightIcon class="h-3 w-3" />
									</a>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- OVERDUE + UPCOMING -->
		<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
			<!-- Overdue -->
			<div
				class="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
			>
				<div class="flex items-center justify-between border-b border-gray-100 p-4">
					<div class="flex items-center gap-2">
						<div class="rounded-md bg-red-50 p-1.5 text-red-700">
							<AlertCircleIcon class="h-4 w-4" />
						</div>
						<h2 class="text-sm font-bold text-gray-900">
							Overdue
							<span class="ml-1 font-mono text-xs font-medium text-gray-500">
								{data.overdueAll.length}
							</span>
						</h2>
					</div>
				</div>

				<div class="max-h-[420px] overflow-y-auto">
					{#if data.overdueAll.length === 0}
						<div class="flex flex-col items-center py-14 text-center">
							<div
								class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
							>
								<CheckCircle2Icon class="h-5 w-5" />
							</div>
							<p class="text-sm font-semibold text-gray-900">Nothing overdue</p>
							<p class="mt-1 text-xs text-gray-500">All batches are on schedule.</p>
						</div>
					{:else}
						<ul class="divide-y divide-gray-100">
							{#each data.overdueAll as item (item.batchId + item.id)}
								<li class="group flex items-start gap-3 px-4 py-3 hover:bg-stone-50/60">
									<div
										class="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-red-50 text-red-700"
									>
										<span class="text-xs leading-none font-bold">
											{item.daysOverdue}d
										</span>
										<span class="mt-0.5 text-[8px] font-semibold uppercase opacity-70"> late </span>
									</div>
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-1.5">
											<span class="truncate text-sm font-semibold text-gray-900">
												{item.name}
											</span>
											<span
												class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset {categoryClass(
													item.category
												)}"
											>
												{item.category}
											</span>
										</div>
										<p class="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
											<span class="font-mono text-gray-600">{item.batchNumber}</span>
											<span class="text-gray-300">·</span>
											<span class="truncate">{item.farmName}</span>
										</p>
										<p class="mt-0.5 text-[11px] text-red-600">
											Day {item.day} — {item.daysOverdue} day{item.daysOverdue === 1 ? '' : 's'} late
										</p>
									</div>
									<a
										href="/admin/medicine-tracking?batch={item.batchId}"
										class="mt-0.5 shrink-0 rounded-md p-1.5 text-gray-400 transition-colors group-hover:bg-white group-hover:text-gray-700 group-hover:shadow-sm"
										aria-label="Open batch"
									>
										<ArrowRightIcon class="h-3.5 w-3.5" />
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>

			<!-- Upcoming -->
			<div
				class="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
			>
				<div class="flex items-center justify-between border-b border-gray-100 p-4">
					<div class="flex items-center gap-2">
						<div class="rounded-md bg-blue-50 p-1.5 text-blue-700">
							<CalendarDaysIcon class="h-4 w-4" />
						</div>
						<h2 class="text-sm font-bold text-gray-900">
							Upcoming · next 7 days
							<span class="ml-1 font-mono text-xs font-medium text-gray-500">
								{data.upcomingAll.length}
							</span>
						</h2>
					</div>
				</div>

				<div class="max-h-[420px] overflow-y-auto">
					{#if data.upcomingAll.length === 0}
						<div class="flex flex-col items-center py-14 text-center">
							<div
								class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
							>
								<SparklesIcon class="h-5 w-5" />
							</div>
							<p class="text-sm font-semibold text-gray-900">Nothing upcoming</p>
							<p class="mt-1 text-xs text-gray-500">No medicines due in the next week.</p>
						</div>
					{:else}
						<ul class="divide-y divide-gray-100">
							{#each data.upcomingAll as item (item.batchId + item.id)}
								<li class="group flex items-start gap-3 px-4 py-3 hover:bg-stone-50/60">
									<div
										class="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-blue-50 text-blue-700"
									>
										<span class="text-xs leading-none font-bold">
											{item.daysAway}d
										</span>
										<span class="mt-0.5 text-[8px] font-semibold uppercase opacity-70"> away </span>
									</div>
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-1.5">
											<span class="truncate text-sm font-semibold text-gray-900">
												{item.name}
											</span>
											<span
												class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset {categoryClass(
													item.category
												)}"
											>
												{item.category}
											</span>
										</div>
										<p class="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
											<span class="font-mono text-gray-600">{item.batchNumber}</span>
											<span class="text-gray-300">·</span>
											<span class="truncate">{item.farmName}</span>
										</p>
										<p class="mt-0.5 text-[11px] text-blue-700">
											Day {item.day}
											{#if item.daysAway === 1}
												— tomorrow
											{:else}
												— in {item.daysAway} days
											{/if}
										</p>
									</div>
									<a
										href="/admin/medicine-tracking?batch={item.batchId}"
										class="mt-0.5 shrink-0 rounded-md p-1.5 text-gray-400 transition-colors group-hover:bg-white group-hover:text-gray-700 group-hover:shadow-sm"
										aria-label="Open batch"
									>
										<ArrowRightIcon class="h-3.5 w-3.5" />
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		</div>

		<!-- COMPLETED CYCLES — table -->
		{#if data.complete.length > 0}
			<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
				<div class="flex items-center gap-2 border-b border-gray-100 p-4">
					<div class="rounded-md bg-emerald-50 p-1.5 text-emerald-700">
						<CheckCircle2Icon class="h-4 w-4" />
					</div>
					<h2 class="text-sm font-bold text-gray-900">
						Completed Cycles
						<span class="ml-1 font-mono text-xs font-medium text-gray-500">
							{data.complete.length}
						</span>
					</h2>
				</div>

				<Table.Root>
					<Table.Header class="bg-stone-50">
						<Table.Row class="hover:bg-transparent">
							<Table.Head class={thCls}>Batch #</Table.Head>
							<Table.Head class={thCls}>Farm</Table.Head>
							<Table.Head class="{thCls} hidden sm:table-cell">Chicks</Table.Head>
							<Table.Head class="{thCls} hidden md:table-cell">Medicines</Table.Head>
							<Table.Head class="w-16"><span class="sr-only">Open</span></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.complete as o (o.batch.id)}
							<Table.Row class="group hover:bg-stone-50/60">
								<Table.Cell class="font-mono text-xs font-semibold text-gray-900">
									{o.batch.batchNumber}
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-col">
										<span class="text-sm font-semibold text-gray-900">
											{o.batch.farm.name}
										</span>
										<span class="flex items-center gap-1 text-xs text-gray-500">
											<MapPinIcon class="h-3 w-3" />
											<span class="truncate">{o.batch.farm.address || '—'}</span>
										</span>
									</div>
								</Table.Cell>
								<Table.Cell class="hidden text-sm text-gray-700 sm:table-cell">
									{o.batch.volume.toLocaleString()}
								</Table.Cell>
								<Table.Cell class="hidden md:table-cell">
									<span
										class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 ring-inset"
									>
										<CheckCircle2Icon class="h-3 w-3" />
										{o.completedCount}/{o.totalEntries}
									</span>
								</Table.Cell>
								<Table.Cell>
									<div class="flex justify-end">
										<a
											href="/admin/medicine-tracking?batch={o.batch.id}"
											class="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-stone-100 hover:text-gray-700"
											aria-label="Open batch"
										>
											<ArrowRightIcon class="h-3.5 w-3.5" />
										</a>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		{/if}

		<!-- Footer hint -->
		<div
			class="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-xs text-blue-800"
		>
			<ShieldCheckIcon class="h-4 w-4 shrink-0" />
			Batches and medicine progress come from mock data — wire to `ChickBatchService` and a persistent
			store later.
		</div>
	</div>
</div>
