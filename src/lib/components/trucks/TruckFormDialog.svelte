<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { TruckIcon } from '@lucide/svelte';
	import { emptyTruckForm, truckToForm, truckStatuses } from '#lib/types/trucks.ts';
	import type { Truck, TruckForm } from '#lib/types/trucks.ts';
	import type { Driver } from '#lib/types/drivers.ts';

	let {
		open = $bindable(false),
		truck = null,
		trucks,
		drivers,
		onsave
	}: {
		open?: boolean;
		truck?: Truck | null;
		trucks: Truck[];
		drivers: Driver[];
		onsave: (truck: Truck) => void | Promise<void>;
	} = $props();

	let form = $state<TruckForm>(emptyTruckForm());
	let saving = $state(false);
	let submitError = $state('');

	$effect(() => {
		if (open) {
			form = truck ? truckToForm(truck) : emptyTruckForm();
			submitError = '';
		}
	});

	const isEdit = $derived(truck !== null);
	const others = $derived(trucks.filter((t) => t.id !== truck?.id));

	const selectedDriverName = $derived(drivers.find((d) => d.id === form.driverId)?.name);

	const duplicatePlate = $derived(
		form.plateNumber.trim() !== '' &&
			others.some((t) => t.plateNumber.toLowerCase() === form.plateNumber.trim().toLowerCase())
	);

	const canSave = $derived(
		form.plateNumber.trim() !== '' &&
			Number.isFinite(form.capacity) &&
			form.capacity >= 0 &&
			!duplicatePlate
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving) return;
		saving = true;
		submitError = '';
		try {
			await onsave({
				id: truck?.id ?? crypto.randomUUID(),
				...form,
				plateNumber: form.plateNumber.trim(),
				notes: form.notes.trim(),
				driverId: form.driverId || null
			});
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save the truck.';
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
				{isEdit ? 'Edit truck' : 'Add truck'}
			</Dialog.Title>
			<Dialog.Description>
				{isEdit ? 'Update the details of this truck.' : 'Register a new delivery truck.'}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="space-y-4 py-2">
			<div class="flex items-center gap-2 border-b border-gray-100 pb-2">
				<TruckIcon class="h-4 w-4 text-red-700" />
				<h3 class="text-sm font-semibold text-gray-900">Truck details</h3>
			</div>

			<div class="space-y-2">
				<Label for="plate">Plate number <span class="text-red-600">*</span></Label>
				<Input
					id="plate"
					bind:value={form.plateNumber}
					placeholder="e.g. ABC-1234"
					required
					aria-invalid={duplicatePlate}
					class={inputCls}
				/>
				{#if duplicatePlate}
					<p class="text-xs text-red-600">This plate number is already registered.</p>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-2">
					<Label for="capacity">Capacity <span class="text-red-600">*</span></Label>
					<Input
						id="capacity"
						type="number"
						min="0"
						step="1"
						bind:value={form.capacity}
						placeholder="e.g. 5000"
						required
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
							{#each truckStatuses as s (s)}
								<Select.Item value={s}>{s}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<div class="space-y-2">
				<Label for="driver">Assigned driver</Label>
				<Select.Root type="single" bind:value={form.driverId}>
					<Select.Trigger id="driver" class="w-full">
						{selectedDriverName ?? 'No driver'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">No driver</Select.Item>
						{#each drivers as d (d.id)}
							<Select.Item value={d.id}>{d.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-2">
				<Label for="notes">Notes</Label>
				<Input
					id="notes"
					bind:value={form.notes}
					placeholder="Optional notes about this truck"
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
					{#if saving}Saving…{:else}{isEdit ? 'Save changes' : 'Add truck'}{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
