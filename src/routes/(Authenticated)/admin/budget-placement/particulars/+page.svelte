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
		InboxIcon,
		AlertCircleIcon,
		LoaderCircleIcon,
		ArrowUpIcon,
		ArrowDownIcon,
		PackageIcon
	} from '@lucide/svelte';
	import type { Particular, ParticularInput } from '#lib/types/particulars.ts';
	import ParticularDialog from '#lib/components/admin/dialogs/particulars/particular_dialog.svelte';

	let items = $state<Particular[]>([]);
	let loading = $state(false);
	let errorMsg = $state('');

	let dialogOpen = $state(false);
	let editingItem = $state<Particular | null>(null);
	let deletingId = $state<string | null>(null);

	let search = $state('');
	let sortValue = $state<'name-asc' | 'name-desc' | 'created-desc' | 'created-asc'>('name-asc');
	let pageSizeRaw = $state('10');
	let page = $state(1);
	const pageSize = $derived(Number(pageSizeRaw));

	const sortKey = $derived(sortValue.split('-')[0] as 'name' | 'created');
	const sortDir = $derived(sortValue.split('-')[1] === 'asc' ? 'asc' : 'desc');

	async function load() {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/particulars');
			if (!res.ok) throw new Error('Failed to load particulars.');
			items = await res.json();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not load particulars.';
		} finally {
			loading = false;
		}
	}
	onMount(load);

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const rows = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : [...items];
		rows.sort((a, b) => {
			const cmp =
				sortKey === 'name'
					? a.name.localeCompare(b.name)
					: new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
			return sortDir === 'asc' ? cmp : -cmp;
		});
		return rows;
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	const currentPage = $derived(Math.min(page, totalPages));
	const paginated = $derived(filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize));

	$effect(() => {
		void search;
		void sortValue;
		void pageSizeRaw;
		page = 1;
	});

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
		if (!res.ok) throw new Error(body.error ?? 'Failed to save particular.');
		await load();
		toast.success(`${isNew ? 'Added' : 'Updated'} ${payload.name}`);
	}

	async function handleDelete(p: Particular) {
		if (!confirm(`Delete “${p.name}”?`)) return;
		deletingId = p.id;
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

	function goToPage(p: number) {
		page = Math.max(1, Math.min(p, totalPages));
	}

	const thCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
</script>

<svelte:head><title>Particulars | Puting Manok Corporation</title></svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Standards</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Particulars</h1>
				<p class="mt-1 text-sm text-gray-500">
					Catalog of particulars. Quantities and formulas are assigned per memory.
				</p>
			</div>
			<div class="flex items-center gap-2">
				<a
					href="/admin/budget-placement/memories"
					class="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-stone-50"
				>
					Open Memories
				</a>
				<Button
					onclick={openAdd}
					class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-600"
				>
					<PlusIcon class="mr-2 h-4 w-4" />Add Particular
				</Button>
			</div>
		</div>

		<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-100 p-4">
				<div class="flex flex-wrap items-center gap-2">
					<div class="relative min-w-[220px] flex-1 sm:max-w-xs">
						<SearchIcon
							class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
						/>
						<Input
							bind:value={search}
							placeholder="Search particular name…"
							class="h-10 rounded-lg border-gray-300 pl-9 {inputCls}"
						/>
					</div>
					<Select.Root type="single" bind:value={sortValue}>
						<Select.Trigger class="h-10 w-[180px] rounded-lg border-gray-300 text-sm">
							<span class="flex items-center gap-1.5">
								{#if sortDir === 'asc'}
									<ArrowUpIcon class="h-3.5 w-3.5 text-gray-500" />
								{:else}
									<ArrowDownIcon class="h-3.5 w-3.5 text-gray-500" />
								{/if}
								{sortValue === 'name-asc'
									? 'Name (A–Z)'
									: sortValue === 'name-desc'
										? 'Name (Z–A)'
										: sortValue === 'created-desc'
											? 'Newest first'
											: 'Oldest first'}
							</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="name-asc">Name (A–Z)</Select.Item>
							<Select.Item value="name-desc">Name (Z–A)</Select.Item>
							<Select.Item value="created-desc">Newest first</Select.Item>
							<Select.Item value="created-asc">Oldest first</Select.Item>
						</Select.Content>
					</Select.Root>
					{#if search.trim()}
						<Button
							variant="ghost"
							class="h-10 text-gray-600 hover:text-red-700"
							onclick={() => (search = '')}
						>
							<XIcon class="mr-1 h-4 w-4" />Clear
						</Button>
					{/if}
				</div>
			</div>

			{#if errorMsg}
				<div
					role="alert"
					class="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
				>
					<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMsg}</span>
				</div>
			{/if}

			<Table.Root>
				<Table.Header class="bg-stone-50">
					<Table.Row class="hover:bg-transparent">
						<Table.Head class={thCls}>Name</Table.Head>
						<Table.Head class="{thCls} hidden md:table-cell">Added</Table.Head>
						<Table.Head class="w-24"><span class="sr-only">Actions</span></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if loading && items.length === 0}
						{#each Array(4) as _}
							<Table.Row class="hover:bg-transparent">
								<Table.Cell colspan={3} class="px-4 py-3">
									<div class="h-6 animate-pulse rounded bg-gray-100"></div>
								</Table.Cell>
							</Table.Row>
						{/each}
					{:else}
						{#each paginated as r (r.id)}
							<Table.Row class="group transition-colors hover:bg-amber-50/40">
								<Table.Cell class="font-semibold text-gray-900">{r.name}</Table.Cell>
								<Table.Cell class="hidden text-xs text-gray-500 md:table-cell">
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
											onclick={() => openEdit(r)}
											aria-label="Edit {r.name}"
										>
											<PencilIcon class="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-gray-500 hover:bg-red-100 hover:text-red-700"
											disabled={deletingId === r.id}
											onclick={() => handleDelete(r)}
											aria-label="Delete {r.name}"
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
								<Table.Cell colspan={3} class="py-16">
									<div class="mx-auto flex max-w-sm flex-col items-center text-center">
										<div
											class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
										>
											<PackageIcon class="h-6 w-6" />
										</div>
										{#if search.trim()}
											<p class="font-semibold text-gray-900">No matching particulars</p>
											<p class="mt-1 text-sm text-gray-500">Try a different search term.</p>
										{:else}
											<p class="font-semibold text-gray-900">No particulars yet</p>
											<p class="mt-1 text-sm text-gray-500">
												Add your first particular to get started.
											</p>
											<Button class="mt-4 bg-red-700 text-white hover:bg-red-600" onclick={openAdd}>
												<PlusIcon class="mr-2 h-4 w-4" />Add Particular
											</Button>
										{/if}
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>

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
							of <span class="font-semibold text-gray-700">{filtered.length}</span>
							{filtered.length === 1 ? 'particular' : 'particulars'}
						</span>
						<div class="flex items-center gap-2">
							<span class="text-gray-400">Rows per page</span>
							<Select.Root type="single" bind:value={pageSizeRaw}>
								<Select.Trigger class="h-8 w-[72px] rounded-md border-gray-300 text-xs">
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
							class="h-8 w-8"
							disabled={currentPage <= 1}
							onclick={() => goToPage(currentPage - 1)}
						>
							<ChevronLeftIcon class="h-4 w-4" />
						</Button>
						<span class="min-w-[80px] text-center text-xs font-medium text-gray-700">
							Page {currentPage} of {totalPages}
						</span>
						<Button
							variant="outline"
							size="icon"
							class="h-8 w-8"
							disabled={currentPage >= totalPages}
							onclick={() => goToPage(currentPage + 1)}
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
