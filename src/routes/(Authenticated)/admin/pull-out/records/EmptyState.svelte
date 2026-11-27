<script lang="ts">
	import { InboxIcon } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.ts';

	let { filtered, onclear }: { filtered: boolean; onclear: () => void } = $props();
</script>

<div class="mx-auto flex max-w-sm flex-col items-center text-center">
	<div
		class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"
	>
		<InboxIcon class="h-6 w-6" />
	</div>
	{#if filtered}
		<p class="font-semibold text-gray-900">No matching pull-outs</p>
		<p class="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
		<Button variant="outline" class="mt-4" onclick={onclear}>Clear filters</Button>
	{:else}
		<p class="font-semibold text-gray-900">No pull-outs yet</p>
		<p class="mt-1 text-sm text-gray-500">
			Save a budget placement with FEEDS entries and they will appear here.
		</p>
	{/if}
</div>
