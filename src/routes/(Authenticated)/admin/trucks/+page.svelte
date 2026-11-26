<script lang="ts">
	import { toast } from 'svelte-sonner';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { truckStatuses, type Truck } from '#lib/types/trucks.ts';
	import type { Driver } from '#lib/types/drivers.ts';
	import {
		PlusIcon,
		SearchIcon,
		PencilIcon,
		Trash2Icon,
		InboxIcon,
		XIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		TruckIcon,
		UserIcon,
		WrenchIcon,
		CircleCheckIcon,
		GaugeIcon,
		ListIcon,
		LayoutGridIcon,
		ArrowUpDownIcon,
		ArrowUpIcon,
		ArrowDownIcon
	} from '@lucide/svelte';
	import TruckFormDialog from '#lib/components/trucks/TruckFormDialog.svelte';
	import DeleteTruckDialog from '#lib/components/trucks/DeleteTruckDialog.svelte';

	type SortKey = 'plate' | 'model' | 'capacity' | 'status';

	//@ts-ignore
	let { data } = $props<{
		data: { trucks: Truck[]; drivers: Driver[] };
	}>();

	let rows = $state<Truck[]>(data.trucks ?? []);
	const drivers = data.drivers ?? [];

	let search = $state('');
	let statusFilter = $state('all');
	let driverFilter = $state<'all' | 'unassigned' | string>('all');
	let viewMode = $state<'table' | 'grid'>('table');
	let sortValue = $state<string>('plate-asc');

	const sortKey = $derived(sortValue.split('-')[0] as SortKey);
	const sortDir = $derived(sortValue.split('-')[1] === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

	let pageSizeRaw = $state('10');
	let page = $state(1);
	const pageSize = $derived(Number(pageSizeRaw));

	let formOpen = $state(false);
	let editingTruck = $state<Truck | null>(null);
	let deleteOpen = $state(false);
	let deleteTarget = $state<Truck | null>(null);

	const driverNameById = $derived(new Map(drivers.map((d) => [d.id, d.name])));
	const driverById = $derived(new Map(drivers.map((d) => [d.id, d])));

	// ---- Status styling --------------------------------------------------
	const statusStyles: Record<string, string> = {
		Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		Maintenance: 'bg-amber-50 text-amber-700 ring-amber-200',
		Inactive: 'bg-gray-100 text-gray-600 ring-gray-200'
	};
	const fallbackStatusStyle = 'bg-gray-100 text-gray-600 ring-gray-200';
	function statusBadgeClass(status: string) {
		return statusStyles[status] ?? fallbackStatusStyle;
	}
	const statusBarColors: Record<string, string> = {
		Active: 'bg-emerald-500',
		Maintenance: 'bg-amber-500',
		Inactive: 'bg-gray-400'
	};
	function statusBarClass(status: string) {
		return statusBarColors[status] ?? 'bg-gray-400';
	}

	// ---- KPIs ------------------------------------------------------------
	const statusCounts = $derived.by(() => {
		const m: Record<string, number> = {};
		for (const t of rows) if (t.status) m[t.status] = (m[t.status] ?? 0) + 1;
		return m;
	});
	const activeCount = $derived(statusCounts['Active'] ?? 0);
	const maintenanceCount = $derived(statusCounts['Maintenance'] ?? 0);
	const assignedCount = $derived(rows.filter((t) => t.driverId).length);

	// ---- Filtering + sorting + pagination --------------------------------
	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const result = rows.filter((r) => {
			const matchesSearch =
				!q ||
				r.plateNumber.toLowerCase().includes(q) ||
				(driverNameById.get(r.driverId ?? '') ?? '').toLowerCase().includes(q);
			if (!matchesSearch) return false;
			if (statusFilter !== 'all' && r.status !== statusFilter) return false;
			if (driverFilter === 'unassigned' && r.driverId) return false;
			if (driverFilter !== 'all' && driverFilter !== 'unassigned' && r.driverId !== driverFilter)
				return false;
			return true;
		});

		result.sort((a, b) => {
			let cmp = 0;
			switch (sortKey) {
				case 'plate':
					cmp = a.plateNumber.localeCompare(b.plateNumber);
					break;

				case 'capacity':
					cmp = a.capacity - b.capacity;
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

	$effect(() => {
		void search;
		void statusFilter;
		void driverFilter;
		void pageSizeRaw;
		void sortValue;
		page = 1;
	});

	const hasFilters = $derived(
		search.trim() !== '' || statusFilter !== 'all' || driverFilter !== 'all'
	);

	// ---- Sorting helpers -------------------------------------------------
	function toggleSort(key: SortKey) {
		if (sortKey === key) sortValue = `${key}-${sortDir === 'asc' ? 'desc' : 'asc'}`;
		else {
			const dir = key === 'capacity' ? 'desc' : 'asc';
			sortValue = `${key}-${dir}`;
		}
	}
	function sortLabel(v: string): string {
		const map: Record<string, string> = {
			'plate-asc': 'Plate (A–Z)',
			'plate-desc': 'Plate (Z–A)',
			'model-asc': 'Model (A–Z)',
			'model-desc': 'Model (Z–A)',
			'capacity-desc': 'Largest capacity',
			'capacity-asc': 'Smallest capacity',
			'status-asc': 'Status (A–Z)',
			'status-desc': 'Status (Z–A)'
		};
		return map[v] ?? v;
	}
	function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
		if (sortKey !== key) return 'none';
		return sortDir === 'asc' ? 'ascending' : 'descending';
	}

	// ---- Actions ---------------------------------------------------------
	function openAdd() {
		editingTruck = null;
		formOpen = true;
	}
	function openEdit(t: Truck) {
		editingTruck = t;
		formOpen = true;
	}
	function goToPage(p: number) {
		page = Math.max(1, Math.min(p, totalPages));
	}
	function clearFilters() {
		search = '';
		statusFilter = 'all';
		driverFilter = 'all';
	}

	async function handleSave(t: Truck) {
		const isEdit = rows.some((r) => r.id === t.id);
		const res = await fetch('/api/trucks', {
			method: isEdit ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(t)
		});
		const result = await res.json();
		if (!res.ok) throw new Error(result.error || 'Failed to save the truck.');
		const saved: Truck = result.truck;
		rows = isEdit ? rows.map((r) => (r.id === saved.id ? saved : r)) : [...rows, saved];
		toast.success(`${isEdit ? 'Updated' : 'Added'} ${saved.plateNumber}`);
	}

	function askDelete(t: Truck) {
		deleteTarget = t;
		deleteOpen = true;
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		const removed = deleteTarget;
		try {
			const res = await fetch(`/api/trucks/delete/${removed.id}`, { method: 'DELETE' });
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Failed to delete the truck.');
			rows = rows.filter((r) => r.id !== removed.id);
			deleteOpen = false;
			toast.success(`Deleted ${removed.plateNumber}`);
		} catch (err: any) {
			toast.error(err.message || 'Could not delete the truck.');
		}
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
</script>

<svelte:head>
	<title>Trucks | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Logistics</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Trucks</h1>
				<p class="mt-1 text-sm text-gray-500">Manage delivery trucks and their assigned drivers.</p>
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
						<ListIcon class="h-3.5 w-3.5" /> Table
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
						<LayoutGridIcon class="h-3.5 w-3.5" /> Grid
					</button>
				</div>
				<Button
					onclick={openAdd}
					class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-600 active:scale-[0.98]"
				>
					<PlusIcon class="mr-2 h-4 w-4" /> Add Truck
				</Button>
			</div>
		</div>

		<!-- KPI CARDS -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Total Trucks</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{rows.length}</p>
					</div>
					<div class="rounded-lg bg-red-50 p-2 text-red-700">
						<TruckIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">{assignedCount} assigned to drivers</p>
			</div>
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Active</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{activeCount}</p>
					</div>
					<div class="rounded-lg bg-emerald-50 p-2 text-emerald-700">
						<CircleCheckIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Ready for delivery</p>
			</div>
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Maintenance</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{maintenanceCount}</p>
					</div>
					<div class="rounded-lg bg-amber-50 p-2 text-amber-700">
						<WrenchIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Currently out of service</p>
			</div>
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">By Status</p>
				<div class="mt-3 space-y-2">
					{#each truckStatuses as s (s)}
						{@const count = statusCounts[s] ?? 0}
						{@const pct = rows.length ? (count / rows.length) * 100 : 0}
						<div class="flex items-center gap-2">
							<span class="w-24 shrink-0 font-mono text-[10px] font-semibold text-gray-600">
								{s}
							</span>
							<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
								<div
									class="h-full rounded-full transition-all duration-300 {statusBarClass(s)}"
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
			<div class="border-b border-gray-100 p-4">
				<div class="flex flex-wrap items-center gap-2">
					<div class="relative min-w-[220px] flex-1 sm:max-w-xs">
						<SearchIcon
							class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
						/>
						<Input
							bind:value={search}
							placeholder="Search plate, model, or driver…"
							class="h-10 rounded-lg border-gray-300 pl-9 {inputCls}"
							aria-label="Search trucks"
						/>
					</div>

					<Select.Root type="single" bind:value={statusFilter}>
						<Select.Trigger
							class="h-10 w-[150px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by status"
						>
							{statusFilter === 'all' ? 'All statuses' : statusFilter}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All statuses</Select.Item>
							{#each truckStatuses as s (s)}
								<Select.Item value={s}>{s}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					<Select.Root type="single" bind:value={driverFilter}>
						<Select.Trigger
							class="h-10 w-[170px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by driver"
						>
							{#if driverFilter === 'all'}
								All drivers
							{:else if driverFilter === 'unassigned'}
								Unassigned
							{:else}
								{driverNameById.get(driverFilter) ?? 'Driver'}
							{/if}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All drivers</Select.Item>
							<Select.Item value="unassigned">Unassigned</Select.Item>
							{#each drivers as d (d.id)}
								<Select.Item value={d.id}>{d.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

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
							<Select.Item value="plate-asc">Plate (A–Z)</Select.Item>
							<Select.Item value="plate-desc">Plate (Z–A)</Select.Item>
							<Select.Item value="model-asc">Model (A–Z)</Select.Item>
							<Select.Item value="model-desc">Model (Z–A)</Select.Item>
							<Select.Item value="capacity-desc">Largest capacity</Select.Item>
							<Select.Item value="capacity-asc">Smallest capacity</Select.Item>
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
									onclick={() => toggleSort('plate')}
									class="inline-flex items-center gap-1 hover:text-gray-700"
									aria-sort={ariaSort('plate')}
								>
									Truck {@render sortIcon('plate')}
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
							<Table.Head class={thCls}>Driver</Table.Head>
							<Table.Head class="{thCls} hidden md:table-cell">
								<button
									type="button"
									onclick={() => toggleSort('capacity')}
									class="inline-flex items-center gap-1 hover:text-gray-700"
									aria-sort={ariaSort('capacity')}
								>
									Capacity {@render sortIcon('capacity')}
								</button>
							</Table.Head>
							<Table.Head class="w-24"><span class="sr-only">Actions</span></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each paginated as t (t.id)}
							<Table.Row class="group transition-colors hover:bg-amber-50/40">
								<Table.Cell>
									<div class="flex flex-col">
										<span class="font-semibold text-gray-900">
											{t.plateNumber}
										</span>
										{#if t.notes}
											<span class="mt-1 text-xs text-gray-500">{t.notes}</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>
									<span
										class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ring-inset {statusBadgeClass(
											t.status
										)}"
									>
										<span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
										{t.status}
									</span>
								</Table.Cell>
								<Table.Cell class="text-sm text-gray-700">
									{#if t.driverId && driverById.get(t.driverId)}
										<div class="flex items-center gap-1.5">
											<UserIcon class="h-3.5 w-3.5 text-gray-400" />
											{driverById.get(t.driverId)!.name}
										</div>
									{:else}
										<span class="text-xs text-gray-400">Unassigned</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="hidden text-sm text-gray-700 md:table-cell">
									<span class="inline-flex items-center gap-1">
										<GaugeIcon class="h-3.5 w-3.5 text-gray-400" />
										{t.capacity.toLocaleString()}
									</span>
								</Table.Cell>
								<Table.Cell>
									<div class="flex justify-end gap-1 opacity-60 group-hover:opacity-100">
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-gray-500 hover:bg-amber-100 hover:text-amber-800"
											aria-label="Edit {t.plateNumber}"
											onclick={() => openEdit(t)}
										>
											<PencilIcon class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-gray-500 hover:bg-red-100 hover:text-red-700"
											aria-label="Delete {t.plateNumber}"
											onclick={() => askDelete(t)}
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
											<p class="font-semibold text-gray-900">No matching trucks</p>
											<p class="mt-1 text-sm text-gray-500">
												Try adjusting your search or filters.
											</p>
											<Button variant="outline" class="mt-4" onclick={clearFilters}
												>Clear filters</Button
											>
										{:else}
											<p class="font-semibold text-gray-900">No trucks yet</p>
											<p class="mt-1 text-sm text-gray-500">Add your first truck to get started.</p>
											<Button class="mt-4 bg-red-700 text-white hover:bg-red-600" onclick={openAdd}>
												<PlusIcon class="mr-2 h-4 w-4" /> Add Truck
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
								<p class="font-semibold text-gray-900">No matching trucks</p>
								<p class="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
								<Button variant="outline" class="mt-4" onclick={clearFilters}>Clear filters</Button>
							{:else}
								<p class="font-semibold text-gray-900">No trucks yet</p>
								<p class="mt-1 text-sm text-gray-500">Add your first truck to get started.</p>
								<Button class="mt-4 bg-red-700 text-white hover:bg-red-600" onclick={openAdd}>
									<PlusIcon class="mr-2 h-4 w-4" /> Add Truck
								</Button>
							{/if}
						</div>
					{:else}
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{#each paginated as t (t.id)}
								<div
									class="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
								>
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<div class="flex flex-wrap items-center gap-1.5">
												<span
													class="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-inset {statusBadgeClass(
														t.status
													)}"
												>
													{t.status}
												</span>
												<span class="font-mono text-[11px] text-gray-500">{t.plateNumber}</span>
											</div>

											<p class="mt-1 flex items-center gap-1 text-xs text-gray-500">
												<UserIcon class="h-3 w-3 shrink-0" />
												{t.driverId && driverById.get(t.driverId)
													? driverById.get(t.driverId)!.name
													: 'Unassigned'}
											</p>
										</div>
										<div class="flex gap-0.5 opacity-60 group-hover:opacity-100">
											<Button
												variant="ghost"
												size="icon"
												class="h-7 w-7 text-gray-500 hover:bg-amber-100 hover:text-amber-800"
												aria-label="Edit {t.plateNumber}"
												onclick={() => openEdit(t)}
											>
												<PencilIcon class="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-7 w-7 text-gray-500 hover:bg-red-100 hover:text-red-700"
												aria-label="Delete {t.plateNumber}"
												onclick={() => askDelete(t)}
											>
												<Trash2Icon class="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
									<div class="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
										<div>
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Capacity
											</p>
											<p class="mt-0.5 text-sm font-bold text-gray-900">
												{t.capacity.toLocaleString()}
											</p>
										</div>
										<div>
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Driver
											</p>
											<p class="mt-0.5 truncate text-sm font-bold text-gray-900">
												{t.driverId && driverById.get(t.driverId)
													? driverById.get(t.driverId)!.name
													: 'Unassigned'}
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
							of <span class="font-semibold text-gray-700">{filtered.length}</span>
							{filtered.length === 1 ? 'truck' : 'trucks'}
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

<TruckFormDialog
	bind:open={formOpen}
	truck={editingTruck}
	{drivers}
	trucks={rows}
	onsave={handleSave}
/>
<DeleteTruckDialog bind:open={deleteOpen} truck={deleteTarget} onconfirm={confirmDelete} />
