<script lang="ts">
	import Wheat from '@lucide/svelte/icons/wheat';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { formatNumber, formatPerChick, formatCurrency } from '#lib/utils/format.ts';
	import { toolbar, tableRoot, tableWrap, th, thFirst, tdBase, tdFirst, tfBase } from './styles.ts';
	import { Calculator, PhilippinePeso } from '@lucide/svelte';

	let {
		feeds,
		volume,
		totalPerChick = $bindable(0),
		type
	}: { feeds: any; volume: number; totalPerChick?: number; type: string } = $props();

	// Mortality rate: CCS = 3.5%, Conventional (and anything else) = 5%
	const mortalityRate = $derived(type?.toLowerCase() === 'ccs' ? 0.035 : 0.05);
	console.log(type);
	// Starter & Grower are costed against volume minus the mortality rate
	const adjustedVolume = $derived(volume * (1 - mortalityRate));

	// Round to 1 decimal place
	const round1 = (n: number) => Math.round(n * 10) / 10;

	// Bags allocation = total qty / (volume / 1000), rounded to 1 decimal
	const bagsAllocation = (qty: number) => {
		const value = volume > 0 ? round1(qty / (volume / 1000)) : 0;
		return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
	};

	const isStarterOrGrower = (g: any) => {
		const k = String(g.key ?? '').toLowerCase();
		const l = String(g.label ?? '').toLowerCase();
		return (
			k.includes('starter') || k.includes('grower') || l.includes('starter') || l.includes('grower')
		);
	};

	// Per-chick for a single feed row (uses the group's divisor)
	const perChick = (amount: number, divisor: number) =>
		formatPerChick(divisor > 0 ? round1(amount / divisor) : 0);

	// Per-chick for a group total (adjusted divisor for starter/grower)
	const groupPerChick = (g: any) => {
		const divisor = isStarterOrGrower(g) ? adjustedVolume : volume;
		return formatPerChick(divisor > 0 ? round1(g.amount / divisor) : 0);
	};

	$effect(() => {
		totalPerChick = volume > 0 ? round1(feeds.amount / volume) : 0;
	});
</script>

