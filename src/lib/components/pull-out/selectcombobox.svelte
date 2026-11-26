<script lang="ts">
	import { tick, type Component } from 'svelte';
	import { CheckIcon, ChevronsUpDownIcon } from '@lucide/svelte';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import * as Command from '#lib/components/ui/command/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { cn } from '#lib/utils.js';

	type Option = { value: string; label: string; description?: string };

	let {
		options,
		value = $bindable(''),
		placeholder = 'Select...',
		searchPlaceholder = 'Search...',
		emptyText = 'No results found.',
		icon: Icon
	}: {
		options: Option[];
		value?: string;
		placeholder?: string;
		searchPlaceholder?: string;
		emptyText?: string;
		icon?: Component<{ class?: string }>;
	} = $props();

	let open = $state(false);
	let triggerRef = $state<HTMLButtonElement | null>(null);

	const selected = $derived(options.find((o) => o.value === value));

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => triggerRef?.focus());
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				role="combobox"
				aria-expanded={open}
				class="h-10 w-full justify-between rounded-lg border-gray-300 font-normal"
			>
				<span class="flex min-w-0 items-center gap-2">
					{#if Icon}
						<Icon class="size-4 shrink-0 text-gray-400" />
					{/if}
					<span class={cn('truncate', !selected && 'text-muted-foreground')}>
						{selected ? selected.label : placeholder}
					</span>
				</span>
				<ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-(--bits-popover-anchor-width) min-w-[260px] p-0" align="start">
		<Command.Root>
			<Command.Input placeholder={searchPlaceholder} />
			<Command.List class="max-h-64">
				<Command.Empty>{emptyText}</Command.Empty>
				<Command.Group>
					{#each options as option (option.value)}
						<Command.Item
							value={`${option.label} ${option.description ?? ''}`}
							onSelect={() => {
								value = option.value;
								closeAndFocusTrigger();
							}}
							class="cursor-pointer py-2"
						>
							<CheckIcon class={cn('mr-2 size-4', value !== option.value && 'text-transparent')} />
							<div class="flex flex-col">
								<span class="font-medium">{option.label}</span>
								{#if option.description}
									<span class="text-xs text-muted-foreground">{option.description}</span>
								{/if}
							</div>
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
