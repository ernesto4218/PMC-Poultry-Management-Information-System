<script lang="ts">
	import {
		FEED_CATEGORY,
		FEED_TRUCKING_RATE,
		FEED_LABOR_RATE,
		parseFeed
	} from '#lib/utils/feeds.ts';
	import { toTitle } from '#lib/utils/format.ts';
	import { computeAmount } from '#lib/utils/particular-amount.ts';
	import { PARTICULAR_CATEGORIES } from '#lib/types/particulars.ts';
	import { buildSummary } from '#lib/medication/medication.ts';

	import BatchSelector from './batch-selector.svelte';
	import BatchDetails from './batch-details.svelte';
	import ParticularsTable from './particulars-table.svelte';
	import FeedsSummary from './feeds-summary.svelte';
	import { farmGroupOf } from '#lib/types/medication-memory.ts';
	import MedicationTable from '../admin/med-guide/medication-table.svelte';
	import type { MedicationSnapshot } from '#lib/types/standards/medications/items.ts';

	let { data } = $props();
	let schedule = $state<MedicationSnapshot | null>(null);
	let qty = $state<Record<string, string>>({});
	let price = $state<Record<string, string>>({});

	// --------------------------------------------------
	// BATCH SELECTION
	// --------------------------------------------------

	const groups = $derived.by(() => {
		const map = new Map();

		for (const b of data.batches) {
			if (!map.has(b.farmId)) {
				map.set(b.farmId, { farm: b.farm, batches: [] });
			}
			map.get(b.farmId).batches.push(b);
		}

		return [...map.values()]
			.sort((a, b) => a.farm.name.localeCompare(b.farm.name, undefined, { numeric: true }))
			.map((g) => ({
				...g,
				batches: g.batches.sort((a: any, b: any) => b.dateSet.localeCompare(a.dateSet))
			}));
	});

	let selectedBatchId = $state('');

	const selectedBatch = $derived(data.batches.find((b: any) => b.id === selectedBatchId));
	const selectedFarm = $derived(selectedBatch?.farm ?? null);
	const group = $derived(selectedFarm ? farmGroupOf(selectedFarm.type) : null);
	const vitaminsSummary = $derived(buildSummary(schedule, selectedBatch?.volume ?? 0, qty, price));
	const VITAMINS_CATEGORY = PARTICULAR_CATEGORIES.find((c) => /med|vit/i.test(String(c)));

	function select(id: string) {
		selectedBatchId = id;
		schedule = null;
		qty = {};

		const batch = data.batches.find((b: any) => b.id === id);
		const g = batch ? farmGroupOf(batch.farm.type) : null;
		const cols = g ? ((data.memory as any)?.[g] ?? []) : [];

		price = Object.fromEntries(cols.map((c: any) => [c.id, c.price ? String(c.price) : '']));
	}

	// --------------------------------------------------
	// PARTICULARS MEMORY FETCH
	// --------------------------------------------------

	const selectedMemoryId = $derived(selectedBatch?.farm?.particular_id ?? null);

	const memoryCacheKey = $derived.by(() => {
		if (!selectedMemoryId) return null;

		const volume = selectedBatch?.volume ?? 0;
		const code = selectedFarm?.code ?? '';

		return `${selectedMemoryId}-${volume}-${code}`;
	});

	let memoryCache = $state({});
	let loadingMemory = $state(false);
	let memoryError = $state<string | null>(null);

	$effect(() => {
		const id = selectedMemoryId;
		const key = memoryCacheKey;

		if (!id || !key) return;
		console.log('Memory from data.memory', data.memory?.[group]);

		//@ts-ignore
		if (memoryCache[key]) return;

		const volume = selectedBatch?.volume ?? 0;
		const code = selectedFarm?.code ?? '';
		let cancelled = false;

		loadingMemory = true;
		memoryError = null;

		fetch(`/api/particular-memory/${id}?volume=${volume}&code=${encodeURIComponent(code)}`)
			.then(async (res) => {
				if (cancelled) return null;

				if (!res.ok) {
					throw new Error(res.status === 404 ? 'Memory not found' : 'Failed to load memory');
				}

				return res.json();
			})
			.then((mem) => {
				if (!cancelled && mem) {
					memoryCache = { ...memoryCache, [key]: mem };
				}
			})
			.catch((err) => {
				if (!cancelled) memoryError = err.message;
			})
			.finally(() => {
				if (!cancelled) loadingMemory = false;
			});

		return () => {
			cancelled = true;
		};
	});

	//@ts-ignore
	const selectedMemory = $derived(memoryCacheKey ? (memoryCache[memoryCacheKey] ?? null) : null);

	// --------------------------------------------------
	// FEED QUANTITY
	// --------------------------------------------------

	const feedQuantity = $derived.by(() => {
		let qty = 0;

		for (const i of selectedMemory?.items ?? []) {
			const itemName = i.particularName ?? i.particular?.name ?? '';
			const isFeed = i.particularCategory === FEED_CATEGORY || !!parseFeed(itemName);
			if (!isFeed) continue;

			qty += Number(i.resolvedQty) || 0;
		}

		return qty;
	});

	// --------------------------------------------------
	// CATEGORY TOTALS
	// --------------------------------------------------

	const categoryTotals = $derived.by(() => {
		const totals = Object.fromEntries(PARTICULAR_CATEGORIES.map((c) => [c, 0]));

		for (const i of selectedMemory?.items ?? []) {
			const category = i.particularCategory;
			if (Object.hasOwn(totals, category)) {
				totals[category] += computeAmount(i);
			}
		}

		const truckingAmount = feedQuantity * FEED_TRUCKING_RATE;
		const laborAmount = feedQuantity * FEED_LABOR_RATE;

		const othersCategory = PARTICULAR_CATEGORIES.find(
			(c) => String(c).trim().toUpperCase() === 'OTHERS'
		);

		if (othersCategory) {
			totals[othersCategory] += truckingAmount + laborAmount;
		}

		if (VITAMINS_CATEGORY) {
			totals[VITAMINS_CATEGORY] += vitaminsSummary.totalAmount;
		}

		return totals;
	});

	const grandTotal = $derived(Object.values(categoryTotals).reduce((a, b) => a + b, 0));

	// --------------------------------------------------
	// FEEDS SUMMARY DATA
	// --------------------------------------------------

	const feeds = $derived.by(() => {
		const map = new Map();

		for (const i of selectedMemory?.items ?? []) {
			const itemName = i.particularName ?? i.particular?.name ?? 'Unknown';
			const stage = parseFeed(itemName);

			if (!stage && i.particularCategory !== FEED_CATEGORY) continue;

			const key = stage ? stage.key : itemName;

			const row = map.get(key) ?? {
				name: stage ? toTitle(stage.key) : itemName,
				type: stage?.type ?? null,
				typeIdx: stage?.typeIdx ?? 999,
				num: stage?.num ?? 0,
				qty: 0,
				amount: 0
			};

			row.qty += Number(i.resolvedQty) || 0;
			row.amount += computeAmount(i);

			map.set(key, row);
		}

		const rows = [...map.values()].sort(
			(a, b) => a.typeIdx - b.typeIdx || a.num - b.num || a.name.localeCompare(b.name)
		);

		const qty = rows.reduce((s, r) => s + r.qty, 0);
		const amount = rows.reduce((s, r) => s + r.amount, 0);
		const volume = Number(selectedBatch?.volume) || 0;

		const detailed = rows.map((r) => ({
			...r,
			avgPrice: r.qty ? r.amount / r.qty : 0,
			pctOfFeeds: amount ? (r.amount / amount) * 100 : 0,
			perChick: volume ? r.amount / volume : 0
		}));

		const groupMap = new Map();

		for (const r of detailed) {
			const gKey = r.type ?? 'other';

			const g = groupMap.get(gKey) ?? {
				key: gKey,
				label: r.type ? toTitle(r.type) : 'Other Feeds',
				typeIdx: r.typeIdx,
				rows: [],
				qty: 0,
				amount: 0
			};

			g.rows.push(r);
			g.qty += r.qty;
			g.amount += r.amount;

			groupMap.set(gKey, g);
		}

		const feedGroups = [...groupMap.values()]
			.sort((a, b) => a.typeIdx - b.typeIdx)
			.map((g) => ({ ...g, perChick: volume ? g.amount / volume : 0 }));

		const extraRows = [
			{ name: 'Feeds Trucking', rate: FEED_TRUCKING_RATE },
			{ name: 'Feeds Labor', rate: FEED_LABOR_RATE }
		].map((e) => {
			const amt = qty * e.rate;
			return {
				name: e.name,
				qty,
				avgPrice: e.rate,
				amount: amt,
				perChick: volume ? amt / volume : 0
			};
		});

		const extraAmount = extraRows.reduce((s, r) => s + r.amount, 0);
		const grandAmount = amount + extraAmount;

		return {
			rows: detailed,
			feedGroups,
			extraRows,
			extraAmount,
			extraPerChick: volume ? extraAmount / volume : 0,
			qty,
			amount,
			perChick: volume ? amount / volume : 0,
			grandAmount,
			grandPerChick: volume ? grandAmount / volume : 0,
			pctOfBudget: grandTotal ? (grandAmount / grandTotal) * 100 : 0
		};
	});

	$effect(() => {
		console.log(group);
		console.log(selectedFarm);
	});
