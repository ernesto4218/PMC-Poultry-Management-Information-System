<script>
	import { invalidateAll } from '$app/navigation';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import Droplets from '@lucide/svelte/icons/droplets';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import * as Command from '#lib/components/ui/command/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { FARM_GROUPS } from '#lib/types/medication-memory.ts';

	/** memory: { CCS: MemoryColumn[], CON: MemoryColumn[] }, medicines: Item[] */
	let { memory, medicines, initialGroup = 'CCS' } = $props();

	let open = $state(false);
	let group = $state(initialGroup);
	let pickerOpen = $state(false);
	let busy = $state(false);
	let error = $state('');

	const list = $derived(memory[group] ?? []);

	// Only medicines of this group's area that aren't in the memory yet
	const available = $derived(
		medicines.filter(
			(m) => m.areaName.trim().toUpperCase() === group && !list.some((c) => c.id === m.id)
		)
	);

	async function run(action, medicineId) {
		busy = true;
		error = '';
		try {
			const res = await fetch('/api/medication-memory', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action, group, medicineId })
			});
			if (!res.ok) error = (await res.json()).error ?? 'Something went wrong.';
			else await invalidateAll();
		} finally {
			busy = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline" size="sm" class="h-8 gap-1.5 border-red-200 text-xs">
				<Settings2 class="size-3.5 text-red-700" />
				Medication memory
			</Button>
		{/snippet}
	</Dialog.Trigger>

	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Medication memory</Dialog.Title>
			<Dialog.Description>
				The generator uses this order for every farm of the selected type.
			</Dialog.Description>
		</Dialog.Header>

		<!-- Group switch -->
		<div class="flex gap-1 rounded-lg bg-amber-50 p-1">
			{#each FARM_GROUPS as g}
				<button
					type="button"
					onclick={() => (group = g)}
					class="flex-1 rounded-md px-3 py-1 text-xs font-semibold transition {group === g
						? 'bg-red-700 text-white shadow-sm'
						: 'text-gray-600 hover:bg-amber-100'}"
				>
					{g}
					<span class="opacity-70">({memory[g]?.length ?? 0})</span>
				</button>
			{/each}
		</div>

		<!-- Ordered list -->
		<ol
			class="max-h-72 divide-y divide-amber-100 overflow-y-auto rounded-lg border border-amber-200"
		>
			<!-- fixed columns -->
			{#each ['Water Gallons', 'Water Liters'] as fixed}
				<li class="flex items-center gap-2 bg-amber-50/60 px-3 py-1.5 text-xs text-gray-600">
					<Droplets class="size-3.5 text-amber-600" />
					<span class="font-medium">{fixed}</span>
					<Badge variant="secondary" class="ml-auto text-[10px]">fixed</Badge>
				</li>
			{/each}

			{#each list as col, i (col.id)}
				<li class="flex items-center gap-2 px-3 py-1.5 text-xs">
					<span class="w-5 text-right font-mono text-gray-400">{i + 1}</span>
					<span class="min-w-0 flex-1 truncate font-medium text-gray-900">{col.name}</span>
					<span class="text-[10px] text-gray-500">{col.value} {col.unit}</span>
					<Button
						variant="ghost"
						size="icon"
						class="size-6"
						disabled={busy || i === 0}
						onclick={() => run('up', col.id)}
						aria-label="Move {col.name} up"
					>
						<ArrowUp class="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						class="size-6"
						disabled={busy || i === list.length - 1}
						onclick={() => run('down', col.id)}
						aria-label="Move {col.name} down"
					>
						<ArrowDown class="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						class="size-6 hover:bg-red-100 hover:text-red-700"
						disabled={busy}
						onclick={() => run('remove', col.id)}
						aria-label="Remove {col.name}"
					>
						<X class="size-3.5" />
					</Button>
				</li>
			{:else}
				<li class="px-3 py-4 text-center text-xs text-gray-500">
					No medicines yet for {group}.
					<button
						type="button"
						class="font-semibold text-red-700 underline"
						onclick={() => run('seed')}
					>
						Load defaults
					</button>
				</li>
			{/each}
		</ol>

		{#if error}
			<p class="text-xs text-red-700">{error}</p>
		{/if}

		<!-- Add -->
		<Popover.Root bind:open={pickerOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						class="h-8 w-full justify-between bg-red-700 text-xs text-white hover:bg-red-800"
						disabled={busy}
					>
						<span class="flex items-center gap-1.5"><Plus class="size-3.5" /> Add to {group}</span>
						<ChevronsUpDown class="size-3 opacity-70" />
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-[var(--bits-popover-anchor-width)] p-0" align="start">
				<Command.Root>
					<Command.Input placeholder="Search {group} medicines…" />
					<Command.List class="max-h-56">
						<Command.Empty>No medicine available.</Command.Empty>
						{#each available as m (m.id)}
							<Command.Item
								value={m.id}
								keywords={[m.itemName, m.unit]}
								onSelect={() => {
									pickerOpen = false;
									run('add', m.id);
								}}
							>
								<span class="flex-1 truncate">{m.itemName}</span>
								<span class="text-[10px] text-gray-500">{m.value} {m.unit}</span>
							</Command.Item>
						{/each}
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	</Dialog.Content>
</Dialog.Root>
