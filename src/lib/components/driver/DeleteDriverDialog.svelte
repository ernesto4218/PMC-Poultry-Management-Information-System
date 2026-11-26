<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Trash2Icon, AlertTriangleIcon } from '@lucide/svelte';
	import type { Driver } from '#lib/types/drivers.ts';

	let {
		open = $bindable(false),
		driver,
		assignedTrucks = 0,
		onconfirm
	}: {
		open?: boolean;
		driver: Driver | null;
		assignedTrucks?: number;
		onconfirm: () => void;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[420px]">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold text-gray-900">Delete this driver?</Dialog.Title>
			<Dialog.Description>
				<span class="font-semibold text-gray-800">{driver?.name}</span>
				will be permanently removed. This can't be undone.
			</Dialog.Description>
		</Dialog.Header>
		{#if assignedTrucks > 0}
			<div
				class="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
			>
				<AlertTriangleIcon class="mt-0.5 h-4 w-4 shrink-0" />
				<p>
					This driver is assigned to
					<strong>{assignedTrucks}</strong>
					truck{assignedTrucks === 1 ? '' : 's'}. Deleting will unassign them.
				</p>
			</div>
		{/if}
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
