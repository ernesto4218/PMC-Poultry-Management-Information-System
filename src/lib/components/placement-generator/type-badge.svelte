<script lang="ts">
	// @ts-nocheck
	import { cn } from '#lib/utils.ts';

	let { type }: { type?: string } = $props();

	const TYPE_STYLES = {
		CCS: 'bg-blue-50 text-blue-700 ring-blue-200',
		CON: 'bg-red-50 text-red-700 ring-red-200'
	};
</script>

{#if type}
	<span
		class={cn(
			'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
			TYPE_STYLES[type] ?? 'bg-gray-50 text-gray-600 ring-gray-500/20'
		)}
	>
		{type}
	</span>
{/if}
