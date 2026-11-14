<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import {
		PlusIcon,
		SearchIcon,
		PencilIcon,
		Trash2Icon,
		PackageIcon,
		CircleCheckIcon,
		ClockAlertIcon,
		LayersIcon,
		InboxIcon,
		XIcon
	} from '@lucide/svelte';

	// ── types ──
	// (move to '#lib/types/master-item.ts' if you prefer)
	interface MasterItem {
		id: string;
		code: string;
		category: string;
		name: string;
		unit: string;
		unitCost: number;
		validFrom: string;
		validTo: string;
		remarks: string;
	}

	type Status = 'active' | 'upcoming' | 'expired';

	const categories = [
		'Labor',
		'Materials',
		'Feeds',
		'Equipment',
		'Utilities',
		'Transportation',
		'Other'
	];
	const units = ['hour', 'day', 'month', 'kg', 'piece', 'sack', 'lot'];

	// Category badge colours – red / amber / neutral family only
	const categoryStyles: Record<string, string> = {
		Labor: 'bg-red-50 text-red-700 ring-red-600/20',
		Materials: 'bg-amber-50 text-amber-800 ring-amber-600/20',
		Feeds: 'bg-orange-50 text-orange-700 ring-orange-600/20',
		Equipment: 'bg-rose-50 text-rose-700 ring-rose-600/20',
		Utilities: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
		Transportation: 'bg-stone-100 text-stone-700 ring-stone-500/20',
		Other: 'bg-gray-100 text-gray-700 ring-gray-500/20'
	};

	const statusStyles: Record<Status, { label: string; dot: string; text: string }> = {
		active: { label: 'Active', dot: 'bg-emerald-500', text: 'text-emerald-700' },
		upcoming: { label: 'Upcoming', dot: 'bg-amber-500', text: 'text-amber-700' },
		expired: { label: 'Expired', dot: 'bg-red-500', text: 'text-red-700' }
	};

	// ── state (Svelte 5 runes) ──
	let rows = $state<MasterItem[]>([]);
	let loaded = $state(false);

	let search = $state('');
	let categoryFilter = $state('all');

	let formOpen = $state(false);
	let editingId = $state<string | null>(null);
	let deleteTarget = $state<MasterItem | null>(null);

	// form fields
	let code = $state('');
	let category = $state('');
	let name = $state('');
	let unit = $state('piece');
	let unitCost = $state(0);
	let validFrom = $state('');
	let validTo = $state('');
	let remarks = $state('');

	const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
	const dateFmt = new Intl.DateTimeFormat('en-PH', {
		year: 'numeric',
		month: 'short',
		day: '2-digit'
	});

	// ── derived ──
	const today = new Date().toISOString().slice(0, 10);

	function statusOf(row: MasterItem): Status {
		if (row.validTo < today) return 'expired';
		if (row.validFrom > today) return 'upcoming';
		return 'active';
	}

	function formatDate(iso: string) {
		return iso ? dateFmt.format(new Date(iso + 'T00:00:00')) : '—';
	}

	const filtered = $derived(
		rows.filter((r) => {
			const q = search.trim().toLowerCase();
			const matchesSearch =
				!q ||
				r.code.toLowerCase().includes(q) ||
				r.name.toLowerCase().includes(q) ||
				r.remarks.toLowerCase().includes(q);
			const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
			return matchesSearch && matchesCategory;
		})
	);

	const stats = $derived({
		total: rows.length,
		active: rows.filter((r) => statusOf(r) === 'active').length,
		expired: rows.filter((r) => statusOf(r) === 'expired').length,
		categories: new Set(rows.map((r) => r.category)).size
	});

	const duplicateCode = $derived(
		code.trim() !== '' &&
			rows.some((r) => r.id !== editingId && r.code.toLowerCase() === code.trim().toLowerCase())
	);
	const invalidRange = $derived(validFrom !== '' && validTo !== '' && validTo < validFrom);
	const canSave = $derived(!!category && !duplicateCode && !invalidRange);

	const hasFilters = $derived(search.trim() !== '' || categoryFilter !== 'all');

	// ── helpers ──
	function resetForm() {
		code = '';
		category = '';
		name = '';
		unit = 'piece';
		unitCost = 0;
		validFrom = '';
		validTo = '';
		remarks = '';
		editingId = null;
	}

	function openAdd() {
		resetForm();
		formOpen = true;
	}

	function openEdit(row: MasterItem) {
		editingId = row.id;
		code = row.code;
		category = row.category;
		name = row.name;
		unit = row.unit;
		unitCost = row.unitCost;
		validFrom = row.validFrom;
		validTo = row.validTo;
		remarks = row.remarks;
		formOpen = true;
	}

	function saveRow() {
		if (!canSave) return;

		const payload = {
			code: code.trim(),
			category,
			name: name.trim(),
			unit,
			unitCost,
			validFrom,
			validTo,
			remarks: remarks.trim()
		};

		if (editingId) {
			rows = rows.map((r) => (r.id === editingId ? { ...r, ...payload } : r));
			toast.success(`Updated ${payload.code}`);
		} else {
			rows = [...rows, { id: crypto.randomUUID(), ...payload }];
			toast.success(`Added ${payload.code}`);
		}

		formOpen = false;
		resetForm();
	}

	function confirmDelete() {
		if (!deleteTarget) return;
		const removed = deleteTarget;
		rows = rows.filter((r) => r.id !== removed.id);
		deleteTarget = null;
		toast.success(`Deleted ${removed.code}`);
	}

	function clearFilters() {
		search = '';
		categoryFilter = 'all';
	}

	// demo data – replace with your API / load function
	onMount(() => {
		rows = [
			{
				id: '1',
				code: 'LAB-001',
				category: 'Labor',
				name: 'Farm hand – standard shift',
				unit: 'hour',
				unitCost: 85,
				validFrom: '2026-01-01',
				validTo: '2026-12-31',
				remarks: ''
			},
			{
				id: '2',
				code: 'FED-001',
				category: 'Feeds',
				name: 'Broiler starter feed (50 kg)',
				unit: 'sack',
				unitCost: 1850,
				validFrom: '2026-01-01',
				validTo: '2026-12-31',
				remarks: 'Supplier price list Q1'
			},
			{
				id: '3',
				code: 'UTL-001',
				category: 'Utilities',
				name: 'Electricity – poultry house',
				unit: 'month',
				unitCost: 12500,
				validFrom: '2025-01-01',
				validTo: '2025-12-31',
				remarks: 'Renewal pending'
			},
			{
				id: '4',
				code: 'TRN-001',
				category: 'Transportation',
				name: 'Live-bird hauling',
				unit: 'lot',
				unitCost: 4200,
				validFrom: '2027-01-01',
				validTo: '2027-12-31',
				remarks: ''
			}
		];
		loaded = true;
	});
