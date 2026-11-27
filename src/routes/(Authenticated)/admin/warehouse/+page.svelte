<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import {
		PlusIcon,
		SearchIcon,
		Trash2Icon,
		InboxIcon,
		XIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		ArrowUpDownIcon,
		ArrowUpIcon,
		ArrowDownIcon,
		WarehouseIcon,
		PackageIcon,
		PackageXIcon,
		AlertTriangleIcon,
		CircleCheckIcon,
		TruckIcon,
		ArrowDownToLineIcon,
		ArrowUpFromLineIcon,
		SlidersHorizontalIcon,
		CalendarDaysIcon
	} from '@lucide/svelte';

	import {
		movementTypeLabels,
		type FeedInventoryRow,
		type FeedMovementRow,
		type MovementType
	} from '#lib/types/feed-stock.ts';
	import MovementFormDialog from '#lib/components/warehouse/MovementFormDialog.svelte';
	import ThresholdDialog from '#lib/components/warehouse/ThresholdDialog.svelte';
	import DeleteMovementDialog from '#lib/components/warehouse/DeleteMovementDialog.svelte';

	type ViewTab = 'inventory' | 'movements';
	type InvSortKey = 'name' | 'supplier' | 'onHand' | 'minStock' | 'status';
	type MovSortKey = 'date' | 'type' | 'qty' | 'status';

	//@ts-ignore
	let { data } = $props<{
		data: {
			inventory: FeedInventoryRow[];
			movements: FeedMovementRow[];
			products: {
				id: string;
				name: string;
				sku: string;
				feedType: string;
				stage: string;
				supplierId: string;
			}[];
			suppliers: { id: string; name: string }[];
			farms: { id: string; name: string; code: string }[];
			drivers: { id: string; name: string }[];
			trucks: { id: string; plateNumber: string; driverId: string | null; status: string }[];
			chickBatches: {
				id: string;
				farmId: string;
				batchNumber: string;
				volume: number;
				dateSet: string;
			}[];
		};
	}>();

	const products = $derived(data.products ?? []);
	const suppliers = $derived(data.suppliers ?? []);
	const farms = $derived(data.farms ?? []);
	const drivers = $derived(data.drivers ?? []);

	// ---- State ---------------------------------------------------------
	let tab = $state<ViewTab>('inventory');
	let search = $state('');
	let supplierFilter = $state('all');
	let typeFilter = $state('all');
	let invStatusFilter = $state<'all' | 'ok' | 'low' | 'out'>('all');
	let movTypeFilter = $state<'all' | MovementType>('all');
	let movStatusFilter = $state('all');
	let invSortValue = $state('name-asc');
	let movSortValue = $state('date-desc');
	let pageSizeRaw = $state('10');
	let page = $state(1);
	const pageSize = $derived(Number(pageSizeRaw));

	let movementOpen = $state(false);
	let movementInitialType = $state<MovementType>('delivery');
	let movementInitialProduct = $state<string>('');
	let thresholdOpen = $state(false);
	let thresholdTarget = $state<FeedInventoryRow | null>(null);
	let deleteOpen = $state(false);
	let deleteTarget = $state<FeedMovementRow | null>(null);

	// ---- Derived sort parts --------------------------------------------
	const invSortKey = $derived(invSortValue.split('-')[0] as InvSortKey);
	const invSortDir = $derived(invSortValue.split('-')[1] === 'asc' ? 'asc' : 'desc') as
		'asc' | 'desc';
	const movSortKey = $derived(movSortValue.split('-')[0] as MovSortKey);
	const movSortDir = $derived(movSortValue.split('-')[1] === 'asc' ? 'asc' : 'desc') as
		'asc' | 'desc';

	// ---- Styling maps --------------------------------------------------
	const typeStyles: Record<MovementType, string> = {
		delivery: 'bg-blue-50 text-blue-700 ring-blue-200',
		'from-farm': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		'to-farm': 'bg-amber-50 text-amber-700 ring-amber-200',
		adjustment: 'bg-purple-50 text-purple-700 ring-purple-200'
	};
	function typeBadge(t: MovementType) {
		return typeStyles[t] ?? 'bg-gray-100 text-gray-600 ring-gray-200';
	}

	const statusStyles: Record<string, string> = {
		Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
		Cancelled: 'bg-gray-100 text-gray-600 ring-gray-200'
	};
	function statusBadge(s: string) {
		return statusStyles[s] ?? 'bg-gray-100 text-gray-600 ring-gray-200';
	}

	const stockStyles: Record<'ok' | 'low' | 'out', string> = {
		ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
		low: 'bg-amber-50 text-amber-700 ring-amber-200',
		out: 'bg-red-50 text-red-700 ring-red-200'
	};
	const stockLabels: Record<'ok' | 'low' | 'out', string> = {
		ok: 'OK',
		low: 'Low',
		out: 'Out'
	};

	// ---- KPI ------------------------------------------------------------
	const totalSkus = $derived(data.inventory?.length ?? 0);
	const totalOnHand = $derived((data.inventory ?? []).reduce((s, r) => s + r.onHand, 0));
	const lowCount = $derived((data.inventory ?? []).filter((r) => r.status === 'low').length);
	const outCount = $derived((data.inventory ?? []).filter((r) => r.status === 'out').length);

	// ---- Feed types present --------------------------------------------
	const feedTypes = $derived(
		Array.from(new Set((data.inventory ?? []).map((r) => r.feedType).filter(Boolean)))
	);

	// ---- Inventory filter/sort/paginate ---------------------------------
	const filteredInventory = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const result = (data.inventory ?? []).filter((r) => {
			const matchesSearch =
				!q ||
				r.productName.toLowerCase().includes(q) ||
				r.sku.toLowerCase().includes(q) ||
				r.supplierName.toLowerCase().includes(q);
			if (!matchesSearch) return false;
			if (supplierFilter !== 'all' && r.supplierId !== supplierFilter) return false;
			if (typeFilter !== 'all' && r.feedType !== typeFilter) return false;
			if (invStatusFilter !== 'all' && r.status !== invStatusFilter) return false;
			return true;
		});

		result.sort((a, b) => {
			let cmp = 0;
			switch (invSortKey) {
				case 'name':
					cmp = a.productName.localeCompare(b.productName);
					break;
				case 'supplier':
					cmp = a.supplierName.localeCompare(b.supplierName);
					break;
				case 'onHand':
					cmp = a.onHand - b.onHand;
					break;
				case 'minStock':
					cmp = a.minStock - b.minStock;
					break;
				case 'status':
					cmp = a.status.localeCompare(b.status);
					break;
			}
			return invSortDir === 'asc' ? cmp : -cmp;
		});
		return result;
	});

	// ---- Movements filter/sort/paginate ---------------------------------
	const filteredMovements = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const result = (data.movements ?? []).filter((m) => {
			const matchesSearch =
				!q ||
				m.productName.toLowerCase().includes(q) ||
				m.sku.toLowerCase().includes(q) ||
				m.truckPlate.toLowerCase().includes(q) ||
				m.chickInCode.toLowerCase().includes(q) ||
				(m.supplierName ?? '').toLowerCase().includes(q) ||
				(m.farmName ?? '').toLowerCase().includes(q);
			if (!matchesSearch) return false;
			if (movTypeFilter !== 'all' && m.movementType !== movTypeFilter) return false;
			if (movStatusFilter !== 'all' && m.status !== movStatusFilter) return false;
			return true;
		});

		result.sort((a, b) => {
			let cmp = 0;
			switch (movSortKey) {
				case 'date':
					cmp = String(a.createdAt).localeCompare(String(b.createdAt));
					break;
				case 'type':
					cmp = a.movementType.localeCompare(b.movementType);
					break;
				case 'qty':
					cmp = a.qty - b.qty;
					break;
				case 'status':
					cmp = a.status.localeCompare(b.status);
					break;
			}
			return movSortDir === 'asc' ? cmp : -cmp;
		});
		return result;
	});

	const activeList = $derived(tab === 'inventory' ? filteredInventory : filteredMovements);
	const totalPages = $derived(Math.max(1, Math.ceil(activeList.length / pageSize)));
	const currentPage = $derived(Math.min(page, totalPages));
	const paginatedInventory = $derived(
		filteredInventory.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);
	const paginatedMovements = $derived(
		filteredMovements.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	$effect(() => {
		void tab;
		void search;
		void supplierFilter;
		void typeFilter;
		void invStatusFilter;
		void movTypeFilter;
		void movStatusFilter;
		void pageSizeRaw;
		void invSortValue;
		void movSortValue;
		page = 1;
	});

	// Reset search & filters when switching tabs
	$effect(() => {
		void tab;
		search = '';
		page = 1;
	});

	const hasFilters = $derived(
		(tab === 'inventory' &&
			(search.trim() !== '' ||
				supplierFilter !== 'all' ||
				typeFilter !== 'all' ||
				invStatusFilter !== 'all')) ||
			(tab === 'movements' &&
				(search.trim() !== '' || movTypeFilter !== 'all' || movStatusFilter !== 'all'))
	);

	// ---- Sorting helpers -------------------------------------------------
	function toggleInvSort(key: InvSortKey) {
		if (invSortKey === key) invSortValue = `${key}-${invSortDir === 'asc' ? 'desc' : 'asc'}`;
		else invSortValue = `${key}-${['onHand', 'minStock'].includes(key) ? 'desc' : 'asc'}`;
	}
	function toggleMovSort(key: MovSortKey) {
		if (movSortKey === key) movSortValue = `${key}-${movSortDir === 'asc' ? 'desc' : 'asc'}`;
		else movSortValue = `${key}-${key === 'date' || key === 'qty' ? 'desc' : 'asc'}`;
	}
	function invSortLabel(v: string): string {
		const m: Record<string, string> = {
			'name-asc': 'Name (A–Z)',
			'name-desc': 'Name (Z–A)',
			'supplier-asc': 'Supplier (A–Z)',
			'supplier-desc': 'Supplier (Z–A)',
			'onHand-desc': 'Most on hand',
			'onHand-asc': 'Fewest on hand',
			'minStock-desc': 'Highest threshold',
			'minStock-asc': 'Lowest threshold',
			'status-asc': 'Status (A–Z)',
			'status-desc': 'Status (Z–A)'
		};
		return m[v] ?? v;
	}
	function movSortLabel(v: string): string {
		const m: Record<string, string> = {
			'date-desc': 'Newest first',
			'date-asc': 'Oldest first',
			'type-asc': 'Type (A–Z)',
			'type-desc': 'Type (Z–A)',
			'qty-desc': 'Largest qty',
			'qty-asc': 'Smallest qty',
			'status-asc': 'Status (A–Z)',
			'status-desc': 'Status (Z–A)'
		};
		return m[v] ?? v;
	}
	function invAria(key: InvSortKey): 'ascending' | 'descending' | 'none' {
		if (invSortKey !== key) return 'none';
		return invSortDir === 'asc' ? 'ascending' : 'descending';
	}
	function movAria(key: MovSortKey): 'ascending' | 'descending' | 'none' {
		if (movSortKey !== key) return 'none';
		return movSortDir === 'asc' ? 'ascending' : 'descending';
	}

	// ---- Actions ---------------------------------------------------------
	function openNew(type: MovementType = 'delivery', product = '') {
		movementInitialType = type;
		movementInitialProduct = product;
		movementOpen = true;
	}
	function openThreshold(row: FeedInventoryRow) {
		thresholdTarget = row;
		thresholdOpen = true;
	}
	function askDelete(row: FeedMovementRow) {
		deleteTarget = row;
		deleteOpen = true;
	}
	function goToPage(p: number) {
		page = Math.max(1, Math.min(p, totalPages));
	}
	function clearFilters() {
		search = '';
		supplierFilter = 'all';
		typeFilter = 'all';
		invStatusFilter = 'all';
		movTypeFilter = 'all';
		movStatusFilter = 'all';
	}

	async function handleSaveMovement(payload: any) {
		const res = await fetch('/api/feed-stock/movements', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const result = await res.json();
		if (!res.ok) throw new Error(result.error || 'Failed to record movement.');
		await invalidateAll();
		toast.success(
			`${movementTypeLabels[payload.movementType as MovementType]} recorded (${payload.qty} sacks).`
		);
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		const removed = deleteTarget;
		try {
			const res = await fetch(`/api/feed-stock/movements/${removed.id}`, { method: 'DELETE' });
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Failed to delete movement.');
			deleteOpen = false;
			await invalidateAll();
			toast.success('Movement deleted and stock reversed.');
		} catch (err: any) {
			toast.error(err.message || 'Could not delete the movement.');
		}
	}

	async function handleSaveThreshold(feedProductId: string, minStock: number) {
		const res = await fetch('/api/feed-stock/thresholds', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ feedProductId, minStock })
		});
		const result = await res.json();
		if (!res.ok) throw new Error(result.error || 'Failed to update threshold.');
		await invalidateAll();
		toast.success('Threshold updated.');
	}

	// ---- Utilities -------------------------------------------------------
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

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
</script>

