<script lang="ts">
	import { AlertTriangleIcon, TruckIcon } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import type { PulloutStore } from './pullout-store.svelte';

	let { store }: { store: PulloutStore } = $props();

	const TEXT = { over: 'text-rose-700', warn: 'text-amber-700', ok: 'text-gray-900' };
	const BAR = { over: 'bg-rose-500', warn: 'bg-amber-500', ok: 'bg-emerald-500' };
</script>

{#if store.selectedCount > 0}
	<div class="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
		<div
			class="flex w-full max-w-2xl items-center gap-4 rounded-2xl border border-gray-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur"
		>
			<div class="flex min-w-0 flex-col">
				<p class="truncate text-xs font-medium text-gray-500">
					{store.selectedCount}
					{store.selectedCount === 1 ? 'row' : 'rows'} selected
				</p>
				<div class="mt-1 flex items-center gap-2">
					<span class="text-sm font-semibold {TEXT[store.tone]}">
						{store.totalBags}
						<span class="text-xs font-normal text-gray-500">/ {store.capacity} bags</span>
					</span>
					<div class="h-1.5 w-32 overflow-hidden rounded-full bg-gray-200">
						<div
							class="h-full rounded-full transition-all {BAR[store.tone]}"
							style="width: {Math.min(100, (store.totalBags / store.capacity) * 100)}%"
						></div>
					</div>
					{#if store.overCapacity}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-200"
						>
							<AlertTriangleIcon class="h-3 w-3" /> Over capacity
						</span>
					{/if}
				</div>
			</div>
			<div class="ml-auto flex items-center gap-2">
				<Button variant="ghost" class="text-gray-600" onclick={store.clearSelection}>Clear</Button>
				<Button class="bg-red-700 text-white hover:bg-red-800" onclick={store.openDrawer}>
					<TruckIcon class="mr-1.5 h-4 w-4" />
					Build Load / Dispatch
				</Button>
			</div>
		</div>
	</div>
{/if}
