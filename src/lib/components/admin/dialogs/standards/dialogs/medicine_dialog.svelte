<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import {
		PillIcon,
		AlertCircleIcon,
		LoaderCircleIcon,
		RefreshCwIcon,
		MapPinIcon
	} from '@lucide/svelte';
	import * as NativeSelect from '#lib/components/ui/native-select/index.js';
	import {
		MEDICINE_UNITS,
		type Item,
		type MedicineUnit
	} from '#lib/types/standards/medicines/items.ts';

	type Area = { id: string; name: string; createdAt: string; updatedAt: string };

	const DEFAULT_AM = '2-3hrs';
	const DEFAULT_AM_PM = '3 hrs';
	const DEFAULT_PM = '2-3 hrs';

	type ItemForm = {
		itemName: string;
		areaName: string;
		value: string;
		price: string;
		unit: MedicineUnit | '';
		amDuration: string;
		amPmDuration: string;
		pmDuration: string;
	};

	function emptyItemForm(): ItemForm {
		return {
			itemName: '',
			price: '',
			areaName: '',
			value: '',
			unit: '',
			amDuration: DEFAULT_AM,
			amPmDuration: DEFAULT_AM_PM,
			pmDuration: DEFAULT_PM
		};
	}

	function itemToForm(item: Item): ItemForm {
		return {
			itemName: item.itemName,
			areaName: item.areaName,
			value: String(item.value),
			price: String(item.price),
			unit: item.unit,
			amDuration: item.amDuration,
			amPmDuration: item.amPmDuration,
			pmDuration: item.pmDuration
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

	// ---- Areas ---------------------------------------------------------
	let areas = $state<Area[]>([]);
	let areasLoading = $state(false);
	let areasLoaded = $state(false);
	let areasError = $state('');

	async function loadAreas() {
		areasLoading = true;
		areasError = '';
		try {
			const res = await fetch('/api/standard/area');
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? `Failed to load areas (HTTP ${res.status}).`);
			}
			const data = (await res.json()) as Area[];
			areas = [...data].sort((a, b) => a.name.localeCompare(b.name));
			areasLoaded = true;
		} catch (err) {
			areasError = err instanceof Error ? err.message : 'Could not load areas.';
		} finally {
			areasLoading = false;
		}
	}

	$effect(() => {
		if (open) {
			form = item ? itemToForm(item) : emptyItemForm();
			submitError = '';
			if (!areasLoaded && !areasLoading) loadAreas();
		}
	});

	const isEdit = $derived(item !== null);
	const others = $derived(items.filter((i) => i.id !== item?.id));

	// Same medicine in the same area already exists → conflict.
	const duplicateItem = $derived(
		form.itemName.trim() !== '' &&
			form.areaName.trim() !== '' &&
			others.some(
				(i) =>
					i.itemName.toLowerCase() === form.itemName.trim().toLowerCase() &&
					i.areaName.toLowerCase() === form.areaName.trim().toLowerCase()
			)
	);

	// Stored area no longer in the list (e.g. area was deleted).
	const areaMissingFromList = $derived(
		form.areaName !== '' && areasLoaded && !areas.some((a) => a.name === form.areaName)
	);

	const valueText = $derived(String(form.value ?? '').trim());
	const valueNum = $derived(Number(valueText));
	const valueValid = $derived(valueText !== '' && Number.isFinite(valueNum) && valueNum >= 0);

	const priceText = $derived(String(form.price ?? '').trim());
	const priceNum = $derived(Number(priceText));
	const priceValid = $derived(priceText !== '' && Number.isFinite(priceNum) && priceNum >= 0);

	const canSave = $derived(
		form.itemName.trim() !== '' &&
			form.areaName.trim() !== '' &&
			form.unit !== '' &&
			valueValid &&
			priceValid &&
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
				areaName: form.areaName.trim(),
				value: valueNum,
				price: priceNum,
				unit: form.unit as MedicineUnit,
				amDuration: form.amDuration.trim() || DEFAULT_AM,
				amPmDuration: form.amPmDuration.trim() || DEFAULT_AM_PM,
				pmDuration: form.pmDuration.trim() || DEFAULT_PM
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

<Dialog.Root bind:open>
	<Dialog.Content class="min-w-xl gap-0 overflow-y-auto border-t-4 border-t-red-700 p-0">
		<Dialog.Header class="border-b border-gray-100 px-6 pt-5 pb-4">
			<Dialog.Title class="flex items-center gap-3 text-lg font-semibold text-gray-900">
				<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
					<PillIcon class="h-5 w-5" />
				</span>
				<span class="flex flex-col leading-tight">
					<span>{isEdit ? 'Edit medicine' : 'Add new medicine'}</span>
					<span class="text-sm font-normal text-gray-500">
						{isEdit
							? 'Update this medicine for the selected area.'
							: 'Register a new medicine in the Puting Manok System.'}
					</span>
				</span>
			</Dialog.Title>
			<Dialog.Description class="sr-only">
				{isEdit ? 'Edit the details of this medicine.' : 'Fill in the details to add a medicine.'}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="flex flex-col">
			<div class="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-5">
				<!-- Name -->
				<div class="space-y-1.5">
					<Label for="itemName" class={labelCls}>
						Name <span class="text-red-600">*</span>
					</Label>
					<Input
						id="itemName"
						bind:value={form.itemName}
						placeholder="e.g. Amilyte"
						required
						autocomplete="off"
						aria-invalid={duplicateItem}
						class={inputCls}
					/>
				</div>

				<!-- Area -->
				<div class="space-y-1.5">
					<Label for="areaName" class={labelCls}>
						Area <span class="text-red-600">*</span>
					</Label>
					<NativeSelect.Root
						id="areaName"
						class="w-full"
						bind:value={form.areaName}
						disabled={areasLoading || !!areasError}
					>
						<NativeSelect.Option value="">
							{areasLoading
								? 'Loading areas…'
								: areasError
									? 'Failed to load areas'
									: 'Select area'}
						</NativeSelect.Option>
						{#each areas as a (a.id)}
							<NativeSelect.Option value={a.name}>{a.name}</NativeSelect.Option>
						{/each}
						{#if areaMissingFromList}
							<NativeSelect.Option value={form.areaName}>
								{form.areaName} (area not found)
							</NativeSelect.Option>
						{/if}
					</NativeSelect.Root>

					{#if areasError}
						<p class="flex items-center gap-1.5 text-xs text-red-600" role="alert">
							<AlertCircleIcon class="h-3.5 w-3.5 shrink-0" />
							<span>{areasError}</span>
							<button
								type="button"
								onclick={loadAreas}
								class="inline-flex items-center gap-0.5 underline hover:no-underline"
							>
								<RefreshCwIcon class="h-3 w-3" /> Retry
							</button>
						</p>
					{:else if areaMissingFromList}
						<p class="text-xs text-amber-700">
							Stored area “{form.areaName}” is no longer in the area list.
						</p>
					{:else if areasLoaded && areas.length === 0}
						<p class="text-xs text-amber-700">
							No areas registered yet. Add one from the Areas page first.
						</p>
					{:else}
						<p class="flex items-center gap-1 text-xs text-gray-500">
							<MapPinIcon class="h-3 w-3" />
							Each area can have its own medicine values.
						</p>
					{/if}
				</div>

				<!-- Value + Price + Unit (single row on sm+) -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
					<div class="space-y-1.5">
						<Label for="value" class={labelCls}>
							Value <span class="text-red-600">*</span>
						</Label>
						<Input
							id="value"
							type="number"
							step="0.01"
							min="0"
							inputmode="decimal"
							bind:value={form.value}
							placeholder="e.g. 1.00"
							required
							aria-invalid={valueText !== '' && !valueValid}
							class={inputCls}
						/>
						{#if valueText !== '' && !valueValid}
							<p class="text-xs text-red-600">Enter a valid non-negative number.</p>
						{:else}
							<p class="text-xs text-gray-500">Up to 2 decimal places.</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<Label for="price" class={labelCls}>
							Price <span class="text-red-600">*</span>
						</Label>
						<Input
							id="price"
							type="number"
							step="0.01"
							min="0"
							inputmode="decimal"
							bind:value={form.price}
							placeholder="e.g. 100"
							required
							aria-invalid={priceText !== '' && !priceValid}
							class={inputCls}
						/>
						{#if priceText !== '' && !priceValid}
							<p class="text-xs text-red-600">Enter a valid non-negative number.</p>
						{:else}
							<p class="text-xs text-gray-500">Up to 2 decimal places.</p>
						{/if}
					</div>

					<div class="w-28 space-y-1.5">
						<Label for="unit" class={labelCls}>
							Unit <span class="text-red-600">*</span>
						</Label>
						<NativeSelect.Root id="unit" class="w-full" bind:value={form.unit}>
							<NativeSelect.Option value="">Select unit</NativeSelect.Option>
							{#each MEDICINE_UNITS as u (u)}
								<NativeSelect.Option value={u}>{u}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
					</div>
				</div>

				<!-- Daily duration -->
				<div class="space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
					<div class="flex items-center justify-between">
						<Label class={labelCls}>Daily duration</Label>
						<button
							type="button"
							onclick={() => {
								form.amDuration = DEFAULT_AM;
								form.amPmDuration = DEFAULT_AM_PM;
								form.pmDuration = DEFAULT_PM;
							}}
							class="text-xs text-gray-500 underline hover:text-gray-700"
						>
							Reset to defaults
						</button>
					</div>
					<p class="text-xs text-gray-500">
						How long to administer this medicine in each slot. Free text — e.g. "2-3hrs", "30 mins",
						"1-2 hrs".
					</p>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
						<div class="space-y-1">
							<Label for="amDuration" class="text-xs font-medium text-gray-600">AM</Label>
							<Input
								id="amDuration"
								bind:value={form.amDuration}
								placeholder="2-3hrs"
								maxlength={50}
								autocomplete="off"
								class="{inputCls} bg-white"
							/>
						</div>
						<div class="space-y-1">
							<Label for="amPmDuration" class="text-xs font-medium text-gray-600">AM-PM</Label>
							<Input
								id="amPmDuration"
								bind:value={form.amPmDuration}
								placeholder="3 hrs"
								maxlength={50}
								autocomplete="off"
								class="{inputCls} bg-white"
							/>
						</div>
						<div class="space-y-1">
							<Label for="pmDuration" class="text-xs font-medium text-gray-600">PM</Label>
							<Input
								id="pmDuration"
								bind:value={form.pmDuration}
								placeholder="2-3 hrs"
								maxlength={50}
								autocomplete="off"
								class="{inputCls} bg-white"
							/>
						</div>
					</div>
				</div>

				{#if duplicateItem}
					<p class="flex items-center gap-1.5 text-xs text-red-600" role="alert">
						<AlertCircleIcon class="h-3.5 w-3.5 shrink-0" />
						This medicine already exists for the selected area.
					</p>
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
						disabled={!canSave || saving || areas.length === 0}
						class="bg-red-700 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
					>
						{#if saving}
							<LoaderCircleIcon class="mr-1.5 h-4 w-4 animate-spin" />
							Saving…
						{:else}
							{isEdit ? 'Save changes' : 'Add medicine'}
						{/if}
					</Button>
				</div>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
