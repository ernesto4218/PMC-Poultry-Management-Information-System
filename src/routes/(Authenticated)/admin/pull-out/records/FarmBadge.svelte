<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { typeStyle } from './utils';

	let { name, code, type }: { name: string; code: string; type: string | null } = $props();
</script>

<span class="inline-flex flex-wrap items-center gap-1.5 font-semibold text-gray-900">
	{name}
	<Badge variant="secondary">{code}</Badge>
	{#if type}
		<span
			class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset {typeStyle(
				type
			)}"
		>
			{type}
		</span>
	{/if}
</span>
