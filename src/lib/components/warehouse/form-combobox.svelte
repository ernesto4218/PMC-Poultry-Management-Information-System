<script lang="ts" module>
	export type ComboOption = {
		value: string;
		label: string;
		/** Muted second line, shown in both the trigger and the list */
		description?: string;
		/** Small pill next to the label */
		badge?: string;
	};
</script>

<script lang="ts">
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import * as Command from '#lib/components/ui/command/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Check, ChevronsUpDown } from '@lucide/svelte';
	import { tick, type Component } from 'svelte';

	let {
		id,
		value = $bindable(''),
		options,
		placeholder = 'Select…',
		searchPlaceholder = 'Search…',
		emptyText = 'No results found.',
		noun = '',
		clearLabel = '',
		mono = false,
		icon: Icon,
		disabled = false
	}: {
		id?: string;
		value?: string;
		options: ComboOption[];
		placeholder?: string;
		searchPlaceholder?: string;
		emptyText?: string;
		/** Plural noun for the count bar, e.g. "suppliers". Leave empty to hide the bar. */
		noun?: string;
		/** When set, adds a first item that clears the value (e.g. "No truck") */
		clearLabel?: string;
		/** Monospace label (codes, plate numbers) */
		mono?: boolean;
		icon?: Component<any>;
		disabled?: boolean;
	} = $props();

	let open = $state(false);
	let triggerRef = $state<HTMLButtonElement | null>(null);

	// Falls back to the raw value so a stale/manual value never renders as "empty"
	const selected = $derived<ComboOption | undefined>(
		options.find((o) => o.value === value) ?? (value ? { value, label: value } : undefined)
	);

	function choose(v: string) {
		value = v;
		open = false;
		tick().then(() => triggerRef?.focus());
	}

	const searchKey = (o: ComboOption) => `${o.label} ${o.description ?? ''} ${o.value}`;
	const labelCls = $derived(mono ? 'font-mono' : '');
</script>

<Popover.Root bind:open>
	<Popover.Trigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				{...props}
				{id}
				{disabled}
				variant="outline"
				role="combobox"
				aria-expanded={open}
				class="h-9 w-full min-w-0 justify-between gap-2 rounded-lg border-gray-200 bg-white px-3 py-0 text-left text-sm font-normal transition-colors hover:border-red-200 hover:bg-white focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 focus-visible:ring-offset-0 data-[state=open]:border-red-500 data-[state=open]:ring-2 data-[state=open]:ring-red-500/20"
			>
				{#if selected}
					<span class="flex min-w-0 flex-1 items-center gap-2">
						{#if Icon}<Icon class="size-4 shrink-0 text-gray-400" />{/if}
						<span class="max-w-[65%] shrink-0 truncate font-medium text-gray-900 {labelCls}">
							{selected.label}
						</span>
						{#if selected.badge}
							<span
								class="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[0.65rem] font-semibold text-red-700"
							>
								{selected.badge}
							</span>
						{/if}
						{#if selected.description}
							<span class="min-w-0 truncate text-xs text-gray-500">{selected.description}</span>
						{/if}
					</span>
				{:else}
					<span class="flex min-w-0 flex-1 items-center gap-2 text-gray-500">
						{#if Icon}<Icon class="size-4 shrink-0 text-gray-400" />{/if}
						<span class="truncate">{placeholder}</span>
					</span>
				{/if}
				<ChevronsUpDown class="size-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-[var(--bits-popover-anchor-width)] min-w-[320px] p-0" align="start">
		<Command.Root>
			<Command.Input placeholder={searchPlaceholder} />

			{#if noun}
				<div
					class="flex items-center justify-between border-b bg-gray-50/60 px-3 py-1 text-[0.7rem] text-gray-500"
				>
					<span>{options.length} {noun}</span>
					{#if value}
						<button type="button" onclick={() => choose('')} class="text-red-700 hover:underline">
							Clear
						</button>
					{/if}
				</div>
			{/if}

			<Command.List class="max-h-[240px]">
				<Command.Empty>{emptyText}</Command.Empty>
				<Command.Group>
					{#if clearLabel}
						<Command.Item
							value={`__clear ${clearLabel}`}
							onSelect={() => choose('')}
							class="flex items-center gap-2 py-2 text-gray-500"
						>
							<span class="flex-1 text-sm">{clearLabel}</span>
							{#if !value}<Check class="size-4 shrink-0 text-red-700" />{/if}
						</Command.Item>
					{/if}

					{#each options as o (o.value)}
						{@const on = o.value === value}
						<Command.Item
							value={searchKey(o)}
							onSelect={() => choose(o.value)}
							class="flex items-center gap-2 py-1.5"
						>
							<span class="flex min-w-0 flex-1 items-center gap-2">
								<span
									class="max-w-[65%] shrink-0 truncate text-sm {labelCls} {on
										? 'font-semibold text-red-700'
										: 'font-medium text-gray-900'}"
								>
									{o.label}
								</span>
								{#if o.badge}
									<span
										class="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[0.65rem] font-semibold text-red-700"
									>
										{o.badge}
									</span>
								{/if}
								{#if o.description}
									<span class="min-w-0 truncate text-xs text-gray-500">{o.description}</span>
								{/if}
							</span>
							{#if on}<Check class="size-4 shrink-0 text-red-700" />{/if}
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
