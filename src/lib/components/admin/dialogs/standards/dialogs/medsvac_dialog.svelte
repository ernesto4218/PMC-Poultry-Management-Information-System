<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { PackageIcon, AlertCircleIcon, LoaderCircleIcon } from '@lucide/svelte';
	import * as Select from '#lib/components/ui/select/index.ts';
	import * as NativeSelect from '#lib/components/ui/native-select/index.js';
	import { farmTypes } from '#lib/types/farms.ts';

	type Item = {
		id: string;
		itemName: string;
		farmType: string;
		category: string;
		perThousand: number;
	};

	type ItemForm = {
		itemName: string;
		farmType: string;
		category: string;
		customCategory: string;
		perThousand: string;
	};

	const OTHER = 'Other';
	const categories = ['MED&VAC', OTHER];

	function emptyItemForm(): ItemForm {
		return {
			itemName: '',
			farmType: '',
			category: '',
			customCategory: '',
			perThousand: ''
		};
	}

	function itemToForm(item: Item): ItemForm {
		const isKnown =
			item.category !== '' && item.category !== OTHER && categories.includes(item.category);
		return {
			itemName: item.itemName,
			farmType: item.farmType,
			category: isKnown ? item.category : OTHER,
			customCategory: isKnown ? '' : item.category,
			perThousand: String(item.perThousand)
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
		/** May be async. Throw an Error to keep the dialog open and show its message. */
		onsave: (item: Item) => void | Promise<void>;
	} = $props();

	let form = $state<ItemForm>(emptyItemForm());
	let saving = $state(false);
	let submitError = $state('');

	$effect(() => {
		if (open) {
			form = item ? itemToForm(item) : emptyItemForm();
			submitError = '';
		}
	});

	const isEdit = $derived(item !== null);

	const others = $derived(items.filter((i) => i.id !== item?.id));

	const duplicateItem = $derived(
		form.itemName.trim() !== '' &&
			form.farmType.trim() !== '' &&
			others.some(
				(i) =>
					i.itemName.toLowerCase() === form.itemName.trim().toLowerCase() &&
					i.farmType.toLowerCase() === form.farmType.trim().toLowerCase()
			)
	);

	// Effective category — either a preset, or the custom text when "Other" is chosen.
	const resolvedCategory = $derived(
		form.category === OTHER ? form.customCategory.trim() : form.category
	);

	// A number input can bind a number (or null when cleared) instead of a string,
	// so always coerce before calling string methods.
	const perThousandText = $derived(String(form.perThousand ?? '').trim());
	const perThousandValue = $derived(Number(perThousandText));
	const perThousandValid = $derived(
		perThousandText !== '' && Number.isFinite(perThousandValue) && perThousandValue >= 0
	);

	const canSave = $derived(
		form.itemName.trim() !== '' &&
			form.farmType.trim() !== '' &&
			resolvedCategory !== '' &&
			perThousandValid &&
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
				farmType: form.farmType.trim(),
				category: resolvedCategory,
				perThousand: perThousandValue
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

<Dialog.Root bind:open>
	<Dialog.Content class="min-w-xl gap-0 overflow-y-auto border-t-4 border-t-red-700 p-0 ">
		<Dialog.Header class="border-b border-gray-100 px-6 pt-5 pb-4">
			<Dialog.Title class="flex items-center gap-3 text-lg font-semibold text-gray-900">
				<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
					<PackageIcon class="h-5 w-5" />
				</span>
				<span class="flex flex-col leading-tight">
					<span>{isEdit ? 'Edit item' : 'Add new Meds and VAC'}</span>
					<span class="text-sm font-normal text-gray-500">
						{isEdit
							? 'Update the details of this item.'
							: 'Register a new standard in the Puting Manok System.'}
					</span>
				</span>
			</Dialog.Title>
			<Dialog.Description class="sr-only">
				{isEdit ? 'Edit the details of this item.' : 'Fill in the details to add a new item.'}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="flex flex-col">
			<div class="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-5">
				<!-- Item name -->
				<div class="space-y-1.5">
					<Label for="itemName" class={labelCls}>
						Item name <span class="text-red-600">*</span>
					</Label>
					<Input
						id="itemName"
						bind:value={form.itemName}
						placeholder="e.g. AMILYTE"
						required
						autocomplete="off"
						aria-invalid={duplicateItem}
						class={inputCls}
					/>
				</div>

				<!-- Farm type + Category -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="farmType" class={labelCls}>
							Farm type <span class="text-red-600">*</span>
						</Label>
						<NativeSelect.Root id="farmType" class="w-full" bind:value={form.farmType}>
							<NativeSelect.Option value="">Select type</NativeSelect.Option>
							{#each farmTypes as type}
								<NativeSelect.Option value={type}>{type}</NativeSelect.Option>
							{/each}
						</NativeSelect.Root>
					</div>

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
						This item already exists for the selected farm type.
					</p>
				{/if}

				<!-- Custom category -->
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

				<!-- Per 1,000 -->
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
						required
						aria-invalid={perThousandText !== '' && !perThousandValid}
						class={inputCls}
					/>
					{#if perThousandText !== '' && !perThousandValid}
						<p class="text-xs text-red-600">Enter a valid non-negative number.</p>
					{:else}
						<p class="text-xs text-gray-500">Up to 2 decimal places.</p>
					{/if}
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
						disabled={!canSave || saving}
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
