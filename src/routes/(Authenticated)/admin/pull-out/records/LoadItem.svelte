<script lang="ts">
	import { TrashIcon } from '@lucide/svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Input } from '#lib/components/ui/input/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import type { PulloutStore } from './pullout-store.svelte.ts';
	import type { PullOutRow } from './types.ts';

	let {
		store,
		row,
		qty,
		onqty,
		onremove
	}: {
		store?: PulloutStore;
		row: PullOutRow;
		qty: number;
		onqty: (value: number) => void;
		onremove: () => void;
	} = $props();

	const stockOptions = $derived(store?.stockOptions ?? []);
	const selectedStock = $derived(store?.selectedStockFor(row.id));
	const missingStock = $derived(qty > 0 && !selectedStock);
	const stockWarn = $derived(selectedStock != null && qty > selectedStock.onHand);

	const triggerLabel = $derived.by(() => {
		if (!selectedStock) return 'Select stock to deduct';
		const feedLabel = [selectedStock.feedType, selectedStock.stage].filter(Boolean).join(' ');
		return feedLabel
			? `${selectedStock.supplierName} · ${feedLabel} (${selectedStock.onHand.toLocaleString()})`
			: `${selectedStock.supplierName} (${selectedStock.onHand.toLocaleString()})`;
	});
</script>

<div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
	<div class="flex items-start gap-3">
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-semibold text-gray-900">
				{row.farmName}
				<Badge variant="secondary">{row.farmCode}</Badge>
			</p>
			<p class="truncate text-xs text-gray-600">
				{row.feedName}
				{#if row.label}· <span class="text-gray-500">{row.label}</span>{/if}
				· batch {row.batchNumber}
			</p>
			<p class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
				<span>
					Remaining <strong class="text-gray-800">{row.remainingQty}</strong> / {row.qtyNum}
				</span>
				{#if selectedStock}
					<span
						class="rounded-full px-1.5 py-0.5 ring-1 {stockWarn
							? 'bg-rose-50 text-rose-700 ring-rose-200'
							: 'bg-stone-100 ring-stone-200'}"
					>
						Stock: {selectedStock.onHand.toLocaleString()}
					</span>
				{/if}
				{#if row.dateLabel}<span class="text-gray-400">· {row.dateLabel}</span>{/if}
			</p>
		</div>

		<div class="flex shrink-0 flex-col items-end gap-1">
			<Input
				type="number"
				min="0"
				max={row.remainingQty}
				value={qty}
				class="h-9 w-20 text-right text-sm {stockWarn ? 'border-rose-400 text-rose-700' : ''}"
				oninput={(e) => onqty(Number((e.target as HTMLInputElement).value))}
			/>
			<button type="button" class="text-[11px] text-gray-500 hover:text-red-700" onclick={onremove}>
				<TrashIcon class="mr-0.5 inline h-3 w-3" /> Remove
			</button>
		</div>
	</div>

	<div class="mt-2.5 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
		<span class="text-[11px] font-semibold text-gray-500 uppercase">Deduct stock</span>
		<div class="w-72">
			<Select.Root
				type="single"
				value={selectedStock?.productId ?? ''}
				onValueChange={(v) => {
					if (v) store?.setStockSelection(row.id, v);
				}}
			>
				<Select.Trigger
					class="h-8 w-full rounded-md text-xs {missingStock
						? 'border-amber-400 ring-1 ring-amber-300'
						: 'border-gray-300'}"
				>
					<span class="truncate {selectedStock ? 'text-gray-900' : 'text-amber-800'}">
						{triggerLabel}
					</span>
				</Select.Trigger>
				<Select.Content class="max-h-60">
					{#each stockOptions as opt (opt.productId)}
						<Select.Item value={opt.productId} class="text-xs">
							<div class="flex w-full items-center justify-between gap-3">
								<span class="truncate">
									<strong class="font-semibold text-gray-900">{opt.supplierName}</strong>
									{#if opt.feedType || opt.stage}
										<span class="text-gray-500">
											· {[opt.feedType, opt.stage].filter(Boolean).join(' ')}
										</span>
									{/if}
								</span>
								<span
									class="shrink-0 font-medium {opt.onHand > 0
										? 'text-emerald-700'
										: 'text-rose-600'}"
								>
									{opt.onHand.toLocaleString()}
								</span>
							</div>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>
</div>
