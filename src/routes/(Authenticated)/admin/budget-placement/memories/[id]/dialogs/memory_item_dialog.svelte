<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Command from '#lib/components/ui/command/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { cn } from '#lib/utils.ts';
	import {
		PackageIcon,
		AlertCircleIcon,
		LoaderCircleIcon,
		CalendarClockIcon,
		MinusIcon,
		PlusIcon,
		ZapIcon,
		XIcon,
		CheckIcon,
		ChevronsUpDownIcon
	} from '@lucide/svelte';
	import type {
		Particular,
		ParticularMemoryItem,
		ParticularMemoryItemInput
	} from '#lib/types/particulars.ts';
	import { tick, untrack } from 'svelte';
	import type { Item as Medicine } from '#lib/types/standards/medicines/items.ts';

	type Pair = { key: string; value: string };

	let {
		open = $bindable(false),
		item = null,
		memoryId,
		particulars,
		medicines = [],
		formulaKeys,
		onsave
	}: {
		open?: boolean;
		item?: ParticularMemoryItem | null;
		memoryId: string;
		particulars: Particular[];
		medicines?: Medicine[];
		formulaKeys: string[];
		onsave: (p: ParticularMemoryItemInput) => Promise<void>;
	} = $props();

	let particularId = $state('');
	let medicineId = $state('');
	let particularOpen = $state(false);
	let particularTriggerRef = $state<HTMLButtonElement | null>(null);
	let label = $state('');
	let mode = $state<'static' | 'formula'>('static');
	let qty = $state('');
	let formulaKey = $state('');
	let formulaOpen = $state(false);
	let formulaTriggerRef = $state<HTMLButtonElement | null>(null);
	let formulaPairs = $state<Pair[]>([]);
	let showParams = $state(false);
	let price = $state('');
	let adjustDirection = $state<'add' | 'subtract'>('add');
	let adjustDays = $state('');
	let saving = $state(false);
	let submitError = $state('');
	let usePlacement = $state(true);

	$effect(() => {
		if (!open) return;
		const it = item; // tracked dependency

		untrack(() => {
			const nextPairs: Pair[] = it?.formulaParams
				? Object.entries(it.formulaParams).map(([k, v]) => ({
						key: k,
						value: typeof v === 'string' ? v : JSON.stringify(v)
					}))
				: [];

			particularId = it?.particularId ?? '';
			medicineId = '';
			particularOpen = false;
			label = it?.label ?? '';
			mode = it?.mode ?? 'static';
			qty = it ? String(it.qty) : '';
			formulaKey = it?.formulaKey ?? '';
			formulaOpen = false;
			formulaPairs = nextPairs;
			showParams = nextPairs.length > 0;
			price = it ? String(it.price) : '';

			const signed = it?.adjustmentDays ?? null;
			adjustDirection = signed != null && signed < 0 ? 'subtract' : 'add';
			adjustDays = signed == null ? '' : String(Math.abs(signed));
			usePlacement = signed == null;
			submitError = '';
		});
	});

	const isEdit = $derived(item !== null);
	const selectedParticular = $derived(particulars.find((p) => p.id === particularId));
	const selectedMedicine = $derived(medicines.find((m) => m.id === medicineId));
	const selectedLabel = $derived(selectedParticular?.name ?? selectedMedicine?.itemName);
	const hasSelection = $derived(particularId !== '' || medicineId !== '');

	// Quantity always comes from what the user enters (static or formula),
	// never from the selected medicine's own value.
	const effectiveMode = $derived<'static' | 'formula'>(mode);

	// Hide medicines that already exist as a particular so nothing shows twice
	const particularNames = $derived(new Set(particulars.map((p) => p.name.trim().toLowerCase())));
	const availableMedicines = $derived(
		medicines.filter((m) => !particularNames.has(m.itemName.trim().toLowerCase()))
	);

	const qtyNum = $derived(Number(qty));

	const qtyValid = $derived(
		effectiveMode === 'formula' || (qty !== '' && Number.isFinite(qtyNum) && qtyNum >= 0)
	);
	const priceNum = $derived(Number(price));
	const priceValid = $derived(price !== '' && Number.isFinite(priceNum) && priceNum >= 0);
	const daysNum = $derived(Number(adjustDays));
	const daysValid = $derived(
		usePlacement ||
			(adjustDays !== '' && Number.isInteger(daysNum) && daysNum >= 0 && daysNum <= 36500)
	);

	const signedAdjustment = $derived<number | null>(
		usePlacement || adjustDays === '' || !daysValid
			? null
			: adjustDirection === 'subtract'
				? -daysNum
				: daysNum
	);
	const formulaValid = $derived(effectiveMode === 'static' || formulaKey.trim() !== '');
	const canSave = $derived(hasSelection && qtyValid && priceValid && daysValid && formulaValid);

	function selectParticular(id: string) {
		particularId = id;
		medicineId = '';
		particularOpen = false;
		tick().then(() => particularTriggerRef?.focus());
	}

	function selectMedicine(id: string) {
		medicineId = id;
		particularId = '';
		particularOpen = false;
		tick().then(() => particularTriggerRef?.focus());
	}

	function selectFormula(key: string) {
		formulaKey = key;
		formulaOpen = false;
		tick().then(() => formulaTriggerRef?.focus());
	}

	function addPair() {
		formulaPairs = [...formulaPairs, { key: '', value: '' }];
	}
	function removePair(idx: number) {
		formulaPairs = formulaPairs.filter((_, i) => i !== idx);
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving) return;

		const params: Record<string, unknown> | null =
			effectiveMode === 'formula' && showParams && formulaPairs.length > 0
				? Object.fromEntries(
						formulaPairs.filter((p) => p.key.trim()).map((p) => [p.key.trim(), p.value])
					)
				: null;

		saving = true;
		submitError = '';
		try {
			await onsave({
				id: item?.id,
				memoryId,
				particularId,
				medicineId: medicineId || null,
				label: label.trim(),
				mode: effectiveMode,
				qty: effectiveMode === 'static' ? qtyNum : 0,
				formulaKey: effectiveMode === 'formula' ? formulaKey.trim() : null,
				formulaParams: params,
				price: priceNum,
				adjustmentDays: signedAdjustment,
				position: item?.position
			});
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save item.';
		} finally {
			saving = false;
		}
	}

	const inputCls =
		'h-10 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0';
	const labelCls = 'text-sm font-medium text-gray-700';

	$inspect({
		particularId,
		medicineId,
		selected: selectedParticular ?? selectedMedicine
	}).with((type, value) => console.log(type, value));
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="min-w-2xl gap-0 overflow-y-auto border-t-4 border-t-red-700 p-0">
		<Dialog.Header class="border-b border-gray-100 px-6 pt-5 pb-4">
			<Dialog.Title class="flex items-center gap-3 text-lg font-semibold text-gray-900">
				<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
					<PackageIcon class="h-5 w-5" />
				</span>
				{isEdit ? 'Edit memory item' : 'Add particular to memory'}
			</Dialog.Title>
		</Dialog.Header>

		<form onsubmit={submit} class="flex flex-col">
			<div class="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
				<!-- Particular + Label -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="particularPick" class={labelCls}>
							Particular <span class="text-red-600">*</span>
						</Label>
						<Popover.Root bind:open={particularOpen}>
							<Popover.Trigger bind:ref={particularTriggerRef}>
								{#snippet child({ props })}
									<Button
										{...props}
										id="particularPick"
										type="button"
										variant="outline"
										role="combobox"
										aria-expanded={particularOpen}
										class={cn(
											'h-10 w-full justify-between bg-white font-normal focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30',
											!selectedLabel && 'text-gray-500'
										)}
									>
										<span class="truncate">
											{selectedLabel ?? 'Select particular…'}
										</span>
										<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>

							<Popover.Content
								class="w-[var(--bits-popover-anchor-width)] min-w-[240px] p-0"
								align="start"
							>
								<Command.Root>
									<Command.Input placeholder="Search particulars or medicines…" />
									<Command.List class="max-h-[260px]">
										<Command.Empty>No particular found.</Command.Empty>

										<Command.Group heading="Particulars">
											{#each particulars as p (p.id)}
												<Command.Item
													value={`p:${p.id}`}
													keywords={[p.name]}
													onSelect={() => selectParticular(p.id)}
													class="gap-2 py-2"
												>
													<CheckIcon
														class={cn(
															'size-4 shrink-0 text-red-700',
															particularId !== p.id && 'text-transparent'
														)}
													/>
													<span class="truncate text-sm text-gray-900">{p.name}</span>
												</Command.Item>
											{/each}
										</Command.Group>

										{#if availableMedicines.length > 0}
											<Command.Group heading="Medicines">
												{#each availableMedicines as m (m.id)}
													<Command.Item
														value={`m:${m.id}`}
														keywords={[m.itemName, m.areaName]}
														onSelect={() => selectMedicine(m.id)}
														class="gap-2 py-2"
													>
														<CheckIcon
															class={cn(
																'size-4 shrink-0 text-red-700',
																medicineId !== m.id && 'text-transparent'
															)}
														/>
														<span class="truncate text-sm text-gray-900">{m.itemName}</span>
														<span class="ml-auto shrink-0 text-xs text-gray-400">{m.areaName}</span>
													</Command.Item>
												{/each}
											</Command.Group>
										{/if}
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
					</div>
					<div class="space-y-1.5">
						<Label for="itemLabel" class={labelCls}>
							Label <span class="text-gray-400">(for duplicates)</span>
						</Label>
						<Input
							id="itemLabel"
							bind:value={label}
							placeholder="e.g. Regular, OT"
							maxlength={100}
							class={inputCls}
						/>
					</div>
				</div>

				<!-- Mode toggle -->
				<div class="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
					<div class="mb-2 flex items-center justify-between">
						<Label class={labelCls}>Quantity source</Label>
						<div class="inline-flex rounded-lg bg-gray-200 p-1">
							<button
								type="button"
								onclick={() => (mode = 'static')}
								class="rounded-md px-3 py-1.5 text-sm font-medium transition-all disabled:cursor-not-allowed {effectiveMode ===
								'static'
									? 'bg-white text-gray-900 shadow-sm'
									: 'text-gray-600 hover:text-gray-900'}"
							>
								Static
							</button>
							<button
								type="button"
								onclick={() => (mode = 'formula')}
								class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 {effectiveMode ===
								'formula'
									? 'bg-white text-amber-800 shadow-sm'
									: 'text-gray-600 hover:text-gray-900'}"
							>
								<ZapIcon class="h-3.5 w-3.5" />Formula
							</button>
						</div>
					</div>

					{#if effectiveMode === 'static'}
						<div class="space-y-1.5">
							<Label for="qty" class="text-xs font-medium text-gray-600">
								Quantity <span class="text-red-600">*</span>
							</Label>
							<Input
								id="qty"
								type="number"
								step="0.01"
								min="0"
								bind:value={qty}
								placeholder="e.g. 10"
								class="{inputCls} bg-white"
							/>
						</div>
					{:else}
						<div class="space-y-2">
							<div class="space-y-1.5">
								<Label for="formulaKey" class="text-xs font-medium text-gray-600">
									Formula <span class="text-red-600">*</span>
								</Label>
								{#if formulaKeys.length === 0}
									<p class="text-xs text-amber-700">
										No formulas registered yet. Register one with
										<code class="rounded bg-gray-100 px-1">registerQtyFormula('…', fn)</code>.
									</p>
								{:else}
									<Popover.Root bind:open={formulaOpen}>
										<Popover.Trigger bind:ref={formulaTriggerRef}>
											{#snippet child({ props })}
												<Button
													{...props}
													id="formulaKey"
													type="button"
													variant="outline"
													role="combobox"
													aria-expanded={formulaOpen}
													class={cn(
														'h-10 w-full justify-between bg-white font-normal focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30',
														!formulaKey && 'text-gray-500'
													)}
												>
													{#if formulaKey}
														<span class="flex min-w-0 items-center gap-2">
															<ZapIcon class="size-3.5 shrink-0 text-amber-600" />
															<span class="truncate font-mono text-sm text-gray-900">
																{formulaKey}
															</span>
														</span>
													{:else}
														<span>Select formula…</span>
													{/if}
													<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
												</Button>
											{/snippet}
										</Popover.Trigger>

										<Popover.Content
											class="w-[var(--bits-popover-anchor-width)] min-w-[240px] p-0"
											align="start"
										>
											<Command.Root>
												<Command.Input placeholder="Search formulas…" />
												<Command.List class="max-h-[260px]">
													<Command.Empty>No formula found.</Command.Empty>
													<Command.Group>
														{#each formulaKeys as k (k)}
															<Command.Item
																value={k}
																onSelect={() => selectFormula(k)}
																class="gap-2 py-2"
															>
																<CheckIcon
																	class={cn(
																		'size-4 shrink-0 text-red-700',
																		formulaKey !== k && 'text-transparent'
																	)}
																/>
																<ZapIcon class="size-3.5 shrink-0 text-amber-600" />
																<span class="truncate font-mono text-sm text-gray-900">{k}</span>
															</Command.Item>
														{/each}
													</Command.Group>
												</Command.List>
											</Command.Root>
										</Popover.Content>
									</Popover.Root>
									{#if formulaKey && !formulaKeys.includes(formulaKey)}
										<p class="flex items-center gap-1 text-xs text-red-600">
											<AlertCircleIcon class="h-3.5 w-3.5 shrink-0" />
											"{formulaKey}" is no longer registered. Pick another formula.
										</p>
									{/if}
								{/if}
							</div>

							<div class="space-y-2">
								<button
									type="button"
									onclick={() => (showParams = !showParams)}
									class="text-xs font-medium text-gray-600 underline hover:text-gray-900"
								>
									{showParams ? 'Hide' : 'Show'} parameters ({formulaPairs.length})
								</button>
								{#if showParams}
									<div class="space-y-2">
										{#each formulaPairs as pair, idx (idx)}
											<div class="flex items-center gap-2">
												<Input
													bind:value={pair.key}
													placeholder="key"
													class="h-9 font-mono text-sm"
												/>
												<Input bind:value={pair.value} placeholder="value" class="h-9 text-sm" />
												<button
													type="button"
													onclick={() => removePair(idx)}
													class="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-red-700"
												>
													<XIcon class="h-4 w-4" />
												</button>
											</div>
										{/each}
										<Button type="button" variant="outline" size="sm" onclick={addPair}>
											<PlusIcon class="mr-1 h-3.5 w-3.5" />Add parameter
										</Button>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- Price -->
				<div class="space-y-1.5">
					<Label for="price" class={labelCls}>
						Price (₱) <span class="text-red-600">*</span>
					</Label>
					<Input
						id="price"
						type="number"
						step="0.01"
						min="0"
						bind:value={price}
						placeholder="e.g. 125.00"
						class={inputCls}
					/>
				</div>

				<!-- Adjustment -->
				<div class="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
					<div class="flex items-center justify-between">
						<Label class={labelCls}>Date basis</Label>
						<div class="inline-flex rounded-lg bg-gray-200 p-1">
							<button
								type="button"
								onclick={() => (usePlacement = true)}
								class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all {usePlacement
									? 'bg-white text-gray-900 shadow-sm'
									: 'text-gray-600 hover:text-gray-900'}"
							>
								<CalendarClockIcon class="h-3.5 w-3.5" />Placement date
							</button>
							<button
								type="button"
								onclick={() => (usePlacement = false)}
								class="rounded-md px-3 py-1.5 text-sm font-medium transition-all {!usePlacement
									? 'bg-white text-amber-800 shadow-sm'
									: 'text-gray-600 hover:text-gray-900'}"
							>
								Custom offset
							</button>
						</div>
					</div>

					{#if usePlacement}
						<p class="flex items-center gap-1 text-xs text-gray-500">
							<CalendarClockIcon class="h-3.5 w-3.5" />
							Uses the date the chicks are placed in the farm, with no adjustment.
						</p>
					{:else}
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
							<div class="space-y-1">
								<Label class="text-xs font-medium text-gray-600">Operation</Label>
								<div class="inline-flex rounded-lg bg-gray-200 p-1">
									<button
										type="button"
										onclick={() => (adjustDirection = 'add')}
										class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all {adjustDirection ===
										'add'
											? 'bg-white text-emerald-700 shadow-sm'
											: 'text-gray-600 hover:text-gray-900'}"
									>
										<PlusIcon class="h-3.5 w-3.5" />Add
									</button>
									<button
										type="button"
										onclick={() => (adjustDirection = 'subtract')}
										class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all {adjustDirection ===
										'subtract'
											? 'bg-white text-red-700 shadow-sm'
											: 'text-gray-600 hover:text-gray-900'}"
									>
										<MinusIcon class="h-3.5 w-3.5" />Minus
									</button>
								</div>
							</div>
							<div class="space-y-1">
								<Label for="adjustDays" class="text-xs font-medium text-gray-600">
									Days <span class="text-red-600">*</span>
								</Label>
								<Input
									id="adjustDays"
									type="number"
									step="1"
									min="0"
									max="36500"
									bind:value={adjustDays}
									placeholder="e.g. 7"
									class="{inputCls} bg-white"
								/>
							</div>
						</div>
						{#if signedAdjustment != null}
							<p class="flex items-center gap-1 text-xs text-emerald-700">
								<CalendarClockIcon class="h-3.5 w-3.5" />
								Placement date {signedAdjustment > 0 ? '+' : '−'}{Math.abs(signedAdjustment)}
								{Math.abs(signedAdjustment) === 1 ? 'day' : 'days'}
							</p>
						{/if}
					{/if}
				</div>

				{#if submitError}
					<div
						role="alert"
						class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
					>
						<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" /><span>{submitError}</span>
					</div>
				{/if}
			</div>

			<Dialog.Footer
				class="mb-2 flex w-full items-end gap-2 border-t border-gray-100 bg-gray-50/60"
			>
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
					class="bg-red-700 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
				>
					{#if saving}
						<LoaderCircleIcon class="mr-1.5 h-4 w-4 animate-spin" />Saving…
					{:else}
						{isEdit ? 'Save changes' : 'Add to memory'}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
