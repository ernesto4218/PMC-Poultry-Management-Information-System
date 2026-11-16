<script>
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';

	let { schedule, birdCount = 0 } = $props();

	let qty = $state({});
	let price = $state({});

	const toNum = (v) => {
		const n = parseFloat(String(v ?? '').replace(/,/g, ''));
		return Number.isNaN(n) ? 0 : n;
	};

	const fmt = (n, min = 2, max = 2) =>
		Number(n).toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });

	const rows = $derived.by(() => {
		const days = schedule?.days ?? [];
		const birds = Number(birdCount) || 0;
		return (schedule?.medications ?? []).map((med) => {
			const grams = days.reduce((sum, d) => sum + toNum(d.doses?.[med.id]), 0);
			const amount = toNum(qty[med.id]) * toNum(price[med.id]);
			return {
				id: med.id,
				name: med.name,
				grams,
				// total grams spread across the flock
				perBirdGrams: birds ? grams / birds : 0,
				kls: grams / 1000,
				amount,
				costPerBird: birds ? amount / birds : 0
			};
		});
	});

	const totalAmount = $derived(rows.reduce((sum, r) => sum + r.amount, 0));
	const totalPerBirdGrams = $derived(
		Number(birdCount) ? rows.reduce((sum, r) => sum + r.grams, 0) / Number(birdCount) : 0
	);

	const head =
		'h-8 border-r border-b border-gray-300 bg-amber-50 px-2 text-center text-xs font-bold text-gray-900';
	const cell = 'h-7 border-r border-b border-gray-200 px-2 py-0 text-right text-xs tabular-nums';
	const cellInput =
		'h-7 rounded-none border-0 bg-transparent px-2 text-right text-xs tabular-nums shadow-none md:text-xs focus-visible:bg-amber-50 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-red-400';
</script>

<div class="overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm">
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
				<Table.Head class={head}>Qty</Table.Head>
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
					<Table.Cell class={cell}>{fmt(row.kls)}</Table.Cell>
					<Table.Cell class={cell}>
						{row.perBirdGrams ? fmt(row.perBirdGrams, 2, 4) : '-'}
					</Table.Cell>

					<Table.Cell class="border-r border-b border-gray-200 p-0">
						<Input
							bind:value={qty[row.id]}
							inputmode="decimal"
							placeholder="0.00"
							aria-label="Qty for {row.name}"
							class={cellInput}
						/>
					</Table.Cell>

					<Table.Cell class="border-r border-b border-gray-200 p-0">
						<Input
							bind:value={price[row.id]}
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
					<Table.Cell colspan={8} class="py-6 text-center text-xs text-gray-500">
						No medicines yet.
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>

		<Table.Footer class="border-0 bg-transparent">
			<Table.Row class="border-0 bg-amber-50 hover:bg-amber-50">
				<Table.Cell class="h-8 border-t border-gray-300 px-2 py-0 text-xs font-bold"
					>total</Table.Cell
				>
				<Table.Cell class="border-t border-gray-300 p-0"></Table.Cell>
				<Table.Cell class="border-t border-gray-300 p-0"></Table.Cell>
				<Table.Cell
					class="border-t border-gray-300 px-2 py-0 text-right text-xs font-bold text-amber-700 tabular-nums"
				>
					{fmt(totalPerBirdGrams, 2, 4)}
				</Table.Cell>
				<Table.Cell class="border-t border-gray-300 p-0"></Table.Cell>
				<Table.Cell class="border-t border-gray-300 p-0"></Table.Cell>
				<Table.Cell
					class="border-t border-gray-300 px-2 py-0 text-right text-xs font-bold text-red-700 tabular-nums"
				>
					{fmt(totalAmount)}
				</Table.Cell>
				<Table.Cell class="border-t border-gray-300 p-0"></Table.Cell>
			</Table.Row>
		</Table.Footer>
	</Table.Root>
</div>
