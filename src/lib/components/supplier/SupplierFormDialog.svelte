<!-- src/lib/components/admin/dialogs/suppliers/SupplierFormDialog.svelte -->
<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { TruckIcon, UserIcon, StickyNoteIcon } from '@lucide/svelte';
	import {
		emptySupplierForm,
		supplierStatuses,
		supplierToForm,
		type FeedSupplier,
		type FeedSupplierForm
	} from '#lib/types/feedSuppliers.ts';

	let {
		open = $bindable(false),
		supplier = null,
		suppliers,
		onsave
	}: {
		open?: boolean;
		supplier?: FeedSupplier | null;
		suppliers: FeedSupplier[];
		/** May be async. Throw an Error to keep the dialog open and show its message. */
		onsave: (supplier: FeedSupplier) => void | Promise<void>;
	} = $props();

	let form = $state<FeedSupplierForm>(emptySupplierForm());
	let saving = $state(false);
	let submitError = $state('');

	// Reset / populate the form every time the dialog opens
	$effect(() => {
		if (open) {
			form = supplier ? supplierToForm(supplier) : emptySupplierForm();
			submitError = '';
		}
	});

	const isEdit = $derived(supplier !== null);

	// ── validation ──
	const others = $derived(suppliers.filter((s) => s.id !== supplier?.id));

	const duplicateName = $derived(
		form.name.trim() !== '' &&
			others.some((s) => s.name.toLowerCase() === form.name.trim().toLowerCase())
	);
	const duplicateCode = $derived(
		form.code.trim() !== '' &&
			others.some((s) => s.code.toLowerCase() === form.code.trim().toLowerCase())
	);
	const invalidEmail = $derived(
		form.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
	);

	const canSave = $derived(
		form.name.trim() !== '' &&
			form.code.trim() !== '' &&
			!duplicateName &&
			!duplicateCode &&
			!invalidEmail
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving) return;

		saving = true;
		submitError = '';

		try {
			await onsave({
				id: supplier?.id ?? crypto.randomUUID(),
				...form,
				name: form.name.trim(),
				code: form.code.trim(),
				contactPerson: form.contactPerson.trim(),
				email: form.email.trim(),
				phone: form.phone.trim(),
				address: form.address.trim(),
				notes: form.notes.trim()
			});
			open = false;
		} catch (err) {
			submitError =
				err instanceof Error ? err.message : 'Could not save the supplier. Please try again.';
		} finally {
			saving = false;
		}
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[92vh] overflow-y-auto border-t-4 border-t-red-700 sm:max-w-[720px]">
		<Dialog.Header>
			<Dialog.Title class="text-xl font-bold text-gray-900">
				{isEdit ? 'Edit supplier' : 'Add supplier'}
			</Dialog.Title>
			<Dialog.Description>
				{isEdit
					? 'Update the contact details of this feed supplier.'
					: 'Register a new feed supplier in the Puting Manok System.'}
				Only the fields marked <span class="font-semibold text-red-600">*</span> are required — you can
				fill in the rest later.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="space-y-7 py-2">
			<!-- 1. Identity -->
			<section class="space-y-4">
				<div class="flex items-center gap-2 border-b border-gray-100 pb-2">
					<TruckIcon class="h-4 w-4 text-red-700" />
					<h3 class="text-sm font-semibold text-gray-900">Supplier identity</h3>
				</div>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="name">Supplier name <span class="text-red-600">*</span></Label>
						<Input
							id="name"
							bind:value={form.name}
							placeholder="e.g. B-Meg Feeds Inc."
							required
							aria-invalid={duplicateName}
							class={inputCls}
						/>
						{#if duplicateName}
							<p class="text-xs text-red-600">A supplier with this name already exists.</p>
						{/if}
					</div>
					<div class="space-y-2">
						<Label for="code">Supplier code <span class="text-red-600">*</span></Label>
						<Input
							id="code"
							bind:value={form.code}
							placeholder="e.g. SUP-001"
							required
							aria-invalid={duplicateCode}
							class={inputCls}
						/>
						{#if duplicateCode}
							<p class="text-xs text-red-600">This supplier code is already in use.</p>
						{/if}
					</div>
					<div class="space-y-2 sm:col-span-2">
						<Label for="status">Status</Label>
						<Select.Root type="single" bind:value={form.status}>
							<Select.Trigger id="status" class="w-full">
								{form.status || 'Select status'}
							</Select.Trigger>
							<Select.Content>
								{#each supplierStatuses as s (s)}
									<Select.Item value={s}>{s}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<p class="text-xs text-gray-500">Whether this supplier is currently active.</p>
					</div>
				</div>
			</section>

			<!-- 2. Contact -->
			<section class="space-y-4">
				<div class="flex items-center gap-2 border-b border-gray-100 pb-2">
					<UserIcon class="h-4 w-4 text-red-700" />
					<h3 class="text-sm font-semibold text-gray-900">Contact information</h3>
				</div>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="contactPerson">Contact person</Label>
						<Input
							id="contactPerson"
							bind:value={form.contactPerson}
							placeholder="Full name"
							class={inputCls}
						/>
					</div>
					<div class="space-y-2">
						<Label for="phone">Phone</Label>
						<Input
							id="phone"
							bind:value={form.phone}
							placeholder="+63 900 000 0000"
							class={inputCls}
						/>
					</div>
					<div class="space-y-2 sm:col-span-2">
						<Label for="email">Email</Label>
						<Input
							id="email"
							type="email"
							bind:value={form.email}
							placeholder="sales@supplier.com"
							aria-invalid={invalidEmail}
							class={inputCls}
						/>
						{#if invalidEmail}
							<p class="text-xs text-red-600">Enter a valid email address.</p>
						{/if}
					</div>
					<div class="space-y-2 sm:col-span-2">
						<Label for="address">Address</Label>
						<Input
							id="address"
							bind:value={form.address}
							placeholder="Street, city, province"
							class={inputCls}
						/>
					</div>
				</div>
			</section>

			<!-- 3. Notes -->
			<section class="space-y-4">
				<div class="flex items-center gap-2 border-b border-gray-100 pb-2">
					<StickyNoteIcon class="h-4 w-4 text-red-700" />
					<h3 class="text-sm font-semibold text-gray-900">Additional notes</h3>
				</div>
				<div class="space-y-2">
					<Label for="notes">Internal notes</Label>
					<Textarea
						id="notes"
						bind:value={form.notes}
						rows={3}
						placeholder="Internal notes about this supplier…"
					/>
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
						{isEdit ? 'Save changes' : 'Add supplier'}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
