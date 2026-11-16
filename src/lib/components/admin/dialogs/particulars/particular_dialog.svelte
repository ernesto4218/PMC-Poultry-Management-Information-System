<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import {
		PackageIcon,
		AlertCircleIcon,
		LoaderCircleIcon,
		CalendarClockIcon,
		MinusIcon,
		PlusIcon
	} from '@lucide/svelte';
	import type { Particular, ParticularInput } from '#lib/types/particulars.ts';

	type ParticularForm = {
		name: string;
		qty: string;
		price: string;
		adjustDirection: 'add' | 'subtract';
		adjustDays: string;
	};

	function emptyForm(): ParticularForm {
		return { name: '', qty: '', price: '', adjustDirection: 'add', adjustDays: '' };
	}

	function itemToForm(p: Particular): ParticularForm {
		const signed = p.adjustmentDays;
		return {
			name: p.name,
			qty: String(p.qty),
			price: String(p.price),
			adjustDirection: signed != null && signed < 0 ? 'subtract' : 'add',
			adjustDays: signed == null ? '' : String(Math.abs(signed))
		};
	}

	let {
		open = $bindable(false),
		item = null,
		onsave
	}: {
		open?: boolean;
		item?: Particular | null;
		onsave: (p: ParticularInput) => Promise<void>;
	} = $props();

	let form = $state<ParticularForm>(emptyForm());
	let saving = $state(false);
	let submitError = $state('');

	$effect(() => {
		if (open) {
			form = item ? itemToForm(item) : emptyForm();
			submitError = '';
		}
	});

	const isEdit = $derived(item !== null);

	const qtyText = $derived(String(form.qty ?? '').trim());
	const qtyNum = $derived(Number(qtyText));
	const qtyValid = $derived(qtyText !== '' && Number.isInteger(qtyNum) && qtyNum >= 0);

	const priceText = $derived(String(form.price ?? '').trim());
	const priceNum = $derived(Number(priceText));
	const priceValid = $derived(priceText !== '' && Number.isFinite(priceNum) && priceNum >= 0);

	const daysText = $derived(String(form.adjustDays ?? '').trim());
	const daysNum = $derived(Number(daysText));
	const daysValid = $derived(
		daysText === '' || (Number.isInteger(daysNum) && daysNum >= 0 && daysNum <= 36500)
	);

	// Signed adjustment stored on the record. null = no adjustment.
	const signedAdjustment = $derived<number | null>(
		daysText === '' || !daysValid ? null : form.adjustDirection === 'subtract' ? -daysNum : daysNum
	);

	// Live preview: base = createdAt (edits) or today (new).
	const previewDate = $derived.by(() => {
		if (signedAdjustment == null) return null;
		const base = isEdit ? item?.createdAt : new Date().toISOString();
		if (!base) return null;
		const d = new Date(base);
		if (Number.isNaN(d.getTime())) return null;
		d.setDate(d.getDate() + signedAdjustment);
		return d.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	});

	const canSave = $derived(form.name.trim() !== '' && qtyValid && priceValid && daysValid);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving) return;
		saving = true;
		submitError = '';
		try {
			await onsave({
				id: item?.id ?? crypto.randomUUID(),
				name: form.name.trim(),
				qty: qtyNum,
				price: priceNum,
				adjustmentDays: signedAdjustment
			});
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save the particular.';
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
					<PackageIcon class="h-5 w-5" />
				</span>
				<span class="flex flex-col leading-tight">
					<span>{isEdit ? 'Edit particular' : 'Add new particular'}</span>
					<span class="text-sm font-normal text-gray-500">
						{isEdit ? 'Update the details of this particular.' : 'Register a new particular.'}
					</span>
				</span>
			</Dialog.Title>
			<Dialog.Description class="sr-only">
				{isEdit
					? 'Edit the details of this particular.'
					: 'Fill in the details to add a particular.'}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="flex flex-col">
			<div class="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-5">
				<!-- Name -->
				<div class="space-y-1.5">
					<Label for="name" class={labelCls}>
						Name <span class="text-red-600">*</span>
					</Label>
					<Input
						id="name"
						bind:value={form.name}
						placeholder="e.g. Chick booster feed"
						required
						autocomplete="off"
						class={inputCls}
					/>
				</div>

				<!-- QTY + Price -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="qty" class={labelCls}>
							QTY <span class="text-red-600">*</span>
						</Label>
						<Input
							id="qty"
							type="number"
							step="1"
							min="0"
							inputmode="numeric"
							bind:value={form.qty}
							placeholder="e.g. 10"
							required
							class={inputCls}
						/>
						{#if qtyText !== '' && !qtyValid}
							<p class="text-xs text-red-600">Enter a non-negative whole number.</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<Label for="price" class={labelCls}>
							Price (₱) <span class="text-red-600">*</span>
						</Label>
						<Input
							id="price"
							type="number"
							step="0.01"
							min="0"
							inputmode="decimal"
							bind:value={form.price}
							placeholder="e.g. 125.00"
							required
							class={inputCls}
						/>
						{#if priceText !== '' && !priceValid}
							<p class="text-xs text-red-600">Enter a non-negative number.</p>
						{/if}
					</div>
				</div>

				<!-- Adjustment date -->
				<div class="space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
					<div class="flex items-center justify-between">
						<Label class={labelCls}>
							Adjustment date <span class="text-gray-400">(optional)</span>
						</Label>
						<button
							type="button"
							onclick={() => {
								form.adjustDirection = 'add';
								form.adjustDays = '';
							}}
							class="text-xs text-gray-500 underline hover:text-gray-700"
						>
							Clear
						</button>
					</div>
					<p class="text-xs text-gray-500">
						Adjust this particular's date by adding or subtracting days from creation.
					</p>

					<div class="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
						<!-- Add / Minus toggle -->
						<div class="space-y-1">
							<Label class="text-xs font-medium text-gray-600">Operation</Label>
							<div
								class="inline-flex rounded-lg bg-gray-200 p-1"
								role="radiogroup"
								aria-label="Adjustment direction"
							>
								<button
									type="button"
									role="radio"
									aria-checked={form.adjustDirection === 'add'}
									onclick={() => (form.adjustDirection = 'add')}
									class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all {form.adjustDirection ===
									'add'
										? 'bg-white text-emerald-700 shadow-sm'
										: 'text-gray-600 hover:text-gray-900'}"
								>
									<PlusIcon class="h-3.5 w-3.5" />
									Add
								</button>
								<button
									type="button"
									role="radio"
									aria-checked={form.adjustDirection === 'subtract'}
									onclick={() => (form.adjustDirection = 'subtract')}
									class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all {form.adjustDirection ===
									'subtract'
										? 'bg-white text-red-700 shadow-sm'
										: 'text-gray-600 hover:text-gray-900'}"
								>
									<MinusIcon class="h-3.5 w-3.5" />
									Minus
								</button>
							</div>
						</div>

						<!-- Days -->
						<div class="space-y-1">
							<Label for="adjustDays" class="text-xs font-medium text-gray-600">Days</Label>
							<Input
								id="adjustDays"
								type="number"
								step="1"
								min="0"
								max="36500"
								inputmode="numeric"
								bind:value={form.adjustDays}
								placeholder="e.g. 7"
								autocomplete="off"
								class="{inputCls} bg-white"
							/>
						</div>
					</div>

					{#if previewDate && signedAdjustment != null}
						<p class="flex items-center gap-1 text-xs text-emerald-700">
							<CalendarClockIcon class="h-3.5 w-3.5" />
							Adjusted date: {previewDate}
							<span class="text-gray-500">
								({signedAdjustment > 0 ? '+' : ''}{signedAdjustment}
								{signedAdjustment === 1 || signedAdjustment === -1 ? 'day' : 'days'})
							</span>
						</p>
					{:else if daysText !== '' && !daysValid}
						<p class="text-xs text-red-600">Enter a whole number of days (0–36500).</p>
					{:else}
						<p class="flex items-center gap-1 text-xs text-gray-500">
							<CalendarClockIcon class="h-3 w-3" />
							No adjustment — uses the creation date.
						</p>
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
							{isEdit ? 'Save changes' : 'Add particular'}
						{/if}
					</Button>
				</div>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
