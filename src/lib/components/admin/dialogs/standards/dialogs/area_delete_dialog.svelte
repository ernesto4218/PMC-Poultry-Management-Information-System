<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { AlertCircleIcon, LoaderCircleIcon, Trash2Icon } from '@lucide/svelte';
	import type { Area } from '#lib/types/standards/area/+items.ts';

	let {
		open = $bindable(false),
		area = null,
		onconfirm
	}: {
		open?: boolean;
		area?: Area | null;
		onconfirm: (area: Area) => void | Promise<void>;
	} = $props();

	let deleting = $state(false);
	let errorMsg = $state('');

	$effect(() => {
		if (open) errorMsg = '';
	});

	async function confirm() {
		if (!area || deleting) return;
		deleting = true;
		errorMsg = '';
		try {
			await onconfirm(area);
			open = false;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not delete the area.';
		} finally {
			deleting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="min-w-md gap-0 overflow-y-auto border-t-4 border-t-red-700 p-0">
		<Dialog.Header class="border-b border-gray-100 px-6 pt-5 pb-4">
			<Dialog.Title class="flex items-center gap-3 text-lg font-semibold text-gray-900">
				<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
					<Trash2Icon class="h-5 w-5" />
				</span>
				<span class="flex flex-col leading-tight">
					<span>Delete area</span>
					<span class="text-sm font-normal text-gray-500">This action cannot be undone.</span>
				</span>
			</Dialog.Title>
		</Dialog.Header>

		<div class="space-y-4 px-6 py-5">
			<p class="text-sm text-gray-700">
				Delete <span class="font-semibold">{area?.name}</span>? Any references from other standards
				will no longer resolve, so double-check before continuing.
			</p>

			{#if errorMsg}
				<div
					role="alert"
					class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
				>
					<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" />
					<span>{errorMsg}</span>
				</div>
			{/if}
		</div>

		<Dialog.Footer class="mb-2 flex w-full items-end gap-2 border-t border-gray-100 bg-gray-50/60">
			<div class="flex gap-2">
				<Dialog.Close
					type="button"
					disabled={deleting}
					class={buttonVariants({ variant: 'outline' })}
				>
					Cancel
				</Dialog.Close>
				<Button
					type="button"
					onclick={confirm}
					disabled={deleting || !area}
					class="bg-red-700 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
				>
					{#if deleting}
						<LoaderCircleIcon class="mr-1.5 h-4 w-4 animate-spin" />
						Deleting…
					{:else}
						Delete area
					{/if}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
