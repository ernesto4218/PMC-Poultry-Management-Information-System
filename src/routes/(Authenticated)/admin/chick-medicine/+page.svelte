<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { tick } from 'svelte';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import type { ChickBatchWithFarm } from '#lib/types/chick-batches.ts';
	import type { MedicineEntry, MedicineCategory, MedicineRoute } from '#lib/types/medicine.ts';
	import {
		BirdIcon,
		MapPinIcon,
		CalendarDaysIcon,
		SyringeIcon,
		DropletIcon,
		EyeIcon,
		WindIcon,
		FeatherIcon,
		LeafIcon,
		CheckCircle2Icon,
		AlertCircleIcon,
		ClockIcon,
		CalendarIcon,
		InboxIcon,
		RotateCcwIcon,
		SparklesIcon,
		ShieldCheckIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		ChevronDownIcon,
		CheckIcon,
		SearchIcon,
		ListIcon,
		LayoutGridIcon,
		XIcon,
		PillIcon,
		TargetIcon
	} from '@lucide/svelte';

	//@ts-ignore
	let { data } = $props<{
		data: {
			batches: ChickBatchWithFarm[];
			schedule: MedicineEntry[];
			progress: Record<string, string[]>;
		};
	}>();

	type StatusFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'completed';
	type EntryStatus = 'completed' | 'overdue' | 'today' | 'upcoming';

	// ---- Batch selection (searchable) ---------------------------------
	let selectedBatchId = $state<string>(data.initialBatchId ?? data.batches[0]?.id ?? '');
	let batchPickerOpen = $state(false);
	let batchSearch = $state('');
	let batchPickerEl: HTMLDivElement;
	let batchSearchEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (batchPickerOpen) tick().then(() => batchSearchEl?.focus());
	});

	const selectedBatch = $derived(data.batches.find((b) => b.id === selectedBatchId) ?? null);

	const filteredBatches = $derived.by(() => {
		const q = batchSearch.trim().toLowerCase();
		if (!q) return data.batches;
		return data.batches.filter(
			(b) =>
				b.batchNumber.toLowerCase().includes(q) ||
				b.farm.name.toLowerCase().includes(q) ||
				b.farm.code.toLowerCase().includes(q)
		);
	});

	function toggleBatchPicker() {
		batchPickerOpen = !batchPickerOpen;
		if (!batchPickerOpen) batchSearch = '';
	}
	function selectBatch(id: string) {
		selectedBatchId = id;
		batchPickerOpen = false;
		batchSearch = '';
	}
	function onWindowClick(e: MouseEvent) {
		if (!batchPickerOpen) return;
		if (batchPickerEl && !batchPickerEl.contains(e.target as Node)) {
			batchPickerOpen = false;
			batchSearch = '';
		}
	}
	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && batchPickerOpen) {
			batchPickerOpen = false;
			batchSearch = '';
		}
	}

	// ---- Progress state ------------------------------------------------
	let progress = $state<Record<string, string[]>>({ ...data.progress });
	const completedSet = $derived(new Set<string>(progress[selectedBatchId] ?? []));

	// ---- Age / current day --------------------------------------------
	function ageDays(dateSet: string): number {
		const clean = dateSet.slice(0, 10);
		const [y, m, d] = clean.split('-').map(Number);
		const set = new Date(y, m - 1, d);
		set.setHours(0, 0, 0, 0);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return Math.round((today.getTime() - set.getTime()) / 86400000);
	}

	const currentDay = $derived(selectedBatch ? ageDays(selectedBatch.dateSet) + 1 : 1);

	// ---- Status ---------------------------------------------------------
	function entryStatus(day: number, completed: boolean): EntryStatus {
		if (completed) return 'completed';
		if (day < currentDay) return 'overdue';
		if (day === currentDay) return 'today';
		return 'upcoming';
	}

	const counts = $derived.by(() => {
		let completed = 0;
		let overdue = 0;
		let today = 0;
		let upcoming = 0;
		for (const e of data.schedule) {
			const s = entryStatus(e.day, completedSet.has(e.id));
			if (s === 'completed') completed++;
			else if (s === 'overdue') overdue++;
			else if (s === 'today') today++;
			else upcoming++;
		}
		return { completed, overdue, today, upcoming, total: data.schedule.length };
	});

	const completionPct = $derived(
		counts.total ? Math.round((counts.completed / counts.total) * 100) : 0
	);

	const nextDue = $derived.by(() => {
		const pending = data.schedule
			.filter((e) => !completedSet.has(e.id))
			.sort((a, b) => a.day - b.day);
		return pending[0] ?? null;
	});

	// ---- Filters --------------------------------------------------------
	let search = $state('');
	let statusFilter = $state<StatusFilter>('all');
	let categoryFilter = $state<string>('all');
	let viewMode = $state<'table' | 'grid'>('table');

	let pageSizeRaw = $state('10');
	let page = $state(1);
	const pageSize = $derived(Number(pageSizeRaw));

	function passesFilters(e: MedicineEntry): boolean {
		const q = search.trim().toLowerCase();
		if (q) {
			const hay = `${e.name} ${e.notes ?? ''}`.toLowerCase();
			if (!hay.includes(q)) return false;
		}
		if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
		if (statusFilter !== 'all') {
			if (entryStatus(e.day, completedSet.has(e.id)) !== statusFilter) return false;
		}
		return true;
	}

	const filteredEntries = $derived.by(() => {
		const list = data.schedule.filter(passesFilters);
		list.sort((a, b) => a.day - b.day || a.name.localeCompare(b.name));
		return list;
	});

	const filteredDays = $derived.by(() => {
		const map = new Map<number, MedicineEntry[]>();
		for (const e of filteredEntries) {
			if (!map.has(e.day)) map.set(e.day, []);
			map.get(e.day)!.push(e);
		}
		return [...map.entries()]
			.sort((a, b) => a[0] - b[0])
			.map(([day, entries]) => ({ day, entries }));
	});

	const totalPages = $derived(
		Math.max(
			1,
			Math.ceil((viewMode === 'table' ? filteredEntries.length : filteredDays.length) / pageSize)
		)
	);
	const currentPage = $derived(Math.min(page, totalPages));

	const paginatedEntries = $derived(
		filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);
	const paginatedDays = $derived(
		filteredDays.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	$effect(() => {
		void search;
		void statusFilter;
		void categoryFilter;
		void pageSizeRaw;
		void viewMode;
		void selectedBatchId;
		page = 1;
	});

	const hasFilters = $derived(
		search.trim() !== '' || statusFilter !== 'all' || categoryFilter !== 'all'
	);

	function clearFilters() {
		search = '';
		statusFilter = 'all';
		categoryFilter = 'all';
	}

	// ---- Actions --------------------------------------------------------
	async function toggleEntry(entryId: string) {
		if (!selectedBatchId) return;
		const key = selectedBatchId;
		const prev = progress[key] ?? [];
		const wasDone = prev.includes(entryId);
		const next = wasDone ? prev.filter((id) => id !== entryId) : [...prev, entryId];

		progress = { ...progress, [key]: next };

		try {
			const res = await fetch('/api/chick-medicine', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ batchId: key, entryId })
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Failed to update.');
			progress = { ...progress, [key]: result.completed };
		} catch (err: any) {
			progress = { ...progress, [key]: prev };
			toast.error(err.message || 'Could not update.');
		}
	}

	async function resetProgress() {
		if (!selectedBatchId) return;
		const key = selectedBatchId;
		const prev = progress[key] ?? [];
		if (prev.length === 0) return;
		progress = { ...progress, [key]: [] };
		try {
			const res = await fetch('/api/chick-medicine', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ batchId: key })
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Failed to reset.');
			toast.success('Progress reset.');
		} catch (err: any) {
			progress = { ...progress, [key]: prev };
			toast.error(err.message || 'Could not reset.');
		}
	}

	// ---- Style helpers --------------------------------------------------
	function categoryClass(c: MedicineCategory): string {
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
	function routeIcon(r: MedicineRoute) {
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
	function statusDot(s: EntryStatus): string {
		switch (s) {
			case 'completed':
				return 'bg-emerald-500';
			case 'overdue':
				return 'bg-red-500';
			case 'today':
				return 'bg-amber-500';
			case 'upcoming':
				return 'bg-gray-300';
		}
	}
	function statusPill(s: EntryStatus): string {
		switch (s) {
			case 'completed':
				return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
			case 'overdue':
				return 'bg-red-50 text-red-700 ring-red-200';
			case 'today':
				return 'bg-amber-50 text-amber-700 ring-amber-200';
			case 'upcoming':
				return 'bg-stone-100 text-stone-600 ring-stone-200';
		}
	}
	function statusLabel(s: EntryStatus): string {
		switch (s) {
			case 'completed':
				return 'Completed';
			case 'overdue':
				return 'Overdue';
			case 'today':
				return 'Today';
			case 'upcoming':
				return 'Upcoming';
		}
	}

	function formatDate(dateStr: string): string {
		const clean = dateStr.slice(0, 10);
		const [y, m, d] = clean.split('-').map(Number);
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

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<svelte:head>
	<title>Medicine Tracking | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER -->
		<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Chick Management</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Medicine Tracking</h1>
				<p class="mt-1 text-sm text-gray-500">
					34-day vaccination and medicine schedule per batch.
				</p>
			</div>

			<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
				<!-- Batch picker -->
				<div class="relative w-full sm:w-[340px]" bind:this={batchPickerEl}>
					<button
						type="button"
						onclick={toggleBatchPicker}
						aria-haspopup="listbox"
						aria-expanded={batchPickerOpen}
						class="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 text-left text-sm shadow-sm transition-colors hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
					>
						<span class="flex min-w-0 flex-1 items-center gap-2">
							<BirdIcon class="h-3.5 w-3.5 shrink-0 text-amber-600" />
							{#if selectedBatch}
								<span class="truncate font-mono text-xs font-semibold text-gray-900">
									{selectedBatch.batchNumber}
								</span>
								<span
									class="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600"
								>
									Day {Math.min(currentDay, 34)}/34
								</span>
							{:else}
								<span class="text-gray-500">Select a batch…</span>
							{/if}
						</span>
						<ChevronDownIcon
							class="h-4 w-4 shrink-0 text-gray-400 transition-transform {batchPickerOpen
								? 'rotate-180'
								: ''}"
						/>
					</button>

					{#if batchPickerOpen}
						<div
							class="absolute right-0 z-50 mt-1 w-full min-w-[320px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
						>
							<div class="border-b border-gray-100 p-2">
								<div class="relative">
									<SearchIcon
										class="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400"
									/>
									<Input
										bind:this={batchSearchEl}
										bind:value={batchSearch}
										placeholder="Search Chick In No. or farm…"
										class="h-9 rounded-md border-gray-300 pl-8 text-sm {inputCls}"
										aria-label="Search batches"
									/>
								</div>
							</div>

							<ul class="max-h-72 overflow-y-auto py-1" role="listbox">
								{#each filteredBatches as b (b.id)}
									{@const isSel = b.id === selectedBatchId}
									{@const done = (progress[b.id] ?? []).length}
									<li role="option" aria-selected={isSel}>
										<button
											type="button"
											onclick={() => selectBatch(b.id)}
											class="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors {isSel
												? 'bg-amber-50'
												: 'hover:bg-stone-50'}"
										>
											<div class="flex min-w-0 flex-1 flex-col">
												<span class="truncate font-mono text-xs font-semibold text-gray-900">
													{b.batchNumber}
												</span>
												<span class="truncate text-xs text-gray-500">{b.farm.name}</span>
											</div>
											<span class="shrink-0 text-[10px] font-semibold text-gray-500">
												{done}/{data.schedule.length}
											</span>
											{#if isSel}
												<CheckIcon class="h-4 w-4 shrink-0 text-red-700" />
											{/if}
										</button>
									</li>
								{:else}
									<li class="px-3 py-6 text-center text-sm text-gray-500">
										No batches match "{batchSearch.trim()}"
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>

				<Button
					variant="outline"
					class="h-10 shrink-0 text-gray-600 hover:text-red-700"
					disabled={!selectedBatch || (progress[selectedBatchId] ?? []).length === 0}
					onclick={resetProgress}
				>
					<RotateCcwIcon class="mr-1.5 h-3.5 w-3.5" />
					Reset
				</Button>
			</div>
		</div>

		<!-- EMPTY STATE — no batches -->
		{#if data.batches.length === 0}
			<div
				class="flex flex-col items-center rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm"
			>
				<div
					class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600"
				>
					<InboxIcon class="h-7 w-7" />
				</div>
				<p class="font-semibold text-gray-900">No batches yet</p>
				<p class="mt-1 text-sm text-gray-500">
					Add a chick batch first — medicine tracking runs per batch.
				</p>
			</div>
		{:else if selectedBatch}
			<!-- KPI CARDS -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<!-- Progress -->
				<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start justify-between">
						<div>
							<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Progress</p>
							<p class="mt-2 text-3xl font-bold text-gray-900">{completionPct}%</p>
						</div>
						<div class="rounded-lg bg-emerald-50 p-2 text-emerald-700">
							<CheckCircle2Icon class="h-5 w-5" />
						</div>
					</div>
					<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
						<div
							class="h-full rounded-full bg-emerald-500 transition-all duration-300"
							style="width: {completionPct}%"
						></div>
					</div>
					<p class="mt-2 text-xs text-gray-500">
						{counts.completed} of {counts.total} completed
					</p>
				</div>

				<!-- Overdue -->
				<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start justify-between">
						<div>
							<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Overdue</p>
							<p
								class="mt-2 text-3xl font-bold {counts.overdue > 0
									? 'text-red-600'
									: 'text-gray-900'}"
							>
								{counts.overdue}
							</p>
						</div>
						<div class="rounded-lg bg-red-50 p-2 text-red-700">
							<AlertCircleIcon class="h-5 w-5" />
						</div>
					</div>
					<p class="mt-2 text-xs {counts.overdue > 0 ? 'text-red-600' : 'text-gray-500'}">
						{counts.overdue > 0 ? 'Needs attention now' : 'All caught up'}
					</p>
				</div>

				<!-- Today -->
				<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start justify-between">
						<div>
							<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Today</p>
							<p class="mt-2 text-3xl font-bold text-gray-900">{counts.today}</p>
						</div>
						<div class="rounded-lg bg-amber-50 p-2 text-amber-700">
							<ClockIcon class="h-5 w-5" />
						</div>
					</div>
					<p class="mt-2 text-xs text-gray-500">
						{counts.today === 0 ? 'Nothing scheduled' : 'Due today'}
					</p>
				</div>

				<!-- Next due -->
				<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start justify-between">
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Next due</p>
						<div class="rounded-lg bg-blue-50 p-2 text-blue-700">
							<TargetIcon class="h-5 w-5" />
						</div>
					</div>
					{#if nextDue}
						{@const s = entryStatus(nextDue.day, false)}
						<p class="mt-2 truncate text-sm font-bold text-gray-900">{nextDue.name}</p>
						<p
							class="mt-1 flex items-center gap-1 text-xs {s === 'overdue'
								? 'text-red-600'
								: s === 'today'
									? 'text-amber-700'
									: 'text-gray-500'}"
						>
							<span class="h-1.5 w-1.5 rounded-full {statusDot(s)}"></span>
							Day {nextDue.day}
							{#if s === 'overdue'}
								· {currentDay - nextDue.day}d overdue
							{:else if nextDue.day === currentDay}
								· due today
							{:else}
								· in {nextDue.day - currentDay}d
							{/if}
						</p>
					{:else}
						<div class="mt-2 flex items-center gap-1.5">
							<SparklesIcon class="h-4 w-4 text-emerald-500" />
							<span class="text-sm font-semibold text-emerald-700">All caught up!</span>
						</div>
						<p class="mt-1 text-xs text-gray-500">Every entry completed</p>
					{/if}
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
								placeholder="Search medicine or notes…"
								class="h-10 rounded-lg border-gray-300 pl-9 {inputCls}"
								aria-label="Search medicines"
							/>
						</div>

						<!-- Status filter -->
						<Select.Root type="single" bind:value={statusFilter}>
							<Select.Trigger
								class="h-10 w-[150px] rounded-lg border-gray-300 text-sm"
								aria-label="Filter by status"
							>
								{#if statusFilter === 'all'}
									All status
								{:else if statusFilter === 'overdue'}
									Overdue
								{:else if statusFilter === 'today'}
									Today
								{:else if statusFilter === 'upcoming'}
									Upcoming
								{:else}
									Completed
								{/if}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">All status</Select.Item>
								<Select.Item value="overdue">Overdue</Select.Item>
								<Select.Item value="today">Today</Select.Item>
								<Select.Item value="upcoming">Upcoming</Select.Item>
								<Select.Item value="completed">Completed</Select.Item>
							</Select.Content>
						</Select.Root>

						<!-- Category filter -->
						<Select.Root type="single" bind:value={categoryFilter}>
							<Select.Trigger
								class="h-10 w-[160px] rounded-lg border-gray-300 text-sm"
								aria-label="Filter by category"
							>
								{categoryFilter === 'all' ? 'All categories' : categoryFilter}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">All categories</Select.Item>
								<Select.Item value="vaccine">Vaccine</Select.Item>
								<Select.Item value="vitamin">Vitamin</Select.Item>
								<Select.Item value="antibiotic">Antibiotic</Select.Item>
								<Select.Item value="coccidiostat">Coccidiostat</Select.Item>
								<Select.Item value="electrolyte">Electrolyte</Select.Item>
								<Select.Item value="other">Other</Select.Item>
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

						<!-- View toggle -->
						<div class="ml-auto flex rounded-lg border border-gray-200 bg-white p-1">
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
								By Day
							</button>
						</div>
					</div>
				</div>

				{#if viewMode === 'table'}
					<!-- TABLE VIEW -->
					<Table.Root>
						<Table.Header class="bg-stone-50">
							<Table.Row class="hover:bg-transparent">
								<Table.Head class="{thCls} w-16">Day</Table.Head>
								<Table.Head class={thCls}>Medicine</Table.Head>
								<Table.Head class="{thCls} hidden sm:table-cell">Category</Table.Head>
								<Table.Head class="{thCls} hidden md:table-cell">Route</Table.Head>
								<Table.Head class="{thCls} hidden lg:table-cell">Status</Table.Head>
								<Table.Head class="w-16"><span class="sr-only">Done</span></Table.Head>
							</Table.Row>
						</Table.Header>

						<Table.Body>
							{#each paginatedEntries as entry (entry.id)}
								{@const Icon = routeIcon(entry.route)}
								{@const isDone = completedSet.has(entry.id)}
								{@const status = entryStatus(entry.day, isDone)}
								<Table.Row class="group transition-colors hover:bg-amber-50/40">
									<Table.Cell>
										<span
											class="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold {entry.day ===
											currentDay
												? 'bg-amber-500 text-white'
												: entry.day < currentDay
													? 'bg-stone-200 text-stone-700'
													: 'bg-stone-100 text-gray-500'}"
										>
											{entry.day}
										</span>
									</Table.Cell>
									<Table.Cell>
										<div class="flex flex-col">
											<span
												class="text-sm font-semibold {isDone
													? 'text-gray-400 line-through'
													: 'text-gray-900'}"
											>
												{entry.name}
												{#if entry.mandatory && !isDone}
													<span class="ml-1 text-[9px] font-bold text-red-600">REQ</span>
												{/if}
											</span>
											{#if entry.notes}
												<span class="truncate text-xs text-gray-500">{entry.notes}</span>
											{/if}
										</div>
									</Table.Cell>
									<Table.Cell class="hidden sm:table-cell">
										<span
											class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {categoryClass(
												entry.category
											)}"
										>
											{entry.category}
										</span>
									</Table.Cell>
									<Table.Cell class="hidden md:table-cell">
										<span
											class="inline-flex items-center gap-1 rounded-md bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-gray-600"
										>
											<Icon class="h-3 w-3" />
											{entry.route}
										</span>
									</Table.Cell>
									<Table.Cell class="hidden lg:table-cell">
										<span
											class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset {statusPill(
												status
											)}"
										>
											<span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
											{statusLabel(status)}
										</span>
									</Table.Cell>
									<Table.Cell>
										<div class="flex justify-end">
											<button
												type="button"
												onclick={() => toggleEntry(entry.id)}
												role="checkbox"
												aria-checked={isDone}
												class="flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors {isDone
													? 'border-emerald-500 bg-emerald-500'
													: status === 'overdue'
														? 'border-red-300 hover:border-red-500'
														: 'border-gray-300 hover:border-gray-400'}"
												aria-label="Toggle {entry.name}"
											>
												{#if isDone}
													<svg viewBox="0 0 20 20" fill="currentColor" class="h-3 w-3 text-white">
														<path
															fill-rule="evenodd"
															d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
															clip-rule="evenodd"
														/>
													</svg>
												{/if}
											</button>
										</div>
									</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row class="hover:bg-transparent">
									<Table.Cell colspan={6} class="py-16">
										<div class="mx-auto flex max-w-sm flex-col items-center text-center">
											<div
												class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
											>
												<InboxIcon class="h-6 w-6" />
											</div>
											{#if hasFilters}
												<p class="font-semibold text-gray-900">No matching entries</p>
												<p class="mt-1 text-sm text-gray-500">
													Try a different search or clear your filters.
												</p>
												<Button variant="outline" class="mt-4" onclick={clearFilters}
													>Clear filters</Button
												>
											{:else}
												<p class="font-semibold text-gray-900">Nothing here</p>
												<p class="mt-1 text-sm text-gray-500">
													The schedule is empty for this batch.
												</p>
											{/if}
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{:else}
					<!-- GRID VIEW — grouped by day -->
					<div class="p-4">
						{#if paginatedDays.length === 0}
							<div class="flex flex-col items-center py-16 text-center">
								<div
									class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
								>
									<InboxIcon class="h-6 w-6" />
								</div>
								{#if hasFilters}
									<p class="font-semibold text-gray-900">No matching entries</p>
									<p class="mt-1 text-sm text-gray-500">
										Try a different search or clear your filters.
									</p>
									<Button variant="outline" class="mt-4" onclick={clearFilters}
										>Clear filters</Button
									>
								{:else}
									<p class="font-semibold text-gray-900">Nothing scheduled</p>
								{/if}
							</div>
						{:else}
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
								{#each paginatedDays as { day, entries } (day)}
									{@const dayDone = entries.filter((e) => completedSet.has(e.id)).length}
									<div
										class="rounded-xl border bg-white shadow-sm {day === currentDay
											? 'border-amber-300 ring-2 ring-amber-100'
											: 'border-gray-200'}"
									>
										<div class="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
											<span
												class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold {day ===
												currentDay
													? 'bg-amber-500 text-white'
													: day < currentDay
														? 'bg-stone-200 text-stone-700'
														: 'bg-white text-gray-500 ring-1 ring-gray-200'}"
											>
												{day}
											</span>
											<div class="flex flex-col">
												<span class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
													Day {day}
												</span>
												{#if day === currentDay}
													<span class="text-[10px] font-bold text-amber-700 uppercase">
														Today
													</span>
												{:else if day < currentDay && dayDone < entries.length}
													<span class="text-[10px] font-bold text-red-600 uppercase"> Past </span>
												{/if}
											</div>
											<span class="ml-auto text-[10px] font-semibold text-gray-500">
												{dayDone}/{entries.length}
											</span>
										</div>

										<div class="divide-y divide-gray-100">
											{#each entries as entry (entry.id)}
												{@const Icon = routeIcon(entry.route)}
												{@const isDone = completedSet.has(entry.id)}
												{@const status = entryStatus(entry.day, isDone)}
												<div class="flex items-start gap-2 px-3 py-2">
													<button
														type="button"
														onclick={() => toggleEntry(entry.id)}
														role="checkbox"
														aria-checked={isDone}
														class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors {isDone
															? 'border-emerald-500 bg-emerald-500'
															: status === 'overdue'
																? 'border-red-300 hover:border-red-500'
																: 'border-gray-300 hover:border-gray-400'}"
														aria-label="Toggle {entry.name}"
													>
														{#if isDone}
															<svg
																viewBox="0 0 20 20"
																fill="currentColor"
																class="h-2.5 w-2.5 text-white"
															>
																<path
																	fill-rule="evenodd"
																	d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
																	clip-rule="evenodd"
																/>
															</svg>
														{/if}
													</button>
													<div class="min-w-0 flex-1">
														<p
															class="truncate text-xs font-semibold {isDone
																? 'text-gray-400 line-through'
																: 'text-gray-900'}"
														>
															{entry.name}
														</p>
														<div class="mt-0.5 flex flex-wrap items-center gap-1">
															<span
																class="rounded px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset {categoryClass(
																	entry.category
																)}"
															>
																{entry.category}
															</span>
															<span class="flex items-center gap-0.5 text-[9px] text-gray-500">
																<Icon class="h-2.5 w-2.5" />
																{entry.route}
															</span>
														</div>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Pagination -->
				<div
					class="flex flex-col gap-3 border-t border-gray-100 bg-stone-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex flex-wrap items-center gap-4 text-xs text-gray-500">
						<span>
							Showing
							<span class="font-semibold text-gray-700">
								{(viewMode === 'table' ? filteredEntries.length : filteredDays.length) === 0
									? 0
									: (currentPage - 1) * pageSize + 1}
							</span>
							–
							<span class="font-semibold text-gray-700">
								{Math.min(
									currentPage * pageSize,
									viewMode === 'table' ? filteredEntries.length : filteredDays.length
								)}
							</span>
							of
							<span class="font-semibold text-gray-700">
								{viewMode === 'table' ? filteredEntries.length : filteredDays.length}
							</span>
							{viewMode === 'table'
								? filteredEntries.length === 1
									? 'entry'
									: 'entries'
								: filteredDays.length === 1
									? 'day'
									: 'days'}
							{#if hasFilters}
								<span class="text-gray-400">(filtered from {data.schedule.length})</span>
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
							onclick={() => (page = Math.max(1, currentPage - 1))}
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
							onclick={() => (page = Math.min(totalPages, currentPage + 1))}
							aria-label="Next page"
						>
							<ChevronRightIcon class="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			<!-- Footer hint -->
			<div
				class="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-xs text-blue-800"
			>
				<ShieldCheckIcon class="h-4 w-4 shrink-0" />
				Progress is stored in memory for this session — wire to a database later.
			</div>
		{/if}
	</div>
</div>
