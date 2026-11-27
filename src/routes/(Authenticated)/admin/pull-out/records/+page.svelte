<script lang="ts">
	import type { PageData } from './$types';
	import DispatchDrawer from './DispatchDrawer.svelte';
	import FilterBar from './FilterBar.svelte';
	import Kpicards from './Kpicards.svelte';
	import Pagination from './Pagination.svelte';
	import { PulloutStore } from './pullout-store.svelte.ts';
	import PulloutTable from './PulloutTable.svelte';
	import SelectionBar from './SelectionBar.svelte';

	let { data }: { data: PageData } = $props();

	const store = new PulloutStore(
		() => data,
		() => data.supplierStocks ?? []
	);

	// Jump back to page 1 whenever filters, sorting or page size change.
	$effect(() => {
		void store.filterKey;
		store.page = 1;
	});
</script>

<svelte:head>
	<title>Pull-out Records | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<div>
			<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Records</p>
			<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Pull-out Records</h1>
			<p class="mt-1 text-sm text-gray-500">
				Every feed scheduled to be pulled out, derived from saved budget placements.
			</p>
		</div>

		<Kpicards summary={store.summary} />

		<!-- Available stocks by supplier -->
		<section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
			<div class="mb-4 flex items-center justify-between gap-2">
				<div>
					<p class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
						Warehouse &amp; Supplier Inventory
					</p>
					<h2 class="text-base font-bold text-gray-900">Available Stocks by Supplier</h2>
				</div>
				<span class="text-xs text-gray-500">
					{store.suppliers.length} supplier{store.suppliers.length === 1 ? '' : 's'}
				</span>
			</div>

			{#if store.suppliers.length === 0}
				<p class="text-sm text-gray-500">No supplier stock records available.</p>
			{:else}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					{#each store.suppliers as supplier (supplier.id)}
						{@const activeProducts = (supplier.products ?? []).filter((p) => p.active === 1)}
						<div class="rounded-lg border border-gray-200 bg-stone-50/60 p-4">
							<div class="flex items-start justify-between gap-2 border-b border-gray-200 pb-2.5">
								<div>
									<div class="flex items-center gap-2">
										<h3 class="text-sm font-bold text-gray-900">{supplier.name}</h3>
										<span
											class="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-gray-600 ring-1 ring-gray-200"
										>
											{supplier.code}
										</span>
									</div>
									<p class="mt-0.5 text-xs text-gray-500">Status: {supplier.status}</p>
								</div>
								<div class="text-right">
									<p class="text-[11px] font-semibold text-gray-500 uppercase">Total On Hand</p>
									<p class="text-sm font-bold text-gray-900">
										{(supplier.totalOnHand ?? 0).toLocaleString()} bags
									</p>
								</div>
							</div>

							<div class="mt-3 divide-y divide-gray-200/70">
								{#each activeProducts as prod (prod.id)}
									{@const feedLabel =
										prod.name ||
										[prod.feedType, prod.stage].filter(Boolean).join(' · ') ||
										'Feed Item'}
									<div class="flex items-center justify-between gap-3 py-2 text-xs">
										<div class="min-w-0">
											<p class="truncate font-medium text-gray-800">{feedLabel}</p>
											{#if prod.sku}
												<p class="font-mono text-[11px] text-gray-400">{prod.sku}</p>
											{/if}
										</div>
										<div class="flex shrink-0 items-center gap-2">
											<span
												class="rounded-full px-2 py-0.5 text-[11px] font-semibold {prod.onHand > 0
													? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
													: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'}"
											>
												{prod.onHand.toLocaleString()} bags
											</span>
										</div>
									</div>
								{:else}
									<p class="py-2 text-xs text-gray-400">No active products</p>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
			<FilterBar {store} />
			<PulloutTable {store} />
			<Pagination {store} />
		</div>
	</div>
</div>

<SelectionBar {store} />
<DispatchDrawer {store} />
