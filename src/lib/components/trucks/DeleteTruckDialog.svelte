<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Trash2Icon } from '@lucide/svelte';
	import type { Truck } from '#lib/types/trucks.ts';

	let {
		open = $bindable(false),
		truck,
		onconfirm
	}: {
		open?: boolean;
		truck: Truck | null;
		onconfirm: () => void;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[420px]">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold text-gray-900">Delete this truck?</Dialog.Title>
			<Dialog.Description>
				<span class="font-semibold text-gray-800">{truck?.plateNumber}</span>
				will be permanently removed. This can't be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="mt-2 flex justify-end gap-2">
			<Dialog.Close type="button" class={buttonVariants({ variant: 'outline' })}
				>Cancel</Dialog.Close
			>
			<Button class="bg-red-700 font-semibold text-white hover:bg-red-600" onclick={onconfirm}>
				<Trash2Icon class="mr-2 h-4 w-4" /> Delete
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