<svelte:head>
	<title>Warehouse | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Logistics</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Warehouse</h1>
				<p class="mt-1 text-sm text-gray-500">Track feed coming in and out of the central hub.</p>
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					onclick={() => openNew('adjustment')}
					class="h-10 rounded-lg border-gray-300 font-semibold text-gray-700"
				>
					<SlidersHorizontalIcon class="mr-2 h-4 w-4" />
					Adjust
				</Button>
				<Button
					onclick={() => openNew('delivery')}
					class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-600 active:scale-[0.98]"
				>
					<PlusIcon class="mr-2 h-4 w-4" />
					New Movement
				</Button>
			</div>
		</div>

		<!-- KPI CARDS -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Total SKUs</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{totalSkus}</p>
					</div>
					<div class="rounded-lg bg-red-50 p-2 text-red-700">
						<WarehouseIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Tracked feed products</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">On Hand</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{totalOnHand.toLocaleString()}</p>
					</div>
					<div class="rounded-lg bg-blue-50 p-2 text-blue-700">
						<PackageIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Total sacks across all SKUs</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Low Stock</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{lowCount}</p>
					</div>
					<div class="rounded-lg bg-amber-50 p-2 text-amber-700">
						<AlertTriangleIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">At or below threshold</p>
			</div>

			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">Out of Stock</p>
						<p class="mt-2 text-3xl font-bold text-gray-900">{outCount}</p>
					</div>
					<div class="rounded-lg bg-red-50 p-2 text-red-700">
						<PackageXIcon class="h-5 w-5" />
					</div>
				</div>
				<p class="mt-2 text-xs text-gray-500">Need restocking</p>
			</div>
		</div>

		<!-- TABS -->
		<div class="flex w-fit rounded-lg border border-gray-200 bg-white p-1">
			<button
				type="button"
				onclick={() => (tab = 'inventory')}
				class="flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors {tab ===
				'inventory'
					? 'bg-stone-100 text-gray-900'
					: 'text-gray-500 hover:text-gray-700'}"
			>
				<PackageIcon class="h-3.5 w-3.5" />
				Inventory
			</button>
			<button
				type="button"
				onclick={() => (tab = 'movements')}
				class="flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors {tab ===
				'movements'
					? 'bg-stone-100 text-gray-900'
					: 'text-gray-500 hover:text-gray-700'}"
			>
				<TruckIcon class="h-3.5 w-3.5" />
				Movements
			</button>
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
							placeholder={tab === 'inventory'
								? 'Search product, SKU, or supplier…'
								: 'Search product, plate, farm, or chick-in…'}
							class="h-10 rounded-lg border-gray-300 pl-9 {inputCls}"
							aria-label="Search"
						/>
					</div>

					{#if tab === 'inventory'}
						<Select.Root type="single" bind:value={supplierFilter}>
							<Select.Trigger
								class="h-10 w-[170px] rounded-lg border-gray-300 text-sm"
								aria-label="Filter by supplier"
							>
								{#if supplierFilter === 'all'}
									All suppliers
								{:else}
									{suppliers.find((s) => s.id === supplierFilter)?.name ?? 'Supplier'}
								{/if}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">All suppliers</Select.Item>
								{#each suppliers as s (s.id)}
									<Select.Item value={s.id}>{s.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>

						<Select.Root type="single" bind:value={typeFilter}>
							<Select.Trigger
								class="h-10 w-[150px] rounded-lg border-gray-300 text-sm"
								aria-label="Filter by feed type"
							>
								{typeFilter === 'all' ? 'All feed types' : typeFilter}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">All feed types</Select.Item>
								{#each feedTypes as t (t)}
									<Select.Item value={t}>{t}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>

						<Select.Root type="single" bind:value={invStatusFilter}>
							<Select.Trigger
								class="h-10 w-[150px] rounded-lg border-gray-300 text-sm"
								aria-label="Filter by stock status"
							>
								{#if invStatusFilter === 'all'}
									All statuses
								{:else if invStatusFilter === 'ok'}
									OK
								{:else if invStatusFilter === 'low'}
									Low stock
								{:else}
									Out of stock
								{/if}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">All statuses</Select.Item>
								<Select.Item value="ok">OK</Select.Item>
								<Select.Item value="low">Low stock</Select.Item>
								<Select.Item value="out">Out of stock</Select.Item>
							</Select.Content>
						</Select.Root>

						<Select.Root type="single" bind:value={invSortValue}>
							<Select.Trigger
								class="h-10 w-[180px] rounded-lg border-gray-300 text-sm"
								aria-label="Sort order"
							>
								<span class="flex items-center gap-1.5">
									{#if invSortDir === 'asc'}
										<ArrowUpIcon class="h-3.5 w-3.5 text-gray-500" />
									{:else}
										<ArrowDownIcon class="h-3.5 w-3.5 text-gray-500" />
									{/if}
									{invSortLabel(invSortValue)}
								</span>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="name-asc">Name (A–Z)</Select.Item>
								<Select.Item value="name-desc">Name (Z–A)</Select.Item>
								<Select.Item value="supplier-asc">Supplier (A–Z)</Select.Item>
								<Select.Item value="supplier-desc">Supplier (Z–A)</Select.Item>
								<Select.Item value="onHand-desc">Most on hand</Select.Item>
								<Select.Item value="onHand-asc">Fewest on hand</Select.Item>
								<Select.Item value="minStock-desc">Highest threshold</Select.Item>
								<Select.Item value="minStock-asc">Lowest threshold</Select.Item>
								<Select.Item value="status-asc">Status (A–Z)</Select.Item>
								<Select.Item value="status-desc">Status (Z–A)</Select.Item>
							</Select.Content>
						</Select.Root>
					{:else}
						<Select.Root type="single" bind:value={movTypeFilter}>
							<Select.Trigger
								class="h-10 w-[150px] rounded-lg border-gray-300 text-sm"
								aria-label="Filter by movement type"
							>
								{movTypeFilter === 'all'
									? 'All types'
									: movementTypeLabels[movTypeFilter as MovementType]}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">All types</Select.Item>
								<Select.Item value="delivery">Delivery</Select.Item>
								<Select.Item value="from-farm">From Farm</Select.Item>
								<Select.Item value="to-farm">To Farm</Select.Item>
								<Select.Item value="adjustment">Adjustment</Select.Item>
							</Select.Content>
						</Select.Root>

						<Select.Root type="single" bind:value={movStatusFilter}>
							<Select.Trigger
								class="h-10 w-[150px] rounded-lg border-gray-300 text-sm"
								aria-label="Filter by status"
							>
								{movStatusFilter === 'all' ? 'All statuses' : movStatusFilter}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">All statuses</Select.Item>
								<Select.Item value="Completed">Completed</Select.Item>
								<Select.Item value="Pending">Pending</Select.Item>
								<Select.Item value="Cancelled">Cancelled</Select.Item>
							</Select.Content>
						</Select.Root>

						<Select.Root type="single" bind:value={movSortValue}>
							<Select.Trigger
								class="h-10 w-[180px] rounded-lg border-gray-300 text-sm"
								aria-label="Sort order"
							>
								<span class="flex items-center gap-1.5">
									{#if movSortDir === 'asc'}
										<ArrowUpIcon class="h-3.5 w-3.5 text-gray-500" />
									{:else}
										<ArrowDownIcon class="h-3.5 w-3.5 text-gray-500" />
									{/if}
									{movSortLabel(movSortValue)}
								</span>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="date-desc">Newest first</Select.Item>
								<Select.Item value="date-asc">Oldest first</Select.Item>
								<Select.Item value="type-asc">Type (A–Z)</Select.Item>
								<Select.Item value="type-desc">Type (Z–A)</Select.Item>
								<Select.Item value="qty-desc">Largest qty</Select.Item>
								<Select.Item value="qty-asc">Smallest qty</Select.Item>
								<Select.Item value="status-asc">Status (A–Z)</Select.Item>
								<Select.Item value="status-desc">Status (Z–A)</Select.Item>
							</Select.Content>
						</Select.Root>
					{/if}

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

			{#if tab === 'inventory'}
				{#snippet invSortIcon(key: InvSortKey)}
					{#if invSortKey === key}
						{#if invSortDir === 'asc'}
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
							<Table.Head class="{thCls} hidden md:table-cell">
								<button
									type="button"
									onclick={() => toggleInvSort('supplier')}
									class="inline-flex items-center gap-1 hover:text-gray-700"
									aria-sort={invAria('supplier')}
								>
									Supplier {@render invSortIcon('supplier')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} hidden lg:table-cell">Type / Stage</Table.Head>
							<Table.Head class={thCls}>
								<button
									type="button"
									onclick={() => toggleInvSort('onHand')}
									class="inline-flex items-center gap-1 hover:text-gray-700"
									aria-sort={invAria('onHand')}
								>
									On hand {@render invSortIcon('onHand')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} hidden sm:table-cell">
								<button
									type="button"
									onclick={() => toggleInvSort('minStock')}
									class="inline-flex items-center gap-1 hover:text-gray-700"
									aria-sort={invAria('minStock')}
								>
									Min {@render invSortIcon('minStock')}
								</button>
							</Table.Head>
							<Table.Head class={thCls}>Status</Table.Head>
							<Table.Head class="{thCls} hidden lg:table-cell">Last movement</Table.Head>
							<Table.Head class="w-24"><span class="sr-only">Actions</span></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each paginatedInventory as row (row.feedProductId)}
							<Table.Row class="group transition-colors hover:bg-amber-50/40">
								<Table.Cell class="hidden text-sm text-gray-700 md:table-cell">
									{row.supplierName}
								</Table.Cell>
								<Table.Cell class="hidden text-xs text-gray-600 lg:table-cell">
									{row.feedType || '—'}{#if row.stage}<span class="text-gray-400">
											· {row.stage}</span
										>{/if}
								</Table.Cell>
								<Table.Cell>
									<span class="font-mono text-sm font-bold text-gray-900">
										{row.onHand.toLocaleString()}
									</span>
									<span class="ml-1 text-xs text-gray-500">sacks</span>
								</Table.Cell>
								<Table.Cell class="hidden text-sm text-gray-700 sm:table-cell">
									{row.minStock.toLocaleString()}
								</Table.Cell>
								<Table.Cell>
									<span
										class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ring-inset {stockStyles[
											row.status
										]}"
									>
										<span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
										{stockLabels[row.status]}
									</span>
								</Table.Cell>
								<Table.Cell class="hidden text-xs text-gray-500 lg:table-cell">
									<span class="inline-flex items-center gap-1">
										<CalendarDaysIcon class="h-3 w-3" />
										{formatDate(row.lastMovementAt)}
									</span>
								</Table.Cell>
								<Table.Cell>
									<div
										class="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100"
									>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-gray-500 hover:bg-purple-100 hover:text-purple-700"
											aria-label="Adjust stock for {row.productName}"
											onclick={() => openNew('adjustment', row.feedProductId)}
										>
											<SlidersHorizontalIcon class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-gray-500 hover:bg-amber-100 hover:text-amber-800"
											aria-label="Set threshold for {row.productName}"
											onclick={() => openThreshold(row)}
										>
											<ArrowUpDownIcon class="h-4 w-4" />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell colspan={8} class="py-16">
									<div class="mx-auto flex max-w-sm flex-col items-center text-center">
										<div
											class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
										>
											<InboxIcon class="h-6 w-6" />
										</div>
										{#if hasFilters}
											<p class="font-semibold text-gray-900">No matching products</p>
											<p class="mt-1 text-sm text-gray-500">
												Try adjusting your search or filters.
											</p>
											<Button variant="outline" class="mt-4" onclick={clearFilters}
												>Clear filters</Button
											>
										{:else}
											<p class="font-semibold text-gray-900">No feed products yet</p>
											<p class="mt-1 text-sm text-gray-500">
												Add feed products first to start tracking stock.
											</p>
										{/if}
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{:else}
				{#snippet movSortIcon(key: MovSortKey)}
					{#if movSortKey === key}
						{#if movSortDir === 'asc'}
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
							<Table.Head class={thCls}>
								<button
									type="button"
									onclick={() => toggleMovSort('date')}
									class="inline-flex items-center gap-1 hover:text-gray-700"
									aria-sort={movAria('date')}
								>
									Date {@render movSortIcon('date')}
								</button>
							</Table.Head>
							<Table.Head class={thCls}>
								<button
									type="button"
									onclick={() => toggleMovSort('type')}
									class="inline-flex items-center gap-1 hover:text-gray-700"
									aria-sort={movAria('type')}
								>
									Type {@render movSortIcon('type')}
								</button>
							</Table.Head>
							<Table.Head class={thCls}>Product</Table.Head>
							<Table.Head class="{thCls} hidden md:table-cell">Party</Table.Head>
							<Table.Head class={thCls}>
								<button
									type="button"
									onclick={() => toggleMovSort('qty')}
									class="inline-flex items-center gap-1 hover:text-gray-700"
									aria-sort={movAria('qty')}
								>
									Qty {@render movSortIcon('qty')}
								</button>
							</Table.Head>
							<Table.Head class="{thCls} hidden lg:table-cell">Plate</Table.Head>
							<Table.Head class="{thCls} hidden xl:table-cell">Chick-in</Table.Head>
							<Table.Head class={thCls}>
								<button
									type="button"
									onclick={() => toggleMovSort('status')}
									class="inline-flex items-center gap-1 hover:text-gray-700"
									aria-sort={movAria('status')}
								>
									Status {@render movSortIcon('status')}
								</button>
							</Table.Head>
							<Table.Head class="w-16"><span class="sr-only">Actions</span></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each paginatedMovements as m (m.id)}
							<Table.Row class="group transition-colors hover:bg-amber-50/40">
								<Table.Cell class="text-xs text-gray-600">
									{formatDate(m.createdAt)}
								</Table.Cell>
								<Table.Cell>
									<span
										class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ring-inset {typeBadge(
											m.movementType
										)}"
									>
										{#if m.direction === 'in'}
											<ArrowDownToLineIcon class="h-3 w-3" />
										{:else}
											<ArrowUpFromLineIcon class="h-3 w-3" />
										{/if}
										{movementTypeLabels[m.movementType]}
									</span>
								</Table.Cell>
								<Table.Cell class="text-sm font-medium text-gray-900">
									{m.productName}
								</Table.Cell>
								<Table.Cell class="hidden text-xs text-gray-600 md:table-cell">
									{#if m.movementType === 'delivery'}
										{m.supplierName ?? '—'}
									{:else if m.movementType === 'from-farm' || m.movementType === 'to-farm'}
										{#if m.farmName}
											<span>{m.farmName}</span>
											{#if m.farmCode}
												<span class="ml-1 font-mono text-[10px] text-gray-400">
													{m.farmCode}
												</span>
											{/if}
										{:else}
											—
										{/if}
									{:else}
										<span class="text-gray-400">—</span>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<span
										class="font-mono text-sm font-bold {m.direction === 'in'
											? 'text-emerald-700'
											: 'text-red-700'}"
									>
										{m.direction === 'in' ? '+' : '-'}{m.qty}
									</span>
									<span class="ml-1 text-xs text-gray-500">sacks</span>
								</Table.Cell>
								<Table.Cell class="hidden text-xs text-gray-600 lg:table-cell">
									{m.truckPlate || '—'}
								</Table.Cell>
								<Table.Cell class="hidden text-xs text-gray-500 xl:table-cell">
									{m.chickInCode || '—'}
								</Table.Cell>
								<Table.Cell>
									<span
										class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ring-1 ring-inset {statusBadge(
											m.status
										)}"
									>
										<span class="h-1.5 w-1.5 rounded-full bg-current opacity-70"></span>
										{m.status}
									</span>
								</Table.Cell>
								<Table.Cell>
									<div
										class="flex justify-end opacity-60 transition-opacity group-hover:opacity-100"
									>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-gray-500 hover:bg-red-100 hover:text-red-700"
											aria-label="Delete movement"
											onclick={() => askDelete(m)}
										>
											<Trash2Icon class="h-4 w-4" />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell colspan={9} class="py-16">
									<div class="mx-auto flex max-w-sm flex-col items-center text-center">
										<div
											class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
										>
											<InboxIcon class="h-6 w-6" />
										</div>
										{#if hasFilters}
											<p class="font-semibold text-gray-900">No matching movements</p>
											<p class="mt-1 text-sm text-gray-500">
												Try adjusting your search or filters.
											</p>
											<Button variant="outline" class="mt-4" onclick={clearFilters}
												>Clear filters</Button
											>
										{:else}
											<p class="font-semibold text-gray-900">No movements yet</p>
											<p class="mt-1 text-sm text-gray-500">
												Record your first delivery to start the ledger.
											</p>
											<Button
												class="mt-4 bg-red-700 text-white hover:bg-red-600"
												onclick={() => openNew('delivery')}
											>
												<PlusIcon class="mr-2 h-4 w-4" />
												New Movement
											</Button>
										{/if}
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}

			<!-- Pagination -->
			{#if activeList.length > 0}
				<div
					class="flex flex-col gap-3 border-t border-gray-100 bg-stone-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex flex-wrap items-center gap-4 text-xs text-gray-500">
						<span>
							Showing
							<span class="font-semibold text-gray-700">
								{activeList.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
							</span>
							–
							<span class="font-semibold text-gray-700">
								{Math.min(currentPage * pageSize, activeList.length)}
							</span>
							of <span class="font-semibold text-gray-700">{activeList.length}</span>
							{tab === 'inventory' ? 'products' : 'movements'}
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

<MovementFormDialog
	bind:open={movementOpen}
	initialType={movementInitialType}
	initialProductId={movementInitialProduct}
	{products}
	{suppliers}
	{farms}
	{drivers}
	trucks={data.trucks ?? []}
	chickBatches={data.chickBatches ?? []}
	onsave={handleSaveMovement}
/>
<ThresholdDialog bind:open={thresholdOpen} row={thresholdTarget} onsave={handleSaveThreshold} />
<DeleteMovementDialog bind:open={deleteOpen} movement={deleteTarget} onconfirm={confirmDelete} />
