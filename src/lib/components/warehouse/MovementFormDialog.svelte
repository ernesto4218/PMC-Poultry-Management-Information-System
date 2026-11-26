<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { PackageIcon, Building2Icon, TruckIcon, UserIcon, SproutIcon } from '@lucide/svelte';
	import FormCombobox, { type ComboOption } from './form-combobox.svelte';
	import {
		emptyMovementForm,
		movementTypeLabels,
		movementTypes,
		movementStatuses,
		type MovementForm,
		type MovementType
	} from '#lib/types/feed-stock.ts';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';

	type ProductLookup = {
		id: string;
		name: string;
		sku: string;
		feedType: string;
		stage: string;
		supplierId: string;
	};
	type SupplierLookup = { id: string; name: string };
	type FarmLookup = { id: string; name: string; code: string };
	type DriverLookup = { id: string; name: string };
	type TruckLookup = { id: string; plateNumber: string; driverId: string | null; status: string };
	type ChickBatchLookup = {
		id: string;
		farmId: string;
		batchNumber: string;
		volume: number;
		dateSet: string;
	};

	let {
		open = $bindable(false),
		initialType = 'delivery',
		initialProductId = '',
		products,
		suppliers,
		farms,
		drivers,
		trucks,
		chickBatches,
		onsave
	}: {
		open?: boolean;
		initialType?: MovementType;
		initialProductId?: string;
		products: ProductLookup[];
		suppliers: SupplierLookup[];
		farms: FarmLookup[];
		drivers: DriverLookup[];
		trucks: TruckLookup[];
		chickBatches: ChickBatchLookup[];
		onsave: (payload: any) => void | Promise<void>;
	} = $props();

	let form = $state<MovementForm>(emptyMovementForm());
	let saving = $state(false);
	let submitError = $state('');
	let prevTruckPlate = $state('');
	let prevFarmId = $state('');

	// Reset the form whenever the dialog opens
	$effect(() => {
		if (open) {
			untrack(() => {
				const f = emptyMovementForm();
				f.movementType = initialType;
				if (initialProductId) {
					const prod = products.find((p) => p.id === initialProductId);
					if (prod) {
						f.feedProductId = prod.id;
						f.supplierId = prod.supplierId;
					}
				}
				form = f;
				prevTruckPlate = '';
				prevFarmId = '';
				submitError = '';
			});
		}
	});

	// Reset product if the supplier changes and no longer owns it
	$effect(() => {
		const supId = form.supplierId;
		const prodId = form.feedProductId;
		untrack(() => {
			if (!supId && prodId) {
				form.feedProductId = '';
			} else if (prodId && supId) {
				const prod = products.find((p) => p.id === prodId);
				if (prod && prod.supplierId !== supId) form.feedProductId = '';
			}
		});
	});

	// Auto-sync the driver whenever the truck selection changes
	$effect(() => {
		if (!open) return;
		const plate = form.truckPlate;
		if (plate === prevTruckPlate) return;
		untrack(() => {
			prevTruckPlate = plate;
			const truck = trucks.find((t) => t.plateNumber === plate);
			form.driverId = truck?.driverId ?? '';
		});
	});

	// Clear chick-in if it no longer belongs to the currently selected farm
	$effect(() => {
		if (!open) return;
		const farmId = form.farmId;
		const code = form.chickInCode;
		untrack(() => {
			if (farmId === prevFarmId) return;
			prevFarmId = farmId;
			if (farmId && code) {
				const valid = chickBatches.some((b) => b.farmId === farmId && b.batchNumber === code);
				if (!valid) form.chickInCode = '';
			}
		});
	});

	$effect(() => {
		if (submitError) {
			toast.error(submitError);
		}
	});

	const isAdjustment = $derived(form.movementType === 'adjustment');
	const showFarm = $derived(form.movementType === 'from-farm' || form.movementType === 'to-farm');
	const showTruck = $derived(!isAdjustment);

	const direction = $derived.by((): 'in' | 'out' => {
		if (form.movementType === 'to-farm') return 'out';
		if (form.movementType === 'delivery' || form.movementType === 'from-farm') return 'in';
		return form.adjustDirection;
	});

	// Only show products belonging to the selected supplier
	const filteredProducts = $derived.by(() => {
		if (!form.supplierId) return [];
		return products.filter((p) => p.supplierId === form.supplierId);
	});

	// Only show active trucks
	const availableTrucks = $derived(trucks.filter((t) => t.status === 'Active'));

	// Batches for the currently selected farm (for the chick-in dropdown)
	const batchesForFarm = $derived.by(() => {
		if (!form.farmId) return [];
		return chickBatches.filter((b) => b.farmId === form.farmId);
	});

	// Driver linked to the currently selected truck
	const selectedTruck = $derived(trucks.find((t) => t.plateNumber === form.truckPlate) ?? null);
	const selectedTruckDriver = $derived.by(() => {
		if (!selectedTruck?.driverId) return null;
		return drivers.find((d) => d.id === selectedTruck.driverId) ?? null;
	});

	// ── Combobox options ────────────────────────────────────────────────
	function fmtDate(iso: string) {
		const d = new Date(iso);
		return Number.isNaN(d.getTime())
			? iso
			: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const supplierOptions = $derived<ComboOption[]>(
		suppliers.map((s) => ({ value: s.id, label: s.name }))
	);

	const productOptions = $derived<ComboOption[]>(
		filteredProducts.map((p) => ({
			value: p.id,
			label: p.name || p.sku,
			description: [p.feedType, p.stage, p.name ? p.sku : ''].filter(Boolean).join(' · ')
		}))
	);

	const farmOptions = $derived<ComboOption[]>(
		farms.map((f) => ({ value: f.id, label: f.name, description: f.code }))
	);

	const batchOptions = $derived<ComboOption[]>(
		batchesForFarm.map((b) => ({
			value: b.batchNumber,
			label: b.batchNumber,
			description: `${b.volume.toLocaleString()} chicks · ${fmtDate(b.dateSet)}`
		}))
	);

	const truckOptions = $derived<ComboOption[]>(
		availableTrucks.map((t) => ({
			value: t.plateNumber,
			label: t.plateNumber,
			description: drivers.find((d) => d.id === t.driverId)?.name ?? 'No driver assigned'
		}))
	);

	const statusOptions: ComboOption[] = movementStatuses.map((s) => ({ value: s, label: s }));

	const canSave = $derived.by(() => {
		if (!form.supplierId) return false;
		if (!form.feedProductId) return false;
		if (!Number.isInteger(form.qty) || form.qty <= 0) return false;
		if (showFarm && !form.farmId) return false;
		if (isAdjustment && form.adjustDirection !== 'in' && form.adjustDirection !== 'out')
			return false;
		return true;
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving) return;
		saving = true;
		submitError = '';
		try {
			await onsave({
				movementType: form.movementType,
				direction,
				feedProductId: form.feedProductId,
				supplierId: form.supplierId || null,
				farmId: showFarm ? form.farmId || null : null,
				driverId: showTruck && form.driverId ? form.driverId : null,
				qty: form.qty,
				chickInCode: form.chickInCode.trim(),
				truckPlate: showTruck ? form.truckPlate.trim() : '',
				status: isAdjustment ? 'Completed' : form.status,
				remarks: form.remarks.trim()
			});
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save movement.';
		} finally {
			saving = false;
		}
	}

	const inputCls =
		'rounded-lg border-gray-200 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0';
	const labelCls = 'text-xs font-medium text-gray-600';
	const optionBtn =
		'rounded-lg border px-2.5 py-1.5 text-left text-[13px] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none';
	const optionOn = 'border-red-600 bg-red-50 font-semibold text-red-800 shadow-xs';
	const optionOff =
		'border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50/40 hover:text-red-700';
</script>

{#snippet sectionLabel(text: string)}
	<div class="flex items-center gap-3">
		<span class="text-[0.68rem] font-semibold tracking-widest text-red-800/70 uppercase">
			{text}
		</span>
		<span class="h-px flex-1 bg-gray-100"></span>
	</div>
{/snippet}

<Dialog.Root bind:open>
	<Dialog.Content
		class="gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:max-w-[520px]"
	>
		<!-- Accent bar -->
		<div class="h-1 w-full bg-gradient-to-r from-red-800 via-red-600 to-red-500"></div>

		<!-- Header -->
		<div class="flex items-center gap-3 px-5 pt-4 pr-12 pb-3">
			<div
				class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700 ring-1 ring-red-100"
			>
				<PackageIcon class="size-4.5" />
			</div>
			<div class="min-w-0">
				<Dialog.Title class="text-base font-semibold tracking-tight text-gray-900">
					Record movement
				</Dialog.Title>
				<Dialog.Description class="text-xs text-gray-500">
					Log feed coming into or going out of the warehouse.
				</Dialog.Description>
			</div>
		</div>

		<form onsubmit={submit} class="flex flex-col border-t border-gray-100">
			<div class="max-h-[68vh] space-y-4 overflow-y-auto px-5 py-4">
				<!-- 1. Movement type -->
				<div class="space-y-2.5">
					<p id="type-label" class={labelCls}>
						Movement type <span class="text-red-600">*</span>
					</p>
					<div role="radiogroup" aria-labelledby="type-label" class="grid grid-cols-2 gap-2">
						{#each movementTypes as t (t)}
							{@const on = form.movementType === t}
							<button
								type="button"
								role="radio"
								aria-checked={on}
								onclick={() => (form.movementType = t)}
								class="{optionBtn} flex items-center gap-2.5 {on ? optionOn : optionOff}"
							>
								<span
									class="flex size-4 shrink-0 items-center justify-center rounded-full border {on
										? 'border-red-600'
										: 'border-gray-300'}"
								>
									{#if on}
										<span class="size-2 rounded-full bg-red-600"></span>
									{/if}
								</span>
								<span class="leading-tight">{movementTypeLabels[t]}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- 2. Supplier & product -->
				<div class="space-y-2">
					{@render sectionLabel('Feed')}
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="min-w-0 space-y-1.5">
							<Label for="supplier" class={labelCls}>
								Supplier <span class="text-red-600">*</span>
							</Label>
							<FormCombobox
								id="supplier"
								bind:value={form.supplierId}
								options={supplierOptions}
								icon={Building2Icon}
								placeholder="Select supplier"
								searchPlaceholder="Search suppliers…"
								emptyText="No supplier found."
								noun="suppliers"
							/>
						</div>

						<div class="min-w-0 space-y-1.5">
							<Label for="product" class={labelCls}>
								Feed product <span class="text-red-600">*</span>
							</Label>
							{#if !form.supplierId}
								<div
									class="flex h-9 w-full items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 text-sm text-gray-400"
								>
									Select a supplier first
								</div>
							{:else if filteredProducts.length === 0}
								<div
									class="flex h-9 w-full items-center rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 text-sm text-amber-700"
								>
									No products for this supplier
								</div>
							{:else}
								<FormCombobox
									id="product"
									bind:value={form.feedProductId}
									options={productOptions}
									placeholder="Select a feed product"
									searchPlaceholder="Search by name, type, or SKU…"
									emptyText="No product found."
									noun="products"
								/>
							{/if}
						</div>
					</div>
				</div>

				<!-- 3. Farm & chick-in -->
				<div class="space-y-2">
					{@render sectionLabel(showFarm ? 'Farm' : 'Reference')}
					<div class="grid gap-3 sm:grid-cols-2">
						{#if showFarm}
							<div class="min-w-0 space-y-1.5">
								<Label for="farm" class={labelCls}>
									Farm <span class="text-red-600">*</span>
								</Label>
								<FormCombobox
									id="farm"
									bind:value={form.farmId}
									options={farmOptions}
									icon={SproutIcon}
									placeholder="Select farm"
									searchPlaceholder="Search by farm name or code…"
									emptyText="No farm found."
									noun="farms"
								/>
							</div>
						{/if}

						<div class="min-w-0 space-y-1.5 {showFarm ? '' : 'sm:col-span-2'}">
							<Label for="chickIn" class={labelCls}>Chick-in code</Label>
							{#if showFarm && form.farmId && batchesForFarm.length > 0}
								<FormCombobox
									id="chickIn"
									bind:value={form.chickInCode}
									options={batchOptions}
									mono
									clearLabel="None"
									placeholder="Select a chick batch"
									searchPlaceholder="Search by Chick In No. or date…"
									emptyText="No batch found."
									noun="batches"
								/>
							{:else}
								<Input
									id="chickIn"
									bind:value={form.chickInCode}
									placeholder="e.g. BI-2025-001"
									class={inputCls}
								/>
							{/if}
							{#if showFarm && form.farmId && batchesForFarm.length === 0}
								<p class="text-xs text-amber-600">
									No chick batches recorded for this farm yet — type the code manually.
								</p>
							{/if}
						</div>
					</div>
				</div>

				<!-- 4. Quantity (+ adjustment direction) -->
				<div class="space-y-2">
					{@render sectionLabel('Quantity')}

					{#if isAdjustment}
						<div class="space-y-1.5">
							<p id="adjust-label" class={labelCls}>
								Adjustment direction <span class="text-red-600">*</span>
							</p>
							<div role="radiogroup" aria-labelledby="adjust-label" class="grid grid-cols-2 gap-2">
								{#each [{ v: 'in', t: 'Add stock (+)' }, { v: 'out', t: 'Remove stock (−)' }] as opt (opt.v)}
									{@const on = form.adjustDirection === opt.v}
									<button
										type="button"
										role="radio"
										aria-checked={on}
										onclick={() => (form.adjustDirection = opt.v as 'in' | 'out')}
										class="{optionBtn} text-center {on ? optionOn : optionOff}"
									>
										{opt.t}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<div class="space-y-1.5">
						<div class="flex items-center justify-between">
							<Label for="qty" class={labelCls}>
								Quantity <span class="text-red-600">*</span>
							</Label>
							<span
								class="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase {direction ===
								'in'
									? 'bg-emerald-50 text-emerald-700'
									: 'bg-amber-50 text-amber-700'}"
							>
								{direction === 'in' ? 'Stock in' : 'Stock out'}
							</span>
						</div>
						<div class="relative">
							<Input
								id="qty"
								type="number"
								min="1"
								step="1"
								bind:value={form.qty}
								placeholder="e.g. 50"
								required
								class="pr-16 text-base font-semibold tabular-nums {inputCls}"
							/>
							<span
								class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-gray-400"
							>
								sacks
							</span>
						</div>
					</div>
				</div>

				<!-- 5. Logistics (not for adjustments) -->
				{#if showTruck}
					<div class="space-y-2">
						{@render sectionLabel('Logistics')}
						<div class="grid gap-3 sm:grid-cols-2">
							<div class="min-w-0 space-y-1.5">
								<Label for="truck" class={labelCls}>Truck plate number</Label>
								<FormCombobox
									id="truck"
									bind:value={form.truckPlate}
									options={truckOptions}
									icon={TruckIcon}
									mono
									clearLabel="No truck"
									placeholder="Select a truck"
									searchPlaceholder="Search by plate or driver…"
									emptyText="No active truck found."
									noun="active trucks"
								/>
							</div>

							<div class="min-w-0 space-y-1.5">
								<Label for="status" class={labelCls}>Status</Label>
								<FormCombobox
									id="status"
									bind:value={form.status}
									options={statusOptions}
									placeholder="Select status"
									searchPlaceholder="Search status…"
									emptyText="No status found."
								/>
							</div>
						</div>

						{#if selectedTruck}
							<div
								class="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5 text-xs"
							>
								<span
									class="flex size-6 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-gray-200"
								>
									<UserIcon class="size-3.5 text-gray-500" />
								</span>
								{#if selectedTruckDriver}
									<span class="text-gray-600">
										Driver
										<strong class="ml-1 font-semibold text-gray-900">
											{selectedTruckDriver.name}
										</strong>
									</span>
								{:else}
									<span class="text-amber-700">No driver assigned to this truck yet.</span>
								{/if}
							</div>
						{/if}
					</div>
				{/if}

				<!-- 6. Remarks -->
				<div class="space-y-1.5">
					<Label for="remarks" class={labelCls}>Remarks</Label>
					<Input
						id="remarks"
						bind:value={form.remarks}
						placeholder="Optional notes"
						class={inputCls}
					/>
				</div>
			</div>

			<!-- Footer -->
			<div
				class="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/70 px-5 py-3"
			>
				<Dialog.Close
					type="button"
					disabled={saving}
					class={buttonVariants({ variant: 'outline' }) + ' rounded-lg'}
				>
					Cancel
				</Dialog.Close>
				<Button
					type="submit"
					disabled={!canSave || saving}
					class="rounded-lg bg-red-700 px-5 font-semibold text-white shadow-sm shadow-red-700/25 hover:bg-red-600 disabled:opacity-50"
				>
					{#if saving}
						Saving…
					{:else}
						Record movement
					{/if}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
