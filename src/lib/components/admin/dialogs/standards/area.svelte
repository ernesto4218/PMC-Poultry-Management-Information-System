<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Table from '#lib/components/ui/table/index.js';
	import {
		PlusIcon,
		PencilIcon,
		Trash2Icon,
		LoaderCircleIcon,
		AlertCircleIcon,
		MapPinIcon,
		SearchIcon,
		XIcon,
		ChevronUpIcon,
		ChevronDownIcon,
		ChevronsUpDownIcon,
		ChevronLeftIcon,
		ChevronRightIcon
	} from '@lucide/svelte';
	import { Input } from '#lib/components/ui/input/index.ts';
	import AreaDialog from './dialogs/area_dialog.svelte';
	import AreaDeleteDialog from './dialogs/area_delete_dialog.svelte';
	import type { Area } from '#lib/types/standards/area/+items.ts';

	let areas = $state<Area[]>([]);
	let loading = $state(false);
	let errorMsg = $state('');

	let dialogOpen = $state(false);
	let editingArea = $state<Area | null>(null);

	let deleteOpen = $state(false);
	let deletingArea = $state<Area | null>(null);

	let actionBusy = $state<string | null>(null);

	type SortKey = 'name' | 'createdAt' | 'updatedAt';

	const PAGE_SIZES = [10, 25, 50];

	let search = $state('');
	let sortKey = $state<SortKey>('name');
	let sortDir = $state<'asc' | 'desc'>('asc');
	let page = $state(1);
	let pageSize = $state(10);

	const filteredItems = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return areas;
		return areas.filter((a) => a.name.toLowerCase().includes(q));
	});

	const dateKeys = ['createdAt', 'updatedAt'] as const;

	const sortedItems = $derived.by(() => {
		const dir = sortDir === 'asc' ? 1 : -1;
		const key = sortKey;
		return [...filteredItems].sort((a, b) => {
			if ((dateKeys as readonly string[]).includes(key)) {
				const ta = Date.parse((a as any)[key] ?? '');
				const tb = Date.parse((b as any)[key] ?? '');
				if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
				if (Number.isNaN(ta)) return 1;
				if (Number.isNaN(tb)) return -1;
				return (ta - tb) * dir;
			}
			return (
				a.name.localeCompare(b.name, undefined, {
					numeric: true,
					sensitivity: 'base'
				}) * dir
			);
		});
	});

	const totalPages = $derived(Math.max(1, Math.ceil(sortedItems.length / pageSize)));
	const pagedItems = $derived(sortedItems.slice((page - 1) * pageSize, page * pageSize));
	const rangeStart = $derived(sortedItems.length === 0 ? 0 : (page - 1) * pageSize + 1);
	const rangeEnd = $derived(Math.min(page * pageSize, sortedItems.length));

	$effect(() => {
		if (page > totalPages) page = totalPages;
	});

	function toggleSort(key: SortKey) {
		if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortKey = key;
			sortDir = 'asc';
		}
		page = 1;
	}
	function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
		return sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';
	}

	async function load() {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/standard/area');
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? `Failed to load areas (HTTP ${res.status}).`);
			}
			areas = await res.json();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not load areas.';
		} finally {
			loading = false;
		}
	}
	onMount(load);

	function openAdd() {
		editingArea = null;
		dialogOpen = true;
	}
	function openEdit(area: Area) {
		editingArea = area;
		dialogOpen = true;
	}
	function openDelete(area: Area) {
		deletingArea = area;
		deleteOpen = true;
	}

	async function handleSave(area: Area) {
		const isNew = !areas.some((a) => a.id === area.id);
		const res = await fetch('/api/standard/area', {
			method: isNew ? 'POST' : 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: area.id, name: area.name })
		});
		let result: { error?: string } | null = null;
		try {
			result = await res.json();
		} catch {
			/* non-JSON */
		}
		if (!res.ok) {
			throw new Error(result?.error ?? `Failed to save area (HTTP ${res.status}).`);
		}
		await load();
	}

	async function handleDelete(area: Area) {
		actionBusy = area.id;
		try {
			const res = await fetch('/api/standard/area', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: area.id })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? `Failed to delete area.`);
			}
			await load();
		} finally {
			actionBusy = null;
		}
	}

	function formatShort(value?: string | Date | null) {
		if (!value) return '—';
		const d = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(d.getTime())) return '—';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
	function formatTime(value?: string | Date | null) {
		if (!value) return '';
		const d = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(d.getTime())) return '';
		return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}
	function formatFull(value?: string | Date | null) {
		if (!value) return '';
		const d = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(d.getTime())) return '';
		return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
	}

	const iconBtn =
		'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';
	const headCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
