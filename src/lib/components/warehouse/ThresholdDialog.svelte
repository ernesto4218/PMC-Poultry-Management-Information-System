<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { ArrowUpDownIcon } from '@lucide/svelte';
	import type { FeedInventoryRow } from '#lib/types/feed-stock.ts';

	let {
		open = $bindable(false),
		row,
		onsave
	}: {
		open?: boolean;
		row: FeedInventoryRow | null;
		onsave: (feedProductId: string, minStock: number) => void | Promise<void>;
	} = $props();

	let minStock = $state(0);
	let saving = $state(false);
	let submitError = $state('');

	$effect(() => {
		if (open && row) {
			minStock = row.minStock;
			submitError = '';
		}
	});

	const canSave = $derived(Number.isInteger(minStock) && minStock >= 0);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!canSave || saving || !row) return;
		saving = true;
		submitError = '';
		try {
			await onsave(row.feedProductId, minStock);
			open = false;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Could not save threshold.';
		} finally {
			saving = false;
		}
	}

	const inputCls = 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="border-t-4 border-t-red-700 sm:max-w-[420px]">
		<Dialog.Header>
			<Dialog.Title class="text-xl font-bold text-gray-900">Low-stock threshold</Dialog.Title>
			<Dialog.Description>
				Set the minimum sack count for <strong>{row?.productName ?? 'this product'}</strong>. A
				warning badge shows when on-hand reaches this number.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={submit} class="space-y-4 py-2">
			<div class="flex items-center gap-2 border-b border-gray-100 pb-2">
				<ArrowUpDownIcon class="h-4 w-4 text-red-700" />
				<h3 class="text-sm font-semibold text-gray-900">Threshold</h3>
			</div>

			<div class="rounded-lg bg-stone-50 p-3 text-sm">
				<p class="text-gray-600">
					Current on-hand: <strong>{row?.onHand.toLocaleString() ?? 0}</strong> sacks
				</p>
			</div>

			<div class="space-y-2">
				<Label for="minStock">Minimum stock (sacks) <span class="text-red-600">*</span></Label>
				<Input
					id="minStock"
					type="number"
					min="0"
					step="1"
					bind:value={minStock}
					required
					class={inputCls}
				/>
				<p class="text-xs text-gray-500">Set to 0 to disable the low-stock warning.</p>
			</div>

			{#if submitError}
				<div
					role="alert"
					class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
				>
					{submitError}
				</div>
			{/if}

			<Dialog.Footer class="flex justify-end gap-2 border-t border-gray-100 pt-4">
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
						Saving…
					{:else}
						Save threshold
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
