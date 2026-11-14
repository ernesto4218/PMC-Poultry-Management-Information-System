<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import * as Table from '#lib/components/ui/table/index.js';
	import {
		PencilIcon,
		LoaderCircleIcon,
		AlertCircleIcon,
		PillIcon,
		SearchIcon,
		XIcon,
		ChevronRightIcon,
		ChevronLeftIcon,
		StickyNoteIcon
	} from '@lucide/svelte';
	import { Input } from '#lib/components/ui/input/index.ts';
	import AgeDialog from './dialogs/age_medication_dialog.svelte';
	import {
		AGE_RANGES,
		type AgeEntry,
		type MedicationSnapshot,
		type StandardMedication
	} from '#lib/types/standards/medications/items.ts';

	let standard = $state<StandardMedication | null>(null);
	let ages = $state<AgeEntry[]>([]);
	let loading = $state(false);
	let errorMsg = $state('');
	let search = $state('');
	let expandedAges = $state<Set<string>>(new Set());

	let dialogOpen = $state(false);
	let editingAge = $state('');
	let editingNote = $state('');
	let editingMedications = $state<MedicationSnapshot[]>([]);

	const standardId = $derived($page.params.id ?? '');

	const map = $derived.by(() => {
		const m = new Map<string, AgeEntry>();
		for (const a of ages) m.set(a.age, a);
		return m;
	});

	const ageRows = $derived(
		AGE_RANGES.map((age) => {
			const entry = map.get(age);
			return {
				age,
				entry: entry ?? null,
				note: entry?.note ?? '',
				medications: entry?.medications ?? [],
				updatedAt: entry?.updatedAt ?? null
			};
		})
	);

	const filteredRows = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return ageRows;
		return ageRows.filter(
			(r) =>
				r.age.toLowerCase().includes(q) ||
				r.note.toLowerCase().includes(q) ||
				r.medications.some((m) => m.name.toLowerCase().includes(q))
		);
	});

	const setCount = $derived(ages.length);
	const totalMeds = $derived(ages.reduce((n, a) => n + a.medications.length, 0));

	async function load() {
		if (!standardId) return;
		loading = true;
		errorMsg = '';
		try {
			const [stdRes, agesRes] = await Promise.all([
				fetch('/api/standard/medication-standard?archived=1'),
				fetch(`/api/standard/medication-standard/ages?standardId=${standardId}`)
			]);
			if (!stdRes.ok) throw new Error(`Failed to load standard (HTTP ${stdRes.status}).`);
			if (!agesRes.ok) throw new Error(`Failed to load ages (HTTP ${agesRes.status}).`);
			const all = (await stdRes.json()) as StandardMedication[];
			standard = all.find((s) => s.id === standardId) ?? null;
			ages = (await agesRes.json()) as AgeEntry[];
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not load.';
		} finally {
			loading = false;
		}
	}
	onMount(load);

	function openEditor(age: string, entry: AgeEntry | null) {
		editingAge = age;
		editingNote = entry?.note ?? '';
		editingMedications = entry?.medications ?? [];
		dialogOpen = true;
	}

	async function saveAge(note: string, medications: MedicationSnapshot[]) {
		const res = await fetch('/api/standard/medication-standard/ages', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ standardId, age: editingAge, note, medications })
		});
		let result: { error?: string } | null = null;
		try {
			result = await res.json();
		} catch {
			/* empty body when cleared */
		}
		if (!res.ok) throw new Error(result?.error ?? `Failed to save (HTTP ${res.status}).`);
		await load();
	}

	function formatShort(v?: string | null) {
		if (!v) return '—';
		const d = new Date(v);
		if (Number.isNaN(d.getTime())) return '—';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
	function formatTime(v?: string | null) {
		if (!v) return '';
		const d = new Date(v);
		if (Number.isNaN(d.getTime())) return '';
		return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}
	function formatFull(v?: string | null) {
		if (!v) return '';
		const d = new Date(v);
		if (Number.isNaN(d.getTime())) return '';
		return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
	}

	function toggleExpand(age: string) {
		const next = new Set(expandedAges);
		next.has(age) ? next.delete(age) : next.add(age);
		expandedAges = next;
	}

	const iconBtn =
		'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';
	const headCls = 'text-xs font-semibold tracking-wide text-gray-500 uppercase';
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => goto('/standards/medication')}
				class="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
				aria-label="Back to standards"
			>
				<ChevronLeftIcon class="h-4 w-4" />
			</button>
			<div class="flex flex-col leading-tight">
				<h1 class="text-lg font-semibold text-gray-900">
					{standard?.name ?? 'Standard'}
				</h1>
				<p class="text-xs text-gray-500">
					{standard?.notes || 'Medication standard'} · {setCount} of {AGE_RANGES.length}
					ages set · {totalMeds}
					{totalMeds === 1 ? 'medicine' : 'medicines'}
				</p>
			</div>
		</div>
	</div>

	{#if errorMsg}
		<div
			role="alert"
			class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
		>
			<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" />
			<span>{errorMsg}</span>
		</div>
	{/if}

	<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
		<div
			class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3"
		>
			<div class="relative">
				<SearchIcon
					class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
				/>
				<Input
					type="search"
					bind:value={search}
					placeholder="Search age, note, or medication…"
					aria-label="Search schedule"
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
			{#if loading}
				<LoaderCircleIcon class="h-4 w-4 animate-spin text-gray-400" />
			{/if}
		</div>

		<Table.Root>
			<Table.Header class="bg-gray-50/80">
				<Table.Row class="hover:bg-transparent">
					<Table.Head class="{headCls} w-32 pl-4">Age (days)</Table.Head>
					<Table.Head class={headCls}>Medication / note</Table.Head>
					<Table.Head class="{headCls} hidden md:table-cell">Last updated</Table.Head>
					<Table.Head class="{headCls} pr-4 text-end">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each filteredRows as row (row.age)}
					{@const meds = row.medications}
					{@const hasContent = meds.length > 0 || row.note !== ''}
					{@const isExpanded = expandedAges.has(row.age)}

					<Table.Row
						class="transition-colors {hasContent
							? 'hover:bg-red-50/30'
							: 'bg-gray-50/30 hover:bg-gray-100/50'}"
					>
						<Table.Cell class="pl-4">
							<button
								type="button"
								onclick={() => toggleExpand(row.age)}
								disabled={!hasContent || meds.length === 0}
								class="flex items-center gap-1.5 rounded-md px-1 py-0.5 font-mono text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-default disabled:hover:bg-transparent"
								aria-expanded={hasContent && isExpanded}
							>
								{#if hasContent && meds.length > 0}
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
							{#if row.note}
								<div
									class="mb-1 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-200 ring-inset"
								>
									<StickyNoteIcon class="h-3 w-3" />
									{row.note}
								</div>
							{/if}
							{#if meds.length > 0}
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
							{:else if !row.note}
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
								title={hasContent ? 'Edit' : 'Set'}
								aria-label={hasContent ? `Edit age ${row.age}` : `Set age ${row.age}`}
								onclick={() => openEditor(row.age, row.entry)}
								class="{iconBtn} {hasContent ? '' : 'text-red-700 hover:bg-red-50'}"
							>
								<PencilIcon class="h-4 w-4" />
							</button>
						</Table.Cell>
					</Table.Row>

					{#if isExpanded && meds.length > 0}
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
													<td class="px-2 py-2 text-right font-mono text-gray-700 tabular-nums"
														>{m.value.toFixed(2)}</td
													>
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
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<AgeDialog
		bind:open={dialogOpen}
		age={editingAge}
		currentNote={editingNote}
		currentMedications={editingMedications}
		onsave={saveAge}
	/>
</div>
