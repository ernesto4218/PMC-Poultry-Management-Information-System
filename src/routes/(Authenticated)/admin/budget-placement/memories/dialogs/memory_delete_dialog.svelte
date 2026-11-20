<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Trash2Icon, LoaderCircleIcon } from '@lucide/svelte';
	import type { ParticularMemory } from '#lib/types/particulars.ts';

	let {
		open = $bindable(false),
		memory,
		onconfirm
	}: {
		open?: boolean;
		memory: ParticularMemory | null;
		onconfirm: () => Promise<void>;
	} = $props();

	let saving = $state(false);

	async function confirm() {
		saving = true;
		try {
			await onconfirm();
			open = false;
		} catch {
			// Parent already surfaced a toast — keep the dialog open so the user can retry or cancel.
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[420px]">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold text-gray-900">Delete this memory?</Dialog.Title>
			<Dialog.Description>
				{#if memory}
					<span class="font-semibold text-gray-800">{memory.name}</span>
					and all {memory.itemCount} item{memory.itemCount === 1 ? '' : 's'} will be permanently removed.
					This can't be undone.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if memory && memory.usedByFarms.length > 0}
			<div
				class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
			>
				<span class="font-semibold">
					{memory.usedByFarms.length}
					farm{memory.usedByFarms.length === 1 ? ' is' : 's are'} using this memory
				</span>
				— they'll be unlinked but not deleted.
			</div>
		{/if}

		<Dialog.Footer class="mt-2 flex justify-end gap-2">
			<Dialog.Close type="button" class={buttonVariants({ variant: 'outline' })} disabled={saving}>
				Cancel
			</Dialog.Close>
			<Button
				class="bg-red-700 font-semibold text-white hover:bg-red-600"
				onclick={confirm}
				disabled={saving}
			>
				{#if saving}
					<LoaderCircleIcon class="mr-2 h-4 w-4 animate-spin" />
				{:else}
					<Trash2Icon class="mr-2 h-4 w-4" />
				{/if}
				Delete
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
