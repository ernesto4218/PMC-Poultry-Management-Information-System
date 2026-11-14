<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Table from '#lib/components/ui/table/index.js';
	import {
		PlusIcon,
		PencilIcon,
		ArchiveIcon,
		ArchiveRestoreIcon,
		LoaderCircleIcon,
		AlertCircleIcon,
		PillIcon,
		SearchIcon,
		XIcon
	} from '@lucide/svelte';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { goto } from '$app/navigation';
	import type { StandardMedication } from '#lib/types/standards/medications/items.ts';
	import StandardDialog from '../../../../../routes/api/standard/medication/[id]/dialogs/standard_dialog.svelte';

	let items = $state<StandardMedication[]>([]);
	let loading = $state(false);
	let errorMsg = $state('');
	let view = $state<'active' | 'archived'>('active');
	let search = $state('');
	let actionBusy = $state<string | null>(null);

	let dialogOpen = $state(false);
	let editing = $state<StandardMedication | null>(null);

	const visible = $derived(items.filter((i) => (view === 'active' ? !i.isArchived : i.isArchived)));
	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return visible;
		return visible.filter(
			(i) => i.name.toLowerCase().includes(q) || i.notes.toLowerCase().includes(q)
		);
	});
	const activeCount = $derived(items.filter((i) => !i.isArchived).length);
	const archivedCount = $derived(items.filter((i) => i.isArchived).length);

	async function load() {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/standard/medication-standard?archived=1');
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? `Failed to load (HTTP ${res.status}).`);
			}
			items = await res.json();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not load standards.';
		} finally {
			loading = false;
		}
	}
	onMount(load);

	function openAdd() {
		editing = null;
		dialogOpen = true;
	}
	function openEdit(s: StandardMedication) {
		editing = s;
		dialogOpen = true;
	}

	async function handleSave(data: { id?: string; name: string; notes: string }) {
		const isNew = !data.id;
		const res = await fetch('/api/standard/medication-standard', {
			method: isNew ? 'POST' : 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		let result: { error?: string } | null = null;
		try {
			result = await res.json();
		} catch {
			/* noop */
		}
		if (!res.ok) throw new Error(result?.error ?? `Failed to save (HTTP ${res.status}).`);
		await load();
	}

	async function toggleArchive(s: StandardMedication) {
		if (actionBusy) return;
		actionBusy = s.id;
		try {
			const res = await fetch('/api/standard/medication-standard', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: s.id, action: s.isArchived ? 'restore' : 'archive' })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? 'Failed.');
			}
			await load();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not update.';
		} finally {
			actionBusy = null;
		}
	}

	function openDetail(s: StandardMedication) {
		goto(`/standards/medication/${s.id}`);
	}

	function formatShort(v?: string | null) {
		if (!v) return '—';
		const d = new Date(v);
		if (Number.isNaN(d.getTime())) return '—';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const iconBtn =
		'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';
	const headCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
</script>

<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
		<div class="inline-flex rounded-lg bg-gray-100 p-1" role="tablist">
			{#each [{ key: 'active', label: 'Active', count: activeCount }, { key: 'archived', label: 'Archived', count: archivedCount }] as tab (tab.key)}
				{@const selected = view === tab.key}
				<button
					type="button"
					role="tab"
					aria-selected={selected}
					onclick={() => (view = tab.key as 'active' | 'archived')}
					class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium
						{selected ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
				>
					{tab.label}
					<span
						class="min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums
						{selected ? 'bg-red-50 text-red-700' : 'bg-gray-200 text-gray-600'}"
					>
						{tab.count}
					</span>
				</button>
			{/each}
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<div class="relative">
				<SearchIcon
					class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
				/>
				<Input
					type="search"
					bind:value={search}
					placeholder="Search standards…"
					aria-label="Search standards"
					class="h-10 w-full pr-9 pl-9 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0 sm:w-64 [&::-webkit-search-cancel-button]:hidden"
				/>
				{#if search}
					<button
						type="button"
						aria-label="Clear search"
						onclick={() => (search = '')}
						class="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100"
					>
						<XIcon class="h-4 w-4" />
					</button>
				{/if}
			</div>
			{#if loading && items.length > 0}
				<LoaderCircleIcon class="h-4 w-4 animate-spin text-gray-400" />
			{/if}
			<Button
				onclick={openAdd}
				class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white hover:bg-red-600"
			>
				<PlusIcon class="mr-2 h-4 w-4" /> Add Standard
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

	<Table.Root>
		<Table.Header class="bg-gray-50/80">
			<Table.Row class="hover:bg-transparent">
				<Table.Head class="{headCls} pl-4">Name</Table.Head>
				<Table.Head class="{headCls} hidden md:table-cell">Notes</Table.Head>
				<Table.Head class="{headCls} text-center">Farms</Table.Head>
				<Table.Head class="{headCls} hidden lg:table-cell">Updated</Table.Head>
				{#if view === 'archived'}
					<Table.Head class={headCls}>Archived on</Table.Head>
				{/if}
				<Table.Head class="{headCls} pr-4 text-end">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#if loading && items.length === 0}
				{#each Array(4) as _}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={view === 'archived' ? 6 : 5} class="px-4 py-3">
							<div class="h-6 animate-pulse rounded bg-gray-100"></div>
						</Table.Cell>
					</Table.Row>
				{/each}
			{:else}
				{#each filtered as s (s.id)}
					<Table.Row class="transition-colors hover:bg-red-50/30">
						<Table.Cell class="pl-4">
							<button
								type="button"
								onclick={() => openDetail(s)}
								class="text-left font-medium text-gray-900 hover:text-red-700"
							>
								{s.name}
							</button>
						</Table.Cell>
						<Table.Cell class="hidden max-w-xs truncate text-sm text-gray-500 md:table-cell">
							{s.notes || '—'}
						</Table.Cell>
						<Table.Cell class="text-center">
							{#if s.farmCount && s.farmCount > 0}
								<span
									class="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
								>
									{s.farmCount}
								</span>
							{:else}
								<span class="text-xs text-gray-400">—</span>
							{/if}
						</Table.Cell>
						<Table.Cell class="hidden text-sm text-gray-500 lg:table-cell">
							{formatShort(s.updatedAt)}
						</Table.Cell>
						{#if view === 'archived'}
							<Table.Cell class="text-sm text-gray-500">
								{formatShort(s.archivedAt)}
							</Table.Cell>
						{/if}
						<Table.Cell class="pr-4 text-end">
							<div class="inline-flex items-center gap-0.5">
								{#if !s.isArchived}
									<button
										type="button"
										title="Edit"
										aria-label="Edit {s.name}"
										onclick={() => openEdit(s)}
										class={iconBtn}
									>
										<PencilIcon class="h-4 w-4" />
									</button>
								{/if}
								{#if s.isArchived}
									<button
										type="button"
										title="Restore"
										disabled={actionBusy === s.id}
										onclick={() => toggleArchive(s)}
										class="{iconBtn} text-emerald-700 hover:bg-emerald-50"
									>
										{#if actionBusy === s.id}
											<LoaderCircleIcon class="h-4 w-4 animate-spin" />
										{:else}
											<ArchiveRestoreIcon class="h-4 w-4" />
										{/if}
									</button>
								{:else}
									<button
										type="button"
										title="Archive"
										disabled={actionBusy === s.id}
										onclick={() => toggleArchive(s)}
										class="{iconBtn} text-amber-700 hover:bg-amber-50"
									>
										{#if actionBusy === s.id}
											<LoaderCircleIcon class="h-4 w-4 animate-spin" />
										{:else}
											<ArchiveIcon class="h-4 w-4" />
										{/if}
									</button>
								{/if}
							</div>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={view === 'archived' ? 6 : 5} class="py-14">
							<div class="flex flex-col items-center gap-2 text-center">
								<span class="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
									<PillIcon class="h-5 w-5 text-gray-400" />
								</span>
								<p class="text-sm font-medium text-gray-700">
									{search.trim()
										? 'No matching standards'
										: view === 'active'
											? 'No active standards'
											: 'No archived standards'}
								</p>
								<p class="text-xs text-gray-500">
									{view === 'active'
										? search.trim()
											? 'Try a different search term.'
											: 'Click "Add Standard" to create one.'
										: 'Archived standards can be restored from here.'}
								</p>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			{/if}
		</Table.Body>
	</Table.Root>

	<div class="border-t border-gray-100 bg-gray-50/60 px-4 py-2.5 text-xs text-gray-500">
		Showing <span class="font-medium text-gray-700 tabular-nums">{filtered.length}</span>
		of <span class="font-medium text-gray-700 tabular-nums">{visible.length}</span>
		{view}
		{visible.length === 1 ? 'standard' : 'standards'}
	</div>

	<StandardDialog bind:open={dialogOpen} standard={editing} onsave={handleSave} />
</div>
