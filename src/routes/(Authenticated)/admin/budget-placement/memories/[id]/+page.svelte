<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import {
		PlusIcon,
		ArrowLeftIcon,
		PencilIcon,
		Trash2Icon,
		ChevronUpIcon,
		ChevronDownIcon,
		ZapIcon,
		CalendarClockIcon,
		LoaderCircleIcon,
		AlertCircleIcon,
		InboxIcon,
		RefreshCwIcon
	} from '@lucide/svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import MemoryItemDialog from './dialogs/memory_item_dialog.svelte';
	import type {
		Particular,
		ParticularMemory,
		ParticularMemoryItem,
		ParticularMemoryItemInput,
		ResolvedMemoryItem
	} from '#lib/types/particulars.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let memory = $state<ParticularMemory>(data.memory);
	let items = $state<ParticularMemoryItem[]>(data.items);
	let formulaKeys = $state<string[]>(data.formulaKeys ?? []);
	let particulars = $state<Particular[]>([]);
	let loading = $state(false);
	let errorMsg = $state('');

	// dialog
	let itemDialogOpen = $state(false);
	let editingItem = $state<ParticularMemoryItem | null>(null);
	let deletingId = $state<string | null>(null);

	// preview context
	let showPreview = $state(false);
	let ctxFarmId = $state('');
	let ctxBatchId = $state('');
	let ctxDate = $state('');
	let ctxPeriod = $state('');
	let resolvedItems = $state<ResolvedMemoryItem[] | null>(null);
	let resolving = $state(false);

	async function load() {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/particulars-memories/${memory.id}`);
			if (!res.ok) throw new Error('Failed to load memory.');
			const body = await res.json();
			memory = body.memory;
			items = body.items;
			formulaKeys = body.formulaKeys ?? [];
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not load memory.';
		} finally {
			loading = false;
		}
	}

	async function loadParticulars() {
		const res = await fetch('/api/particulars');
		if (res.ok) particulars = await res.json();
	}

	onMount(() => {
		loadParticulars();
	});

	function openAdd() {
		editingItem = null;
		itemDialogOpen = true;
	}
	function openEdit(item: ParticularMemoryItem) {
		editingItem = item;
		itemDialogOpen = true;
	}

	async function handleSave(payload: ParticularMemoryItemInput) {
		const isNew = !payload.id;
		const url = `/api/particulars-memories/${memory.id}/items`;
		const res = await fetch(url, {
			method: isNew ? 'POST' : 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(body.error ?? 'Failed to save item.');
		await load();
		toast.success(isNew ? 'Item added' : 'Item updated');
	}

	async function handleDelete(item: ParticularMemoryItem) {
		if (!confirm(`Remove this item from the memory?`)) return;
		deletingId = item.id;
		try {
			const res = await fetch(`/api/particulars-memories/${memory.id}/items`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: item.id })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? 'Failed to delete.');
			}
			await load();
			toast.success('Item removed');
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Could not remove item.';
			errorMsg = msg;
			toast.error(msg);
		} finally {
			deletingId = null;
		}
	}

	async function move(idx: number, dir: -1 | 1) {
		const target = idx + dir;
		if (target < 0 || target >= items.length) return;
		const ids = items.map((i) => i.id);
		[ids[idx], ids[target]] = [ids[target], ids[idx]];
		// Optimistic
		const next = [...items];
		[next[idx], next[target]] = [next[target], next[idx]];
		items = next;
		try {
			const res = await fetch(`/api/particulars-memories/${memory.id}/items`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids })
			});
			if (!res.ok) throw new Error('Reorder failed.');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Reorder failed.');
			await load();
		}
	}

	async function runPreview() {
		resolving = true;
		errorMsg = '';
		try {
			const params = new URLSearchParams({ resolve: '1' });
			if (ctxFarmId) params.set('farmId', ctxFarmId);
			if (ctxBatchId) params.set('batchId', ctxBatchId);
			if (ctxDate) params.set('date', ctxDate);
			if (ctxPeriod) params.set('period', ctxPeriod);
			const res = await fetch(`/api/particulars-memories/${memory.id}?${params}`);
			if (!res.ok) throw new Error('Failed to resolve.');
			const body = await res.json();
			resolvedItems = body.items;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not resolve memory.';
		} finally {
			resolving = false;
		}
	}

	const resolvedById = $derived.by(() => {
		if (!resolvedItems) return null;
		return new Map(resolvedItems.map((r) => [r.id, r]));
	});

	function displayQty(item: ParticularMemoryItem): {
		label: string;
		value: string;
		error?: string;
	} {
		const r = resolvedById?.get(item.id);
		if (item.mode === 'formula') {
			return {
				label: item.formulaKey ?? '—',
				value: r ? (r.resolveError ? '—' : String(r.resolvedQty)) : '…',
				error: r?.resolveError ?? undefined
			};
		}
		return { label: 'Static', value: String(item.qty) };
	}

	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
</script>

<svelte:head><title>{memory.name} | Memories</title></svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<a
					href="/particulars/memories"
					class="inline-flex items-center gap-1 text-xs font-semibold tracking-wider text-red-700 uppercase hover:underline"
				>
					<ArrowLeftIcon class="h-3 w-3" /> Memories
				</a>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">{memory.name}</h1>
				{#if memory.notes}
					<p class="mt-1 text-sm text-gray-500">{memory.notes}</p>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<Button variant="outline" onclick={() => (showPreview = !showPreview)}>
					<RefreshCwIcon class="mr-1.5 h-4 w-4" />
					{showPreview ? 'Hide preview' : 'Preview resolution'}
				</Button>
				<Button
					onclick={openAdd}
					class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white hover:bg-red-600"
				>
					<PlusIcon class="mr-2 h-4 w-4" />Add Item
				</Button>
			</div>
		</div>

		{#if showPreview}
			<div class="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
				<p class="mb-3 text-sm font-semibold text-amber-900">
					Preview context <span class="font-normal text-amber-700">(used only for resolution)</span>
				</p>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
					<Input bind:value={ctxFarmId} placeholder="farmId" class="h-9 bg-white" />
					<Input bind:value={ctxBatchId} placeholder="batchId" class="h-9 bg-white" />
					<Input type="date" bind:value={ctxDate} class="h-9 bg-white" />
					<Input bind:value={ctxPeriod} placeholder="period (e.g. 2025-Q4)" class="h-9 bg-white" />
				</div>
				<div class="mt-3">
					<Button size="sm" onclick={runPreview} disabled={resolving}>
						{#if resolving}
							<LoaderCircleIcon class="mr-1.5 h-3.5 w-3.5 animate-spin" />Resolving…
						{:else}
							Resolve
						{/if}
					</Button>
				</div>
			</div>
		{/if}

		{#if errorMsg}
			<div
				role="alert"
				class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
			>
				<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMsg}</span>
			</div>
		{/if}

		<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
			<Table.Root>
				<Table.Header class="bg-stone-50">
					<Table.Row class="hover:bg-transparent">
						<Table.Head class="{thCls} w-16">Order</Table.Head>
						<Table.Head class={thCls}>Particular</Table.Head>
						<Table.Head class="{thCls} w-24">Mode</Table.Head>
						<Table.Head class="{thCls} text-end">QTY</Table.Head>
						<Table.Head class="{thCls} text-end">Price</Table.Head>
						<Table.Head class="{thCls} hidden md:table-cell">Adjustment</Table.Head>
						<Table.Head class="{thCls} w-24 text-end">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each items as item, idx (item.id)}
						{@const dq = displayQty(item)}
						<Table.Row class="group hover:bg-amber-50/30">
							<Table.Cell>
								<div class="flex flex-col items-center gap-0.5">
									<button
										type="button"
										onclick={() => move(idx, -1)}
										disabled={idx === 0}
										class="text-gray-400 hover:text-gray-700 disabled:opacity-30"
										aria-label="Move up"
									>
										<ChevronUpIcon class="h-3.5 w-3.5" />
									</button>
									<span class="text-[10px] text-gray-500 tabular-nums">{idx + 1}</span>
									<button
										type="button"
										onclick={() => move(idx, 1)}
										disabled={idx === items.length - 1}
										class="text-gray-400 hover:text-gray-700 disabled:opacity-30"
										aria-label="Move down"
									>
										<ChevronDownIcon class="h-3.5 w-3.5" />
									</button>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex flex-col">
									<span class="font-semibold text-gray-900">{item.particularName}</span>
									{#if item.label}
										<span class="text-xs text-gray-500">{item.label}</span>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell>
								{#if item.mode === 'formula'}
									<Badge variant="secondary" class="bg-amber-50 text-amber-800">
										<ZapIcon class="mr-0.5 h-3 w-3" />Formula
									</Badge>
								{:else}
									<Badge variant="secondary">Static</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-end tabular-nums">
								{#if item.mode === 'formula'}
									<div class="flex flex-col items-end">
										<code class="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">
											{dq.label}
										</code>
										<span
											class="text-xs {dq.error ? 'text-red-600' : 'text-emerald-700'}"
											title={dq.error}
										>
											{dq.error ? 'unresolved' : `= ${dq.value}`}
										</span>
									</div>
								{:else}
									<span class="text-gray-700">{dq.value}</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-end text-gray-700 tabular-nums">
								₱{item.price.toFixed(2)}
							</Table.Cell>
							<Table.Cell class="hidden text-xs md:table-cell">
								{#if item.adjustmentDays != null}
									<span class="inline-flex items-center gap-1">
										<CalendarClockIcon
											class="h-3 w-3 {item.adjustmentDays < 0
												? 'text-red-600'
												: 'text-emerald-600'}"
										/>
										{item.adjustmentDays > 0 ? '+' : ''}{item.adjustmentDays}d
									</span>
								{:else}
									<span class="text-gray-400">—</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<div
									class="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100"
								>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-gray-500 hover:bg-amber-100"
										onclick={() => openEdit(item)}
										aria-label="Edit"
									>
										<PencilIcon class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-gray-500 hover:bg-red-100 hover:text-red-700"
										disabled={deletingId === item.id}
										onclick={() => handleDelete(item)}
										aria-label="Remove"
									>
										{#if deletingId === item.id}
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
							<Table.Cell colspan={7} class="py-16">
								<div class="mx-auto flex max-w-sm flex-col items-center text-center">
									<div
										class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
									>
										<InboxIcon class="h-6 w-6" />
									</div>
									<p class="font-semibold text-gray-900">No items yet</p>
									<p class="mt-1 text-sm text-gray-500">
										Add particulars to this memory and assign qty or formulas.
									</p>
									<Button class="mt-4 bg-red-700 text-white hover:bg-red-600" onclick={openAdd}>
										<PlusIcon class="mr-2 h-4 w-4" />Add Item
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</div>
</div>

<MemoryItemDialog
	bind:open={itemDialogOpen}
	item={editingItem}
	memoryId={memory.id}
	{particulars}
	{formulaKeys}
	medicines={data.medicines}
	onsave={handleSave}
/>
