<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { PackageIcon, LayersIcon, TagIcon } from '@lucide/svelte';
	import {
		emptyProductForm,
		feedStages,
		feedTypeOrder,
		type FeedProduct,
		type FeedProductForm
	} from '#lib/types/feedProducts.ts';
	import type { FeedSupplier } from '#lib/types/feedSuppliers.ts';

	let {
		open = $bindable(false),
		product = null,
		supplierId = '',
		suppliers = [],
		products = [],
		onsave
	}: {
		open?: boolean;
		product?: FeedProduct | null;
		supplierId?: string;
		suppliers?: FeedSupplier[];
		products?: FeedProduct[];
		onsave: (p: FeedProduct) => void | Promise<void>;
	} = $props();

	let form = $state<FeedProductForm>(emptyProductForm(''));
	let saving = $state(false);
	let submitError = $state('');

	$effect(() => {
		if (open) {
			form = product ? { ...product, id: undefined as any } : emptyProductForm(supplierId || '');
			if (product) {
				const { id: _id, ...rest } = product;
				form = rest;
			}
			submitError = '';
		}
	});

	const isEdit = $derived(product !== null);
	const supplier = $derived(suppliers.find((s) => s.id === form.supplierId) ?? null);

	// ── validation ──
	const others = $derived(
		products.filter((p) => p.supplierId === form.supplierId && p.id !== product?.id)
	);

	const duplicateStage = $derived(
		form.feedType.trim() !== '' &&
			form.stage.trim() !== '' &&
			others.some(
				(p) =>
					p.feedType.toLowerCase() === form.feedType.trim().toLowerCase() &&
					p.stage.toLowerCase() === form.stage.trim().toLowerCase()
			)
	);

	const canSave = $derived(
		form.supplierId.trim() !== '' &&
			form.feedType.trim() !== '' &&
			form.stage.trim() !== '' &&
			!duplicateStage
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving) return;

		saving = true;
		submitError = '';

		try {
			await onsave({
				id: product?.id ?? crypto.randomUUID(),
				...form,
				feedType: form.feedType.trim(),
				stage: form.stage.trim(),
				name: form.name.trim(),
				sku: form.sku.trim()
			});
			open = false;
		} catch (err) {
			submitError =
				err instanceof Error ? err.message : 'Could not save the product. Please try again.';
		} finally {
			saving = false;
		}
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[92vh] overflow-y-auto border-t-4 border-t-red-700 sm:max-w-[640px]">
		<Dialog.Header>
			<Dialog.Title class="text-xl font-bold text-gray-900">
				{isEdit ? 'Edit product' : 'Add product'}
			</Dialog.Title>
			<Dialog.Description>
				{#if supplier}
					Product for <span class="font-semibold text-gray-900">{supplier.name}</span>.
				{:else}
					Add a feed product to this supplier's catalog.
				{/if}
				Only the fields marked <span class="font-semibold text-red-600">*</span> are required.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="space-y-7 py-2">
			<!-- 1. Product identity -->
			<section class="space-y-4">
				<div class="flex items-center gap-2 border-b border-gray-100 pb-2">
					<LayersIcon class="h-4 w-4 text-red-700" />
					<h3 class="text-sm font-semibold text-gray-900">Feed classification</h3>
				</div>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="feedType">Feed type <span class="text-red-600">*</span></Label>
						<Select.Root type="single" bind:value={form.feedType}>
							<Select.Trigger id="feedType" class="w-full">
								{form.feedType || 'Select feed type'}
							</Select.Trigger>
							<Select.Content>
								{#each feedTypeOrder as t (t)}
									<Select.Item value={t}>{t}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label for="stage">Stage / variant <span class="text-red-600">*</span></Label>
						<Input
							id="stage"
							bind:value={form.stage}
							list="stage-suggestions"
							placeholder="e.g. Starter, BRDR. Booster"
							required
							aria-invalid={duplicateStage}
							class={inputCls}
						/>
						<datalist id="stage-suggestions">
							{#each feedStages as s (s)}
								<option value={s}></option>
							{/each}
						</datalist>
						{#if duplicateStage}
							<p class="text-xs text-red-600">
								This feed type + stage combo already exists for this supplier.
							</p>
						{:else}
							<p class="text-xs text-gray-500">
								Brand-specific names are fine (e.g. “BRDR. Booster”).
							</p>
						{/if}
					</div>
				</div>
			</section>

			<!-- 2. Product details -->
			<section class="space-y-4">
				<div class="flex items-center gap-2 border-b border-gray-100 pb-2">
					<PackageIcon class="h-4 w-4 text-red-700" />
					<h3 class="text-sm font-semibold text-gray-900">Product details</h3>
				</div>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-2 sm:col-span-2">
						<Label for="name">Display name</Label>
						<Input
							id="name"
							bind:value={form.name}
							placeholder="e.g. Cargill Broiler Starter 20kg"
							class={inputCls}
						/>
						<p class="text-xs text-gray-500">
							Optional. If left blank, the stage is used as the label.
						</p>
					</div>
					<div class="space-y-2 sm:col-span-2">
						<Label for="sku">SKU / product code</Label>
						<Input id="sku" bind:value={form.sku} placeholder="e.g. BR-STR-20" class={inputCls} />
					</div>
					<div class="space-y-2 sm:col-span-2">
						<Label for="active">Status</Label>
						<label class="flex cursor-pointer items-center gap-2">
							<input
								id="active"
								type="checkbox"
								checked={form.active === 1}
								onchange={(e) =>
									(form.active = (e.currentTarget as HTMLInputElement).checked ? 1 : 0)}
								class="h-4 w-4 rounded border-gray-300 text-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-0"
							/>
							<span class="text-sm text-gray-700">This product is currently active</span>
						</label>
					</div>
				</div>
			</section>

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
					disabled={!canSave || saving}
					class="bg-red-700 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
				>
					{#if saving}
						Saving…
					{:else}
						{isEdit ? 'Save changes' : 'Add product'}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
