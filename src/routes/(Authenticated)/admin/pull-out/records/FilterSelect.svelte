<script lang="ts">
	import * as Select from '#lib/components/ui/select/index.ts';

	type Option = { value: string; label: string };

	let {
		value = $bindable(),
		options,
		label,
		class: cls = 'w-[160px]'
	}: { value: string; options: Option[]; label: string; class?: string } = $props();

	const current = $derived(options.find((o) => o.value === value)?.label ?? options[0]?.label);
</script>

<Select.Root type="single" bind:value>
	<Select.Trigger class="h-10 rounded-lg border-gray-300 text-sm {cls}" aria-label={label}>
		<span class="truncate">{current}</span>
	</Select.Trigger>
	<Select.Content>
		{#each options as o (o.value)}
			<Select.Item value={o.value}>{o.label}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
