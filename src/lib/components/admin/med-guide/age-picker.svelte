<script>
	import { enhance } from '$app/forms';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { AGES, parseAgeRanges, summarizeAges } from '#lib/types/medication-memory.ts';

	let { group, medicineId, name, ages = [] } = $props();

	let open = $state(false);
	let selected = $state([]);
	let rangeText = $state('');

	const toggle = (a) =>
		(selected = selected.includes(a) ? selected.filter((x) => x !== a) : [...selected, a]);

	function applyRange() {
		selected = [...new Set([...selected, ...parseAgeRanges(rangeText)])];
		rangeText = '';
	}
</script>

<Popover.Root
	bind:open
	onOpenChange={(o) => {
		if (o) {
			selected = [...ages];
			rangeText = '';
		}
	}}
>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				type="button"
				variant="outline"
				size="sm"
				class="h-6 max-w-44 gap-1 border-amber-200 px-2 text-[10px]"
				aria-label="Set ages for {name}"
			>
				<CalendarDays class="size-3 shrink-0 text-amber-600" />
				<span class="truncate {ages.length ? 'text-gray-900' : 'text-amber-700'}">
					{ages.length ? summarizeAges(ages) : 'Set ages'}
				</span>
			</Button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-80 space-y-2.5 p-3" align="end">
		<p class="text-xs font-semibold text-gray-900">{name}: ages given</p>

		<div class="grid grid-cols-7 gap-1">
			{#each AGES as a (a)}
				<button
					type="button"
					onclick={() => toggle(a)}
					aria-pressed={selected.includes(a)}
					class="h-7 rounded text-[11px] font-semibold transition {selected.includes(a)
						? 'bg-red-700 text-white'
						: 'bg-amber-50 text-gray-700 hover:bg-amber-100'}"
				>
					{a}
				</button>
			{/each}
		</div>

		<div class="flex gap-1.5">
			<Input
				bind:value={rangeText}
				placeholder="Range, e.g. 0-5, 7, 10-20"
				class="h-7 text-xs"
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						applyRange();
					}
				}}
			/>
			<Button type="button" variant="outline" size="sm" class="h-7 text-xs" onclick={applyRange}>
				Add
			</Button>
		</div>

		<div class="flex items-center justify-between gap-2">
			<div class="flex gap-1">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-7 text-xs"
					onclick={() => (selected = [...AGES])}
				>
					All
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-7 text-xs"
					onclick={() => (selected = [])}
				>
					Clear
				</Button>
			</div>

			<form
				method="POST"
				action="?/ages"
				use:enhance={() =>
					async ({ update }) => {
						await update();
						open = false;
					}}
			>
				<input type="hidden" name="group" value={group} />
				<input type="hidden" name="medicineId" value={medicineId} />
				<input type="hidden" name="ages" value={JSON.stringify(selected)} />
				<Button type="submit" size="sm" class="h-7 bg-red-700 text-xs text-white hover:bg-red-800">
					Save ({selected.length})
				</Button>
			</form>
		</div>
	</Popover.Content>
</Popover.Root>
