<script lang="ts">
	import { toast } from 'svelte-sonner';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { supplierStatuses, type FeedSupplier } from '#lib/types/feedSuppliers.ts';
	import type { FeedProduct } from '#lib/types/feedProducts.ts';
	import {
		PlusIcon,
		SearchIcon,
		PencilIcon,
		Trash2Icon,
		TruckIcon,
		BadgeCheckIcon,
		PhoneIcon,
		MailIcon,
		MapPinIcon,
		InboxIcon,
		XIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		PackageIcon
	} from '@lucide/svelte';
	import SupplierFormDialog from '#lib/components/supplier/SupplierFormDialog.svelte';
	import DeleteSupplierDialog from '#lib/components/supplier/DeleteSupplierDialog.svelte';
	import ProductsDialog from '#lib/components/supplier/ProductsDialog.svelte';
	import ProductFormDialog from '#lib/components/supplier/ProductFormDialog.svelte';
	import DeleteProductDialog from '#lib/components/supplier/DeleteProductDialog.svelte';

	//@ts-ignore
	let { data } = $props<{
		data: { suppliers: FeedSupplier[]; products: FeedProduct[] };
	}>();

	const statusStyles: Record<string, string> = {
		Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
		Inactive: 'bg-gray-100 text-gray-600 ring-gray-500/20'
	};
	const statusDot: Record<string, string> = {
		Active: 'bg-emerald-500',
		Inactive: 'bg-gray-400'
	};

	// state
	let rows = $state<FeedSupplier[]>(data.suppliers);
	let products = $state<FeedProduct[]>(data.products);
	let search = $state('');
	let statusFilter = $state('all');

	// pagination
	let pageSizeRaw = $state('10');
	let page = $state(1);
	const pageSize = $derived(Number(pageSizeRaw));

	// supplier dialogs
	let formOpen = $state(false);
	let editing = $state<FeedSupplier | null>(null);
	let deleteOpen = $state(false);
	let deleteTarget = $state<FeedSupplier | null>(null);

	// products dialogs
	let productsOpen = $state(false);
	let productsTarget = $state<FeedSupplier | null>(null);
	let productFormOpen = $state(false);
	let editingProduct = $state<FeedProduct | null>(null);
	let productSupplierId = $state('');
	let deleteProductOpen = $state(false);
	let deleteProductTarget = $state<FeedProduct | null>(null);

	const num = new Intl.NumberFormat('en-PH');

	const filtered = $derived(
		rows.filter((r) => {
			const q = search.trim().toLowerCase();
			const matchesSearch =
				!q ||
				r.name.toLowerCase().includes(q) ||
				r.code.toLowerCase().includes(q) ||
				r.contactPerson.toLowerCase().includes(q) ||
				r.email.toLowerCase().includes(q) ||
				r.phone.toLowerCase().includes(q) ||
				r.address.toLowerCase().includes(q);
			const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
			return matchesSearch && matchesStatus;
		})
	);

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const currentPage = $derived(Math.min(page, totalPages));
	const paginated = $derived(filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize));

	$effect(() => {
		void search;
		void statusFilter;
		void pageSizeRaw;
		page = 1;
	});

	const stats = $derived.by(() => {
		const active = rows.filter((r) => r.status === 'Active').length;
		const withEmail = rows.filter((r) => r.email?.trim()).length;
		const withPhone = rows.filter((r) => r.phone?.trim()).length;
		const withAddress = rows.filter((r) => r.address?.trim()).length;
		const withContact = rows.filter((r) => r.email?.trim() || r.phone?.trim()).length;

		const pct = (n: number) => (rows.length ? Math.round((n / rows.length) * 100) : 0);

		return {
			total: rows.length,
			active,
			activePct: pct(active),
			withEmail,
			withPhone,
			withAddress,
			withContact,
			contactPct: pct(withContact),
			totalProducts: products.length,
			activeProducts: products.filter((p) => p.active === 1).length
		};
	});

	const statCards = $derived([
		{
			label: 'Total suppliers',
			value: num.format(stats.total),
			icon: TruckIcon,
			tone: 'bg-red-50 text-red-700'
		},
		{
			label: 'Active suppliers',
			value: `${stats.active} / ${stats.total}`,
			sub: `${stats.activePct}% currently active`,
			icon: BadgeCheckIcon,
			tone: 'bg-emerald-50 text-emerald-700'
		},
		{
			label: 'Products catalog',
			value: num.format(stats.totalProducts),
			sub: `${stats.activeProducts} active item${stats.activeProducts === 1 ? '' : 's'}`,
			icon: PackageIcon,
			tone: 'bg-amber-50 text-amber-700'
		}
	]);

	const hasFilters = $derived(search.trim() !== '' || statusFilter !== 'all');

	// ── helpers ──
	function productsFor(supplierId: string) {
		return products.filter((p) => p.supplierId === supplierId);
	}

	// ── supplier actions ──
	function openAdd() {
		editing = null;
		formOpen = true;
	}
	function openEdit(s: FeedSupplier) {
		editing = s;
		formOpen = true;
	}
	function goToPage(p: number) {
		page = Math.max(1, Math.min(p, totalPages));
	}
	function clearFilters() {
		search = '';
		statusFilter = 'all';
	}

	async function handleSave(supplier: FeedSupplier) {
		const isEdit = rows.some((r) => r.id === supplier.id);
		const response = await fetch('/api/suppliers', {
			method: isEdit ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(supplier)
		});
		const result = await response.json();
		if (!response.ok) throw new Error(result.error || 'Failed to save the supplier.');

		const saved: FeedSupplier = result.supplier;
		rows = isEdit ? rows.map((r) => (r.id === saved.id ? saved : r)) : [...rows, saved];
		toast.success(`${isEdit ? 'Updated' : 'Added'} ${saved.name}`);
	}

	function askDelete(s: FeedSupplier) {
		deleteTarget = s;
		deleteOpen = true;
	}
	async function confirmDelete() {
		if (!deleteTarget) return;
		const removed = deleteTarget;
		try {
			const res = await fetch(`/api/suppliers/delete/${removed.id}`, { method: 'DELETE' });
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Failed to delete the supplier.');
			rows = rows.filter((r) => r.id !== removed.id);
			products = products.filter((p) => p.supplierId !== removed.id);
			deleteOpen = false;
			toast.success(`Deleted ${removed.name}`);
		} catch (err: any) {
			toast.error(err.message || 'Could not delete the supplier.');
		}
	}

	// ── product actions ──
	function openProducts(s: FeedSupplier) {
		productsTarget = s;
		productsOpen = true;
	}
	function openAddProduct(supplierId: string) {
		editingProduct = null;
		productSupplierId = supplierId;
		productFormOpen = true;
	}
	function openEditProduct(p: FeedProduct) {
		editingProduct = p;
		productSupplierId = p.supplierId;
		productFormOpen = true;
	}

	async function handleSaveProduct(product: FeedProduct) {
		const isEdit = products.some((p) => p.id === product.id);
		const res = await fetch('/api/products', {
			method: isEdit ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(product)
		});
		const result = await res.json();
		if (!res.ok) throw new Error(result.error || 'Failed to save product.');

		const saved: FeedProduct = result.product;
		products = isEdit ? products.map((p) => (p.id === saved.id ? saved : p)) : [...products, saved];
		toast.success(`${isEdit ? 'Updated' : 'Added'} ${saved.name || saved.stage}`);
	}

	function askDeleteProduct(p: FeedProduct) {
		deleteProductTarget = p;
		deleteProductOpen = true;
	}
	async function confirmDeleteProduct() {
		if (!deleteProductTarget) return;
		const removed = deleteProductTarget;
		try {
			const res = await fetch(`/api/products/delete/${removed.id}`, { method: 'DELETE' });
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || 'Failed to delete product.');
			products = products.filter((p) => p.id !== removed.id);
			deleteProductOpen = false;
			toast.success(`Removed ${removed.name || removed.stage}`);
		} catch (err: any) {
			toast.error(err.message || 'Could not delete the product.');
		}
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
</script>

