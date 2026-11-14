<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import {
		PackageIcon,
		AlertCircleIcon,
		LoaderCircleIcon,
		RefreshCwIcon,
		BuildingIcon,
		SearchIcon,
		ChevronDownIcon,
		CheckIcon
	} from '@lucide/svelte';
	import { tick } from 'svelte';
	import * as Select from '#lib/components/ui/select/index.ts';
	import * as NativeSelect from '#lib/components/ui/native-select/index.js';

	type Farm = { id: string; name: string; code: string; type?: string; address?: string };

	type Item = {
		id: string;
		itemName: string;
		farmCode: string;
		category: string;
		perThousand: number;
		standardPerFarm: number;
		unit: string;
	};

	type ItemForm = {
		itemName: string;
		farmCode: string;
		category: string;
		customCategory: string;
		perThousand: string;
		standardPerFarm: string;
		unit: string;
		customUnit: string;
	};

	const OTHER = 'Other';
	const categories = ['SUPPLIES', 'FEEDS', 'EQUIPMENT', 'CLEANING', 'PACKAGING', OTHER];
	const units = [
		'pcs',
		'kg',
		'g',
		'L',
		'mL',
		'box',
		'pack',
		'bag',
		'sack',
		'bottle',
		'vial',
		'roll',
		OTHER
	];

	function emptyItemForm(): ItemForm {
		return {
			itemName: '',
			farmCode: '',
			category: '',
			customCategory: '',
			perThousand: '',
			standardPerFarm: '',
			unit: '',
			customUnit: ''
		};
	}

	function itemToForm(item: Item): ItemForm {
		const catKnown =
			item.category !== '' && item.category !== OTHER && categories.includes(item.category);
		const unitKnown = item.unit !== '' && item.unit !== OTHER && units.includes(item.unit);
		return {
			itemName: item.itemName,
			farmCode: item.farmCode,
			category: catKnown ? item.category : OTHER,
			customCategory: catKnown ? '' : item.category,
			perThousand: String(item.perThousand),
			standardPerFarm: String(item.standardPerFarm),
			unit: unitKnown ? item.unit : OTHER,
			customUnit: unitKnown ? '' : item.unit
		};
	}

	let {
		open = $bindable(false),
		item = null,
		items,
		onsave
	}: {
		open?: boolean;
		item?: Item | null;
		items: Item[];
		onsave: (item: Item) => void | Promise<void>;
	} = $props();

	let form = $state<ItemForm>(emptyItemForm());
	let saving = $state(false);
	let submitError = $state('');

	// ---- Farms (source of the Farm Code options) ------------------------
	let farms = $state<Farm[]>([]);
	let farmsLoading = $state(false);
	let farmsLoaded = $state(false);
	let farmsError = $state('');

	async function loadFarms() {
		farmsLoading = true;
		farmsError = '';
		try {
			const res = await fetch('/api/farms');
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? `Failed to load farms (HTTP ${res.status}).`);
			}
			const data = (await res.json()) as Farm[];
			farms = [...data].sort((a, b) => a.code.localeCompare(b.code));
			farmsLoaded = true;
		} catch (err) {
			farmsError = err instanceof Error ? err.message : 'Could not load farms.';
		} finally {
			farmsLoading = false;
		}
	}

	// ---- Farm picker state ---------------------------------------------
	let farmPickerOpen = $state(false);
	let farmSearch = $state('');
	let farmPickerEl: HTMLDivElement;
	let farmSearchEl: HTMLInputElement | undefined = $state();

	// Reset form + picker when the dialog opens.
	$effect(() => {
		if (open) {
			form = item ? itemToForm(item) : emptyItemForm();
			submitError = '';
			farmPickerOpen = false;
			farmSearch = '';
			if (!farmsLoaded && !farmsLoading) loadFarms();
		}
	});

	// Focus the search input when the picker opens.
	$effect(() => {
		if (farmPickerOpen) {
			tick().then(() => farmSearchEl?.focus());
		}
	});

	const isEdit = $derived(item !== null);
	const others = $derived(items.filter((i) => i.id !== item?.id));

	const selectedFarm = $derived(farms.find((f) => f.code === form.farmCode) ?? null);

	const filteredFarms = $derived.by(() => {
		const q = farmSearch.trim().toLowerCase();
		if (!q) return farms;
		return farms.filter(
			(f) =>
				f.name.toLowerCase().includes(q) ||
				f.code.toLowerCase().includes(q) ||
				(f.address ?? '').toLowerCase().includes(q)
		);
	});

	// Code is stored but the farm it references is no longer in the list.
	const codeMissingFromList = $derived(
		form.farmCode !== '' && farmsLoaded && !farms.some((f) => f.code === form.farmCode)
	);

	function toggleFarmPicker() {
		if (farmsLoading) return;
		farmPickerOpen = !farmPickerOpen;
		if (!farmPickerOpen) farmSearch = '';
	}

	function selectFarm(code: string) {
		form.farmCode = code;
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
	// --------------------------------------------------------------------

	const duplicateItem = $derived(
		form.itemName.trim() !== '' &&
			form.farmCode.trim() !== '' &&
			others.some(
				(i) =>
					i.itemName.toLowerCase() === form.itemName.trim().toLowerCase() &&
					i.farmCode.toLowerCase() === form.farmCode.trim().toLowerCase()
			)
	);

	const resolvedCategory = $derived(
		form.category === OTHER ? form.customCategory.trim() : form.category
	);
	const resolvedUnit = $derived(form.unit === OTHER ? form.customUnit.trim() : form.unit);

	const perThousandText = $derived(String(form.perThousand ?? '').trim());
	const perThousandValue = $derived(Number(perThousandText));
	const perThousandValid = $derived(
		perThousandText !== '' && Number.isFinite(perThousandValue) && perThousandValue >= 0
	);

	const standardPerFarmText = $derived(String(form.standardPerFarm ?? '').trim());
	const standardPerFarmValue = $derived(Number(standardPerFarmText));
	const standardPerFarmValid = $derived(
		standardPerFarmText !== '' && Number.isFinite(standardPerFarmValue) && standardPerFarmValue >= 0
	);

	const canSave = $derived(
		form.itemName.trim() !== '' &&
			form.farmCode.trim() !== '' &&
			resolvedCategory !== '' &&
			resolvedUnit !== '' &&
			perThousandValid &&
			standardPerFarmValid &&
			!duplicateItem
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving) return;

		saving = true;
		submitError = '';

		try {
			await onsave({
				id: item?.id ?? crypto.randomUUID(),
				itemName: form.itemName.trim(),
				farmCode: form.farmCode.trim(),
				category: resolvedCategory,
				perThousand: perThousandValue,
				standardPerFarm: standardPerFarmValue,
				unit: resolvedUnit
			});
			open = false;
		} catch (err) {
			submitError =
				err instanceof Error ? err.message : 'Could not save the item. Please try again.';
		} finally {
			saving = false;
		}
	}

	const inputCls =
		'h-10 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0';
	const labelCls = 'text-sm font-medium text-gray-700';
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<Dialog.Root bind:open>
	<Dialog.Content class="min-w-xl gap-0 overflow-y-auto border-t-4 border-t-red-700 p-0">
		<Dialog.Header class="border-b border-gray-100 px-6 pt-5 pb-4">
			<Dialog.Title class="flex items-center gap-3 text-lg font-semibold text-gray-900">
				<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
					<PackageIcon class="h-5 w-5" />
				</span>
				<span class="flex flex-col leading-tight">
					<span>{isEdit ? 'Edit supply' : 'Add new supply'}</span>
					<span class="text-sm font-normal text-gray-500">
						{isEdit
							? 'Update the details of this supply.'
							: 'Register a new supply standard in the Puting Manok System.'}
					</span>
				</span>
			</Dialog.Title>
			<Dialog.Description class="sr-only">
				{isEdit ? 'Edit the details of this supply.' : 'Fill in the details to add a new supply.'}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="flex flex-col">
			<div class="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-5">
				<div class="space-y-1.5">
					<Label for="itemName" class={labelCls}>
						Item name <span class="text-red-600">*</span>
					</Label>
					<Input
						id="itemName"
						bind:value={form.itemName}
						placeholder="e.g. CHICK PAPER"
						required
						autocomplete="off"
						aria-invalid={duplicateItem}
						class={inputCls}
					/>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<!-- Farm code — searchable picker -->
					<div class="space-y-1.5">
						<Label for="farmCode-trigger">
							Farm code <span class="text-red-600">*</span>
						</Label>

						<div class="relative" bind:this={farmPickerEl}>
							<button
								id="farmCode-trigger"
								type="button"
								onclick={toggleFarmPicker}
								aria-haspopup="listbox"
								aria-expanded={farmPickerOpen}
								disabled={farmsLoading || !!farmsError}
								class="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 text-left text-sm shadow-xs transition-colors hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
							>
								{#if selectedFarm}
									<span class="flex min-w-0 flex-1 flex-col leading-tight">
										<span class="truncate font-medium text-gray-900">{selectedFarm.code}</span>
										<span class="truncate text-xs text-gray-500">{selectedFarm.name}</span>
									</span>
								{:else if form.farmCode}
									<span class="flex min-w-0 flex-1 flex-col leading-tight">
										<span class="truncate font-mono text-sm font-medium text-gray-900">
											{form.farmCode}
										</span>
										<span class="truncate text-xs text-amber-700">farm not found</span>
									</span>
								{:else if farmsLoading}
									<span class="text-gray-500">Loading farms…</span>
								{:else if farmsError}
									<span class="text-gray-500">Failed to load farms</span>
								{:else}
									<span class="text-gray-500">Select farm code</span>
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
									<div class="border-b border-gray-100 p-2">
										<div class="relative">
											<SearchIcon
												class="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400"
											/>
											<Input
												bind:this={farmSearchEl}
												bind:value={farmSearch}
												placeholder="Search code, name, or address…"
												class="h-9 rounded-md border-gray-300 pl-8 text-sm focus-visible:ring-red-500 focus-visible:ring-offset-0"
												aria-label="Search farms"
											/>
										</div>
									</div>

									<ul class="max-h-60 overflow-y-auto py-1" role="listbox">
										{#each filteredFarms as f (f.id)}
											{@const isSelected = f.code === form.farmCode}
											<li role="option" aria-selected={isSelected}>
												<button
													type="button"
													onclick={() => selectFarm(f.code)}
													class="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors {isSelected
														? 'bg-amber-50'
														: 'hover:bg-stone-50'}"
												>
													<div class="flex min-w-0 flex-1 flex-col">
														<span class="truncate text-sm font-medium text-gray-900">
															{f.name}
														</span>
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

						{#if farmsError}
							<p class="flex items-center gap-1.5 text-xs text-red-600" role="alert">
								<AlertCircleIcon class="h-3.5 w-3.5 shrink-0" />
								<span>{farmsError}</span>
								<button
									type="button"
									onclick={loadFarms}
									class="inline-flex items-center gap-0.5 underline hover:no-underline"
								>
									<RefreshCwIcon class="h-3 w-3" /> Retry
								</button>
							</p>
						{:else if selectedFarm && !farmPickerOpen}
							<p class="flex items-center gap-1 text-xs text-gray-500">
								<BuildingIcon class="h-3 w-3" />
								{selectedFarm.address || 'No address on file'}
								{#if selectedFarm.type}
									· {selectedFarm.type}
								{/if}
							</p>
						{:else if codeMissingFromList && !farmPickerOpen}
							<p class="text-xs text-amber-700">
								Stored code “{form.farmCode}” is not in the current farm list.
							</p>
						{:else if farmsLoaded && farms.length === 0}
							<p class="text-xs text-amber-700">No farms registered yet. Add one first.</p>
						{/if}
					</div>

					<!-- Category -->
					<div class="space-y-1.5">
						<Label for="category" class={labelCls}>
							Category <span class="text-red-600">*</span>
						</Label>
						<Select.Root type="single" bind:value={form.category}>
							<Select.Trigger id="category" class="h-10 w-full">
								{form.category || 'Select category'}
							</Select.Trigger>
							<Select.Content>
								{#each categories as c (c)}
									<Select.Item value={c}>{c}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				{#if duplicateItem}
					<p class="flex items-center gap-1.5 text-xs text-red-600" role="alert">
						<AlertCircleIcon class="h-3.5 w-3.5 shrink-0" />
						This item already exists for the selected farm code.
					</p>
				{/if}

				{#if form.category === OTHER}
					<div class="space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3">
						<Label for="customCategory" class={labelCls}>
							Custom category <span class="text-red-600">*</span>
						</Label>
						<Input
							id="customCategory"
							bind:value={form.customCategory}
							placeholder="Enter custom category"
							required
							autocomplete="off"
							aria-invalid={form.customCategory.trim() === ''}
							class="{inputCls} bg-white"
						/>
						{#if form.customCategory.trim() === ''}
							<p class="text-xs text-red-600">Enter a category name.</p>
						{/if}
					</div>
				{/if}

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="perThousand" class={labelCls}>
							Per 1,000 <span class="text-red-600">*</span>
						</Label>
						<Input
							id="perThousand"
							type="number"
							step="0.01"
							min="0"
							inputmode="decimal"
							bind:value={form.perThousand}
							placeholder="e.g. 0.05"
							aria-invalid={perThousandText !== '' && !perThousandValid}
							class={inputCls}
						/>
						{#if perThousandText !== '' && !perThousandValid}
							<p class="text-xs text-red-600">Enter a valid non-negative number.</p>
						{:else}
							<p class="text-xs text-gray-500">Up to 2 decimal places.</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<Label for="standardPerFarm" class={labelCls}>
							Standard per farm <span class="text-red-600">*</span>
						</Label>
						<Input
							id="standardPerFarm"
							type="number"
							step="0.01"
							min="0"
							inputmode="decimal"
							bind:value={form.standardPerFarm}
							placeholder="e.g. 25"
							required
							aria-invalid={standardPerFarmText !== '' && !standardPerFarmValid}
							class={inputCls}
						/>
						{#if standardPerFarmText !== '' && !standardPerFarmValid}
							<p class="text-xs text-red-600">Enter a valid non-negative number.</p>
						{:else}
							<p class="text-xs text-gray-500">Total required per farm.</p>
						{/if}
					</div>
				</div>

				<div class="space-y-1.5">
					<Label for="unit" class={labelCls}>
						Unit <span class="text-red-600">*</span>
					</Label>
					<NativeSelect.Root id="unit" class="w-full" bind:value={form.unit}>
						<NativeSelect.Option value="">Select unit</NativeSelect.Option>
						{#each units as u}
							<NativeSelect.Option value={u}>{u}</NativeSelect.Option>
						{/each}
					</NativeSelect.Root>
				</div>

				{#if form.unit === OTHER}
					<div class="space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3">
						<Label for="customUnit" class={labelCls}>
							Custom unit <span class="text-red-600">*</span>
						</Label>
						<Input
							id="customUnit"
							bind:value={form.customUnit}
							placeholder="Enter custom unit"
							required
							autocomplete="off"
							aria-invalid={form.customUnit.trim() === ''}
							class="{inputCls} bg-white"
						/>
						{#if form.customUnit.trim() === ''}
							<p class="text-xs text-red-600">Enter a unit name.</p>
						{/if}
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
						disabled={!canSave || saving || farms.length === 0}
						class="bg-red-700 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
					>
						{#if saving}
							<LoaderCircleIcon class="mr-1.5 h-4 w-4 animate-spin" />
							Saving…
						{:else}
							{isEdit ? 'Save changes' : 'Add item'}
						{/if}
					</Button>
				</div>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