</script>

<svelte:head>
	<title>Master List | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- ── HEADER ── -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Master List</h1>
				<p class="mt-1 text-sm text-gray-500">
					Maintain the items and unit costs used when generating budgets.
				</p>
			</div>

			<Button
				onclick={openAdd}
				class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-600 active:scale-[0.98]"
			>
				<PlusIcon class="mr-2 h-4 w-4" />
				Add Item
			</Button>
		</div>

		<!-- ── STATS ── -->
		<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
			{#each [{ label: 'Total items', value: stats.total, icon: PackageIcon, tone: 'bg-red-50 text-red-700' }, { label: 'Active', value: stats.active, icon: CircleCheckIcon, tone: 'bg-emerald-50 text-emerald-700' }, { label: 'Expired', value: stats.expired, icon: ClockAlertIcon, tone: 'bg-amber-50 text-amber-700' }, { label: 'Categories', value: stats.categories, icon: LayersIcon, tone: 'bg-stone-100 text-stone-700' }] as card (card.label)}
				<div
					class="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
				>
					<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg {card.tone}">
						<card.icon class="h-5 w-5" />
					</div>
					<div>
						<p class="text-xs font-medium text-gray-500">{card.label}</p>
						<p class="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</p>
					</div>
				</div>
			{/each}
		</div>

		<!-- ── TABLE CARD ── -->
		<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
			<!-- toolbar -->
			<div
				class="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<div class="relative w-full sm:max-w-xs">
					<SearchIcon
						class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
					/>
					<Input
						bind:value={search}
						placeholder="Search code, item or remarks…"
						class="h-10 rounded-lg border-gray-300 pl-9 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
						aria-label="Search master list"
					/>
				</div>

				<div class="flex items-center gap-2">
					<Select.Root type="single" bind:value={categoryFilter}>
						<Select.Trigger
							class="h-10 w-48 rounded-lg border-gray-300"
							aria-label="Filter by category"
						>
							{categoryFilter === 'all' ? 'All categories' : categoryFilter}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All categories</Select.Item>
							{#each categories as c (c)}
								<Select.Item value={c}>{c}</Select.Item>
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
							Clear
						</Button>
					{/if}
				</div>
			</div>

			<!-- table -->
			<Table.Root>
				<Table.Header class="bg-stone-50">
					<Table.Row class="hover:bg-transparent">
						<Table.Head class="text-xs font-semibold tracking-wide text-gray-500 uppercase"
							>Code</Table.Head
						>
						<Table.Head class="text-xs font-semibold tracking-wide text-gray-500 uppercase"
							>Item</Table.Head
						>
						<Table.Head class="text-xs font-semibold tracking-wide text-gray-500 uppercase"
							>Category</Table.Head
						>
						<Table.Head class="text-xs font-semibold tracking-wide text-gray-500 uppercase"
							>Unit</Table.Head
						>
						<Table.Head
							class="text-right text-xs font-semibold tracking-wide text-gray-500 uppercase"
							>Unit Cost</Table.Head
						>
						<Table.Head class="text-xs font-semibold tracking-wide text-gray-500 uppercase"
							>Validity</Table.Head
						>
						<Table.Head class="text-xs font-semibold tracking-wide text-gray-500 uppercase"
							>Status</Table.Head
						>
						<Table.Head class="w-24"><span class="sr-only">Actions</span></Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#if !loaded}
						{#each Array(4) as _, i (i)}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell colspan={8}>
									<div class="h-5 w-full animate-pulse rounded bg-gray-100"></div>
								</Table.Cell>
							</Table.Row>
						{/each}
					{:else}
						{#each filtered as row (row.id)}
							{@const status = statusOf(row)}
							<Table.Row class="group transition-colors hover:bg-amber-50/40">
								<Table.Cell class="font-mono text-sm font-semibold text-gray-900">
									{row.code}
								</Table.Cell>
								<Table.Cell>
									<div class="font-medium text-gray-900">{row.name}</div>
									{#if row.remarks}
										<div class="text-xs text-gray-500">{row.remarks}</div>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<span
										class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset {categoryStyles[
											row.category
										] ?? categoryStyles.Other}"
									>
										{row.category}
									</span>
								</Table.Cell>
								<Table.Cell class="text-gray-600 capitalize">{row.unit}</Table.Cell>
								<Table.Cell class="text-right font-semibold text-gray-900 tabular-nums">
									{peso.format(row.unitCost)}
								</Table.Cell>
								<Table.Cell class="text-sm whitespace-nowrap text-gray-600">
									{formatDate(row.validFrom)} – {formatDate(row.validTo)}
								</Table.Cell>
								<Table.Cell>
									<span
										class="inline-flex items-center gap-1.5 text-xs font-medium {statusStyles[
											status
										].text}"
									>
										<span class="h-1.5 w-1.5 rounded-full {statusStyles[status].dot}"></span>
										{statusStyles[status].label}
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
											aria-label="Edit {row.code}"
											onclick={() => openEdit(row)}
										>
											<PencilIcon class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-gray-500 hover:bg-red-100 hover:text-red-700"
											aria-label="Delete {row.code}"
											onclick={() => (deleteTarget = row)}
										>
											<Trash2Icon class="h-4 w-4" />
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
											<p class="font-semibold text-gray-900">No matching items</p>
											<p class="mt-1 text-sm text-gray-500">
												Try a different search term or clear your filters.
											</p>
											<Button variant="outline" class="mt-4" onclick={clearFilters}>
												Clear filters
											</Button>
										{:else}
											<p class="font-semibold text-gray-900">No items yet</p>
											<p class="mt-1 text-sm text-gray-500">
												Add your first item to start building budgets.
											</p>
											<Button class="mt-4 bg-red-700 text-white hover:bg-red-600" onclick={openAdd}>
												<PlusIcon class="mr-2 h-4 w-4" />
												Add Item
											</Button>
										{/if}
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>

			<!-- footer -->
			{#if loaded && rows.length > 0}
				<div class="border-t border-gray-100 bg-stone-50 px-4 py-3 text-xs text-gray-500">
					Showing <span class="font-semibold text-gray-700">{filtered.length}</span> of
					<span class="font-semibold text-gray-700">{rows.length}</span> items
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- ── ADD / EDIT DIALOG ── -->
<Dialog.Root
	bind:open={formOpen}
	onOpenChange={(v) => {
		if (!v) resetForm();
	}}
>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto border-t-4 border-t-red-700 sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title class="text-xl font-bold text-gray-900">
				{editingId ? 'Edit item' : 'Add item'}
			</Dialog.Title>
			<Dialog.Description>
				{editingId
					? 'Update the details of this master list item.'
					: 'This item will be available when generating budgets.'}
			</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				saveRow();
			}}
			class="grid gap-4 py-2"
		>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<Label for="code">Item code</Label>
					<Input
						id="code"
						bind:value={code}
						placeholder="e.g. LAB-001"
						required
						aria-invalid={duplicateCode}
						class="focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
					/>
					{#if duplicateCode}
						<p class="text-xs text-red-600">This code already exists.</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="category">Category</Label>
					<Select.Root type="single" bind:value={category}>
						<Select.Trigger id="category" class="w-full">
							{category || 'Select category'}
						</Select.Trigger>
						<Select.Content>
							{#each categories as c (c)}
								<Select.Item value={c}>{c}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2 sm:col-span-2">
					<Label for="name">Item name / description</Label>
					<Input
						id="name"
						bind:value={name}
						placeholder="e.g. Broiler starter feed"
						required
						class="focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
					/>
				</div>

				<div class="space-y-2">
					<Label for="unit">Unit</Label>
					<Select.Root type="single" bind:value={unit}>
						<Select.Trigger id="unit" class="w-full capitalize">
							{unit}
						</Select.Trigger>
						<Select.Content>
							{#each units as u (u)}
								<Select.Item value={u} class="capitalize">{u}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label for="unitCost">Unit cost (₱)</Label>
					<Input
						id="unitCost"
						type="number"
						bind:value={unitCost}
						min="0"
						step="0.01"
						required
						class="focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
					/>
				</div>

				<div class="space-y-2">
					<Label for="validFrom">Valid from</Label>
					<Input
						id="validFrom"
						type="date"
						bind:value={validFrom}
						required
						class="focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
					/>
				</div>

				<div class="space-y-2">
					<Label for="validTo">Valid to</Label>
					<Input
						id="validTo"
						type="date"
						bind:value={validTo}
						min={validFrom}
						required
						aria-invalid={invalidRange}
						class="focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
					/>
					{#if invalidRange}
						<p class="text-xs text-red-600">End date must be on or after the start date.</p>
					{/if}
				</div>

				<div class="space-y-2 sm:col-span-2">
					<Label for="remarks"
						>Remarks <span class="font-normal text-gray-400">(optional)</span></Label
					>
					<Input
						id="remarks"
						bind:value={remarks}
						placeholder="Supplier, source, notes…"
						class="focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0"
					/>
				</div>
			</div>

			<Dialog.Footer class="mt-4 flex justify-end gap-2">
				<Dialog.Close type="button" class={buttonVariants({ variant: 'outline' })}>
					Cancel
				</Dialog.Close>
				<Button
					type="submit"
					disabled={!canSave}
					class="bg-red-700 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
				>
					{editingId ? 'Save changes' : 'Add item'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- ── DELETE CONFIRMATION ── -->
<Dialog.Root
	open={deleteTarget !== null}
	onOpenChange={(v) => {
		if (!v) deleteTarget = null;
	}}
>
	<Dialog.Content class="sm:max-w-[420px]">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold text-gray-900">Delete this item?</Dialog.Title>
			<Dialog.Description>
				<span class="font-semibold text-gray-800">{deleteTarget?.code}</span>
				– {deleteTarget?.name} will be permanently removed from the master list. This can't be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="mt-2 flex justify-end gap-2">
			<Dialog.Close type="button" class={buttonVariants({ variant: 'outline' })}>
				Cancel
			</Dialog.Close>
			<Button class="bg-red-700 font-semibold text-white hover:bg-red-600" onclick={confirmDelete}>
				<Trash2Icon class="mr-2 h-4 w-4" />
				Delete
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
