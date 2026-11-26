<script lang="ts">
	import { toast } from 'svelte-sonner';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { driverStatuses, type Driver } from '#lib/types/drivers.ts';
	import type { Truck } from '#lib/types/trucks.ts';
	import {
		PlusIcon,
		SearchIcon,
		PencilIcon,
		Trash2Icon,
		InboxIcon,
		XIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		UserIcon,
		TruckIcon,
		PhoneIcon,
		MapPinIcon,
		CircleCheckIcon,
		CircleXIcon,
		ListIcon,
		LayoutGridIcon,
		ArrowUpDownIcon,
		ArrowUpIcon,
		ArrowDownIcon
	} from '@lucide/svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import DriverFormDialog from '#lib/components/driver/DriverFormDialog.svelte';
	import DeleteDriverDialog from '#lib/components/driver/DeleteDriverDialog.svelte';

	type SortKey = 'name' | 'license' | 'status';

	//@ts-ignore
	let { data } = $props<{ data: { drivers: Driver[]; trucks: Truck[] } }>();

	let rows = $state<Driver[]>(data.drivers ?? []);
	const trucks = data.trucks ?? [];

	let search = $state('');
	let statusFilter = $state('all');
	let assignedFilter = $state<'all' | 'assigned' | 'unassigned'>('all');
	let viewMode = $state<'table' | 'grid'>('table');
	let sortValue = $state<string>('name-asc');

	const sortKey = $derived(sortValue.split('-')[0] as SortKey);
	const sortDir = $derived(sortValue.split('-')[1] === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

	let pageSizeRaw = $state('10');
	let page = $state(1);
	const pageSize = $derived(Number(pageSizeRaw));

	let formOpen = $state(false);
	let editingDriver = $state<Driver | null>(null);
	let deleteOpen = $state(false);
	let deleteTarget = $state<Driver | null>(null);
	let deleteAssignedCount = $state(0);

	const trucksByDriver = $derived.by(() => {
		const m = new Map<string, Truck[]>();
		for (const t of trucks) {
			if (!t.driverId) continue;
			const arr = m.get(t.driverId) ?? [];
			arr.push(t);
			m.set(t.driverId, arr);
		}
		return m;
	});

	// ---- Status styling --------------------------------------------------
	const statusStyles: Record<string, string> = {
		Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		Inactive: 'bg-gray-100 text-gray-600 ring-gray-200'
	};
	function statusBadgeClass(s: string) {
		return statusStyles[s] ?? 'bg-gray-100 text-gray-600 ring-gray-200';
	}
	const statusBarColors: Record<string, string> = {
		Active: 'bg-emerald-500',
		Inactive: 'bg-gray-400'
	};
	function statusBarClass(s: string) {
		return statusBarColors[s] ?? 'bg-gray-400';
	}

	// ---- KPIs ------------------------------------------------------------
	const statusCounts = $derived.by(() => {
		const m: Record<string, number> = {};
		for (const d of rows) if (d.status) m[d.status] = (m[d.status] ?? 0) + 1;
		return m;
	});
	const activeCount = $derived(statusCounts['Active'] ?? 0);
	const inactiveCount = $derived(statusCounts['Inactive'] ?? 0);
	const assignedCount = $derived(
		rows.filter((d) => (trucksByDriver.get(d.id) ?? []).length > 0).length
	);

	// ---- Filtering + sorting + pagination --------------------------------
	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const result = rows.filter((r) => {
			const matchesSearch =
				!q || r.name.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q);
			if (!matchesSearch) return false;
			if (statusFilter !== 'all' && r.status !== statusFilter) return false;
			const assigned = (trucksByDriver.get(r.id) ?? []).length > 0;
			if (assignedFilter === 'assigned' && !assigned) return false;
			if (assignedFilter === 'unassigned' && assigned) return false;
			return true;
		});

		result.sort((a, b) => {
			let cmp = 0;
			switch (sortKey) {
				case 'name':
					cmp = a.name.localeCompare(b.name);
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
		void assignedFilter;
		void pageSizeRaw;
		void sortValue;
		page = 1;
	});

	const hasFilters = $derived(
		search.trim() !== '' || statusFilter !== 'all' || assignedFilter !== 'all'
	);

	// ---- Sorting helpers -------------------------------------------------
	function toggleSort(key: SortKey) {
		if (sortKey === key) sortValue = `${key}-${sortDir === 'asc' ? 'desc' : 'asc'}`;
		else sortValue = `${key}-asc`;
	}
	function sortLabel(v: string): string {
		const map: Record<string, string> = {
			'name-asc': 'Name (A–Z)',
			'name-desc': 'Name (Z–A)',
			'license-asc': 'License (A–Z)',
			'license-desc': 'License (Z–A)',
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
		editingDriver = null;
		formOpen = true;
	}
	function openEdit(d: Driver) {
		editingDriver = d;
		formOpen = true;
	}
	function goToPage(p: number) {
		page = Math.max(1, Math.min(p, totalPages));
	}
	function clearFilters() {
		search = '';
		statusFilter = 'all';
		assignedFilter = 'all';
	}

	async function handleSave(d: Driver) {
		const isEdit = rows.some((r) => r.id === d.id);
		const res = await fetch('/api/drivers', {
			method: isEdit ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(d)
		});
		const result = await res.json();
		if (!res.ok) throw new Error(result.error || 'Failed to save the driver.');
		const saved: Driver = result.driver;
		rows = isEdit ? rows.map((r) => (r.id === saved.id ? saved : r)) : [...rows, saved];
		toast.success(`${isEdit ? 'Updated' : 'Added'} ${saved.name}`);
	}

	function askDelete(d: Driver) {
		deleteTarget = d;
		deleteAssignedCount = (trucksByDriver.get(d.id) ?? []).length;
		deleteOpen = true;
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		const removed = deleteTarget;
		try {
			const res = await fetch(`/api/drivers/delete/${removed.id}`, { method: 'DELETE' });
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Failed to delete the driver.');
			rows = rows.filter((r) => r.id !== removed.id);
			deleteOpen = false;
			toast.success(`Deleted ${removed.name}`);
		} catch (err: any) {
			toast.error(err.message || 'Could not delete the driver.');
		}
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';

	function truckPlates(driverId: string): string {
		const list = trucksByDriver.get(driverId) ?? [];
		if (list.length === 0) return 'Unassigned';
		return list.map((t) => t.plateNumber).join(', ');
	}
</script>

<svelte:head>
	<title>Drivers | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Logistics</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Drivers</h1>
				<p class="mt-1 text-sm text-gray-500">Manage drivers and their assigned trucks.</p>
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
					<PlusIcon class="mr-2 h-4 w-4" /> Add Driver
				</Button>
			</div>
		</div>

		<!-- KPI CARDS -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
							Total Drivers
						</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{rows.length}</p>
					</div>
					<div class="rounded-lg bg-red-50 p-2 text-red-700">
						<UserIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">{assignedCount} assigned to trucks</p>
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
				<p class="mt-2 text-xs text-gray-500">Available to drive</p>
			</div>
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Inactive</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{inactiveCount}</p>
					</div>
					<div class="rounded-lg bg-gray-100 p-2 text-gray-600">
						<CircleXIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Not currently driving</p>
			</div>
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">By Status</p>
				<div class="mt-3 space-y-2">
					{#each driverStatuses as s (s)}
						{@const count = statusCounts[s] ?? 0}
						{@const pct = rows.length ? (count / rows.length) * 100 : 0}
						<div class="flex items-center gap-2">
							<span class="w-24 shrink-0 font-mono text-[10px] font-semibold text-gray-600"
								>{s}</span
							>
							<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
								<div
									class="h-full rounded-full transition-all duration-300 {statusBarClass(s)}"
									style="width: {pct}%"
								></div>
							</div>
							<span class="w-6 shrink-0 text-right text-xs font-semibold text-gray-700"
								>{count}</span
							>
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
							placeholder="Search name, license, or phone…"
							class="h-10 rounded-lg border-gray-300 pl-9 {inputCls}"
							aria-label="Search drivers"
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
							{#each driverStatuses as s (s)}
								<Select.Item value={s}>{s}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					<Select.Root type="single" bind:value={assignedFilter}>
						<Select.Trigger
							class="h-10 w-[160px] rounded-lg border-gray-300 text-sm"
							aria-label="Filter by assignment"
						>
							{#if assignedFilter === 'all'}Any assignment{:else if assignedFilter === 'assigned'}Assigned{:else}Unassigned{/if}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">Any assignment</Select.Item>
							<Select.Item value="assigned">Assigned</Select.Item>
							<Select.Item value="unassigned">Unassigned</Select.Item>
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
							<Select.Item value="name-asc">Name (A–Z)</Select.Item>
							<Select.Item value="name-desc">Name (Z–A)</Select.Item>
							<Select.Item value="license-asc">License (A–Z)</Select.Item>
							<Select.Item value="license-desc">License (Z–A)</Select.Item>
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
									onclick={() => toggleSort('name')}
									class="inline-flex items-center gap-1 hover:text-gray-700"
									aria-sort={ariaSort('name')}
								>
									Driver {@render sortIcon('name')}
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
							<Table.Head class="{thCls} hidden md:table-cell">Phone</Table.Head>
							<Table.Head class="{thCls} hidden lg:table-cell">Assigned truck</Table.Head>
							<Table.Head class="w-24"><span class="sr-only">Actions</span></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each paginated as d (d.id)}
							<Table.Row class="group transition-colors hover:bg-amber-50/40">
								<Table.Cell>
									<div class="flex flex-col">
										<span class="font-semibold text-gray-900">
											{d.name}
										</span>
										{#if d.address}
											<span class="mt-1 flex items-center gap-1 text-xs text-gray-500">
												<MapPinIcon class="h-3 w-3 shrink-0" />
												<span class="truncate">{d.address}</span>
											</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>
									<span
										class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ring-inset {statusBadgeClass(
											d.status
										)}"
									>
										<span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
										{d.status}
									</span>
								</Table.Cell>
								<Table.Cell class="hidden text-sm text-gray-700 md:table-cell">
									{#if d.phone}
										<span class="inline-flex items-center gap-1">
											<PhoneIcon class="h-3.5 w-3.5 text-gray-400" />
											{d.phone}
										</span>
									{:else}
										<span class="text-xs text-gray-400">—</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="hidden text-sm text-gray-700 lg:table-cell">
									{#if (trucksByDriver.get(d.id) ?? []).length > 0}
										<span class="inline-flex items-center gap-1">
											<TruckIcon class="h-3.5 w-3.5 text-gray-400" />
											{truckPlates(d.id)}
										</span>
									{:else}
										<span class="text-xs text-gray-400">Unassigned</span>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<div class="flex justify-end gap-1 opacity-60 group-hover:opacity-100">
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-gray-500 hover:bg-amber-100 hover:text-amber-800"
											aria-label="Edit {d.name}"
											onclick={() => openEdit(d)}
										>
											<PencilIcon class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-gray-500 hover:bg-red-100 hover:text-red-700"
											aria-label="Delete {d.name}"
											onclick={() => askDelete(d)}
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
											<p class="font-semibold text-gray-900">No matching drivers</p>
											<p class="mt-1 text-sm text-gray-500">
												Try adjusting your search or filters.
											</p>
											<Button variant="outline" class="mt-4" onclick={clearFilters}
												>Clear filters</Button
											>
										{:else}
											<p class="font-semibold text-gray-900">No drivers yet</p>
											<p class="mt-1 text-sm text-gray-500">
												Add your first driver to get started.
											</p>
											<Button class="mt-4 bg-red-700 text-white hover:bg-red-600" onclick={openAdd}>
												<PlusIcon class="mr-2 h-4 w-4" /> Add Driver
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
								<p class="font-semibold text-gray-900">No matching drivers</p>
								<p class="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
								<Button variant="outline" class="mt-4" onclick={clearFilters}>Clear filters</Button>
							{:else}
								<p class="font-semibold text-gray-900">No drivers yet</p>
								<p class="mt-1 text-sm text-gray-500">Add your first driver to get started.</p>
								<Button class="mt-4 bg-red-700 text-white hover:bg-red-600" onclick={openAdd}>
									<PlusIcon class="mr-2 h-4 w-4" /> Add Driver
								</Button>
							{/if}
						</div>
					{:else}
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{#each paginated as d (d.id)}
								<div
									class="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
								>
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<div class="flex flex-wrap items-center gap-1.5">
												<span
													class="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-inset {statusBadgeClass(
														d.status
													)}"
												>
													{d.status}
												</span>
											</div>
											<h3 class="mt-2 truncate text-base font-bold text-gray-900">{d.name}</h3>
											{#if d.phone}
												<p class="mt-1 flex items-center gap-1 text-xs text-gray-500">
													<PhoneIcon class="h-3 w-3 shrink-0" />
													{d.phone}
												</p>
											{/if}
										</div>
										<div class="flex gap-0.5 opacity-60 group-hover:opacity-100">
											<Button
												variant="ghost"
												size="icon"
												class="h-7 w-7 text-gray-500 hover:bg-amber-100 hover:text-amber-800"
												aria-label="Edit {d.name}"
												onclick={() => openEdit(d)}
											>
												<PencilIcon class="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-7 w-7 text-gray-500 hover:bg-red-100 hover:text-red-700"
												aria-label="Delete {d.name}"
												onclick={() => askDelete(d)}
											>
												<Trash2Icon class="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
									<div class="mt-4 grid grid-cols-1 gap-2 border-t border-gray-100 pt-3">
										<div>
											<p class="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
												Assigned truck
											</p>
											<p class="mt-0.5 truncate text-sm font-bold text-gray-900">
												{truckPlates(d.id)}
											</p>
										</div>
										{#if d.address}
											<p class="mt-1 flex items-center gap-1 text-xs text-gray-500">
												<MapPinIcon class="h-3 w-3 shrink-0" />
												<span class="truncate">{d.address}</span>
											</p>
										{/if}
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
							{filtered.length === 1 ? 'driver' : 'drivers'}
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

<DriverFormDialog bind:open={formOpen} driver={editingDriver} drivers={rows} onsave={handleSave} />
<DeleteDriverDialog
	bind:open={deleteOpen}
	driver={deleteTarget}
	assignedTrucks={deleteAssignedCount}
	onconfirm={confirmDelete}
/>
