<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import {
		UsersIcon,
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

	type Farm = { id: string; name: string; code: string; type?: string; address?: string };

	type Item = {
		id: string;
		itemName: string;
		farmCode: string;
		category: string;
		manpower: string;
		qty: number;
		cost: number;
		hours: number;
		multiplier: number;
		amount: number;
		amountPhp: number;
	};

	type ItemForm = {
		itemName: string;
		farmCode: string;
		category: string;
		customCategory: string;
		manpower: string;
		qty: string;
		cost: string;
		hours: string;
		multiplier: string;
	};

	const OTHER = 'Other';
	const categories = ['Salaries', 'Extra Allowances', OTHER];

	function emptyItemForm(): ItemForm {
		return {
			itemName: '',
			farmCode: '',
			category: '',
			customCategory: '',
			manpower: '',
			qty: '',
			cost: '',
			hours: '',
			multiplier: ''
		};
	}

	function itemToForm(item: Item): ItemForm {
		const catKnown =
			item.category !== '' && item.category !== OTHER && categories.includes(item.category);
		return {
			itemName: item.itemName,
			farmCode: item.farmCode,
			category: catKnown ? item.category : OTHER,
			customCategory: catKnown ? '' : item.category,
			manpower: item.manpower,
			qty: String(item.qty),
			cost: String(item.cost),
			hours: String(item.hours),
			multiplier: String(item.multiplier)
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
			farms = (await res.json()) as Farm[];
			farms = [...farms].sort((a, b) => a.code.localeCompare(b.code));
			farmsLoaded = true;
		} catch (err) {
			farmsError = err instanceof Error ? err.message : 'Could not load farms.';
		} finally {
			farmsLoading = false;
		}
	}

	let farmPickerOpen = $state(false);
	let farmSearch = $state('');
	let farmPickerEl: HTMLDivElement;
	let farmSearchEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (open) {
			form = item ? itemToForm(item) : emptyItemForm();
			submitError = '';
			farmPickerOpen = false;
			farmSearch = '';
			if (!farmsLoaded && !farmsLoading) loadFarms();
		}
	});

	$effect(() => {
		if (farmPickerOpen) tick().then(() => farmSearchEl?.focus());
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

	const qtyNum = $derived(Number(form.qty));
	const costNum = $derived(Number(form.cost));
	const hoursNum = $derived(Number(form.hours));
	const multNum = $derived(Number(form.multiplier));
	const qtyValid = $derived(form.qty !== '' && Number.isFinite(qtyNum) && qtyNum >= 0);
	const costValid = $derived(form.cost !== '' && Number.isFinite(costNum) && costNum >= 0);
	const hoursValid = $derived(form.hours !== '' && Number.isFinite(hoursNum) && hoursNum >= 0);
	const multValid = $derived(form.multiplier !== '' && Number.isFinite(multNum) && multNum >= 0);

	const previewAmount = $derived(
		qtyValid && costValid && hoursValid ? qtyNum * costNum * hoursNum : 0
	);
	const previewAmountPhp = $derived(
		qtyValid && costValid && hoursValid && multValid ? previewAmount * multNum : 0
	);

	const canSave = $derived(
		form.itemName.trim() !== '' &&
			form.farmCode.trim() !== '' &&
			resolvedCategory !== '' &&
			qtyValid &&
			costValid &&
			hoursValid &&
			multValid &&
			!duplicateItem
	);

	function php(n: number) {
		return new Intl.NumberFormat('en-PH', {
			style: 'currency',
			currency: 'PHP',
			minimumFractionDigits: 2
		}).format(n);
	}

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
				manpower: form.manpower.trim(),
				qty: qtyNum,
				cost: costNum,
				hours: hoursNum,
				multiplier: multNum,
				amount: previewAmount,
				amountPhp: previewAmountPhp
			});
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save the item.';
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
	<Dialog.Content class="min-w-2xl gap-0 overflow-y-auto border-t-4 border-t-red-700 p-0">
		<Dialog.Header class="border-b border-gray-100 px-6 pt-5 pb-4">
			<Dialog.Title class="flex items-center gap-3 text-lg font-semibold text-gray-900">
				<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
					<UsersIcon class="h-5 w-5" />
				</span>
				<span class="flex flex-col leading-tight">
					<span>{isEdit ? 'Edit manpower' : 'Add new manpower'}</span>
					<span class="text-sm font-normal text-gray-500">
						{isEdit ? 'Update this manpower entry.' : 'Register a new manpower standard.'}
					</span>
				</span>
			</Dialog.Title>
			<Dialog.Description class="sr-only">
				{isEdit ? 'Edit the details of this manpower entry.' : 'Fill in the details.'}
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
						placeholder="e.g. FARM OVERTIME HARVEST"
						required
						autocomplete="off"
						aria-invalid={duplicateItem}
						class={inputCls}
					/>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<!-- Farm code picker -->
					<div class="space-y-1.5">
						<Label for="farmCode-trigger">Farm code <span class="text-red-600">*</span></Label>
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
														<span class="truncate text-sm font-medium text-gray-900">{f.name}</span>
														<span class="truncate text-xs text-gray-500">{f.address || '—'}</span>
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
												{farmSearch.trim()
													? `No farms match "${farmSearch.trim()}"`
													: 'No farms available'}
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
						<Label for="category" class={labelCls}
							>Category <span class="text-red-600">*</span></Label
						>
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
							class="{inputCls} bg-white"
						/>
						{#if form.customCategory.trim() === ''}
							<p class="text-xs text-red-600">Enter a category name.</p>
						{/if}
					</div>
				{/if}

				<div class="space-y-1.5">
					<Label for="manpower" class={labelCls}>Manpower</Label>
					<Input
						id="manpower"
						bind:value={form.manpower}
						placeholder="e.g. 5 workers — HARVEST CREW A"
						autocomplete="off"
						class={inputCls}
					/>
					<p class="text-xs text-gray-500">Optional description of the crew.</p>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="qty" class={labelCls}>QTY <span class="text-red-600">*</span></Label>
						<Input
							id="qty"
							type="number"
							step="1"
							min="0"
							bind:value={form.qty}
							placeholder="e.g. 5"
							required
							class={inputCls}
						/>
						{#if form.qty !== '' && !qtyValid}
							<p class="text-xs text-red-600">Enter a non-negative number.</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<Label for="cost" class={labelCls}>COST <span class="text-red-600">*</span></Label>
						<Input
							id="cost"
							type="number"
							step="0.01"
							min="0"
							bind:value={form.cost}
							placeholder="e.g. 72.50"
							required
							class={inputCls}
						/>
						{#if form.cost !== '' && !costValid}
							<p class="text-xs text-red-600">Enter a non-negative number.</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<Label for="hours" class={labelCls}
							>No. of hours <span class="text-red-600">*</span></Label
						>
						<Input
							id="hours"
							type="number"
							step="0.01"
							min="0"
							bind:value={form.hours}
							placeholder="e.g. 4"
							required
							class={inputCls}
						/>
						{#if form.hours !== '' && !hoursValid}
							<p class="text-xs text-red-600">Enter a non-negative number.</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<Label for="multiplier" class={labelCls}
							>MULTIPLIER <span class="text-red-600">*</span></Label
						>
						<Input
							id="multiplier"
							type="number"
							step="0.01"
							min="0"
							bind:value={form.multiplier}
							placeholder="e.g. 7"
							required
							class={inputCls}
						/>
						{#if form.multiplier !== '' && !multValid}
							<p class="text-xs text-red-600">Enter a non-negative number.</p>
						{/if}
					</div>
				</div>

				<!-- Live preview -->
				<div
					class="grid grid-cols-1 gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 sm:grid-cols-2"
				>
					<div>
						<p class="text-[10px] font-semibold tracking-wider text-amber-800 uppercase">Amount</p>
						<p class="mt-0.5 font-mono text-sm font-semibold text-amber-900">
							{previewAmount.toFixed(2)}
						</p>
						<p class="text-[10px] text-amber-700">QTY × COST × Hours</p>
					</div>
					<div>
						<p class="text-[10px] font-semibold tracking-wider text-amber-800 uppercase">
							Amount (PHP)
						</p>
						<p class="mt-0.5 font-mono text-sm font-semibold text-amber-900">
							{php(previewAmountPhp)}
						</p>
						<p class="text-[10px] text-amber-700">Amount × MULTIPLIER</p>
					</div>
				</div>

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
