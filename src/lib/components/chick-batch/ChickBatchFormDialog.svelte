<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import {
		BirdIcon,
		HashIcon,
		CalendarIcon,
		BuildingIcon,
		SearchIcon,
		ChevronDownIcon,
		CheckIcon,
		XIcon
	} from '@lucide/svelte';
	import { tick } from 'svelte';
	import {
		buildBatchNumber,
		emptyChickBatchForm,
		type ChickBatch,
		type ChickBatchForm
	} from '#lib/types/chick-batches.ts';
	import type { Farm } from '#lib/types/farms.ts';

	let {
		open = $bindable(false),
		batch = null,
		farms,
		batches,
		onsave
	}: {
		open?: boolean;
		batch?: ChickBatch | null;
		farms: Farm[];
		batches: ChickBatch[];
		onsave: (data: ChickBatchForm & { id?: string }) => void | Promise<void>;
	} = $props();

	// ---- Farm type color coding ----------------------------------------
	const TYPE_STYLES: Record<string, string> = {
		CCS: 'bg-blue-50 text-blue-700 ring-blue-200',
		CON: 'bg-red-50 text-red-700 ring-red-200'
	};
	const TYPE_ACCENT: Record<string, string> = {
		CCS: 'border-l-blue-500',
		CON: 'border-l-red-500'
	};
	const FALLBACK_STYLE = 'bg-stone-50 text-gray-600 ring-stone-200';
	const FALLBACK_ACCENT = 'border-l-stone-300';

	const typeStyle = (t?: string) => TYPE_STYLES[t ?? ''] ?? FALLBACK_STYLE;
	const typeAccent = (t?: string) => TYPE_ACCENT[t ?? ''] ?? FALLBACK_ACCENT;

	/**
	 * Max chicks that can be assigned to a farm.
	 * ASSUMPTION: Farm has a numeric `volume` field. Change this one function
	 * if the field is named differently (e.g. `capacity`).
	 */
	function farmLimit(f: Farm | null): number | null {
		if (!f) return null;
		const v = Number((f as unknown as { volume?: number }).volume);
		return Number.isFinite(v) ? v : null;
	}
	// ---------------------------------------------------------------------

	let form = $state<ChickBatchForm>(emptyChickBatchForm());
	let saving = $state(false);
	let submitError = $state('');

	// ---- Farm picker state ---------------------------------------------
	type SortKey = 'name' | 'volume-desc' | 'volume-asc';

	let farmPickerOpen = $state(false);
	let farmSearch = $state('');
	let typeFilter = $state<string>('ALL');
	let fitsOnly = $state(false);
	let sortBy = $state<SortKey>('name');
	let farmPickerEl: HTMLDivElement;
	let farmSearchEl: HTMLInputElement | undefined = $state();

	function resetFilters() {
		farmSearch = '';
		typeFilter = 'ALL';
		fitsOnly = false;
		sortBy = 'name';
	}

	$effect(() => {
		if (open) {
			form = batch
				? { farmId: batch.farmId, dateSet: batch.dateSet, volume: batch.volume }
				: emptyChickBatchForm();
			submitError = '';
			farmPickerOpen = false;
			resetFilters();
		}
	});

	$effect(() => {
		if (farmPickerOpen) {
			tick().then(() => farmSearchEl?.focus());
		}
	});

	const isEdit = $derived(batch !== null);
	const selectedFarm = $derived(farms.find((f) => f.id === form.farmId) ?? null);
	const maxVolume = $derived(farmLimit(selectedFarm));
	const volumeNum = $derived(Number(form.volume));
	const volumeTooHigh = $derived(
		maxVolume !== null && form.volume !== ('' as unknown) && volumeNum > maxVolume
	);

	/** Distinct farm types present in the data, with counts. */
	const typeOptions = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const f of farms) {
			if (f.type) counts.set(f.type, (counts.get(f.type) ?? 0) + 1);
		}
		return [...counts.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([type, count]) => ({ type, count }));
	});

	/** "Fits volume" filter only makes sense once a valid volume is typed. */
	const canFilterFits = $derived(Number.isFinite(volumeNum) && volumeNum > 0);

	const filteredFarms = $derived.by(() => {
		const q = farmSearch.trim().toLowerCase();

		let list = farms.filter((f) => {
			if (typeFilter !== 'ALL' && f.type !== typeFilter) return false;

			if (fitsOnly && canFilterFits) {
				const limit = farmLimit(f);
				if (limit === null || limit < volumeNum) return false;
			}

			if (!q) return true;
			return (
				f.name.toLowerCase().includes(q) ||
				f.code.toLowerCase().includes(q) ||
				f.address.toLowerCase().includes(q) ||
				(f.type ?? '').toLowerCase().includes(q)
			);
		});

		list = [...list].sort((a, b) => {
			if (sortBy === 'name') return a.name.localeCompare(b.name);
			const av = farmLimit(a) ?? -1;
			const bv = farmLimit(b) ?? -1;
			return sortBy === 'volume-desc' ? bv - av : av - bv;
		});

		return list;
	});

	const hasActiveFilters = $derived(
		farmSearch.trim() !== '' || typeFilter !== 'ALL' || fitsOnly || sortBy !== 'name'
	);

	function toggleFarmPicker() {
		farmPickerOpen = !farmPickerOpen;
	}

	function selectFarm(id: string) {
		form.farmId = id;
		farmPickerOpen = false;
	}

	function onWindowClick(e: MouseEvent) {
		if (!farmPickerOpen) return;
		if (farmPickerEl && !farmPickerEl.contains(e.target as Node)) {
			farmPickerOpen = false;
		}
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && farmPickerOpen) {
			farmPickerOpen = false;
		}
	}
	// ---------------------------------------------------------------------

	const previewBatchNumber = $derived.by(() => {
		if (!selectedFarm || !form.dateSet) return '';
		if (batch && batch.farmId === form.farmId && batch.dateSet === form.dateSet) {
			return batch.batchNumber;
		}
		const maxSeq = batches
			.filter((b) => b.farmId === form.farmId && b.dateSet === form.dateSet)
			.reduce((m, b) => Math.max(m, b.sequence), 0);
		return buildBatchNumber(selectedFarm.code, form.dateSet, maxSeq + 1);
	});

	const canSave = $derived(
		form.farmId !== '' &&
			form.dateSet !== '' &&
			Number.isInteger(volumeNum) &&
			volumeNum > 0 &&
			!volumeTooHigh
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving) return;

		saving = true;
		submitError = '';

		try {
			await onsave({
				...(batch ? { id: batch.id } : {}),
				farmId: form.farmId,
				dateSet: form.dateSet,
				volume: Number(form.volume)
			});
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save the batch.';
		} finally {
			saving = false;
		}
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
	const chipBase =
		'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none';
	const chipIdle = 'bg-white text-gray-600 ring-gray-200 hover:bg-stone-50';
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<Dialog.Root bind:open>
	<Dialog.Content class="border-t-4 border-t-red-700 sm:max-w-[520px]">
		<Dialog.Header>
			<Dialog.Title class="text-xl font-bold text-gray-900">
				{isEdit ? 'Edit chick batch' : 'Add chick batch'}
			</Dialog.Title>
			<Dialog.Description>
				{isEdit
					? "Update this batch's farm, date set, or volume."
					: 'Select a farm and assign how many chicks to set.'}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="space-y-4 py-2">
			<div class="flex items-center gap-2 border-b border-gray-100 pb-2">
				<BirdIcon class="h-4 w-4 text-red-700" />
				<h3 class="text-sm font-semibold text-gray-900">Batch details</h3>
			</div>

			<!-- Farm — searchable + filterable picker -->
			<div class="space-y-2">
				<Label for="farm-trigger">Farm <span class="text-red-600">*</span></Label>

				<div class="relative" bind:this={farmPickerEl}>
					<button
						id="farm-trigger"
						type="button"
						onclick={toggleFarmPicker}
						aria-haspopup="listbox"
						aria-expanded={farmPickerOpen}
						class="flex h-12 w-full items-center justify-between gap-2 rounded-md border border-l-4 border-gray-300 bg-white px-3 text-left text-sm shadow-xs transition-colors hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none {selectedFarm
							? typeAccent(selectedFarm.type)
							: 'border-l-gray-300'}"
					>
						{#if selectedFarm}
							<span class="flex min-w-0 flex-1 flex-col leading-tight">
								<span class="truncate font-medium text-gray-900">{selectedFarm.name}</span>
								<span class="truncate text-xs text-gray-500">
									{selectedFarm.code}
									{#if selectedFarm.address}
										· {selectedFarm.address}
									{/if}
								</span>
							</span>
							{#if selectedFarm.type}
								<span
									class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset {typeStyle(
										selectedFarm.type
									)}"
								>
									{selectedFarm.type}
								</span>
							{/if}
						{:else}
							<span class="text-gray-500">Select a farm</span>
						{/if}
						<ChevronDownIcon
							class="h-4 w-4 shrink-0 text-gray-400 transition-transform {farmPickerOpen
								? 'rotate-180'
								: ''}"
						/>
					</button>

					{#if farmPickerOpen}
						<div
							class="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
						>
							<!-- Search + filters -->
							<div class="space-y-2 border-b border-gray-100 p-2">
								<div class="relative">
									<SearchIcon
										class="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400"
									/>
									<Input
										bind:this={farmSearchEl}
										bind:value={farmSearch}
										placeholder="Search name, code, address, or type…"
										class="h-9 rounded-md border-gray-300 pr-8 pl-8 text-sm {inputCls}"
										aria-label="Search farms"
									/>
									{#if farmSearch}
										<button
											type="button"
											onclick={() => {
												farmSearch = '';
												farmSearchEl?.focus();
											}}
											aria-label="Clear search"
											class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
										>
											<XIcon class="h-3.5 w-3.5" />
										</button>
									{/if}
								</div>

								<!-- Type chips + fits-volume chip -->
								<div class="flex flex-wrap items-center gap-1.5">
									<button
										type="button"
										onclick={() => (typeFilter = 'ALL')}
										aria-pressed={typeFilter === 'ALL'}
										class="{chipBase} {typeFilter === 'ALL'
											? 'bg-gray-900 text-white ring-gray-900'
											: chipIdle}"
									>
										All
										<span class="opacity-70">{farms.length}</span>
									</button>

									{#each typeOptions as opt (opt.type)}
										<button
											type="button"
											onclick={() => (typeFilter = typeFilter === opt.type ? 'ALL' : opt.type)}
											aria-pressed={typeFilter === opt.type}
											class="{chipBase} {typeFilter === opt.type ? typeStyle(opt.type) : chipIdle}"
										>
											{opt.type}
											<span class="opacity-70">{opt.count}</span>
										</button>
									{/each}

									<span class="mx-0.5 h-4 w-px bg-gray-200" aria-hidden="true"></span>

									<button
										type="button"
										onclick={() => (fitsOnly = !fitsOnly)}
										disabled={!canFilterFits}
										aria-pressed={fitsOnly}
										title={canFilterFits
											? 'Only farms with enough volume'
											: 'Enter a volume first to use this filter'}
										class="{chipBase} disabled:cursor-not-allowed disabled:opacity-50 {fitsOnly &&
										canFilterFits
											? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
											: chipIdle}"
									>
										{#if fitsOnly && canFilterFits}
											<CheckIcon class="h-3 w-3" />
										{/if}
										Fits {canFilterFits ? volumeNum.toLocaleString() : 'volume'}
									</button>
								</div>

								<!-- Sort + result count -->
								<div class="flex items-center justify-between gap-2 text-[11px] text-gray-500">
									<span aria-live="polite">
										{filteredFarms.length} of {farms.length} farm{farms.length === 1 ? '' : 's'}
									</span>
									<div class="flex items-center gap-2">
										{#if hasActiveFilters}
											<button
												type="button"
												onclick={resetFilters}
												class="font-medium text-red-700 hover:underline"
											>
												Reset
											</button>
										{/if}
										<label class="flex items-center gap-1">
											<span>Sort</span>
											<select
												bind:value={sortBy}
												class="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] text-gray-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
											>
												<option value="name">Name A–Z</option>
												<option value="volume-desc">Volume high → low</option>
												<option value="volume-asc">Volume low → high</option>
											</select>
										</label>
									</div>
								</div>
							</div>

							<ul class="max-h-56 overflow-y-auto py-1" role="listbox">
								{#each filteredFarms as f (f.id)}
									{@const isSelected = f.id === form.farmId}
									{@const limit = farmLimit(f)}
									<li role="option" aria-selected={isSelected}>
										<button
											type="button"
											onclick={() => selectFarm(f.id)}
											class="flex w-full items-center gap-2 border-l-4 px-3 py-2 text-left transition-colors {typeAccent(
												f.type
											)} {isSelected ? 'bg-amber-50' : 'hover:bg-stone-50'}"
										>
											<div class="flex min-w-0 flex-1 flex-col">
												<span class="truncate text-sm font-medium text-gray-900">{f.name}</span>
												<span class="truncate text-xs text-gray-500">
													{f.address || '—'}
												</span>
											</div>
											{#if limit !== null}
												<span class="shrink-0 text-xs text-gray-500 tabular-nums">
													Volume: {limit.toLocaleString()}
												</span>
											{/if}
											{#if f.type}
												<span
													class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset {typeStyle(
														f.type
													)}"
												>
													{f.type}
												</span>
											{/if}
											<span
												class="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600"
											>
												{f.code}
											</span>
											{#if isSelected}
												<CheckIcon class="h-4 w-4 shrink-0 text-red-700" />
											{/if}
										</button>
									</li>
								{:else}
									<li class="px-3 py-6 text-center text-sm text-gray-500">
										{#if hasActiveFilters}
											No farms match the current filters
											<button
												type="button"
												onclick={resetFilters}
												class="mt-1 block w-full text-xs font-medium text-red-700 hover:underline"
											>
												Reset filters
											</button>
										{:else}
											No farms available
										{/if}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>

				{#if selectedFarm && !farmPickerOpen}
					<p class="flex items-center gap-1 text-xs text-gray-500">
						<BuildingIcon class="h-3 w-3" />
						{selectedFarm.address || 'No address on file'}
					</p>
				{/if}
			</div>

			<!-- Date set + Volume -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<Label for="dateSet" class="flex items-center gap-1">
						<CalendarIcon class="h-3.5 w-3.5 text-gray-500" />
						Date set <span class="text-red-600">*</span>
					</Label>
					<Input id="dateSet" type="date" bind:value={form.dateSet} required class={inputCls} />
				</div>

				<div class="space-y-2">
					<Label for="volume" class="flex items-center gap-1">
						<HashIcon class="h-3.5 w-3.5 text-gray-500" />
						Volume <span class="text-red-600">*</span>
					</Label>
					<Input
						id="volume"
						type="number"
						min="1"
						max={maxVolume ?? undefined}
						step="1"
						bind:value={form.volume}
						placeholder={selectedFarm ? 'e.g. 500' : 'Select a farm first'}
						disabled={!selectedFarm}
						required
						aria-invalid={volumeTooHigh}
						class="{inputCls} {volumeTooHigh ? 'border-red-500 focus-visible:ring-red-500' : ''}"
					/>
					{#if selectedFarm && maxVolume !== null}
						<p class="text-xs {volumeTooHigh ? 'font-medium text-red-600' : 'text-gray-500'}">
							{#if volumeTooHigh}
								Exceeds farm volume — max {maxVolume.toLocaleString()}
							{:else}
								Max {maxVolume.toLocaleString()} for {selectedFarm.name}
							{/if}
						</p>
					{/if}
				</div>
			</div>

			<!-- Batch number preview -->
			{#if previewBatchNumber}
				<div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
					<p class="text-[10px] font-semibold tracking-wider text-amber-800 uppercase">
						Batch number
					</p>
					<p class="mt-0.5 font-mono text-sm font-semibold text-amber-900">
						{previewBatchNumber}
					</p>
					{#if isEdit && batch && batch.batchNumber !== previewBatchNumber}
						<p class="mt-1 text-[11px] text-amber-700">
							Will replace previous <span class="font-mono">{batch.batchNumber}</span>
						</p>
					{/if}
				</div>
			{/if}

			{#if submitError}
				<div
					role="alert"
					class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
				>
					{submitError}
				</div>
			{/if}

			<Dialog.Footer class="flex justify-end gap-2 border-t border-gray-100 pt-4">
				<Dialog.Close
					type="button"
					disabled={saving}
					class={buttonVariants({ variant: 'outline' })}
				>
					Cancel
				</Dialog.Close>
				<Button
					type="submit"
					disabled={!canSave || saving || farms.length === 0}
					class="bg-red-700 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
				>
					{#if saving}
						Saving…
					{:else}
						{isEdit ? 'Save changes' : 'Add batch'}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
