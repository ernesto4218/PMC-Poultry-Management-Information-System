<script>
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import Droplets from '@lucide/svelte/icons/droplets';
	import Pill from '@lucide/svelte/icons/pill';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import * as Command from '#lib/components/ui/command/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { FARM_GROUPS } from '#lib/types/medication-memory.ts';
	import AgePicker from '../../../../../lib/components/admin/med-guide/age-picker.svelte';

	let { data, form } = $props();

	let group = $state('CCS');
	let pickerOpen = $state(false);
	let addForm = $state(null);
	let addId = $state('');

	const list = $derived(data.memory[group] ?? []);

	// Only medicines of this group's area that aren't in the memory yet
	const available = $derived(data.medicines.filter((m) => !list.some((c) => c.id === m.id)));
	const availableByArea = $derived.by(() => {
		const map = new Map();
		for (const m of available) {
			if (!map.has(m.areaName)) map.set(m.areaName, []);
			map.get(m.areaName).push(m);
		}
		return [...map.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([areaName, items]) => ({
				areaName,
				items: items.sort((a, b) => a.itemName.localeCompare(b.itemName))
			}));
	});

	async function pick(m) {
		addId = m.id;
		pickerOpen = false;
		await tick(); // let the hidden input pick up the new value
		addForm?.requestSubmit();
	}
</script>

<svelte:head>
	<title>Medication Memory | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="space-y-4">
		<!-- HEADER -->
		<div>
			<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Chick Management</p>
			<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Medication Memory</h1>
			<p class="mt-1 text-sm text-gray-500">
				The medication generator follows this order for every farm of the selected type.
			</p>
		</div>

		<!-- ONE CARD -->
		<section class="overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm">
			<!-- Header strip + group switch -->
			<div
				class="flex flex-wrap items-center justify-between gap-2 border-b border-red-100 bg-gradient-to-r from-red-50 to-amber-50 px-3 py-2"
			>
				<div class="flex items-center gap-2">
					<Pill class="size-4 text-red-700" />
					<h2 class="text-sm font-bold tracking-wide text-gray-900 uppercase">Order</h2>
					<Badge variant="secondary" class="bg-amber-100 text-amber-800 hover:bg-amber-100">
						{list.length} items
					</Badge>
				</div>

				<div class="flex gap-1 rounded-md bg-white/70 p-0.5 ring-1 ring-amber-200">
					{#each FARM_GROUPS as g}
						<button
							type="button"
							onclick={() => (group = g)}
							aria-pressed={group === g}
							class="rounded px-3 py-1 text-xs font-semibold transition {group === g
								? 'bg-red-700 text-white shadow-sm'
								: 'text-gray-600 hover:bg-amber-100'}"
						>
							{g}
							<span class="opacity-70">({data.memory[g]?.length ?? 0})</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Ordered list -->
			<ol class="divide-y divide-amber-100">
				{#each ['Water Gallons', 'Water Liters'] as fixed}
					<li class="flex items-center gap-2 bg-amber-50/60 px-3 py-1.5 text-xs text-gray-600">
						<Droplets class="size-3.5 text-amber-600" />
						<span class="font-medium">{fixed}</span>
						<Badge variant="secondary" class="ml-auto text-[10px]">fixed</Badge>
					</li>
				{/each}

				{#each list as col, i (col.id)}
					<li>
						<form method="POST" use:enhance class="flex items-center gap-2 px-3 py-1.5 text-xs">
							<input type="hidden" name="group" value={group} />
							<input type="hidden" name="medicineId" value={col.id} />

							<span class="w-5 text-right font-mono text-gray-400">{i + 1}</span>
							<span class="min-w-0 flex-1 truncate font-medium text-gray-900">{col.name}</span>
							<AgePicker {group} medicineId={col.id} name={col.name} ages={col.ages} />
							<span class="text-[10px] text-gray-500">{col.value} {col.unit}</span>

							<Button
								type="submit"
								formaction="?/move"
								name="direction"
								value="up"
								variant="ghost"
								size="icon"
								class="size-6"
								disabled={i === 0}
								aria-label="Move {col.name} up"
							>
								<ArrowUp class="size-3.5" />
							</Button>
							<Button
								type="submit"
								formaction="?/move"
								name="direction"
								value="down"
								variant="ghost"
								size="icon"
								class="size-6"
								disabled={i === list.length - 1}
								aria-label="Move {col.name} down"
							>
								<ArrowDown class="size-3.5" />
							</Button>
							<Button
								type="submit"
								formaction="?/remove"
								variant="ghost"
								size="icon"
								class="size-6 hover:bg-red-100 hover:text-red-700"
								aria-label="Remove {col.name}"
							>
								<X class="size-3.5" />
							</Button>
						</form>
					</li>
				{:else}
					<li class="px-3 py-5 text-center text-xs text-gray-500">
						<p>No medicines yet for {group}.</p>
						<form method="POST" action="?/seed" use:enhance class="mt-1">
							<input type="hidden" name="group" value={group} />
							<button type="submit" class="font-semibold text-red-700 underline">
								Load defaults
							</button>
						</form>
					</li>
				{/each}
			</ol>

			{#if form?.error}
				<p
					class="flex items-center gap-1.5 border-t border-red-100 bg-red-50 px-3 py-1.5 text-xs text-red-700"
				>
					<TriangleAlert class="size-3.5 shrink-0" />
					{form.error}
				</p>
			{/if}

			<!-- Add (hidden form submitted from the picker) -->
			<form
				bind:this={addForm}
				method="POST"
				action="?/add"
				use:enhance
				class="border-t border-red-100 p-3"
			>
				<input type="hidden" name="group" value={group} />
				<input type="hidden" name="medicineId" value={addId} />

				<Popover.Root bind:open={pickerOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								type="button"
								role="combobox"
								aria-expanded={pickerOpen}
								class="h-8 w-full justify-between bg-red-700 text-xs text-white hover:bg-red-800"
							>
								<span class="flex items-center gap-1.5">
									<Plus class="size-3.5" /> Add to {group}
								</span>
								<ChevronsUpDown class="size-3 opacity-70" />
							</Button>
						{/snippet}
					</Popover.Trigger>

					<Popover.Content class="w-[var(--bits-popover-anchor-width)] p-0" align="start">
						<Command.Root>
							<Command.Input placeholder="Search {group} medicines…" />
							<Command.List class="max-h-64">
								<Command.Empty>
									{available.length === 0
										? 'All medicines are already added.'
										: 'No medicine found.'}
								</Command.Empty>

								{#each availableByArea as area (area.areaName)}
									<Command.Group heading={area.areaName}>
										{#each area.items as m (m.id)}
											<Command.Item
												value={m.id}
												keywords={[m.itemName, m.areaName, m.unit]}
												onSelect={() => pick(m)}
											>
												<span class="flex-1 truncate">{m.itemName}</span>
												<span class="text-[10px] text-gray-500">{m.value} {m.unit}</span>
											</Command.Item>
										{/each}
									</Command.Group>
								{/each}
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</form>
		</section>
	</div>
</div>
