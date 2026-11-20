<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { LayersIcon, AlertCircleIcon, LoaderCircleIcon } from '@lucide/svelte';
	import type { ParticularMemory, ParticularMemoryInput } from '#lib/types/particulars.ts';

	let {
		open = $bindable(false),
		item = null,
		onsave
	}: {
		open?: boolean;
		item?: ParticularMemory | null;
		onsave: (p: ParticularMemoryInput) => Promise<void>;
	} = $props();

	let name = $state('');
	let notes = $state('');
	let saving = $state(false);
	let submitError = $state('');

	$effect(() => {
		if (open) {
			name = item?.name ?? '';
			notes = item?.notes ?? '';
			submitError = '';
		}
	});

	const isEdit = $derived(item !== null);
	const canSave = $derived(name.trim() !== '');

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving) return;
		saving = true;
		submitError = '';
		try {
			await onsave({ id: item?.id, name: name.trim(), notes: notes.trim() });
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save memory.';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="min-w-md gap-0 overflow-y-auto border-t-4 border-t-red-700 p-0">
		<Dialog.Header class="border-b border-gray-100 px-6 pt-5 pb-4">
			<Dialog.Title class="flex items-center gap-3 text-lg font-semibold text-gray-900">
				<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
					<LayersIcon class="h-5 w-5" />
				</span>
				{isEdit ? 'Edit memory' : 'Create new memory'}
			</Dialog.Title>
		</Dialog.Header>

		<form onsubmit={submit} class="flex flex-col">
			<div class="space-y-4 px-6 py-5">
				<div class="space-y-1.5">
					<Label for="memoryName" class="text-sm font-medium text-gray-700">
						Name <span class="text-red-600">*</span>
					</Label>
					<Input
						id="memoryName"
						bind:value={name}
						placeholder="e.g. Dry season CCS"
						required
						autocomplete="off"
						class="h-10"
					/>
				</div>
				<div class="space-y-1.5">
					<Label for="memoryNotes" class="text-sm font-medium text-gray-700">
						Notes <span class="text-gray-400">(optional)</span>
					</Label>
					<Input
						id="memoryNotes"
						bind:value={notes}
						placeholder="Short description…"
						autocomplete="off"
						maxlength={500}
						class="h-10"
					/>
				</div>
				{#if submitError}
					<p class="flex items-center gap-1.5 text-xs text-red-600">
						<AlertCircleIcon class="h-3.5 w-3.5 shrink-0" />{submitError}
					</p>
				{/if}
			</div>
			<Dialog.Footer
				class="mb-2 flex w-full items-end gap-2 border-t border-gray-100 bg-gray-50/60"
			>
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
						<LoaderCircleIcon class="mr-1.5 h-4 w-4 animate-spin" />Saving…
					{:else}
						{isEdit ? 'Save changes' : 'Create memory'}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
