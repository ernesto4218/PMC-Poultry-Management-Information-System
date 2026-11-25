<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import {
		PlusIcon,
		SearchIcon,
		PencilIcon,
		Trash2Icon,
		LayersIcon,
		AlertCircleIcon,
		LoaderCircleIcon,
		InboxIcon,
		ArrowRightIcon,
		ArrowLeftIcon,
		CopyIcon,
		Building2Icon
	} from '@lucide/svelte';
	import MemoryDialog from './dialogs/memory_dialog.svelte';
	import type { ParticularMemory, ParticularMemoryInput } from '#lib/types/particulars.ts';
	import MemoryDuplicateDialog from './dialogs/memory_duplicate_dialog.svelte';
	import MemoryDeleteDialog from './dialogs/memory_delete_dialog.svelte';

	let memories = $state<ParticularMemory[]>([]);
	let loading = $state(false);
	let errorMsg = $state('');
	let search = $state('');
	let dialogOpen = $state(false);
	let editing = $state<ParticularMemory | null>(null);
	let deleteOpen = $state(false);
	let deleteTarget = $state<ParticularMemory | null>(null);

	let dupOpen = $state(false);
	let dupSource = $state<ParticularMemory | null>(null);

	async function load() {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/particulars-memories');
			if (!res.ok) throw new Error('Failed to load memories.');
			memories = await res.json();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not load memories.';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return q
			? memories.filter(
					(m) => m.name.toLowerCase().includes(q) || m.notes.toLowerCase().includes(q)
				)
			: memories;
	});

	function openDuplicate(m: ParticularMemory) {
		dupSource = m;
		dupOpen = true;
	}

	function openAdd() {
		editing = null;
		dialogOpen = true;
	}

	function openEdit(m: ParticularMemory) {
		editing = m;
		dialogOpen = true;
	}

	function openDelete(m: ParticularMemory) {
		deleteTarget = m;
		deleteOpen = true;
	}

	async function handleSave(payload: ParticularMemoryInput) {
		const isNew = !memories.some((m) => m.id === payload.id);
		const res = await fetch('/api/particulars-memories', {
			method: isNew ? 'POST' : 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(body.error ?? 'Failed to save memory.');
		await load();
		toast.success(`${isNew ? 'Created' : 'Updated'} ${payload.name}`);
	}

	async function handleDuplicate(payload: { name: string; notes: string }) {
		if (!dupSource) throw new Error('No source memory selected.');
		const res = await fetch(`/api/particulars-memories/${dupSource.id}/duplicate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(body.error ?? 'Failed to duplicate memory.');
		await load();
		toast.success(`Duplicated as "${payload.name}"`);
	}

	async function handleDeleteConfirm() {
		if (!deleteTarget) return;
		const m = deleteTarget;
		try {
			const res = await fetch('/api/particulars-memories', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: m.id })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? 'Failed to delete.');
			}
			await load();
			toast.success(`Deleted ${m.name}`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Could not delete memory.';
			errorMsg = msg;
			toast.error(msg);
			throw err; // keep dialog open
		}
	}
</script>

<svelte:head><title>Memories | Puting Manok Corporation</title></svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<a
					href="/admin/budget-placement/particulars"
					class="inline-flex items-center gap-1 text-xs font-semibold tracking-wider text-red-700 uppercase hover:underline"
				>
					<ArrowLeftIcon class="h-3 w-3" /> Particulars
				</a>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Memories</h1>
				<p class="mt-1 text-sm text-gray-500">
					Bundles of particulars with their own quantities and formulas.
				</p>
			</div>
			<div class="flex items-center gap-2">
				<div class="relative min-w-[220px] flex-1 sm:max-w-xs">
					<SearchIcon
						class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
					/>
					<Input bind:value={search} placeholder="Search memories…" class="h-10 pl-9" />
				</div>
				<Button
					onclick={openAdd}
					class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-600"
				>
					<PlusIcon class="mr-2 h-4 w-4" />New Memory
				</Button>
			</div>
		</div>

		{#if errorMsg}
			<div
				role="alert"
				class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
			>
				<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMsg}</span>
			</div>
		{/if}

		{#if loading && memories.length === 0}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{#each Array(4) as _}
					<div class="h-40 animate-pulse rounded-xl border border-gray-200 bg-white"></div>
				{/each}
			</div>
		{:else if filtered.length === 0}
			<div
				class="flex flex-col items-center rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm"
			>
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
				>
					<InboxIcon class="h-6 w-6" />
				</div>
				{#if search.trim()}
					<p class="font-semibold text-gray-900">No matching memories</p>
					<p class="mt-1 text-sm text-gray-500">Try a different search term.</p>
				{:else}
					<p class="font-semibold text-gray-900">No memories yet</p>
					<p class="mt-1 text-sm text-gray-500">Create your first memory to bundle particulars.</p>
					<Button class="mt-4 bg-red-700 text-white hover:bg-red-600" onclick={openAdd}>
						<PlusIcon class="mr-2 h-4 w-4" />New Memory
					</Button>
				{/if}
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{#each filtered as m (m.id)}
					<div
						class="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
					>
						<div class="flex items-start justify-between gap-2">
							<div class="flex items-center gap-2">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-700"
								>
									<LayersIcon class="h-4 w-4" />
								</div>
								<div>
									<h3 class="text-base font-bold text-gray-900">{m.name}</h3>
									<p class="text-xs text-gray-500">
										{m.itemCount} item{m.itemCount === 1 ? '' : 's'}
									</p>
								</div>
							</div>
							<div class="flex gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7 text-gray-500 hover:bg-blue-100 hover:text-blue-700"
									onclick={() => openDuplicate(m)}
									aria-label="Duplicate {m.name}"
								>
									<CopyIcon class="h-3.5 w-3.5" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7 text-gray-500 hover:bg-amber-100 hover:text-amber-800"
									onclick={() => openEdit(m)}
									aria-label="Edit {m.name}"
								>
									<PencilIcon class="h-3.5 w-3.5" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7 text-gray-500 hover:bg-red-100 hover:text-red-700"
									onclick={() => openDelete(m)}
									aria-label="Delete {m.name}"
								>
									<Trash2Icon class="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
						{#if m.usedByFarms.length > 0}
							<div class="mt-3">
								<div
									class="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase"
								>
									<Building2Icon class="h-3 w-3" />
									Used by {m.usedByFarms.length}
									farm{m.usedByFarms.length === 1 ? '' : 's'}
								</div>
								<div class="mt-1.5 flex flex-wrap gap-1">
									{#each m.usedByFarms.slice(0, 3) as f (f.id)}
										<span
											class="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-gray-700"
											title={f.code}
										>
											{f.code}
										</span>
									{/each}
									{#if m.usedByFarms.length > 3}
										{@const rest = m.usedByFarms.slice(3)}
										<span
											class="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-gray-500"
											title={rest.map((f) => f.name).join(', ')}
										>
											+{rest.length} more
										</span>
									{/if}
								</div>
							</div>
						{:else}
							<p class="mt-3 flex items-center gap-1 text-xs text-gray-400 italic">
								<Building2Icon class="h-3 w-3" /> Not used by any farm
							</p>
						{/if}
						{#if m.notes}
							<p class="mt-3 line-clamp-2 text-sm text-gray-600">{m.notes}</p>
						{/if}
						<a
							href="/admin/budget-placement/memories/{m.id}"
							class="mt-4 flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-stone-100"
						>
							<span>Open builder</span>
							<ArrowRightIcon class="h-4 w-4 text-red-700" />
						</a>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<MemoryDialog bind:open={dialogOpen} item={editing} onsave={handleSave} />
<MemoryDuplicateDialog bind:open={dupOpen} source={dupSource} onsave={handleDuplicate} />
<MemoryDeleteDialog bind:open={deleteOpen} memory={deleteTarget} onconfirm={handleDeleteConfirm} />
