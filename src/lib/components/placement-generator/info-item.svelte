<script lang="ts">
	// @ts-nocheck
	import { cn } from '#lib/utils.ts';

	let {
		icon: Icon,
		label,
		value,
		mono = false
	}: {
		icon: any;
		label: string;
		value: string;
		mono?: boolean;
	} = $props();
</script>

<div class="flex items-start gap-2 rounded-lg">
	<div
		class="flex size-5 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm ring-1 ring-amber-200/70"
	>
		<Icon class="size-3" />
	</div>

	<div class="min-w-0">
		<p class="text-[10px] font-semibold tracking-wider text-amber-700/80 uppercase">
			{label}
		</p>

		<p class={cn('mt-0.5 text-xs font-medium break-words text-gray-900', mono && 'font-mono')}>
			{value}
		</p>
	</div>
</div>
