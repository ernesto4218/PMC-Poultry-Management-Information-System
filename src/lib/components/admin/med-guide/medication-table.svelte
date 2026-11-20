<script>
	import Droplets from '@lucide/svelte/icons/droplets';
	import Pill from '@lucide/svelte/icons/pill';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import MedicationSummary from './medication-summary.svelte';
	import { Syringe } from '@lucide/svelte';
	import {
		buildVaccination,
		buildSchedule,
		createDays,
		sanitizeDecimal,
		gallonsNum,
		litersNum,
		doseNum,
		fmt,
		onPerBirdInput,
		onGallonsInput
	} from '#lib/medication/medication.ts';

	/**
	 * columns:  MemoryColumn[] for the selected farm group
	 * volume:   farm volume used for the water calculation
	 * onchange: called with a plain-data snapshot whenever anything changes
	 */
	let {
		columns = [],
		volume = 0,
		onchange,
		type,
		qty = $bindable({}),
		price = $bindable({})
	} = $props();

	let days = $state(createDays(type));
	$effect(() => {
		days = createDays(type);
	});

	const gallons = (day) => fmt(gallonsNum(day, volume, type));
	const liters = (day) => fmt(litersNum(day, volume, type));
	const dose = (day, col) => fmt(doseNum(days, day, col, volume, type));

	// What the editable gallons input should show.
	// If the user typed a value, show their raw text (so trailing "." or "0." survives);
	// otherwise show the auto-derived string.
	function gallonsInputValue(day) {
		if (day.manualGallons !== '') return day.manualGallons;
		const g = gallonsNum(day, volume, type);
		return g == null ? '' : String(g);
	}

	// Single source of truth: used by onchange AND by the summary below.
	const schedule = $derived({
		medications: columns,
		volume,
		days: buildSchedule(days, columns, volume, type)
	});

	const vaccination = $derived(
		buildVaccination(
			days.map((d) => d.age),
			Number(volume),
			type
		)
	);

	$effect(() => {
		onchange?.(
			$state.snapshot({
				medications: columns,
				volume,
				days: schedule.days,
				vaccination
			})
		);
	});

	const cellInput =
		'h-7 rounded-none border-0 bg-transparent px-2 text-right text-xs tabular-nums shadow-none md:text-xs focus-visible:bg-amber-50 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-red-400';
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-row gap-2">
		<div class="w-full overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm">
			<!-- Toolbar -->
			<div
				class="flex flex-wrap items-center gap-2 border-b border-red-100 bg-gradient-to-r from-red-50 to-amber-50 px-3 py-2"
			>
				<Pill class="size-4 text-red-700" />
				<h2 class="text-sm font-bold tracking-wide text-gray-900 uppercase">Medication</h2>
				<Badge variant="secondary" class="bg-amber-100 text-amber-800 hover:bg-amber-100">
					{columns.length} items
				</Badge>
				<p class="hidden text-[11px] text-gray-500 md:block">
					Click a day number to toggle <span class="font-semibold text-sky-700">Water Only</span>.
				</p>
			</div>

			{#if columns.length === 0}
				<p class="px-3 py-6 text-center text-xs text-gray-500">
					No medicines in the memory for this farm type yet. Use “Medication memory” to add some.
				</p>
			{/if}

			<div
				class="[&>[data-slot=table-container]]:max-h-[70vh] [&>[data-slot=table-container]]:overflow-auto"
			>
				<Table.Root class="w-max min-w-full border-separate border-spacing-0 text-xs">
					<Table.Header>
						<Table.Row class="border-0 hover:bg-transparent">
							<Table.Head
								class="sticky top-0 left-0 z-30 h-9 w-14 border-r border-b border-gray-300 bg-amber-100 px-2 text-center text-xs font-bold text-gray-900"
							>
								Age
							</Table.Head>
							<Table.Head
								class="sticky top-0 z-20 h-9 w-15 border-r border-b border-gray-300 bg-amber-50 px-2 text-center text-xs font-bold text-gray-900"
							>
								<div class="flex flex-col items-center leading-tight">
									<span>Water / Bird</span>
								</div>
							</Table.Head>
							<Table.Head
								class="sticky top-0 z-20 h-9 w-15 border-r border-b border-gray-300 bg-amber-50 px-2 text-center text-xs font-bold text-gray-900"
							>
								Water Gallons
							</Table.Head>
							<Table.Head
								class="sticky top-0 z-20 h-9 w-15 border-r border-b border-gray-300 bg-amber-50 px-2 text-center text-xs font-bold text-gray-900"
							>
								Water Liters
							</Table.Head>

							{#each columns as col (col.id)}
								<Table.Head
									class="sticky top-0 z-20 h-9 min-w-32 border-r border-b border-gray-300 bg-amber-50 px-2 text-center"
								>
									<div class="flex flex-col items-center leading-tight">
										<span
											class="max-w-full truncate text-xs font-bold text-gray-900"
											title={col.name}
										>
											{col.name}
										</span>
										<span class="text-[9px] font-medium text-amber-700 uppercase"
											>{col.value} {col.unit}</span
										>
									</div>
								</Table.Head>
							{/each}
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#each days as day (day.age)}
							<Table.Row class="border-0 hover:bg-transparent">
								<Table.Cell
									class="sticky left-0 z-10 border-r border-b border-gray-200 bg-amber-50 p-0"
								>
									<button
										type="button"
										onclick={() => (day.waterOnly = !day.waterOnly)}
										class="h-7 w-full px-2 text-center text-xs font-bold text-gray-900 transition hover:bg-amber-100 focus-visible:ring-1 focus-visible:ring-red-400 focus-visible:outline-none focus-visible:ring-inset"
										title={day.waterOnly ? 'Mark as medicated day' : 'Mark as water only'}
										aria-pressed={day.waterOnly}
									>
										{day.age}
									</button>
								</Table.Cell>

								<!-- Water per bird (editable) -->
								<Table.Cell class="border-r border-b border-gray-200 p-0">
									<Input
										value={day.perBird}
										inputmode="decimal"
										oninput={(e) => onPerBirdInput(day, e)}
										aria-label="Water per bird (mL), day {day.age}"
										class={cellInput}
									/>
								</Table.Cell>

								<!-- Gallons (editable — recalculates liters + doses for this row) -->
								<Table.Cell class="border-r border-b border-gray-200 p-0">
									<Input
										value={gallonsInputValue(day)}
										inputmode="decimal"
										oninput={(e) => onGallonsInput(day, e)}
										aria-label="Water gallons, day {day.age}"
										class={cellInput}
									/>
								</Table.Cell>

								<!-- Liters (calculated from gallons) -->
								<Table.Cell class="border-r border-b border-gray-200 p-0">
									<Input
										value={liters(day)}
										readonly
										tabindex={-1}
										aria-label="Water liters, day {day.age}"
										class={cellInput}
									/>
								</Table.Cell>

								{#if day.waterOnly}
									{#if columns.length}
										<Table.Cell
											colspan={columns.length}
											class="border-b border-sky-300 bg-sky-200 p-0 text-center text-xs font-bold tracking-widest text-sky-800 uppercase"
										>
											<span class="inline-flex items-center gap-1">
												<Droplets class="size-3" />
												Water only
											</span>
										</Table.Cell>
									{/if}
								{:else}
									{#each columns as col (col.id)}
										{#if col.ages?.includes(day.age)}
											<Table.Cell class="border-r border-b border-gray-200 p-0">
												<Input
													value={dose(day, col)}
													readonly
													tabindex={-1}
													aria-label="{col.name} dose, day {day.age}"
													title="{col.value} {col.unit} × {gallons(day)} gal"
													class={cellInput}
												/>
											</Table.Cell>
										{:else}
											<!-- not given at this age: locked -->
											<Table.Cell
												class="border-r border-b border-gray-200 bg-gray-100/70 p-0"
												aria-disabled="true"
											></Table.Cell>
										{/if}
									{/each}
								{/if}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</div>

		<div class="w-2xl overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm">
			<div
				class="flex flex-wrap items-center gap-2 border-b border-red-100 bg-gradient-to-r from-red-50 to-amber-50 px-3 py-2"
			>
				<Syringe class="size-4 text-red-700" />
				<h2 class="text-sm font-bold tracking-wide text-gray-900 uppercase">Vaccination</h2>
				<Badge variant="secondary" class="bg-amber-100 text-amber-800 hover:bg-amber-100">
					6 items
				</Badge>
			</div>

			<div
				class="[&>[data-slot=table-container]]:max-h-[70vh] [&>[data-slot=table-container]]:overflow-auto"
			>
				<Table.Root class="w-max min-w-full border-separate border-spacing-0 text-xs">
					<Table.Header>
						<Table.Row class="border-0 hover:bg-transparent">
							<Table.Head
								class="sticky top-0 left-0 z-30 h-9 w-14 border-r border-b border-gray-300 bg-amber-100 px-2 text-center text-xs font-bold text-gray-900"
							>
								Age
							</Table.Head>
							<Table.Head
								class="sticky top-0 z-20 h-9 w-15 border-r border-b border-gray-300 bg-amber-50 px-2 text-center text-xs font-bold text-gray-900"
							>
								<div class="flex flex-col items-center leading-tight">
									<span>Gal</span>
								</div>
							</Table.Head>
							<Table.Head
								class="sticky top-0 z-20 h-9 w-15 border-r border-b border-gray-300 bg-amber-50 px-2 text-center text-xs font-bold text-gray-900"
							>
								L
							</Table.Head>

							<Table.Head
								class="sticky top-0 z-20 h-9 w-15 border-r border-b border-gray-300 bg-amber-50 px-2 text-center text-xs font-bold text-gray-900"
							>
								NBL
							</Table.Head>
							<Table.Head
								class="sticky top-0 z-20 h-9 w-15 border-r border-b border-gray-300 bg-amber-50 px-2 text-center text-xs font-bold text-gray-900"
							>
								Gumboro
							</Table.Head>
							<Table.Head
								class="sticky top-0 z-20 h-9 w-15 border-r border-b border-gray-300 bg-amber-50 px-2 text-center text-xs font-bold text-gray-900"
							>
								Vac Safe
							</Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#each vaccination as row (row.age)}
							<Table.Row class="border-0 hover:bg-transparent">
								<Table.Cell
									class="sticky left-0 z-10 border-r border-b border-gray-200 bg-amber-50 p-0"
								>
									<div class="flex h-7 items-center justify-center text-xs font-bold text-gray-900">
										{row.age}
									</div>
								</Table.Cell>
								<Table.Cell class="border-r border-b border-gray-200 p-0 text-center">
									{fmt(row.gallons)}
								</Table.Cell>
								<Table.Cell class="border-r border-b border-gray-200 p-0 text-center">
									{fmt(row.liters)}
								</Table.Cell>
								<Table.Cell class="border-r border-b border-gray-200 p-0 text-center">
									{fmt(row.nbl)}
								</Table.Cell>
								<Table.Cell class="border-r border-b border-gray-200 p-0 text-center">
									{fmt(row.gumboro)}
								</Table.Cell>
								<Table.Cell class="border-r border-b border-gray-200 p-0 text-center">
									{fmt(row.vacSafe)}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</div>
	</div>

	<!-- Vitamins summary, fed by the same snapshot -->
	<MedicationSummary {schedule} birdCount={volume} />
</div>
