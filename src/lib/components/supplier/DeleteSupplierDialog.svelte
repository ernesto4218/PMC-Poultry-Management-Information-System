<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Loader2, Trash2Icon } from '@lucide/svelte';
	import type { FeedSupplier } from '#lib/types/feedSuppliers.ts';

	let {
		open = $bindable(),
		supplier = null,
		onconfirm
		//@ts-ignore
	} = $props<{
		open: boolean;
		supplier: FeedSupplier | null;
		onconfirm: () => Promise<void>;
	}>();

	let deleting = $state(false);

	async function handleConfirm() {
		deleting = true;
		try {
			await onconfirm();
		} finally {
			deleting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<span class="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600">
					<Trash2Icon class="h-4 w-4" />
				</span>
				Delete supplier
			</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete
				<span class="font-semibold text-gray-900">{supplier?.name ?? 'this supplier'}</span>? This
				action cannot be undone.
				{#if supplier}
					<span class="mt-2 block text-xs text-gray-500">
						Any feed products linked to this supplier will also need to be reassigned or removed.
					</span>
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="gap-2">
			<Button variant="outline" onclick={() => (open = false)} disabled={deleting}>Cancel</Button>
			<Button
				class="bg-red-700 text-white hover:bg-red-600"
				onclick={handleConfirm}
				disabled={deleting}
			>
				{#if deleting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Deleting…
				{:else}
					Delete
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
