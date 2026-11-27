<script lang="ts">
	import { enhance } from '$app/forms';
	import { XIcon, TruckIcon, AlertTriangleIcon, Loader2Icon } from '@lucide/svelte';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import type { PulloutStore } from './pullout-store.svelte.ts';
	import LoadItem from './LoadItem.svelte';

	let { store }: { store: PulloutStore } = $props();

	const label = 'mb-1 block text-xs font-semibold text-gray-600 uppercase';
	const driverName = $derived(store.drivers.find((d) => d.id === store.form.driverId)?.name);
	const canSubmit = $derived(
		!store.submitting &&
			!!store.form.truckId &&
			!!store.form.driverId &&
			store.selectedCount > 0 &&
			store.totalBags > 0 &&
			store.allStocksSelected
	);
</script>

{#if store.drawerOpen}
	<div class="fixed inset-0 z-50 flex justify-end">
		<button
			type="button"
			aria-label="Close drawer"
			class="flex-1 bg-black/30 backdrop-blur-[1px]"
			onclick={store.closeDrawer}
		></button>

		<aside class="flex h-full w-full max-w-xl flex-col bg-stone-50 shadow-2xl">
			<form
				method="POST"
				action="?/dispatch"
				use:enhance={store.enhanceDispatch}
				class="flex h-full flex-col"
			>
				<input type="hidden" name="payload" value={JSON.stringify(store.payload)} />

				<!-- Header -->
				<div class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
					<div>
						<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">Dispatch</p>
						<h2 class="mt-0.5 text-lg font-bold text-gray-900">Build Load</h2>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						class="h-8 w-8"
						onclick={store.closeDrawer}
						aria-label="Close"
					>
						<XIcon class="h-4 w-4" />
					</Button>
				</div>

				<!-- Body -->
				<div class="flex-1 space-y-5 overflow-y-auto px-6 py-5">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<span class={label}>Truck</span>
							<Select.Root type="single" bind:value={store.form.truckId}>
								<Select.Trigger class="h-10 w-full rounded-lg border-gray-300 text-sm">
									{store.selectedTruck?.plateNumber ?? 'Select truck'}
								</Select.Trigger>
								<Select.Content>
									{#each store.trucks as t (t.id)}
										<Select.Item value={t.id}>{t.plateNumber} · {t.capacity} bags</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<div>
							<span class={label}>Driver</span>
							<Select.Root type="single" bind:value={store.form.driverId}>
								<Select.Trigger class="h-10 w-full rounded-lg border-gray-300 text-sm">
									{driverName ?? 'Select driver'}
								</Select.Trigger>
								<Select.Content>
									{#each store.drivers as d (d.id)}
										<Select.Item value={d.id}>{d.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<label class="block">
							<span class={label}>Dispatch Date</span>
							<Input
								type="date"
								bind:value={store.form.dispatchDate}
								class="h-10 rounded-lg border-gray-300"
							/>
						</label>

						<label class="block sm:col-span-2">
							<span class={label}>Notes / Exception reason</span>
							<Input
								bind:value={store.form.notes}
								placeholder="Optional — e.g. low stock, split delivery…"
								class="h-10 rounded-lg border-gray-300"
							/>
						</label>
					</div>

					{#if store.unselectedStockRows.length > 0}
						<div
							class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
						>
							<AlertTriangleIcon class="mt-0.5 h-4 w-4 shrink-0" />
							<div>
								<strong>Select stock to deduct</strong> for:
								{store.unselectedStockRows.map((r) => r.feedName).join(', ')}.
							</div>
						</div>
					{/if}

					{#if store.overCapacity}
						<div
							class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
						>
							<AlertTriangleIcon class="mt-0.5 h-4 w-4 shrink-0" />
							<div>
								<strong>Over capacity.</strong>
								{store.totalBags} bags exceeds the {store.capacity}-bag limit for this truck. You
								can still dispatch — this is a soft warning.
							</div>
						</div>
					{/if}

					{#if store.stockWarnings.length > 0}
						<div
							class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
						>
							<AlertTriangleIcon class="mt-0.5 h-4 w-4 shrink-0" />
							<div>
								<strong>Exceeds selected stock.</strong>
								{store.stockWarnings.map((r) => r.feedName).join(', ')}. Dispatch can still proceed.
							</div>
						</div>
					{/if}

					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<p class="text-xs font-semibold text-gray-600 uppercase">
								{store.selectedCount} items · {store.totalBags} bags
							</p>
							<button
								type="button"
								class="text-xs text-red-700 hover:underline"
								onclick={store.clearSelection}
							>
								Clear all
							</button>
						</div>

						{#each store.selectedRows as row (row.id)}
							<LoadItem
								{store}
								{row}
								qty={store.qtyFor(row)}
								onqty={(v) => store.setLoadQty(row.id, v)}
								onremove={() => store.removeItem(row.id)}
							/>
						{/each}
					</div>
				</div>

				<!-- Footer -->
				<div class="border-t border-gray-200 bg-white px-6 py-4">
					<div class="mb-3 flex items-center justify-between text-sm">
						<span class="text-gray-500">Total bags</span>
						<span class="font-semibold {store.overCapacity ? 'text-rose-700' : 'text-gray-900'}">
							{store.totalBags} / {store.capacity}
						</span>
					</div>
					<div class="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onclick={store.closeDrawer}
							disabled={store.submitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							class="bg-red-700 text-white hover:bg-red-800"
							disabled={!canSubmit}
						>
							{#if store.submitting}
								<Loader2Icon class="mr-1.5 h-4 w-4 animate-spin" /> Dispatching…
							{:else}
								<TruckIcon class="mr-1.5 h-4 w-4" /> Confirm &amp; Dispatch
							{/if}
						</Button>
					</div>
				</div>
			</form>
		</aside>
	</div>
{/if}
