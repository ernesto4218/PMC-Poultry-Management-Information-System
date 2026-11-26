<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Trash2Icon, AlertTriangleIcon } from '@lucide/svelte';
	import { movementTypeLabels, type FeedMovementRow } from '#lib/types/feed-stock.ts';

	let {
		open = $bindable(false),
		movement,
		onconfirm
	}: {
		open?: boolean;
		movement: FeedMovementRow | null;
		onconfirm: () => void;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[420px]">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold text-gray-900">Delete this movement?</Dialog.Title>
			<Dialog.Description>
				{movement
					? `${movementTypeLabels[movement.movementType]} of ${movement.qty} sacks for ${movement.productName} will be removed from the ledger.`
					: 'This movement will be removed.'}
			</Dialog.Description>
		</Dialog.Header>

		<div
			class="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
		>
			<AlertTriangleIcon class="mt-0.5 h-4 w-4 shrink-0" />
			<p>
				Deleting this movement will <strong>reverse its stock effect</strong>. This can't be undone.
			</p>
		</div>

		<Dialog.Footer class="mt-2 flex justify-end gap-2">
			<Dialog.Close type="button" class={buttonVariants({ variant: 'outline' })}>
				Cancel
			</Dialog.Close>
			<Button class="bg-red-700 font-semibold text-white hover:bg-red-600" onclick={onconfirm}>
				<Trash2Icon class="mr-2 h-4 w-4" /> Delete
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
