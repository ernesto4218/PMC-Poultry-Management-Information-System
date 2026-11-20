<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { BuildingIcon } from '@lucide/svelte';
	import { emptyFarmForm, farmToForm, farmTypes } from '#lib/types/farms.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import type { Farm, FarmForm } from '#lib/types/farms.ts';

	let {
		open = $bindable(false),
		farm = null,
		farms,
		memories,
		onsave
	}: {
		open?: boolean;
		farm?: Farm | null;
		farms: Farm[];
		memories: { id: string; name: string }[];
		/** May be async. Throw an Error to keep the dialog open and show its message. */
		onsave: (farm: Farm) => void | Promise<void>;
	} = $props();

	let form = $state<FarmForm>(emptyFarmForm());
	let saving = $state(false);
	let submitError = $state('');

	$effect(() => {
		if (open) {
			form = farm ? farmToForm(farm) : emptyFarmForm();
			submitError = '';
		}
	});

	const isEdit = $derived(farm !== null);

	const others = $derived(farms.filter((f) => f.id !== farm?.id));

	const selectedMemoryName = $derived(
		memories.find((m) => m.id === form.particularsMemoryId)?.name
	);

	const duplicateName = $derived(
		form.name.trim() !== '' &&
			others.some((f) => f.name.toLowerCase() === form.name.trim().toLowerCase())
	);
	const duplicateCode = $derived(
		form.code.trim() !== '' &&
			others.some((f) => f.code.toLowerCase() === form.code.trim().toLowerCase())
	);

	const canSave = $derived(
		form.name.trim() !== '' &&
			form.code.trim() !== '' &&
			Number.isFinite(form.volume) &&
			form.volume > 0 &&
			Number.isInteger(form.staff) &&
			form.staff >= 0 &&
			!duplicateName &&
			!duplicateCode
	);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving) return;

		saving = true;
		submitError = '';

		try {
			await onsave({
				id: farm?.id ?? crypto.randomUUID(),
				...form,
				name: form.name.trim(),
				code: form.code.trim(),
				address: form.address.trim(),
				particularsMemoryId: form.particularsMemoryId || null
			});
			open = false;
		} catch (err) {
			submitError =
				err instanceof Error ? err.message : 'Could not save the farm. Please try again.';
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
				{isEdit ? 'Edit farm' : 'Add farm'}
			</Dialog.Title>
			<Dialog.Description>
				{isEdit
					? 'Update the details of this farm site.'
					: 'Register a new farm site in the Puting Manok System.'}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="space-y-4 py-2">
			<div class="flex items-center gap-2 border-b border-gray-100 pb-2">
				<BuildingIcon class="h-4 w-4 text-red-700" />
				<h3 class="text-sm font-semibold text-gray-900">Farm details</h3>
			</div>

			<div class="space-y-2">
				<Label for="name">Name <span class="text-red-600">*</span></Label>
				<Input
					id="name"
					bind:value={form.name}
					placeholder="e.g. Puting Manok - Pagadian Branch"
					required
					aria-invalid={duplicateName}
					class={inputCls}
				/>
				{#if duplicateName}
					<p class="text-xs text-red-600">This farm name already exists.</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="code">Code <span class="text-red-600">*</span></Label>
				<Input
					id="code"
					bind:value={form.code}
					placeholder="e.g. CC-1001"
					required
					aria-invalid={duplicateCode}
					class={inputCls}
				/>
				{#if duplicateCode}
					<p class="text-xs text-red-600">This farm code is already assigned.</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="type">Type <span class="text-red-600">*</span></Label>
				<Select.Root type="single" bind:value={form.type}>
					<Select.Trigger id="type" class="w-full">
						{form.type || 'Select farm type'}
					</Select.Trigger>
					<Select.Content>
						{#each farmTypes as t (t)}
							<Select.Item value={t}>{t}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-2">
				<Label for="volume">Volume <span class="text-red-600">*</span></Label>
				<Input
					id="volume"
					type="number"
					min="0"
					step="any"
					bind:value={form.volume}
					placeholder="e.g. 5000"
					required
					class={inputCls}
				/>
			</div>

			<div class="space-y-2">
				<Label for="staff">Staff <span class="text-red-600">*</span></Label>
				<Input
					id="staff"
					type="number"
					min="0"
					step="1"
					bind:value={form.staff}
					placeholder="e.g. 5"
					required
					class={inputCls}
				/>
				<p class="text-xs text-gray-500">Number of staff assigned to this farm.</p>
			</div>

			<div class="space-y-2">
				<Label for="memory">Particulars memory</Label>
				<Select.Root type="single" bind:value={form.particularsMemoryId}>
					<Select.Trigger id="memory" class="w-full">
						{selectedMemoryName ?? 'No memory'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">No memory</Select.Item>
						{#each memories as m (m.id)}
							<Select.Item value={m.id}>{m.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
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
						{isEdit ? 'Save changes' : 'Add farm'}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
