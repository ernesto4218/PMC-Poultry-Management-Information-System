<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { MapPinIcon, AlertCircleIcon, LoaderCircleIcon } from '@lucide/svelte';

	type Area = {
		id: string;
		name: string;
		createdAt: string;
		updatedAt: string;
	};

	let {
		open = $bindable(false),
		area = null,
		areas,
		onsave
	}: {
		open?: boolean;
		area?: Area | null;
		areas: Area[];
		onsave: (area: Area) => void | Promise<void>;
	} = $props();

	let name = $state('');
	let saving = $state(false);
	let submitError = $state('');

	$effect(() => {
		if (open) {
			name = area ? area.name : '';
			submitError = '';
		}
	});

	const isEdit = $derived(area !== null);
	const others = $derived(areas.filter((a) => a.id !== area?.id));

	const duplicateName = $derived(
		name.trim() !== '' && others.some((a) => a.name.toLowerCase() === name.trim().toLowerCase())
	);

	const canSave = $derived(name.trim() !== '' && name.trim().length <= 150 && !duplicateName);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving) return;
		saving = true;
		submitError = '';
		try {
			await onsave({
				id: area?.id ?? crypto.randomUUID(),
				name: name.trim(),
				createdAt: area?.createdAt ?? new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save the area.';
		} finally {
			saving = false;
		}
	}

	const inputCls =
		'h-10 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0';
	const labelCls = 'text-sm font-medium text-gray-700';
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="min-w-md gap-0 overflow-y-auto border-t-4 border-t-red-700 p-0">
		<Dialog.Header class="border-b border-gray-100 px-6 pt-5 pb-4">
			<Dialog.Title class="flex items-center gap-3 text-lg font-semibold text-gray-900">
				<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
					<MapPinIcon class="h-5 w-5" />
				</span>
				<span class="flex flex-col leading-tight">
					<span>{isEdit ? 'Edit area' : 'Add new area'}</span>
					<span class="text-sm font-normal text-gray-500">
						{isEdit ? 'Rename this area.' : 'Register a new area in the Puting Manok System.'}
					</span>
				</span>
			</Dialog.Title>
			<Dialog.Description class="sr-only">
				{isEdit ? 'Edit the name of this area.' : 'Enter a name for the new area.'}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="flex flex-col">
			<div class="space-y-5 px-6 py-5">
				<div class="space-y-1.5">
					<Label for="areaName" class={labelCls}>
						Name <span class="text-red-600">*</span>
					</Label>
					<Input
						id="areaName"
						bind:value={name}
						placeholder="e.g. CARUMBA"
						required
						autocomplete="off"
						maxlength={150}
						aria-invalid={duplicateName || name.trim().length > 150}
						class={inputCls}
					/>
					{#if duplicateName}
						<p class="flex items-center gap-1.5 text-xs text-red-600" role="alert">
							<AlertCircleIcon class="h-3.5 w-3.5 shrink-0" />
							An area with this name already exists.
						</p>
					{:else if name.trim().length > 150}
						<p class="text-xs text-red-600">Name must be 150 characters or fewer.</p>
					{:else if isEdit && area}
						<p class="text-xs text-gray-500">Added {new Date(area.createdAt).toLocaleString()}</p>
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
							{isEdit ? 'Save changes' : 'Add area'}
						{/if}
					</Button>
				</div>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
