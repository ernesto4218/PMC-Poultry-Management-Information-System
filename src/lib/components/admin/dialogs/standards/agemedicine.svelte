<script lang="ts">
	import { onMount } from 'svelte';
	import * as Table from '#lib/components/ui/table/index.js';
	import {
		PencilIcon,
		LoaderCircleIcon,
		AlertCircleIcon,
		PillIcon,
		SearchIcon,
		XIcon,
		ChevronRightIcon,
		DropletIcon
	} from '@lucide/svelte';
	import { Input } from '#lib/components/ui/input/index.ts';
	import AgeMedicineDialog from './dialogs/age_medicine_dialog.svelte';
	import {
		AGE_RANGES,
		type AgeMedicineItem,
		type Entry
	} from '#lib/types/standards/age-medicine/items.ts';

	let entries = $state<Entry[]>([]);
	let loading = $state(false);
	let errorMsg = $state('');
	let search = $state('');
	let expandedAges = $state<Set<string>>(new Set());

	let dialogOpen = $state(false);
	let editingAge = $state<string>('');
	let editingMedications = $state<AgeMedicineItem[]>([]);
	const PLAIN_WATER_AGE = '6';

	const map = $derived.by(() => {
		const m = new Map<string, Entry>();
		for (const e of entries) m.set(e.age, e);
		return m;
	});

	const ageRows = $derived(
		AGE_RANGES.map((age) => {
			const entry = map.get(age);
			return {
				age,
				entry: entry ?? null,
				medications: entry?.medications ?? [],
				updatedAt: entry?.updatedAt ?? null,
				isPlainWater: age === PLAIN_WATER_AGE
			};
		})
	);

	const filteredRows = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return ageRows;
		return ageRows.filter(
			(r) =>
				r.age.toLowerCase().includes(q) ||
				r.medications.some((m) => m.name.toLowerCase().includes(q))
		);
	});

	const setCount = $derived(entries.length);
	const totalMeds = $derived(entries.reduce((n, e) => n + e.medications.length, 0));

	async function load() {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/standard/age-medicine');
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? `Failed to load (HTTP ${res.status}).`);
			}
			entries = (await res.json()) as Entry[];
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not load schedule.';
		} finally {
			loading = false;
		}
	}

	onMount(load);

	function openEditor(age: string, entry: Entry | null) {
		editingAge = age;
		editingMedications = entry?.medications ?? [];
		dialogOpen = true;
	}

	async function saveMedication(medications: AgeMedicineItem[]) {
		const res = await fetch('/api/standard/age-medicine', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ age: editingAge, medications })
		});
		let result: { error?: string } | null = null;
		try {
			result = await res.json();
		} catch {
			/* empty body when cleared */
		}
		if (!res.ok) {
			throw new Error(result?.error ?? `Failed to save (HTTP ${res.status}).`);
		}
		await load();
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

	function toggleExpand(age: string) {
		const next = new Set(expandedAges);
		if (next.has(age)) next.delete(age);
		else next.add(age);
		expandedAges = next;
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
				<PillIcon class="h-5 w-5" />
			</span>
			<div class="flex flex-col leading-tight">
				<span class="text-sm font-semibold text-gray-900">Medication by age</span>
				<span class="text-xs text-gray-500">
					{AGE_RANGES.length} ages · {setCount} scheduled · {totalMeds}
					{totalMeds === 1 ? 'medicine' : 'medicines'}
				</span>
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
					placeholder="Search age or medication…"
					aria-label="Search schedule"
					autocomplete="off"
					class="h-10 w-full pr-9 pl-9 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0 sm:w-64 [&::-webkit-search-cancel-button]:hidden"
				/>
				{#if search}
					<button
						type="button"
						aria-label="Clear search"
						onclick={() => (search = '')}
						class="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
					>
						<XIcon class="h-4 w-4" />
					</button>
				{/if}
			</div>
			{#if loading}
				<LoaderCircleIcon class="h-4 w-4 animate-spin text-gray-400" aria-label="Loading" />
			{/if}
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

	<!-- Table -->
	<Table.Root>
		<Table.Header class="bg-gray-50/80">
			<Table.Row class="hover:bg-transparent">
				<Table.Head class="{headCls} w-32 pl-4">Age (days)</Table.Head>
				<Table.Head class={headCls}>Medication</Table.Head>
				<Table.Head class="{headCls} hidden md:table-cell">Last updated</Table.Head>
				<Table.Head class="{headCls} pr-4 text-end">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#if loading && entries.length === 0 && search === ''}
				{#each Array(6) as _}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={4} class="px-4 py-3">
							<div class="h-6 animate-pulse rounded bg-gray-100"></div>
						</Table.Cell>
					</Table.Row>
				{/each}
			{:else}
				{#each filteredRows as row (row.age)}
					{@const meds = row.medications}
					{@const isSet = meds.length > 0}
					{@const isExpanded = expandedAges.has(row.age)}

					<Table.Row
						class="transition-colors {isSet
							? 'hover:bg-red-50/30'
							: 'bg-gray-50/30 hover:bg-gray-100/50'}"
					>
						<Table.Cell class="pl-4">
							<button
								type="button"
								onclick={() => toggleExpand(row.age)}
								disabled={!isSet}
								class="flex items-center gap-1.5 rounded-md px-1 py-0.5 font-mono text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-default disabled:hover:bg-transparent"
								aria-expanded={isSet && isExpanded}
							>
								{#if isSet}
									<ChevronRightIcon
										class="h-4 w-4 text-gray-500 transition-transform {isExpanded
											? 'rotate-90'
											: ''}"
									/>
								{:else}
									<span class="w-4"></span>
								{/if}
								{row.age}
							</button>
						</Table.Cell>

						<Table.Cell>
							{#if row.isPlainWater}
								<span
									class="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-200 ring-inset"
								>
									<DropletIcon class="h-3 w-3" />
									Plain water
								</span>
							{:else if isSet}
								<div class="flex items-center gap-2">
									<span class="text-xs font-medium text-gray-700">
										{meds.length}
										{meds.length === 1 ? 'medicine' : 'medicines'}
									</span>
								</div>
								<div class="mt-1 flex flex-wrap gap-1">
									{#each meds as m (m.id)}
										<span
											class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 ring-inset"
										>
											<PillIcon class="h-3 w-3" />
											{m.name}
										</span>
									{/each}
								</div>
							{:else}
								<span class="text-xs text-gray-400 italic">Not set</span>
							{/if}
						</Table.Cell>

						<Table.Cell
							class="hidden text-sm text-gray-500 md:table-cell"
							title={formatFull(row.updatedAt)}
						>
							{#if row.updatedAt}
								<div class="flex flex-col leading-tight whitespace-nowrap">
									<span class="text-gray-700">{formatShort(row.updatedAt)}</span>
									<span class="text-xs text-gray-400">{formatTime(row.updatedAt)}</span>
								</div>
							{:else}
								—
							{/if}
						</Table.Cell>

						<Table.Cell class="pr-4 text-end">
							<button
								type="button"
								title={isSet ? 'Edit medications' : 'Set medications'}
								aria-label={isSet
									? `Edit medications for age ${row.age}`
									: `Set medications for age ${row.age}`}
								onclick={() => openEditor(row.age, row.entry)}
								class="{iconBtn} {isSet
									? 'hover:bg-gray-100 hover:text-gray-900'
									: 'text-red-700 hover:bg-red-50'}"
							>
								<PencilIcon class="h-4 w-4" />
							</button>
						</Table.Cell>
					</Table.Row>

					{#if isExpanded && isSet}
						<Table.Row class="hover:bg-transparent">
							<Table.Cell colspan={4} class="bg-gray-50/70 px-6 py-3">
								<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
									<table class="w-full text-xs">
										<thead class="bg-gray-50 text-gray-600">
											<tr class="border-b border-gray-200">
												<th class="px-3 py-2 text-left font-semibold">Medicine</th>
												<th class="px-2 py-2 text-left font-semibold">Area</th>
												<th class="px-2 py-2 text-right font-semibold">Value</th>
												<th class="px-2 py-2 text-left font-semibold">Unit</th>
												<th class="px-2 py-2 text-left font-semibold">AM</th>
												<th class="px-2 py-2 text-left font-semibold">AM-PM</th>
												<th class="px-2 py-2 text-left font-semibold">PM</th>
											</tr>
										</thead>
										<tbody>
											{#each meds as m (m.id)}
												<tr class="border-b border-gray-100 last:border-0">
													<td class="px-3 py-2 font-medium text-gray-900">{m.name}</td>
													<td class="px-2 py-2 text-gray-700">{m.areaName || '—'}</td>
													<td class="px-2 py-2 text-right font-mono text-gray-700 tabular-nums">
														{m.value.toFixed(2)}
													</td>
													<td class="px-2 py-2 text-gray-600">{m.unit || '—'}</td>
													<td class="px-2 py-2 text-gray-600">{m.amDuration || '—'}</td>
													<td class="px-2 py-2 text-gray-600">{m.amPmDuration || '—'}</td>
													<td class="px-2 py-2 text-gray-600">{m.pmDuration || '—'}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</Table.Cell>
						</Table.Row>
					{/if}
				{:else}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={4} class="py-14">
							<div class="flex flex-col items-center gap-2 text-center">
								<span class="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
									<PillIcon class="h-5 w-5 text-gray-400" />
								</span>
								<p class="text-sm font-medium text-gray-700">No matching ages</p>
								<p class="text-xs text-gray-500">Try a different search term.</p>
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
			{#if search.trim()}
				Showing {filteredRows.length} of {AGE_RANGES.length} ages
			{:else}
				Showing all {AGE_RANGES.length} ages
			{/if}
		</p>
		<p>
			<span class="font-medium text-gray-700 tabular-nums">{setCount}</span> scheduled ·
			<span class="font-medium text-gray-700 tabular-nums">{AGE_RANGES.length - setCount}</span>
			empty
		</p>
	</div>

	<AgeMedicineDialog
		bind:open={dialogOpen}
		age={editingAge}
		currentMedications={editingMedications}
		onsave={saveMedication}
	/>
</div>
