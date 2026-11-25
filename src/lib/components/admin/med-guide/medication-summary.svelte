<script>
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import Syringe from '@lucide/svelte/icons/syringe';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { formatNumber } from '#lib/utils/format.ts';
	import { buildSummary } from '#lib/medication/medication.ts';

	let { schedule, birdCount = 0, vaccination = [] } = $props();

	let qty = $state({});
	let price = $state({});

	const defaultPrice = $derived(
		Object.fromEntries((schedule?.medications ?? []).map((m) => [m.id, String(m.price ?? '')]))
	);
	const effectivePrice = $derived({ ...defaultPrice, ...price });

	const summary = $derived(buildSummary(schedule, birdCount, qty, effectivePrice));

	const rows = $derived(summary.rows);
	const totalAmount = $derived(summary.totalAmount);
	const totalPerBirdGrams = $derived(summary.totalPerBirdGrams);
	const totalCostPerBird = $derived(Number(birdCount) ? totalAmount / Number(birdCount) : 0);

	// ---- Vaccines: aggregate the per-age rows into totals ----
	const vaccineTotals = $derived(
		vaccination.reduce(
			(acc, row) => ({
				gallons: acc.gallons + (Number(row.gallons) || 0),
				liters: acc.liters + (Number(row.liters) || 0),
				nbl: acc.nbl + (Number(row.nbl) || 0),
				gumboro: acc.gumboro + (Number(row.gumboro) || 0),
				vacSafe: acc.vacSafe + (Number(row.vacSafe) || 0)
			}),
			{ gallons: 0, liters: 0, nbl: 0, gumboro: 0, vacSafe: 0 }
		)
	);
	const totalDoses = $derived(vaccineTotals.nbl + vaccineTotals.gumboro + vaccineTotals.vacSafe);

	const fmt = (n, min = 2, max = 2) =>
		Number(n).toLocaleString('en-US', {
			minimumFractionDigits: min,
			maximumFractionDigits: max
		});

	const head =
		'h-8 border-r border-b border-gray-300 bg-amber-50 px-2 text-center text-xs font-bold text-gray-900';
	const cell = 'h-7 border-r border-b border-gray-200 px-2 py-0 text-right text-xs tabular-nums';
	const cellInput =
		'h-7 rounded-none border-0 bg-transparent px-2 text-right text-xs tabular-nums shadow-none md:text-xs focus-visible:bg-amber-50 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-red-400';
</script>