</script>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER + BATCH SELECT -->
		<div class="flex flex-row items-center justify-between">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">
						Chick Management
					</p>

					<h1 class="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight text-gray-900">
						Budget Placement Generator
					</h1>

					<p class="mt-1 text-sm text-gray-500">Generate a monthly budget of each farm.</p>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<BatchSelector {groups} {selectedBatch} {selectedFarm} onSelect={select} />
			</div>
		</div>

		<!-- BATCH + FARM DETAILS -->
		{#if selectedBatch && selectedFarm}
			<BatchDetails batch={selectedBatch} farm={selectedFarm} />

			<!-- PARTICULARS MEMORY -->
			{#if selectedMemoryId}
				<ParticularsTable
					memory={selectedMemory}
					vitamins={vitaminsSummary.rows}
					vitaminsCategory={VITAMINS_CATEGORY}
					dateSet={selectedBatch.dateSet}
					//@ts-ignore
					medications={data.memory?.[group] ?? []}
					{categoryTotals}
					{grandTotal}
					{feeds}
					loading={loadingMemory}
					error={memoryError}
				/>

				<!-- FEEDS SUMMARY -->
				{#if selectedMemory?.items?.length && feeds.rows.length}
					<FeedsSummary {feeds} volume={selectedBatch.volume} />
				{/if}
			{/if}
		{:else}
			<p
				class="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2 text-xs text-gray-600"
			>
				<span class="font-semibold text-gray-900">No batch selected.</span>
				Choose a chick batch above to generate its medication guide.
			</p>
		{/if}
	</div>

	<div class="hidden">
		{#if selectedBatch && selectedFarm && group}
			{#key selectedBatch.id}
				<MedicationTable
					volume={selectedBatch.volume}
					columns={data.memory?.[group] ?? []}
					onchange={(value: MedicationSnapshot) => (schedule = value)}
					type={selectedFarm.type}
					bind:qty
					bind:price
				/>
			{/key}
		{/if}
	</div>
</div>
