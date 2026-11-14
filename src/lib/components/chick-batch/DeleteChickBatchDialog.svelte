<!-- src/lib/components/admin/dialogs/chick-batches/DeleteChickBatchDialog.svelte -->
<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Trash2Icon } from '@lucide/svelte';
	import type { ChickBatchWithFarm } from '#lib/types/chick-batches.ts';

	let {
		open = $bindable(false),
		batch,
		onconfirm
	}: {
		open?: boolean;
		batch: ChickBatchWithFarm | null;
		onconfirm: () => void;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[420px]">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold text-gray-900">Delete this batch?</Dialog.Title>
			<Dialog.Description>
				Batch <span class="font-mono font-semibold text-gray-800">{batch?.batchNumber}</span>
				({batch?.volume.toLocaleString()} chicks, {batch?.farm.name}) will be permanently removed.
				This can't be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="mt-2 flex justify-end gap-2">
			<Dialog.Close type="button" class={buttonVariants({ variant: 'outline' })}>
				Cancel
			</Dialog.Close>
			<Button class="bg-red-700 font-semibold text-white hover:bg-red-600" onclick={onconfirm}>
				<Trash2Icon class="mr-2 h-4 w-4" />
				Delete
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
