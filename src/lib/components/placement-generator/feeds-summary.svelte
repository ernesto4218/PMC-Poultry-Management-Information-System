<script lang="ts">
	import Wheat from '@lucide/svelte/icons/wheat';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { formatNumber, formatPerChick, formatCurrency } from '#lib/utils/format.ts';
	import { toolbar, tableRoot, tableWrap, th, thFirst, tdBase, tdFirst, tfBase } from './styles.ts';

	let { feeds, volume }: { feeds: any; volume: number } = $props();
</script>

<div class="overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm">
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
					<Table.Head class="{th} text-right">AVG PRICE</Table.Head>
					<Table.Head class="{th} text-right">AMOUNT</Table.Head>
					<Table.Head class="{th} text-right">COST / CHICK</Table.Head>
				</Table.Row>
			</Table.Header>

			<Table.Body>
				{#each feeds.feedGroups as g (g.key)}
					<!-- GROUP HEADING -->
					<Table.Row class="border-0 hover:bg-transparent">
						<Table.Cell
							colspan={5}
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
								{formatCurrency(r.avgPrice)}
							</Table.Cell>

							<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
								{formatCurrency(r.amount)}
							</Table.Cell>

							<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
								{formatPerChick(r.perChick)}
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

							<Table.Cell class="{tdBase} bg-stone-100"></Table.Cell>

							<Table.Cell
								class="{tdBase} bg-stone-100 text-right font-mono font-semibold tabular-nums"
							>
								{formatCurrency(g.amount)}
							</Table.Cell>

							<Table.Cell
								class="{tdBase} bg-stone-100 text-right font-mono font-semibold tabular-nums"
							>
								{formatPerChick(g.perChick)}
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

					<Table.Cell class={tfBase}></Table.Cell>

					<Table.Cell class="{tfBase} text-right font-mono tabular-nums">
						{formatCurrency(feeds.amount)}
					</Table.Cell>

					<Table.Cell class="{tfBase} text-right font-mono tabular-nums">
						{formatPerChick(feeds.perChick)}
					</Table.Cell>
				</Table.Row>
			</Table.Footer>
		</Table.Root>
	</div>
</div>
