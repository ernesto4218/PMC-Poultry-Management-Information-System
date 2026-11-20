<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { CopyIcon, LoaderCircleIcon, AlertCircleIcon } from '@lucide/svelte';
	import type { ParticularMemory } from '#lib/types/particulars.ts';

	let {
		open = $bindable(false),
		source = null,
		onsave
	}: {
		open?: boolean;
		source?: ParticularMemory | null;
		onsave: (payload: { name: string; notes: string }) => Promise<void>;
	} = $props();

	let name = $state('');
	let notes = $state('');
	let saving = $state(false);
	let errorMsg = $state('');

	// Reset the form whenever the dialog re-opens for a new source
	$effect(() => {
		if (open && source) {
			name = `${source.name} (copy)`;
			notes = source.notes ?? '';
			errorMsg = '';
			saving = false;
		}
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) {
			errorMsg = 'Name is required.';
			return;
		}
		saving = true;
		errorMsg = '';
		try {
			await onsave({ name: trimmed, notes: notes.trim() });
			open = false;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to duplicate memory.';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<form onsubmit={submit}>
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2">
					<CopyIcon class="h-5 w-5 text-red-700" /> Duplicate memory
				</Dialog.Title>
				<Dialog.Description>
					{#if source}
						Creates a copy of <span class="font-semibold text-gray-900">{source.name}</span>
						with the same {source.itemCount} item{source.itemCount === 1 ? '' : 's'}, formulas,
						quantities and prices. You can rename it below.
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			<div class="grid gap-3 py-4">
				<div class="grid gap-1.5">
					<label for="dup-name" class="text-sm font-medium text-gray-700">Name</label>
					<Input id="dup-name" bind:value={name} placeholder="Memory name" class="h-10" />
				</div>
				<div class="grid gap-1.5">
					<label for="dup-notes" class="text-sm font-medium text-gray-700">
						Notes <span class="text-xs font-normal text-gray-400">(optional)</span>
					</label>
					<textarea
						id="dup-notes"
						bind:value={notes}
						rows={3}
						placeholder="Describe this memory…"
						class="w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:outline-none"
					></textarea>
				</div>

				{#if errorMsg}
					<div
						role="alert"
						class="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-700"
					>
						<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMsg}</span>
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Button type="button" variant="outline" disabled={saving} onclick={() => (open = false)}>
					Cancel
				</Button>
				<Button type="submit" disabled={saving} class="bg-red-700 text-white hover:bg-red-600">
					{#if saving}
						<LoaderCircleIcon class="mr-2 h-4 w-4 animate-spin" />Duplicating…
					{:else}
						<CopyIcon class="mr-2 h-4 w-4" />Duplicate
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
