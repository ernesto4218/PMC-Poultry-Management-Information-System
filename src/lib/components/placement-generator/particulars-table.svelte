<script lang="ts">
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { computeAmount } from '#lib/utils/particular-amount.ts';
	import { PARTICULAR_CATEGORIES } from '#lib/types/particulars.ts';
	import {
		formatNumber,
		formatCurrency,
		formatDateShort,
		addDaysToDate
	} from '#lib/utils/format.ts';
	import { toolbar, tableRoot, tableWrap, th, thFirst, tdBase, tdFirst, tfBase } from './styles.ts';

	let {
		memory,
		medications,
		vitamins = [],
		vitaminsCategory = null,
		dateSet,
		categoryTotals,
		grandTotal,
		feeds,
		loading = false,
		error = null
	}: {
		memory: any;
		medications: any;
		vitamins?: any[];
		vitaminsCategory?: string | null;
		dateSet: string;
		categoryTotals: Record<string, number>;
		grandTotal: number;
		feeds: any;
		loading?: boolean;
		error?: string | null;
	} = $props();

	$effect(() => {
		console.log('Vitamins from particulars table s', vitamins);
	});
</script>

<div class="overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm">
	<div class={toolbar}>
		<ClipboardList class="size-4 text-red-700" />

		<h2 class="text-sm font-bold tracking-wide text-gray-900 uppercase">Particulars</h2>

		<Badge variant="secondary" class="bg-amber-100 text-amber-800 hover:bg-amber-100">
			{memory?.items?.length ?? 0} items
		</Badge>
	</div>

	{#if loading && !memory}
		<p class="px-3 py-6 text-center text-xs text-gray-500">Loading particulars…</p>
	{:else if error}
		<p class="px-3 py-6 text-center text-xs text-red-600">{error}</p>
	{:else if memory}
		{#if memory.items?.length}
			<div class={tableWrap}>
				<Table.Root class={tableRoot}>
					<Table.Header>
						<Table.Row class="border-0 hover:bg-transparent">
							<Table.Head class="{thFirst} w-36 text-center">DATE</Table.Head>

							<Table.Head class="{th} min-w-56 text-left">PARTICULARS</Table.Head>

							<Table.Head class="{th} text-right">QTY</Table.Head>
							<Table.Head class="{th} text-right">PRICE</Table.Head>
							<Table.Head class="{th} text-center">P.O</Table.Head>

							{#each PARTICULAR_CATEGORIES as c (c)}
								<Table.Head class="{th} min-w-28 text-right">
									{c}
								</Table.Head>
							{/each}

							<Table.Head class="{th} text-left">REMARKS</Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#each vitamins as v (v.id)}
							<Table.Row class="border-0 bg-amber-50/30 hover:bg-amber-50/40">
								<Table.Cell class={tdFirst}>
									<span class="text-gray-400">—</span>
								</Table.Cell>

								<Table.Cell class="{tdBase} font-medium text-gray-900">{v.name}</Table.Cell>

								<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
									{formatNumber(v.kls, { roundUp: true, decimals: 1 })}
								</Table.Cell>

								<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
									{formatCurrency(v.price)}
								</Table.Cell>

								<Table.Cell class="{tdBase} text-center"></Table.Cell>

								{#each PARTICULAR_CATEGORIES as c (c)}
									{#if c === vitaminsCategory}
										<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
											{formatCurrency(v.amount)}
										</Table.Cell>
									{:else}
										<Table.Cell class="{tdBase} bg-gray-100/70" aria-disabled="true"></Table.Cell>
									{/if}
								{/each}

								<Table.Cell class={tdBase}></Table.Cell>
							</Table.Row>
						{/each}
						{#each memory.items as item (item.id)}
							{@const adjustedDate =
								item.adjustmentDays != null ? addDaysToDate(dateSet, item.adjustmentDays) : null}

							<Table.Row class="border-0 hover:bg-amber-50/40">
								<Table.Cell class={tdFirst}>
									{#if adjustedDate}
										<span class="text-xs font-bold text-gray-900">
											{formatDateShort(adjustedDate)}
										</span>

										<span class="ml-1 text-[10px] font-medium text-amber-700">
											(Day {item.adjustmentDays})
										</span>
									{:else}
										<span class="text-gray-400">—</span>
									{/if}
								</Table.Cell>

								<Table.Cell class="{tdBase} font-medium text-gray-900">
									{item.particularName ?? item.particular?.name ?? '—'}

									{#if item.label}
										<span class="ml-1 text-xs text-gray-400">
											({item.label})
										</span>
									{/if}
								</Table.Cell>

								<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
									{formatNumber(item.resolvedQty)}
								</Table.Cell>

								<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
									{formatCurrency(item.price)}
								</Table.Cell>

								<Table.Cell class="{tdBase} text-center"></Table.Cell>

								{#each PARTICULAR_CATEGORIES as c (c)}
									{#if item.particularCategory === c}
										<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
											{formatCurrency(computeAmount(item))}
										</Table.Cell>
									{:else}
										<Table.Cell class="{tdBase} bg-gray-100/70" aria-disabled="true"></Table.Cell>
									{/if}
								{/each}

								<Table.Cell class="{tdBase} text-red-600">
									{item.resolveError ?? ''}
								</Table.Cell>
							</Table.Row>
						{/each}

						<!-- FEEDS TRUCKING + LABOR (auto-computed, shown as particulars) -->
						{#if feeds.qty > 0}
							{#each feeds.extraRows as r (r.name)}
								<Table.Row class="border-0 bg-amber-50/30 hover:bg-amber-50/40">
									<Table.Cell class={tdFirst}>
										<span class="text-gray-400">—</span>
									</Table.Cell>

									<Table.Cell class="{tdBase} font-medium text-gray-900">
										{r.name}
									</Table.Cell>

									<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
										{formatNumber(r.qty)}
									</Table.Cell>

									<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
										{formatCurrency(r.avgPrice)}
									</Table.Cell>

									<Table.Cell class="{tdBase} text-center"></Table.Cell>

									{#each PARTICULAR_CATEGORIES as c (c)}
										{#if String(c).trim().toUpperCase() === 'OTHERS'}
											<Table.Cell class="{tdBase} text-right font-mono tabular-nums">
												{formatCurrency(r.amount)}
											</Table.Cell>
										{:else}
											<Table.Cell class="{tdBase} bg-gray-100/70" aria-disabled="true"></Table.Cell>
										{/if}
									{/each}

									<Table.Cell class="{tdBase} text-red-600"></Table.Cell>
								</Table.Row>
							{/each}
						{/if}
					</Table.Body>

					<Table.Footer class="border-0 bg-transparent">
						<Table.Row class="border-0 hover:bg-transparent">
							<Table.Cell colspan={5} class="{tfBase} text-right tracking-wider uppercase">
								Total
							</Table.Cell>

							{#each PARTICULAR_CATEGORIES as c (c)}
								<Table.Cell class="{tfBase} text-right font-mono tabular-nums">
									{formatCurrency(categoryTotals[c])}
								</Table.Cell>
							{/each}

							<Table.Cell class="{tfBase} font-mono tabular-nums">
								₱{formatCurrency(grandTotal)}
							</Table.Cell>
						</Table.Row>
					</Table.Footer>
				</Table.Root>
			</div>
		{:else}
			<p class="px-3 py-6 text-center text-xs text-gray-500">This memory has no items yet.</p>
		{/if}
	{:else}
		<p class="px-3 py-6 text-center text-xs text-gray-500">No particulars memory linked.</p>
	{/if}
</div>
