<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import {
		PillIcon,
		DropletIcon,
		AlertCircleIcon,
		LoaderCircleIcon,
		SearchIcon,
		CheckIcon,
		XIcon,
		RefreshCwIcon
	} from '@lucide/svelte';
	import type { AgeMedicineItem } from '#lib/types/standards/age-medicine/items.ts';
	import type { Item as Medicine } from '#lib/types/standards/medicines/items.ts';

	/** Age 6 is reserved for plain water — no medications allowed. */
	const PLAIN_WATER_AGE = '6';

	let {
		open = $bindable(false),
		age,
		currentMedications = [],
		onsave
	}: {
		open?: boolean;
		age: string;
		currentMedications?: AgeMedicineItem[];
		onsave: (medications: AgeMedicineItem[]) => void | Promise<void>;
	} = $props();

	let selected = $state<AgeMedicineItem[]>([]);
	let saving = $state(false);
	let submitError = $state('');

	let medicines = $state<Medicine[]>([]);
	let loading = $state(false);
	let loaded = $state(false);
	let errorMsg = $state('');

	const isPlainWater = $derived(age === PLAIN_WATER_AGE);

	async function loadMedicines() {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/standard/medicines');
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? `Failed to load medicines (HTTP ${res.status}).`);
			}
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
			selected = [...currentMedications];
			submitError = '';
			search = '';
			if (!isPlainWater && !loaded) loadMedicines();
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

	const canSave = $derived(
		isPlainWater
			? currentMedications.length > 0
			: selected.length > 0 || currentMedications.length > 0
	);

	function snapshot(m: Medicine): AgeMedicineItem {
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
		if (selectedIds.has(m.id)) {
			selected = selected.filter((x) => x.id !== m.id);
		} else {
			selected = [...selected, snapshot(m)];
		}
	}

	function remove(id: string) {
		selected = selected.filter((x) => x.id !== id);
	}

	function clearAll() {
		selected = [];
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (saving) return;
		// Plain water always saves an empty medication list (clears any leftovers).
		const payload = isPlainWater ? [] : selected;
		saving = true;
		submitError = '';
		try {
			await onsave(payload);
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save.';
		} finally {
			saving = false;
		}
	}

	const isClearing = $derived(
		!isPlainWater && currentMedications.length > 0 && selected.length === 0
	);
	const labelCls = 'text-sm font-medium text-gray-700';
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="min-w-3xl gap-0 overflow-y-auto border-t-4 border-t-red-700 p-0">
		<Dialog.Header class="border-b border-gray-100 px-6 pt-5 pb-4">
			<Dialog.Title class="flex items-center gap-3 text-lg font-semibold text-gray-900">
				<span
					class="flex h-9 w-9 items-center justify-center rounded-lg {isPlainWater
						? 'bg-blue-50 text-blue-600'
						: 'bg-red-50 text-red-700'}"
				>
					{#if isPlainWater}
						<DropletIcon class="h-5 w-5" />
					{:else}
						<PillIcon class="h-5 w-5" />
					{/if}
				</span>
				<span class="flex flex-col leading-tight">
					<span>{isPlainWater ? 'Plain water day' : 'Set medications'}</span>
					<span class="text-sm font-normal text-gray-500">
						{#if isPlainWater}
							Age {age} · no medications
						{:else}
							Age {age} · {selected.length}
							{selected.length === 1 ? 'medicine' : 'medicines'} selected
						{/if}
					</span>
				</span>
			</Dialog.Title>
			<Dialog.Description class="sr-only">
				{isPlainWater
					? `Age ${age} is reserved for plain water only.`
					: `Pick one or more medicines for birds at age ${age}.`}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="flex flex-col">
			{#if isPlainWater}
				<!-- Plain water view -->
				<div class="space-y-4 px-6 py-5">
					<div class="rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-5 text-center">
						<span
							class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100"
						>
							<DropletIcon class="h-6 w-6 text-blue-600" />
						</span>
						<p class="mt-3 text-base font-semibold text-blue-900">Plain water only</p>
						<p class="mt-1 text-sm text-blue-700">
							Day 6 is reserved for plain water. No medications are administered on this day.
						</p>
					</div>

					{#if currentMedications.length > 0}
						<div
							class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
						>
							<p class="font-semibold">Existing medications detected</p>
							<p class="mt-1 text-xs">
								Age 6 currently has {currentMedications.length}
								{currentMedications.length === 1 ? 'medicine' : 'medicines'} saved:
							</p>
							<ul class="mt-2 space-y-0.5 text-xs">
								{#each currentMedications as m (m.id)}
									<li>• {m.name}</li>
								{/each}
							</ul>
							<p class="mt-2 text-xs">Saving will clear these.</p>
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
			{:else}
				<!-- Normal medication picker -->
				<div class="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
					<!-- Selected medications -->
					<div class="space-y-1.5">
						<div class="flex items-center justify-between">
							<Label class={labelCls}>Selected</Label>
							{#if selected.length > 0}
								<button
									type="button"
									onclick={clearAll}
									class="inline-flex items-center gap-1 text-xs text-amber-700 underline hover:no-underline"
								>
									<XIcon class="h-3 w-3" /> Clear all
								</button>
							{/if}
						</div>

						{#if selected.length === 0}
							<p
								class="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500 italic"
							>
								None yet — pick from the list below.
							</p>
						{:else}
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
												<td class="px-2 py-1.5 text-right font-mono text-gray-700 tabular-nums">
													{m.value.toFixed(2)}
												</td>
												<td class="px-2 py-1.5 text-gray-600">{m.unit || '—'}</td>
												<td class="px-2 py-1.5 text-gray-600">{m.amDuration || '—'}</td>
												<td class="px-2 py-1.5 text-gray-600">{m.amPmDuration || '—'}</td>
												<td class="px-2 py-1.5 text-gray-600">{m.pmDuration || '—'}</td>
												<td class="pr-2 text-right">
													<button
														type="button"
														onclick={() => remove(m.id)}
														aria-label="Remove {m.name}"
														class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-700"
													>
														<XIcon class="h-3 w-3" />
													</button>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>

					<!-- Search -->
					<div class="relative">
						<SearchIcon
							class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
						/>
						<Input
							type="search"
							bind:value={search}
							placeholder="Search medicine, area, or unit…"
							aria-label="Search medicines"
							autocomplete="off"
							class="h-10 w-full pr-9 pl-9 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0"
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

					<div class="rounded-lg border border-gray-200 bg-white">
						{#if loading}
							<div class="flex items-center gap-2 px-4 py-6 text-sm text-gray-500">
								<LoaderCircleIcon class="h-4 w-4 animate-spin" /> Loading medicines…
							</div>
						{:else if errorMsg}
							<div class="flex items-start gap-2 px-4 py-3 text-sm text-red-700">
								<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" />
								<span>{errorMsg}</span>
								<button
									type="button"
									onclick={loadMedicines}
									class="inline-flex items-center gap-0.5 underline hover:no-underline"
								>
									<RefreshCwIcon class="h-3 w-3" /> Retry
								</button>
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
							<ul
								class="max-h-64 divide-y divide-gray-100 overflow-y-auto"
								role="listbox"
								aria-multiselectable="true"
							>
								{#each filtered as m (m.id)}
									{@const isSelected = selectedIds.has(m.id)}
									<li role="option" aria-selected={isSelected}>
										<label
											class="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors {isSelected
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
											{#if isSelected}
												<CheckIcon class="h-4 w-4 shrink-0 text-emerald-600" />
											{/if}
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
							<span>Saving with nothing selected will clear the schedule for age {age}.</span>
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
			{/if}

			<Dialog.Footer
				class="mb-2 flex w-full items-end gap-2 border-t border-gray-100 bg-gray-50/60"
			>
				<div class="flex gap-2">
					<Dialog.Close
						type="button"
						disabled={saving}
						class={buttonVariants({ variant: 'outline' })}
					>
						{isPlainWater ? 'Close' : 'Cancel'}
					</Dialog.Close>

					{#if isPlainWater}
						{#if currentMedications.length > 0}
							<Button
								type="submit"
								disabled={saving}
								class="bg-blue-600 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
							>
								{#if saving}
									<LoaderCircleIcon class="mr-1.5 h-4 w-4 animate-spin" />
									Clearing…
								{:else}
									Clear medications
								{/if}
							</Button>
						{/if}
					{:else}
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
								Clear schedule
							{:else}
								Save {selected.length}
								{selected.length === 1 ? 'medicine' : 'medicines'}
							{/if}
						</Button>
					{/if}
				</div>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
