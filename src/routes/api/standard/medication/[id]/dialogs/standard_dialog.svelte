<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { PillIcon, AlertCircleIcon, LoaderCircleIcon } from '@lucide/svelte';
	import type { StandardMedication } from '#lib/types/standards/medications/items.ts';

	let {
		open = $bindable(false),
		standard = null,
		onsave
	}: {
		open?: boolean;
		standard?: StandardMedication | null;
		onsave: (data: { id?: string; name: string; notes: string }) => void | Promise<void>;
	} = $props();

	let name = $state('');
	let notes = $state('');
	let saving = $state(false);
	let submitError = $state('');

	$effect(() => {
		if (open) {
			name = standard?.name ?? '';
			notes = standard?.notes ?? '';
			submitError = '';
		}
	});

	const isEdit = $derived(standard !== null);
	const canSave = $derived(name.trim() !== '');

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving) return;
		saving = true;
		submitError = '';
		try {
			await onsave({
				...(standard ? { id: standard.id } : {}),
				name: name.trim(),
				notes: notes.trim()
			});
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save.';
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
					<PillIcon class="h-5 w-5" />
				</span>
				<span class="flex flex-col leading-tight">
					<span>{isEdit ? 'Edit standard' : 'New medication standard'}</span>
					<span class="text-sm font-normal text-gray-500">
						{isEdit ? 'Update the standard details.' : 'Name the standard so farms can link to it.'}
					</span>
				</span>
			</Dialog.Title>
		</Dialog.Header>

		<form onsubmit={submit} class="flex flex-col">
			<div class="space-y-4 px-6 py-5">
				<div class="space-y-1.5">
					<Label for="name" class="text-sm font-medium text-gray-700">
						Name <span class="text-red-600">*</span>
					</Label>
					<Input
						id="name"
						bind:value={name}
						placeholder="e.g. Broiler Standard 2025"
						required
						autocomplete="off"
						maxlength={150}
						class="h-10 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0"
					/>
				</div>

				<div class="space-y-1.5">
					<Label for="notes" class="text-sm font-medium text-gray-700">Notes</Label>
					<textarea
						id="notes"
						bind:value={notes}
						placeholder="Optional description for staff…"
						maxlength={500}
						rows={3}
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0 focus-visible:outline-none"
					></textarea>
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
							{isEdit ? 'Save changes' : 'Create standard'}
						{/if}
					</Button>
				</div>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
