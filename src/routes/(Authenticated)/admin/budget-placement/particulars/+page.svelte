<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import {
		PlusIcon,
		SearchIcon,
		PencilIcon,
		Trash2Icon,
		XIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		LayoutGridIcon,
		ListIcon,
		ArrowUpDownIcon,
		ArrowUpIcon,
		ArrowDownIcon,
		CalendarClockIcon,
		InboxIcon,
		AlertCircleIcon,
		LoaderCircleIcon
	} from '@lucide/svelte';
	import type { Particular, ParticularInput } from '#lib/types/particulars.ts';
	import ParticularDialog from '#lib/components/admin/dialogs/particulars/particular_dialog.svelte';

	type SortKey = 'name' | 'qty' | 'price' | 'adjustment' | 'created';
	type SortDir = 'asc' | 'desc';
	type AdjustmentFilter = 'all' | 'none' | 'added' | 'subtracted';

	let items = $state<Particular[]>([]);
	let loading = $state(false);
	let errorMsg = $state('');

	let dialogOpen = $state(false);
	let editingItem = $state<Particular | null>(null);
	let deletingId = $state<string | null>(null);

	let search = $state('');
	let adjustmentFilter = $state<AdjustmentFilter>('all');
	let viewMode = $state<'table' | 'grid'>('table');
	let sortValue = $state('name-asc');

	const sortKey = $derived(sortValue.split('-')[0] as SortKey);
	const sortDir = $derived(sortValue.split('-')[1] === 'asc' ? 'asc' : 'desc') as SortDir;

	let pageSizeRaw = $state('10');
	let page = $state(1);
	const pageSize = $derived(Number(pageSizeRaw));

	async function load() {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/particulars');
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? `Failed to load particulars (HTTP ${res.status}).`);
			}
			items = await res.json();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not load particulars.';
		} finally {
			loading = false;
		}
	}
	onMount(load);

	function openAdd() {
		editingItem = null;
		dialogOpen = true;
	}
	function openEdit(p: Particular) {
		editingItem = p;
		dialogOpen = true;
	}

	async function handleSave(payload: ParticularInput) {
		const isNew = !items.some((i) => i.id === payload.id);
		const res = await fetch('/api/particulars', {
			method: isNew ? 'POST' : 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(body.error ?? `Failed to save (HTTP ${res.status}).`);
		await load();
		toast.success(`${isNew ? 'Added' : 'Updated'} ${payload.name}`);
	}

	async function handleDelete(p: Particular) {
		if (!confirm(`Delete “${p.name}”?`)) return;
		deletingId = p.id;
		errorMsg = '';
		try {
			const res = await fetch('/api/particulars', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: p.id })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? 'Failed to delete.');
			}
			await load();
			toast.success(`Deleted ${p.name}`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Could not delete particular.';
			errorMsg = msg;
			toast.error(msg);
		} finally {
			deletingId = null;
		}
	}

	// ---- Filtering / sorting / pagination -------------------------------
	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const result = items.filter((r) => {
			if (q && !r.name.toLowerCase().includes(q)) return false;

			if (adjustmentFilter !== 'all') {
				const a = r.adjustmentDays;
				if (adjustmentFilter === 'none' && a !== null) return false;
				if (adjustmentFilter === 'added' && (a === null || a <= 0)) return false;
				if (adjustmentFilter === 'subtracted' && (a === null || a >= 0)) return false;
			}

			return true;
		});

		result.sort((a, b) => {
			let cmp = 0;
			switch (sortKey) {
				case 'name':
					cmp = a.name.localeCompare(b.name);
					break;
				case 'qty':
					cmp = a.qty - b.qty;
					break;
				case 'price':
					cmp = a.price - b.price;
					break;
				case 'adjustment': {
					const aa = Math.abs(a.adjustmentDays ?? 0);
					const bb = Math.abs(b.adjustmentDays ?? 0);
					cmp = aa - bb;
					break;
				}
				case 'created':
					cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
		void adjustmentFilter;
		void pageSizeRaw;
		void sortValue;
		page = 1;
	});

	const hasFilters = $derived(search.trim() !== '' || adjustmentFilter !== 'all');

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortValue = `${key}-${sortDir === 'asc' ? 'desc' : 'asc'}`;
		} else {
			const dir: SortDir = key === 'name' ? 'asc' : 'desc';
			sortValue = `${key}-${dir}`;
		}
	}

	function sortLabel(v: string): string {
		switch (v) {
			case 'name-asc':
				return 'Name (A–Z)';
			case 'name-desc':
				return 'Name (Z–A)';
			case 'qty-desc':
				return 'Highest QTY';
			case 'qty-asc':
				return 'Lowest QTY';
			case 'price-desc':
				return 'Highest price';
			case 'price-asc':
				return 'Lowest price';
			case 'adjustment-desc':
				return 'Most adjusted';
			case 'adjustment-asc':
				return 'Least adjusted';
			case 'created-desc':
				return 'Newest first';
			case 'created-asc':
				return 'Oldest first';
			default:
				return v;
		}
	}

	function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
		if (sortKey !== key) return 'none';
		return sortDir === 'asc' ? 'ascending' : 'descending';
	}

	function clearFilters() {
		search = '';
		adjustmentFilter = 'all';
	}

	function goToPage(p: number) {
		page = Math.max(1, Math.min(p, totalPages));
	}

	function adjustedDate(createdAt: string, days: number | null): string | null {
		if (days == null) return null;
		const d = new Date(createdAt);
		if (Number.isNaN(d.getTime())) return null;
		d.setDate(d.getDate() + days);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
</script>

<svelte:head>
	<title>Particulars | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Standards</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Particulars</h1>
				<p class="mt-1 text-sm text-gray-500">
					Manage the list of particulars used across the system.
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
					onclick={openAdd}
					class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-600 active:scale-[0.98]"
				>
					<PlusIcon class="mr-2 h-4 w-4" />
					Add Particular
				</Button>
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
							placeholder="Search particular name…"
							class="h-10 rounded-lg border-gray-300 pl-9 {inputCls}"
							aria-label="Search particulars"
						/>
					</div>

					<!-- Adjustment filter -->
					<Select.Root type="single" bind:value={adjustmentFilter}>
						<Select.Trigger
							class="h-10 w-[170px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by adjustment"
						>
							{#if adjustmentFilter === 'all'}
								Any adjustment
							{:else if adjustmentFilter === 'none'}
								No adjustment
							{:else if adjustmentFilter === 'added'}
								Added days
							{:else}
								Subtracted days
							{/if}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">Any adjustment</Select.Item>
							<Select.Item value="none">No adjustment</Select.Item>
							<Select.Item value="added">Added days</Select.Item>
							<Select.Item value="subtracted">Subtracted days</Select.Item>
						</Select.Content>
					</Select.Root>

					<!-- Sort -->
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
							<Select.Item value="name-asc">Name (A–Z)</Select.Item>
							<Select.Item value="name-desc">Name (Z–A)</Select.Item>
							<Select.Item value="qty-desc">Highest QTY</Select.Item>
							<Select.Item value="qty-asc">Lowest QTY</Select.Item>
							<Select.Item value="price-desc">Highest price</Select.Item>
							<Select.Item value="price-asc">Lowest price</Select.Item>
							<Select.Item value="adjustment-desc">Most adjusted</Select.Item>
							<Select.Item value="adjustment-asc">Least adjusted</Select.Item>
							<Select.Item value="created-desc">Newest first</Select.Item>
							<Select.Item value="created-asc">Oldest first</Select.Item>
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

			{#if errorMsg}
				<div
					role="alert"
					class="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
				>
					<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" />
					<span>{errorMsg}</span>
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
									Name
									{@render sortIcon('name')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} text-end">
								<button
									type="button"
									onclick={() => toggleSort('qty')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('qty')}
								>
									QTY
									{@render sortIcon('qty')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} text-end">
								<button
									type="button"
									onclick={() => toggleSort('price')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('price')}
								>
									Price
									{@render sortIcon('price')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} hidden md:table-cell">
								<button
									type="button"
									onclick={() => toggleSort('adjustment')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('adjustment')}
								>
									Adjustment date
									{@render sortIcon('adjustment')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} hidden lg:table-cell">
								<button
									type="button"
									onclick={() => toggleSort('created')}
									class="inline-flex items-center gap-1 transition-colors hover:text-gray-700"
									aria-sort={ariaSort('created')}
								>
									Added
									{@render sortIcon('created')}
								</button>
							</Table.Head>
							<Table.Head class="w-24"><span class="sr-only">Actions</span></Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#if loading && items.length === 0}
							{#each Array(4) as _}
								<Table.Row class="hover:bg-transparent">
									<Table.Cell colspan={6} class="px-4 py-3">
										<div class="h-6 animate-pulse rounded bg-gray-100"></div>
									</Table.Cell>
								</Table.Row>
							{/each}
						{:else}
							{#each paginated as r (r.id)}
								{@const adjusted = adjustedDate(r.createdAt, r.adjustmentDays)}
								<Table.Row class="group transition-colors hover:bg-amber-50/40">
									<Table.Cell class="font-semibold text-gray-900">{r.name}</Table.Cell>
									<Table.Cell class="text-end text-gray-700 tabular-nums">{r.qty}</Table.Cell>
									<Table.Cell class="text-end font-medium text-gray-900 tabular-nums">
										₱{r.price.toFixed(2)}
									</Table.Cell>
									<Table.Cell class="hidden text-gray-600 md:table-cell">
										{#if adjusted && r.adjustmentDays != null}
											<span class="inline-flex items-center gap-1">
												<CalendarClockIcon
													class="h-3.5 w-3.5 {r.adjustmentDays < 0
														? 'text-red-600'
														: 'text-emerald-600'}"
												/>
												{adjusted}
												<span class="text-[10px] text-gray-400">
													({r.adjustmentDays > 0 ? '+' : ''}{r.adjustmentDays}d)
												</span>
											</span>
										{:else}
											<span class="text-xs text-gray-400">—</span>
										{/if}
									</Table.Cell>
									<Table.Cell class="hidden text-xs text-gray-500 lg:table-cell">
										{new Date(r.createdAt).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}
									</Table.Cell>
									<Table.Cell>
										<div
											class="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100"
										>
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8 text-gray-500 hover:bg-amber-100 hover:text-amber-800"
												aria-label="Edit {r.name}"
												onclick={() => openEdit(r)}
											>
												<PencilIcon class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8 text-gray-500 hover:bg-red-100 hover:text-red-700"
												aria-label="Delete {r.name}"
												disabled={deletingId === r.id}
												onclick={() => handleDelete(r)}
											>
												{#if deletingId === r.id}
													<LoaderCircleIcon class="h-4 w-4 animate-spin" />
												{:else}
													<Trash2Icon class="h-4 w-4" />
												{/if}
											</Button>
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
												<p class="font-semibold text-gray-900">No matching particulars</p>
												<p class="mt-1 text-sm text-gray-500">
													Try adjusting your search or filters.
												</p>
												<Button variant="outline" class="mt-4" onclick={clearFilters}
													>Clear filters</Button
												>
											{:else}
												<p class="font-semibold text-gray-900">No particulars yet</p>
												<p class="mt-1 text-sm text-gray-500">
													Add your first particular to get started.
												</p>
												<Button
													class="mt-4 bg-red-700 text-white hover:bg-red-600"
													onclick={openAdd}
												>
													<PlusIcon class="mr-2 h-4 w-4" />
													Add Particular
												</Button>
											{/if}
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						{/if}
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
								<p class="font-semibold text-gray-900">No matching particulars</p>
								<p class="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
								<Button variant="outline" class="mt-4" onclick={clearFilters}>Clear filters</Button>
							{:else}
								<p class="font-semibold text-gray-900">No particulars yet</p>
								<p class="mt-1 text-sm text-gray-500">Add your first particular to get started.</p>
								<Button class="mt-4 bg-red-700 text-white hover:bg-red-600" onclick={openAdd}>
									<PlusIcon class="mr-2 h-4 w-4" />
									Add Particular
								</Button>
							{/if}
						</div>
					{:else}
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{#each paginated as r (r.id)}
								{@const adjusted = adjustedDate(r.createdAt, r.adjustmentDays)}
								<div
									class="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
								>
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<h3 class="truncate text-base font-bold text-gray-900">{r.name}</h3>
										</div>
										<div class="flex gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
											<Button
												variant="ghost"
												size="icon"
												class="h-7 w-7 text-gray-500 hover:bg-amber-100 hover:text-amber-800"
												aria-label="Edit {r.name}"
												onclick={() => openEdit(r)}
											>
												<PencilIcon class="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-7 w-7 text-gray-500 hover:bg-red-100 hover:text-red-700"
												aria-label="Delete {r.name}"
												disabled={deletingId === r.id}
												onclick={() => handleDelete(r)}
											>
												{#if deletingId === r.id}
													<LoaderCircleIcon class="h-3.5 w-3.5 animate-spin" />
												{:else}
													<Trash2Icon class="h-3.5 w-3.5" />
												{/if}
											</Button>
										</div>
									</div>

									<div class="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
										<div>
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												QTY
											</p>
											<p class="mt-0.5 text-sm font-bold text-gray-900">{r.qty}</p>
										</div>
										<div>
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Price
											</p>
											<p class="mt-0.5 text-sm font-bold text-gray-900">
												₱{r.price.toFixed(2)}
											</p>
										</div>
										<div>
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Adjustment
											</p>
											<p class="mt-0.5 truncate text-sm font-bold text-gray-900">
												{adjusted ?? '—'}
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
			{#if items.length > 0}
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
							{filtered.length === 1 ? 'particular' : 'particulars'}
							{#if filtered.length !== items.length}
								<span class="text-gray-400">(filtered from {items.length})</span>
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

<ParticularDialog bind:open={dialogOpen} item={editingItem} onsave={handleSave} />
