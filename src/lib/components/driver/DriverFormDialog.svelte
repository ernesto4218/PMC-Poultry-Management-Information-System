<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { UserIcon } from '@lucide/svelte';
	import { emptyDriverForm, driverToForm, driverStatuses } from '#lib/types/drivers.ts';
	import type { Driver, DriverForm } from '#lib/types/drivers.ts';

	let {
		open = $bindable(false),
		driver = null,
		drivers,
		onsave
	}: {
		open?: boolean;
		driver?: Driver | null;
		drivers: Driver[];
		onsave: (driver: Driver) => void | Promise<void>;
	} = $props();

	let form = $state<DriverForm>(emptyDriverForm());
	let saving = $state(false);
	let submitError = $state('');

	$effect(() => {
		if (open) {
			form = driver ? driverToForm(driver) : emptyDriverForm();
			submitError = '';
		}
	});

	const isEdit = $derived(driver !== null);
	const others = $derived(drivers.filter((d) => d.id !== driver?.id));

	const duplicateName = $derived(
		form.name.trim() !== '' &&
			others.some((d) => d.name.toLowerCase() === form.name.trim().toLowerCase())
	);

	const canSave = $derived(form.name.trim() !== '' && !duplicateName);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving) return;
		saving = true;
		submitError = '';
		try {
			await onsave({
				id: driver?.id ?? crypto.randomUUID(),
				...form,
				name: form.name.trim(),
				phone: form.phone.trim(),
				address: form.address.trim(),
				notes: form.notes.trim()
			});
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save the driver.';
		} finally {
			saving = false;
		}
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="border-t-4 border-t-red-700 sm:max-w-[480px]">
		<Dialog.Header>
			<Dialog.Title class="text-xl font-bold text-gray-900">
				{isEdit ? 'Edit driver' : 'Add driver'}
			</Dialog.Title>
			<Dialog.Description>
				{isEdit ? 'Update the details of this driver.' : 'Register a new driver.'}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="space-y-4 py-2">
			<div class="flex items-center gap-2 border-b border-gray-100 pb-2">
				<UserIcon class="h-4 w-4 text-red-700" />
				<h3 class="text-sm font-semibold text-gray-900">Driver details</h3>
			</div>

			<div class="space-y-2">
				<Label for="name">Full name <span class="text-red-600">*</span></Label>
				<Input
					id="name"
					bind:value={form.name}
					placeholder="e.g. Juan dela Cruz"
					required
					aria-invalid={duplicateName}
					class={inputCls}
				/>
				{#if duplicateName}
					<p class="text-xs text-red-600">A driver with this name already exists.</p>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-2">
					<Label for="phone">Phone</Label>
					<Input
						id="phone"
						bind:value={form.phone}
						placeholder="e.g. 0917 123 4567"
						class={inputCls}
					/>
				</div>
				<div class="space-y-2">
					<Label for="status">Status</Label>
					<Select.Root type="single" bind:value={form.status}>
						<Select.Trigger id="status" class="w-full">
							{form.status || 'Select status'}
						</Select.Trigger>
						<Select.Content>
							{#each driverStatuses as s (s)}
								<Select.Item value={s}>{s}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<div class="space-y-2">
				<Label for="address">Address</Label>
				<Input
					id="address"
					bind:value={form.address}
					placeholder="e.g. Brgy. San Jose, Pagadian City"
					class={inputCls}
				/>
			</div>

			<div class="space-y-2">
				<Label for="notes">Notes</Label>
				<Input
					id="notes"
					bind:value={form.notes}
					placeholder="Optional notes about this driver"
					class={inputCls}
				/>
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
					{#if saving}Saving…{:else}{isEdit ? 'Save changes' : 'Add driver'}{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
