<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { TruckIcon, ReceiptIcon } from '@lucide/svelte';
	import type { TrackedDispatch } from '#lib/services/dispatch.service.ts';

	let {
		open = $bindable(false),
		trip = null
	}: {
		open?: boolean;
		trip?: TrackedDispatch | null;
	} = $props();

	let arrivalDate = $state('');
	let supplierDrNumber = $state('');
	let drReceivedDate = $state('');
	let forwardedAccountingDate = $state('');
	let saleInvoiceNumber = $state('');
	let amount = $state('');
	let dueDate = $state('');

	let saving = $state(false);
	let submitError = $state('');

	// Prefill whenever the dialog opens for a trip.
	$effect(() => {
		if (!open || !trip) return;
		arrivalDate = toDateInput(trip.arrivalDate);
		supplierDrNumber = trip.supplierDrNumber ?? '';
		drReceivedDate = toDateInput(trip.drReceivedDate);
		forwardedAccountingDate = toDateInput(trip.forwardedAccountingDate);
		saleInvoiceNumber = trip.saleInvoiceNumber ?? '';
		amount = trip.amount === null ? '' : String(trip.amount);
		dueDate = toDateInput(trip.dueDate);
		submitError = '';
	});

	const amountInvalid = $derived(amount !== '' && !(Number(amount) >= 0));
	const canSave = $derived(!!trip && !amountInvalid);

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';

	function toDateInput(v: unknown): string {
		if (!v) return '';
		if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
		return String(v).slice(0, 10);
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto border-t-4 border-t-red-700 sm:max-w-[520px]">
		<Dialog.Header>
			<Dialog.Title class="text-xl font-bold text-gray-900">
				Update trip {trip?.tripCode ?? ''}
			</Dialog.Title>
			<Dialog.Description>
				{trip?.plateNumber ?? ''} · record the delivery receipt and billing details for this trip.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/updateDelivery"
			class="space-y-4 py-2"
			use:enhance={() => {
				if (!canSave || saving) return ({ cancel }) => cancel();
				saving = true;
				submitError = '';
				return async ({ result, update }) => {
					saving = false;
					if (result.type === 'success') {
						open = false;
						await update();
					} else if (result.type === 'failure') {
						submitError = (result.data?.message as string) ?? 'Could not save. Please try again.';
					} else {
						submitError = 'Something went wrong. Please try again.';
					}
				};
			}}
		>
			<input type="hidden" name="dispatchId" value={trip?.id ?? ''} />

			<!-- DELIVERY -->
			<div class="flex items-center gap-2 border-b border-gray-100 pb-2">
				<TruckIcon class="h-4 w-4 text-red-700" />
				<h3 class="text-sm font-semibold text-gray-900">Delivery</h3>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<Label for="arrivalDate">Date arrival</Label>
					<Input
						id="arrivalDate"
						name="arrivalDate"
						type="date"
						bind:value={arrivalDate}
						class={inputCls}
					/>
					<p class="text-xs text-gray-500">Setting this marks the trip as delivered.</p>
				</div>

				<div class="space-y-2">
					<Label for="supplierDrNumber">Supplier DR #</Label>
					<Input
						id="supplierDrNumber"
						name="supplierDrNumber"
						bind:value={supplierDrNumber}
						maxlength={60}
						placeholder="e.g. DR-004521"
						class={inputCls}
					/>
				</div>

				<div class="space-y-2 sm:col-span-2">
					<Label for="drReceivedDate">Date DR received</Label>
					<Input
						id="drReceivedDate"
						name="drReceivedDate"
						type="date"
						bind:value={drReceivedDate}
						class={inputCls}
					/>
				</div>
			</div>

			<!-- BILLING -->
			<div class="flex items-center gap-2 border-b border-gray-100 pt-2 pb-2">
				<ReceiptIcon class="h-4 w-4 text-red-700" />
				<h3 class="text-sm font-semibold text-gray-900">Billing</h3>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="space-y-2 sm:col-span-2">
					<Label for="forwardedAccountingDate">Date forwarded to accounting</Label>
					<Input
						id="forwardedAccountingDate"
						name="forwardedAccountingDate"
						type="date"
						bind:value={forwardedAccountingDate}
						class={inputCls}
					/>
				</div>

				<div class="space-y-2">
					<Label for="saleInvoiceNumber">Sale invoice #</Label>
					<Input
						id="saleInvoiceNumber"
						name="saleInvoiceNumber"
						bind:value={saleInvoiceNumber}
						maxlength={60}
						placeholder="e.g. SI-10234"
						class={inputCls}
					/>
				</div>

				<div class="space-y-2">
					<Label for="amount">Amount</Label>
					<div class="relative">
						<span
							class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-400"
						>
							₱
						</span>
						<Input
							id="amount"
							name="amount"
							type="number"
							min="0"
							step="0.01"
							inputmode="decimal"
							bind:value={amount}
							placeholder="0.00"
							aria-invalid={amountInvalid}
							class="pl-7 text-right font-mono {inputCls}"
						/>
					</div>
					{#if amountInvalid}
						<p class="text-xs text-red-600">Amount must be zero or more.</p>
					{/if}
				</div>

				<div class="space-y-2 sm:col-span-2">
					<Label for="dueDate">Due date</Label>
					<Input id="dueDate" name="dueDate" type="date" bind:value={dueDate} class={inputCls} />
				</div>
			</div>

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
					{saving ? 'Saving…' : 'Save details'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