<div class="flex flex-row gap-4">
	<div class="w-full overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm">
		<div class={toolbar}>
			<Wheat class="size-4 text-red-700" />

			<h2 class="text-sm font-bold tracking-wide text-gray-900 uppercase">Feeds Summary</h2>

			<Badge variant="secondary" class="bg-amber-100 text-amber-800 hover:bg-amber-100">
				{feeds.rows.length} feeds
			</Badge>

			<Badge variant="secondary" class="bg-amber-100 text-amber-800 hover:bg-amber-100">
				÷ {formatNumber(volume)} chicks
			</Badge>
		</div>

		<div class={tableWrap}>
			<Table.Root class={tableRoot}>
				<Table.Header>
					<Table.Row class="border-0 hover:bg-transparent">
						<Table.Head class="{thFirst} min-w-36 text-left">FEED</Table.Head>
						<Table.Head class="{th} text-right">TOTAL QTY</Table.Head>
						<Table.Head class="{th} text-right">AMOUNT</Table.Head>
						<Table.Head class="{th} text-right">BAGS ALLOCATION</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each feeds.feedGroups as g (g.key)}
						<!-- GROUP HEADING -->
						<Table.Row class="border-0 hover:bg-transparent">
							<Table.Cell
								colspan={4}
								class="border-b border-gray-300 bg-amber-100 px-2 py-1 text-xs font-bold tracking-wider text-amber-800 uppercase"
							>
								{g.label}
							</Table.Cell>
						</Table.Row>

						<!-- FEED ITEMS -->
						{#each g.rows as r (r.name)}
							<Table.Row class="border-0 hover:bg-amber-50/40">
								<Table.Cell class="{tdFirst} pl-5">
									{r.name}
								</Table.Cell>

								<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
									{formatNumber(r.qty)}
								</Table.Cell>

								<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
									{formatCurrency(r.amount)}
								</Table.Cell>

								<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
									{bagsAllocation(r.qty)}
								</Table.Cell>
							</Table.Row>
						{/each}

						<!-- GROUP SUBTOTAL -->
						{#if g.rows.length > 1}
							<Table.Row class="border-0 hover:bg-transparent">
								<Table.Cell
									class="sticky left-0 z-10 border-r border-b border-gray-200 bg-stone-100 px-2 py-1.5 pl-5 text-xs font-semibold text-gray-600"
								>
									Total {g.label}
								</Table.Cell>

								<Table.Cell
									class="{tdBase} bg-stone-100 text-right font-mono font-semibold tabular-nums"
								>
									{formatNumber(g.qty)}
								</Table.Cell>

								<Table.Cell
									class="{tdBase} bg-stone-100 text-right font-mono font-semibold tabular-nums"
								>
									{formatCurrency(g.amount)}
								</Table.Cell>

								<Table.Cell
									class="{tdBase} bg-stone-100 text-right font-mono font-semibold tabular-nums"
								>
									{bagsAllocation(g.qty)}
								</Table.Cell>
							</Table.Row>
						{/if}
					{/each}
				</Table.Body>

				<Table.Footer class="border-0 bg-transparent">
					<Table.Row class="border-0 hover:bg-transparent">
						<Table.Cell class="{tfBase} uppercase">Total feeds cost</Table.Cell>

						<Table.Cell class="{tfBase} text-right font-mono tabular-nums">
							{formatNumber(feeds.qty)}
						</Table.Cell>

						<Table.Cell class="{tfBase} text-right font-mono tabular-nums">
							{formatCurrency(feeds.amount)}
						</Table.Cell>

						<Table.Cell class="{tfBase} text-right font-mono tabular-nums">
							{bagsAllocation(feeds.qty)}
						</Table.Cell>
					</Table.Row>
				</Table.Footer>
			</Table.Root>
		</div>
	</div>

	<div class="flex h-fit w-full flex-col gap-4">
		<div class="h-fit w-full overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm">
			<div class={toolbar}>
				<PhilippinePeso class="size-4 text-red-700" />

				<h2 class="text-sm font-bold tracking-wide text-gray-900 uppercase">
					Feeds Cost Breakdown
				</h2>
			</div>

			<div class={tableWrap}>
				<Table.Root class={tableRoot}>
					<Table.Header>
						<Table.Row class="border-0 hover:bg-transparent">
							<Table.Head class="{thFirst} min-w-36 text-left">FEED</Table.Head>
							<Table.Head class="{th} text-right">TOTAL</Table.Head>
							<Table.Head class="{th} text-right">VOLUME</Table.Head>
							<Table.Head class="{th} text-right">COST / CHICK</Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#each feeds.feedGroups as g (g.key)}
							<!-- GROUP SUBTOTAL -->
							{#if g.rows.length > 1}
								<Table.Row class="border-0 hover:bg-transparent">
									<Table.Cell
										class="sticky left-0 z-10 border-r border-b border-gray-200 bg-stone-100 px-2 py-1.5 pl-5 text-xs font-semibold text-gray-600"
									>
										Total {g.label}
									</Table.Cell>

									<Table.Cell
										class="{tdBase} bg-stone-100 text-right font-mono font-semibold tabular-nums"
									>
										{formatCurrency(g.amount)}
									</Table.Cell>

									<Table.Cell
										class="{tdBase} bg-stone-100 text-right font-mono font-semibold tabular-nums"
									>
										{formatCurrency(isStarterOrGrower(g) ? adjustedVolume : volume)}
									</Table.Cell>

									<Table.Cell
										class="{tdBase} bg-stone-100 text-right font-mono font-semibold tabular-nums"
									>
										{groupPerChick(g)}
									</Table.Cell>
								</Table.Row>
							{/if}
						{/each}
					</Table.Body>

					<Table.Footer class="border-0 bg-transparent">
						<Table.Row class="border-0 hover:bg-transparent">
							<Table.Cell class="{tfBase} uppercase">Total feeds cost</Table.Cell>

							<Table.Cell class="{tfBase} text-right font-mono tabular-nums">
								{formatCurrency(feeds.amount)}
							</Table.Cell>

							<Table.Cell class={tfBase}></Table.Cell>

							<Table.Cell class="{tfBase} text-right font-mono tabular-nums">
								{perChick(feeds.amount, volume)}
							</Table.Cell>
						</Table.Row>
					</Table.Footer>
				</Table.Root>
			</div>
		</div>

		<div class="mb-4 w-full overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm">
			<div class={toolbar}>
				<Calculator class="size-4 text-red-700" />

				<h2 class="text-sm font-bold tracking-wide text-gray-900 uppercase">Computation Basis</h2>
			</div>

			<div class={tableWrap}>
				<Table.Root class={tableRoot}>
					<Table.Header>
						<Table.Row class="border-0 hover:bg-transparent">
							<Table.Head class="{thFirst} min-w-36 text-left">TYPE</Table.Head>
							<Table.Head class="{th} text-right">MORTALITY RATE</Table.Head>
							<Table.Head class="{th} text-right">VOLUME (CHICKS)</Table.Head>
							<Table.Head class="{th} text-right">ADJUSTED VOLUME</Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						<Table.Row class="border-0 hover:bg-amber-50/40">
							<Table.Cell class={tdFirst}>{type?.toUpperCase()}</Table.Cell>

							<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
								{(mortalityRate * 100).toFixed(1)}%
							</Table.Cell>

							<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
								{formatNumber(volume)}
							</Table.Cell>

							<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
								{formatNumber(adjustedVolume)}
							</Table.Cell>
						</Table.Row>
					</Table.Body>
				</Table.Root>
			</div>
		</div>
	</div>
</div>
