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
		CheckIcon
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

	let form = $state<ChickBatchForm>(emptyChickBatchForm());
	let saving = $state(false);
	let submitError = $state('');

	// ---- Farm picker state ---------------------------------------------
	let farmPickerOpen = $state(false);
	let farmSearch = $state('');
	let farmPickerEl: HTMLDivElement;
	let farmSearchEl: HTMLInputElement | undefined = $state();

	// Reset the picker whenever the dialog opens / closes.
	$effect(() => {
		if (open) {
			form = batch
				? { farmId: batch.farmId, dateSet: batch.dateSet, volume: batch.volume }
				: emptyChickBatchForm();
			submitError = '';
			farmPickerOpen = false;
			farmSearch = '';
		}
	});

	// Focus the search box when the picker opens.
	$effect(() => {
		if (farmPickerOpen) {
			tick().then(() => farmSearchEl?.focus());
		}
	});

	const isEdit = $derived(batch !== null);
	const selectedFarm = $derived(farms.find((f) => f.id === form.farmId) ?? null);

	/** Filter farms by name / code / address. */
	const filteredFarms = $derived.by(() => {
		const q = farmSearch.trim().toLowerCase();
		if (!q) return farms;
		return farms.filter(
			(f) =>
				f.name.toLowerCase().includes(q) ||
				f.code.toLowerCase().includes(q) ||
				f.address.toLowerCase().includes(q)
		);
	});

	function toggleFarmPicker() {
		farmPickerOpen = !farmPickerOpen;
		if (!farmPickerOpen) farmSearch = '';
	}

	function selectFarm(id: string) {
		form.farmId = id;
		farmPickerOpen = false;
		farmSearch = '';
	}

	function onWindowClick(e: MouseEvent) {
		if (!farmPickerOpen) return;
		if (farmPickerEl && !farmPickerEl.contains(e.target as Node)) {
			farmPickerOpen = false;
			farmSearch = '';
		}
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && farmPickerOpen) {
			farmPickerOpen = false;
			farmSearch = '';
		}
	}
	// ---------------------------------------------------------------------

	// Live preview of the batch number the server will assign
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
			Number.isInteger(Number(form.volume)) &&
			Number(form.volume) > 0
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
					: 'Register a new batch of day-old chicks.'}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="space-y-4 py-2">
			<div class="flex items-center gap-2 border-b border-gray-100 pb-2">
				<BirdIcon class="h-4 w-4 text-red-700" />
				<h3 class="text-sm font-semibold text-gray-900">Batch details</h3>
			</div>

			<!-- Farm — searchable picker --------------------------------- -->
			<div class="space-y-2">
				<Label for="farm-trigger">Farm <span class="text-red-600">*</span></Label>

				<div class="relative" bind:this={farmPickerEl}>
					<button
						id="farm-trigger"
						type="button"
						onclick={toggleFarmPicker}
						aria-haspopup="listbox"
						aria-expanded={farmPickerOpen}
						class="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 text-left text-sm shadow-xs transition-colors hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
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
							<!-- Search -->
							<div class="border-b border-gray-100 p-2">
								<div class="relative">
									<SearchIcon
										class="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400"
									/>
									<Input
										bind:this={farmSearchEl}
										bind:value={farmSearch}
										placeholder="Search name, code, or address…"
										class="h-9 rounded-md border-gray-300 pl-8 text-sm {inputCls}"
										aria-label="Search farms"
									/>
								</div>
							</div>

							<!-- Results -->
							<ul class="max-h-60 overflow-y-auto py-1" role="listbox">
								{#each filteredFarms as f (f.id)}
									{@const isSelected = f.id === form.farmId}
									<li role="option" aria-selected={isSelected}>
										<button
											type="button"
											onclick={() => selectFarm(f.id)}
											class="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors {isSelected
												? 'bg-amber-50'
												: 'hover:bg-stone-50'}"
										>
											<div class="flex min-w-0 flex-1 flex-col">
												<span class="truncate text-sm font-medium text-gray-900">{f.name}</span>
												<span class="truncate text-xs text-gray-500">
													{f.address || '—'}
												</span>
											</div>
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
										{#if farmSearch.trim()}
											No farms match "{farmSearch.trim()}"
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
						step="1"
						bind:value={form.volume}
						placeholder="e.g. 500"
						required
						class={inputCls}
					/>
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
