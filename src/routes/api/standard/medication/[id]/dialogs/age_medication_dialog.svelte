<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import {
		PillIcon,
		StickyNoteIcon,
		AlertCircleIcon,
		LoaderCircleIcon,
		SearchIcon,
		CheckIcon,
		XIcon,
		RefreshCwIcon
	} from '@lucide/svelte';
	import type { MedicationSnapshot } from '#lib/types/standards/medications/items.ts';
	import type { Item as Medicine } from '#lib/types/standards/medicines/items.ts';

	let {
		open = $bindable(false),
		age,
		currentNote = '',
		currentMedications = [],
		onsave
	}: {
		open?: boolean;
		age: string;
		currentNote?: string;
		currentMedications?: MedicationSnapshot[];
		onsave: (note: string, medications: MedicationSnapshot[]) => void | Promise<void>;
	} = $props();

	let note = $state('');
	let selected = $state<MedicationSnapshot[]>([]);
	let saving = $state(false);
	let submitError = $state('');

	let medicines = $state<Medicine[]>([]);
	let loading = $state(false);
	let loaded = $state(false);
	let errorMsg = $state('');

	async function loadMedicines() {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/standard/medicines');
			if (!res.ok) throw new Error(`Failed to load (HTTP ${res.status}).`);
			const data = (await res.json()) as Medicine[];
			medicines = [...data].sort(
				(a, b) => a.areaName.localeCompare(b.areaName) || a.itemName.localeCompare(b.itemName)
			);
			loaded = true;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not load medicines.';
		} finally {
			loading = false;
		}
	}

	let search = $state('');

	$effect(() => {
		if (open) {
			note = currentNote;
			selected = [...currentMedications];
			submitError = '';
			search = '';
			if (!loaded) loadMedicines();
		}
	});

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return medicines;
		return medicines.filter(
			(m) =>
				m.itemName.toLowerCase().includes(q) ||
				m.areaName.toLowerCase().includes(q) ||
				m.unit.toLowerCase().includes(q)
		);
	});

	const selectedIds = $derived(new Set(selected.map((m) => m.id)));

	function snapshot(m: Medicine): MedicationSnapshot {
		return {
			id: m.id,
			name: m.itemName,
			areaName: m.areaName,
			value: m.value,
			unit: m.unit,
			amDuration: m.amDuration,
			amPmDuration: m.amPmDuration,
			pmDuration: m.pmDuration
		};
	}

	function toggle(m: Medicine) {
		if (selectedIds.has(m.id)) selected = selected.filter((x) => x.id !== m.id);
		else selected = [...selected, snapshot(m)];
	}

	function remove(id: string) {
		selected = selected.filter((x) => x.id !== id);
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (saving) return;
		saving = true;
		submitError = '';
		try {
			await onsave(note.trim(), selected);
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save.';
		} finally {
			saving = false;
		}
	}

	const isEmpty = $derived(note.trim() === '' && selected.length === 0);
	const isClearing = $derived((currentNote !== '' || currentMedications.length > 0) && isEmpty);
	const canSave = $derived(!isEmpty || currentNote !== '' || currentMedications.length > 0);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="min-w-3xl gap-0 overflow-y-auto border-t-4 border-t-red-700 p-0">
		<Dialog.Header class="border-b border-gray-100 px-6 pt-5 pb-4">
			<Dialog.Title class="flex items-center gap-3 text-lg font-semibold text-gray-900">
				<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
					<PillIcon class="h-5 w-5" />
				</span>
				<span class="flex flex-col leading-tight">
					<span>Age {age}</span>
					<span class="text-sm font-normal text-gray-500">
						{selected.length}
						{selected.length === 1 ? 'medicine' : 'medicines'} · {note ? '1' : '0'} note
					</span>
				</span>
			</Dialog.Title>
		</Dialog.Header>

		<form onsubmit={submit} class="flex flex-col">
			<div class="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
				<!-- Note -->
				<div class="space-y-1.5">
					<Label for="note" class="text-sm font-medium text-gray-700">Note (optional)</Label>
					<Input
						id="note"
						bind:value={note}
						placeholder="e.g. Plain water, Fasting day, Vaccination"
						maxlength={200}
						autocomplete="off"
						class="h-10 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0"
					/>
					<p class="text-xs text-gray-500">
						Shown instead of (or alongside) medications — e.g. "Plain water".
					</p>
				</div>

				<!-- Selected -->
				{#if selected.length > 0}
					<div class="space-y-1.5">
						<Label class="text-sm font-medium text-gray-700">Selected medicines</Label>
						<div class="overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50/40">
							<table class="w-full text-xs">
								<thead class="border-b border-emerald-200 bg-emerald-50 text-emerald-900">
									<tr>
										<th class="px-3 py-1.5 text-left font-semibold">Medicine</th>
										<th class="px-2 py-1.5 text-left font-semibold">Area</th>
										<th class="px-2 py-1.5 text-right font-semibold">Value</th>
										<th class="px-2 py-1.5 text-left font-semibold">Unit</th>
										<th class="px-2 py-1.5 text-left font-semibold">AM</th>
										<th class="px-2 py-1.5 text-left font-semibold">AM-PM</th>
										<th class="px-2 py-1.5 text-left font-semibold">PM</th>
										<th class="w-8"></th>
									</tr>
								</thead>
								<tbody>
									{#each selected as m (m.id)}
										<tr class="border-b border-emerald-100 last:border-0">
											<td class="px-3 py-1.5 font-medium text-gray-900">{m.name}</td>
											<td class="px-2 py-1.5 text-gray-700">{m.areaName || '—'}</td>
											<td class="px-2 py-1.5 text-right font-mono text-gray-700 tabular-nums"
												>{m.value.toFixed(2)}</td
											>
											<td class="px-2 py-1.5 text-gray-600">{m.unit || '—'}</td>
											<td class="px-2 py-1.5 text-gray-600">{m.amDuration || '—'}</td>
											<td class="px-2 py-1.5 text-gray-600">{m.amPmDuration || '—'}</td>
											<td class="px-2 py-1.5 text-gray-600">{m.pmDuration || '—'}</td>
											<td class="pr-2 text-right">
												<button
													type="button"
													onclick={() => remove(m.id)}
													class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-700"
													aria-label="Remove {m.name}"
												>
													<XIcon class="h-3 w-3" />
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				<!-- Picker -->
				<div class="relative">
					<SearchIcon
						class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
					/>
					<Input
						type="search"
						bind:value={search}
						placeholder="Search medicine, area, or unit…"
						class="h-10 w-full pr-9 pl-9 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0"
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

				<div class="rounded-lg border border-gray-200 bg-white">
					{#if loading}
						<div class="flex items-center gap-2 px-4 py-6 text-sm text-gray-500">
							<LoaderCircleIcon class="h-4 w-4 animate-spin" /> Loading…
						</div>
					{:else if errorMsg}
						<div class="flex items-start gap-2 px-4 py-3 text-sm text-red-700">
							<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" />
							<span>{errorMsg}</span>
							<button type="button" onclick={loadMedicines} class="underline">Retry</button>
						</div>
					{:else if filtered.length === 0}
						<div class="px-4 py-6 text-center text-sm text-gray-500">
							{#if search.trim()}
								No medicines match "{search.trim()}".
							{:else}
								No medicines yet. Add some from the Medicines page first.
							{/if}
						</div>
					{:else}
						<ul class="max-h-64 divide-y divide-gray-100 overflow-y-auto">
							{#each filtered as m (m.id)}
								{@const isSelected = selectedIds.has(m.id)}
								<li>
									<label
										class="flex cursor-pointer items-center gap-3 px-3 py-2 {isSelected
											? 'bg-emerald-50/60'
											: 'hover:bg-stone-50'}"
									>
										<input
											type="checkbox"
											checked={isSelected}
											onchange={() => toggle(m)}
											class="h-4 w-4 rounded border-gray-300 text-red-700 focus:ring-red-500"
										/>
										<div class="flex min-w-0 flex-1 flex-col">
											<span class="truncate text-sm font-medium text-gray-900">{m.itemName}</span>
											<span class="truncate text-xs text-gray-500">
												{m.areaName} · {m.value.toFixed(2)}
												{m.unit}
											</span>
										</div>
										{#if isSelected}<CheckIcon class="h-4 w-4 text-emerald-600" />{/if}
									</label>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				{#if isClearing}
					<div
						role="alert"
						class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
					>
						<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" />
						<span>Saving with no note and no medicines will clear age {age}.</span>
					</div>
				{/if}

				{#if submitError}
					<div
						role="alert"
						class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
					>
						<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" />
						<span>{submitError}</span>
					</div>
				{/if}
			</div>

			<Dialog.Footer
				class="mb-2 flex w-full items-end gap-2 border-t border-gray-100 bg-gray-50/60"
			>
				<div class="flex gap-2">
					<Dialog.Close
						type="button"
						disabled={saving}
						class={buttonVariants({ variant: 'outline' })}
					>
						Cancel
					</Dialog.Close>
					<Button
						type="submit"
						disabled={!canSave || saving}
						class="{isClearing
							? 'bg-amber-600'
							: 'bg-red-700'} font-semibold text-white hover:opacity-90 disabled:opacity-50"
					>
						{#if saving}
							<LoaderCircleIcon class="mr-1.5 h-4 w-4 animate-spin" />
							Saving…
						{:else if isClearing}
							Clear age
						{:else}
							Save
						{/if}
					</Button>
				</div>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