<!-- Vitamins + Vaccines side-by-side on wide screens -->
<div class="flex flex-col gap-3 xl:flex-row">
	<!-- ============ Vitamins Summary (unchanged) ============ -->
	<div class="min-w-0 flex-1 overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm">
		<div
			class="flex flex-wrap items-center gap-2 border-b border-red-100 bg-gradient-to-r from-red-50 to-amber-50 px-3 py-2"
		>
			<FlaskConical class="size-4 text-red-700" />
			<h2 class="text-sm font-bold tracking-wide text-gray-900 uppercase">Vitamins Summary</h2>
			<Badge variant="secondary" class="bg-amber-100 text-amber-800 hover:bg-amber-100">
				{rows.length} items
			</Badge>
			<p class="hidden text-[11px] text-gray-500 md:block">
				Grams are totaled from the medication table. Per-bird = total ÷ {birdCount || 0} birds.
			</p>
		</div>

		<Table.Root class="w-full min-w-[820px] border-separate border-spacing-0 text-xs">
			<Table.Header>
				<Table.Row class="border-0 hover:bg-transparent">
					<Table.Head class="{head} !text-left !text-red-700">VITAMINS</Table.Head>
					<Table.Head class={head}>grms/ml</Table.Head>
					<Table.Head class={head}>kls/L</Table.Head>
					<Table.Head class={head}>grms/ml / Bird</Table.Head>
					<Table.Head class={head}>Price</Table.Head>
					<Table.Head class={head}>Amount</Table.Head>
					<Table.Head class="{head} border-r-0">COST / Bird</Table.Head>
				</Table.Row>
			</Table.Header>

			<Table.Body>
				{#each rows as row (row.id)}
					<Table.Row
						class="border-0 hover:bg-amber-50/40 {row.grams === 0
							? 'bg-[#e2efda] hover:bg-[#e2efda]'
							: ''}"
					>
						<Table.Cell
							class="h-7 border-r border-b border-gray-200 px-2 py-0 text-xs font-semibold text-gray-900"
						>
							{row.name}
						</Table.Cell>

						<Table.Cell class={cell}>{row.grams ? fmt(row.grams, 0, 2) : '-'}</Table.Cell>
						<Table.Cell class={cell}>
							{formatNumber(row.kls, { roundUp: true, decimals: 1 })}
						</Table.Cell>
						<Table.Cell class={cell}>
							{row.perBirdGrams ? fmt(row.perBirdGrams, 2, 4) : '-'}
						</Table.Cell>

						<Table.Cell class="border-r border-b border-gray-200 p-0">
							<Input
								value={effectivePrice[row.id] ?? ''}
								oninput={(e) => (price[row.id] = e.currentTarget.value)}
								inputmode="decimal"
								placeholder="0.00"
								aria-label="Price for {row.name}"
								class={cellInput}
							/>
						</Table.Cell>

						<Table.Cell class="{cell} font-medium">{fmt(row.amount)}</Table.Cell>
						<Table.Cell class="{cell} border-r-0 font-bold text-gray-900">
							{fmt(row.costPerBird)}
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={7} class="py-6 text-center text-xs text-gray-500">
							No medicines yet.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>

			<Table.Footer class="border-0 bg-transparent">
				<Table.Row class="border-0 bg-amber-50 hover:bg-amber-50">
					<Table.Cell class="h-8 border-t border-gray-300 px-2 py-0 text-xs font-bold">
						total
					</Table.Cell>
					<Table.Cell class="border-t border-gray-300 p-0"></Table.Cell>
					<Table.Cell class="border-t border-gray-300 p-0"></Table.Cell>
					<Table.Cell
						class="border-t border-gray-300 px-2 py-0 text-right text-xs font-bold text-amber-700 tabular-nums"
					>
						{fmt(totalPerBirdGrams, 2, 4)}
					</Table.Cell>
					<Table.Cell class="border-t border-gray-300 p-0"></Table.Cell>
					<Table.Cell
						class="border-t border-gray-300 px-2 py-0 text-right text-xs font-bold text-red-700 tabular-nums"
					>
						{fmt(totalAmount)}
					</Table.Cell>
					<Table.Cell
						class="border-t border-gray-300 px-2 py-0 text-right text-xs font-bold text-red-700 tabular-nums"
					>
						{fmt(totalCostPerBird)}
					</Table.Cell>
				</Table.Row>
			</Table.Footer>
		</Table.Root>
	</div>

	<!-- ============ Vaccines Summary (new) ============ -->
	<div class="overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm xl:w-96">
		<div
			class="flex flex-wrap items-center gap-2 border-b border-red-100 bg-gradient-to-r from-red-50 to-amber-50 px-3 py-2"
		>
			<Syringe class="size-4 text-red-700" />
			<h2 class="text-sm font-bold tracking-wide text-gray-900 uppercase">Vaccines Summary</h2>
			<Badge variant="secondary" class="bg-amber-100 text-amber-800 hover:bg-amber-100">
				{vaccination.length} days
			</Badge>
		</div>

		<Table.Root class="w-full border-separate border-spacing-0 text-xs">
			<Table.Header>
				<Table.Row class="border-0 hover:bg-transparent">
					<Table.Head class="{head} !text-left !text-red-700">VACCINES</Table.Head>
					<Table.Head class="{head} border-r-0">DOSES</Table.Head>
				</Table.Row>
			</Table.Header>

			<Table.Body>
				{#if vaccination.length}
					<Table.Row class="border-0 hover:bg-amber-50/40">
						<Table.Cell
							class="h-7 border-r border-b border-gray-200 px-2 py-0 text-xs font-semibold text-gray-900"
						>
							NBL
						</Table.Cell>
						<Table.Cell class="{cell} border-r-0">{fmt(vaccineTotals.nbl, 0, 2)}</Table.Cell>
					</Table.Row>
					<Table.Row class="border-0 hover:bg-amber-50/40">
						<Table.Cell
							class="h-7 border-r border-b border-gray-200 px-2 py-0 text-xs font-semibold text-gray-900"
						>
							Gumboro
						</Table.Cell>
						<Table.Cell class="{cell} border-r-0">{fmt(vaccineTotals.gumboro, 0, 2)}</Table.Cell>
					</Table.Row>
					<Table.Row class="border-0 hover:bg-amber-50/40">
						<Table.Cell
							class="h-7 border-r border-b border-gray-200 px-2 py-0 text-xs font-semibold text-gray-900"
						>
							Vac Safe
						</Table.Cell>
						<Table.Cell class="{cell} border-r-0">{fmt(vaccineTotals.vacSafe, 0, 2)}</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row class="hover:bg-transparent">
						<Table.Cell colspan={2} class="py-6 text-center text-xs text-gray-500">
							No vaccination days scheduled.
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>

			<Table.Footer class="border-0 bg-transparent">
				<Table.Row class="border-0 bg-amber-50 hover:bg-amber-50">
					<Table.Cell class="h-8 border-t border-gray-300 px-2 py-0 text-xs font-bold">
						total doses
					</Table.Cell>
					<Table.Cell
						class="border-t border-gray-300 px-2 py-0 text-right text-xs font-bold text-red-700 tabular-nums"
					>
						{fmt(totalDoses, 0, 2)}
					</Table.Cell>
				</Table.Row>
			</Table.Footer>
		</Table.Root>

		<div class="border-t border-gray-200 bg-amber-50/50 px-3 py-2 text-xs text-gray-700">
			<span class="font-semibold text-gray-900">Water:</span>
			{fmt(vaccineTotals.gallons)} gal
			<span class="mx-1 text-gray-400">·</span>
			{fmt(vaccineTotals.liters)} L
		</div>
	</div>
</div>