<svelte:head>
	<title>Suppliers | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Procurement</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Feeds Suppliers</h1>
				<p class="mt-1 text-sm text-gray-500">
					Manage supplier contacts and the feed products they carry.
				</p>
			</div>
			<Button
				onclick={openAdd}
				class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-600 active:scale-[0.98]"
			>
				<PlusIcon class="mr-2 h-4 w-4" />
				Add Supplier
			</Button>
		</div>

		<!-- STATS -->
		<div class="grid grid-cols-3 gap-4">
			{#each statCards as card (card.label)}
				<div
					class="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
				>
					<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg {card.tone}">
						<card.icon class="h-5 w-5" />
					</div>
					<div class="min-w-0">
						<p class="text-xs font-medium text-gray-500">{card.label}</p>
						<p class="text-xl font-bold text-gray-900 tabular-nums">{card.value}</p>
						{#if card.sub}
							<p class="mt-0.5 truncate text-[11px] text-gray-400">{card.sub}</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- TABLE CARD -->
		<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
			<div
				class="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<div class="relative w-full sm:max-w-xs">
					<SearchIcon
						class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
					/>
					<Input
						bind:value={search}
						placeholder="Search supplier, code, contact…"
						class="h-10 rounded-lg border-gray-300 pl-9 {inputCls}"
						aria-label="Search suppliers"
					/>
				</div>
				<div class="flex items-center gap-2">
					<Select.Root type="single" bind:value={statusFilter}>
						<Select.Trigger
							class="h-10 w-40 rounded-lg border-gray-300"
							aria-label="Filter by status"
						>
							{statusFilter === 'all' ? 'All statuses' : statusFilter}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All statuses</Select.Item>
							{#each supplierStatuses as s (s)}
								<Select.Item value={s}>{s}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					{#if hasFilters}
						<Button
							variant="ghost"
							class="h-10 text-gray-600 hover:text-red-700"
							onclick={clearFilters}
						>
							<XIcon class="mr-1 h-4 w-4" />Clear
						</Button>
					{/if}
				</div>
			</div>

			<Table.Root>
				<Table.Header class="bg-stone-50">
					<Table.Row class="hover:bg-transparent">
						<Table.Head class={thCls}>Supplier</Table.Head>
						<Table.Head class={thCls}>Contact person</Table.Head>
						<Table.Head class={thCls}>Email</Table.Head>
						<Table.Head class={thCls}>Phone</Table.Head>
						<Table.Head class={thCls}>Products</Table.Head>
						<Table.Head class={thCls}>Status</Table.Head>
						<Table.Head class="w-24"><span class="sr-only">Actions</span></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each paginated as row (row.id)}
						<Table.Row class="group transition-colors hover:bg-amber-50/40">
							<Table.Cell>
								<div class="font-semibold text-gray-900">{row.name}</div>
								<div class="font-mono text-xs text-gray-500">{row.code}</div>
							</Table.Cell>
							<Table.Cell class="text-gray-700">
								{row.contactPerson || '—'}
							</Table.Cell>
							<Table.Cell class="text-gray-600">
								{#if row.email}
									<a href="mailto:{row.email}" class="text-red-700 hover:underline">
										{row.email}
									</a>
								{:else}
									<span class="text-gray-400">—</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-gray-600">
								{#if row.phone}
									<a href="tel:{row.phone}" class="hover:underline">{row.phone}</a>
								{:else}
									<span class="text-gray-400">—</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								{@const count = productsFor(row.id).length}
								{#if count > 0}
									<button
										type="button"
										class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-600/20 ring-inset hover:bg-amber-100"
										onclick={() => openProducts(row)}
									>
										<PackageIcon class="h-3.5 w-3.5" />
										{count} item{count === 1 ? '' : 's'}
									</button>
								{:else}
									<button
										type="button"
										class="text-xs font-medium text-red-700 hover:underline"
										onclick={() => openProducts(row)}
									>
										+ Add products
									</button>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<span
									class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset {statusStyles[
										row.status
									] ?? 'bg-gray-100 text-gray-700 ring-gray-500/20'}"
								>
									<span class="h-1.5 w-1.5 rounded-full {statusDot[row.status] ?? 'bg-gray-400'}"
									></span>
									{row.status || '—'}
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
										aria-label="Edit {row.name}"
										onclick={() => openEdit(row)}
									>
										<PencilIcon class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-gray-500 hover:bg-red-100 hover:text-red-700"
										aria-label="Delete {row.name}"
										onclick={() => askDelete(row)}
									>
										<Trash2Icon class="h-4 w-4" />
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
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
										<p class="font-semibold text-gray-900">No matching suppliers</p>
										<p class="mt-1 text-sm text-gray-500">
											Try a different search term or clear your filters.
										</p>
										<Button variant="outline" class="mt-4" onclick={clearFilters}
											>Clear filters</Button
										>
									{:else}
										<p class="font-semibold text-gray-900">No suppliers yet</p>
										<p class="mt-1 text-sm text-gray-500">
											Add your first feed supplier to get started.
										</p>
										<Button class="mt-4 bg-red-700 text-white hover:bg-red-600" onclick={openAdd}>
											<PlusIcon class="mr-2 h-4 w-4" />Add Supplier
										</Button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>

			{#if rows.length > 0}
				<div
					class="flex flex-col gap-3 border-t border-gray-100 bg-stone-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex flex-wrap items-center gap-4 text-xs text-gray-500">
						<span>
							Showing
							<span class="font-semibold text-gray-700"
								>{filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span
							>
							–
							<span class="font-semibold text-gray-700"
								>{Math.min(currentPage * pageSize, filtered.length)}</span
							>
							of <span class="font-semibold text-gray-700">{filtered.length}</span>
							{filtered.length === 1 ? 'supplier' : 'suppliers'}
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
						<span class="min-w-[80px] text-center text-xs font-medium text-gray-700"
							>Page {currentPage} of {totalPages}</span
						>
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

<!-- SUPPLIER DIALOGS -->
<SupplierFormDialog bind:open={formOpen} supplier={editing} suppliers={rows} onsave={handleSave} />
<DeleteSupplierDialog bind:open={deleteOpen} supplier={deleteTarget} onconfirm={confirmDelete} />

<!-- PRODUCTS DIALOGS -->
<ProductsDialog
	bind:open={productsOpen}
	supplier={productsTarget}
	products={productsFor(productsTarget?.id ?? '')}
	onadd={() => {
		if (productsTarget) openAddProduct(productsTarget.id);
	}}
	onedit={openEditProduct}
	ondelete={askDeleteProduct}
/>

<ProductFormDialog
	bind:open={productFormOpen}
	product={editingProduct}
	supplierId={productSupplierId}
	suppliers={rows}
	{products}
	onsave={handleSaveProduct}
/>

<DeleteProductDialog
	bind:open={deleteProductOpen}
	product={deleteProductTarget}
	onconfirm={confirmDeleteProduct}
/>