</script>

<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
	<!-- Toolbar -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
		<div class="flex items-center gap-2">
			<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
				<MapPinIcon class="h-5 w-5" />
			</span>
			<div class="flex flex-col leading-tight">
				<span class="text-sm font-semibold text-gray-900">Areas</span>
				<span class="text-xs text-gray-500"
					>{areas.length} {areas.length === 1 ? 'area' : 'areas'}</span
				>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<div class="relative">
				<SearchIcon
					class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
				/>
				<Input
					type="search"
					bind:value={search}
					oninput={() => (page = 1)}
					placeholder="Search areas…"
					aria-label="Search areas"
					autocomplete="off"
					class="h-10 w-full pr-9 pl-9 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0 sm:w-64 [&::-webkit-search-cancel-button]:hidden"
				/>
				{#if search}
					<button
						type="button"
						aria-label="Clear search"
						onclick={() => {
							search = '';
							page = 1;
						}}
						class="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
					>
						<XIcon class="h-4 w-4" />
					</button>
				{/if}
			</div>
			{#if loading && areas.length > 0}
				<LoaderCircleIcon class="h-4 w-4 animate-spin text-gray-400" aria-label="Refreshing" />
			{/if}
			<Button
				onclick={openAdd}
				class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-600 active:scale-[0.98]"
			>
				<PlusIcon class="mr-2 h-4 w-4" />
				Add Area
			</Button>
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

	{#snippet sortBtn(key: SortKey, label: string)}
		<button
			type="button"
			onclick={() => toggleSort(key)}
			class="group inline-flex items-center gap-1 uppercase transition-colors hover:text-gray-900 focus-visible:text-gray-900 focus-visible:outline-none {sortKey ===
			key
				? 'text-gray-900'
				: ''}"
		>
			{label}
			{#if sortKey === key}
				{#if sortDir === 'asc'}
					<ChevronUpIcon class="h-3.5 w-3.5 text-red-700" />
				{:else}
					<ChevronDownIcon class="h-3.5 w-3.5 text-red-700" />
				{/if}
			{:else}
				<ChevronsUpDownIcon class="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500" />
			{/if}
		</button>
	{/snippet}

	<!-- Table -->
	<Table.Root>
		<Table.Header class="bg-gray-50/80">
			<Table.Row class="hover:bg-transparent">
				<Table.Head class="{headCls} pl-4" aria-sort={ariaSort('name')}>
					{@render sortBtn('name', 'Name')}
				</Table.Head>
				<Table.Head class="{headCls} hidden sm:table-cell" aria-sort={ariaSort('createdAt')}>
					{@render sortBtn('createdAt', 'Date added')}
				</Table.Head>
				<Table.Head class="{headCls} hidden md:table-cell" aria-sort={ariaSort('updatedAt')}>
					{@render sortBtn('updatedAt', 'Last updated')}
				</Table.Head>
				<Table.Head class="{headCls} pr-4 text-end">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#if loading && areas.length === 0}
				{#each Array(4) as _}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={4} class="px-4 py-3">
							<div class="h-6 animate-pulse rounded bg-gray-100"></div>
						</Table.Cell>
					</Table.Row>
				{/each}
			{:else}
				{#each pagedItems as area (area.id)}
					<Table.Row class="transition-colors hover:bg-red-50/30">
						<Table.Cell class="pl-4 font-medium text-gray-900">
							{area.name}
						</Table.Cell>
						<Table.Cell
							class="hidden text-sm text-gray-500 sm:table-cell"
							title={formatFull(area.createdAt)}
						>
							<div class="flex flex-col leading-tight whitespace-nowrap">
								<span class="text-gray-700">{formatShort(area.createdAt)}</span>
								<span class="text-xs text-gray-400">{formatTime(area.createdAt)}</span>
							</div>
						</Table.Cell>
						<Table.Cell
							class="hidden text-sm text-gray-500 md:table-cell"
							title={formatFull(area.updatedAt)}
						>
							<div class="flex flex-col leading-tight whitespace-nowrap">
								<span class="text-gray-700">{formatShort(area.updatedAt)}</span>
								<span class="text-xs text-gray-400">{formatTime(area.updatedAt)}</span>
							</div>
						</Table.Cell>
						<Table.Cell class="pr-4 text-end">
							<div class="inline-flex items-center gap-0.5">
								<button
									type="button"
									title="Edit"
									aria-label="Edit {area.name}"
									onclick={() => openEdit(area)}
									class="{iconBtn} hover:bg-gray-100 hover:text-gray-900"
								>
									<PencilIcon class="h-4 w-4" />
								</button>
								<button
									type="button"
									title="Delete"
									aria-label="Delete {area.name}"
									disabled={actionBusy === area.id}
									onclick={() => openDelete(area)}
									class="{iconBtn} text-red-700 hover:bg-red-50"
								>
									{#if actionBusy === area.id}
										<LoaderCircleIcon class="h-4 w-4 animate-spin" />
									{:else}
										<Trash2Icon class="h-4 w-4" />
									{/if}
								</button>
							</div>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={4} class="py-14">
							<div class="flex flex-col items-center gap-2 text-center">
								<span class="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
									<MapPinIcon class="h-5 w-5 text-gray-400" />
								</span>
								<p class="text-sm font-medium text-gray-700">
									{search.trim() ? 'No matching areas' : 'No areas yet'}
								</p>
								<p class="text-xs text-gray-500">
									{search.trim()
										? 'Try a different search term.'
										: 'Click “Add Area” to create one.'}
								</p>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			{/if}
		</Table.Body>
	</Table.Root>

	<!-- Footer -->
	<div
		class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-2.5 text-xs text-gray-500"
	>
		<p aria-live="polite">
			{#if sortedItems.length === 0}
				No areas{search.trim() ? ' match your search' : ''}
			{:else}
				Showing <span class="font-medium text-gray-700 tabular-nums">{rangeStart}–{rangeEnd}</span>
				of <span class="font-medium text-gray-700 tabular-nums">{sortedItems.length}</span>
				{sortedItems.length === 1 ? 'area' : 'areas'}
				{#if search.trim() && filteredItems.length !== areas.length}
					(filtered from {areas.length})
				{/if}
			{/if}
		</p>

		<div class="flex items-center gap-4">
			<label class="flex items-center gap-2">
				<span>Rows per page</span>
				<select
					bind:value={pageSize}
					onchange={() => (page = 1)}
					class="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:outline-none"
				>
					{#each PAGE_SIZES as size (size)}
						<option value={size}>{size}</option>
					{/each}
				</select>
			</label>

			<div class="flex items-center gap-2">
				<span class="tabular-nums">Page {page} of {totalPages}</span>
				<div class="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon"
						class="h-8 w-8"
						aria-label="Previous page"
						disabled={page <= 1}
						onclick={() => (page = Math.max(1, page - 1))}
					>
						<ChevronLeftIcon class="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						class="h-8 w-8"
						aria-label="Next page"
						disabled={page >= totalPages}
						onclick={() => (page = Math.min(totalPages, page + 1))}
					>
						<ChevronRightIcon class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	</div>

	<AreaDialog bind:open={dialogOpen} area={editingArea} {areas} onsave={handleSave} />
	<AreaDeleteDialog bind:open={deleteOpen} area={deletingArea} onconfirm={handleDelete} />
</div>
