<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.ts';
	import { PlusIcon, PackageIcon, PencilIcon, Trash2Icon, Loader2 } from '@lucide/svelte';
	import { groupByFeedType, type FeedProduct } from '#lib/types/feedProducts.ts';
	import type { FeedSupplier } from '#lib/types/feedSuppliers.ts';

	let {
		open = $bindable(false),
		supplier = null,
		products = [],
		onadd,
		onedit,
		ondelete
	}: {
		open?: boolean;
		supplier?: FeedSupplier | null;
		products?: FeedProduct[];
		onadd?: () => void;
		onedit?: (p: FeedProduct) => void;
		ondelete?: (p: FeedProduct) => Promise<void> | void;
	} = $props();

	let deletingId = $state<string | null>(null);

	const grouped = $derived(
		supplier ? groupByFeedType(products.filter((p) => p.supplierId === supplier.id)) : []
	);
	const total = $derived(grouped.reduce((n, [, list]) => n + list.length, 0));

	async function handleDelete(p: FeedProduct) {
		if (!ondelete) return;
		deletingId = p.id;
		try {
			await ondelete(p);
		} finally {
			deletingId = null;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[92vh] overflow-y-auto border-t-4 border-t-red-700 sm:max-w-[720px]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2 text-xl font-bold text-gray-900">
				<PackageIcon class="h-5 w-5 text-red-700" />
				{supplier?.name ?? 'Supplier'} — products
			</Dialog.Title>
			<Dialog.Description>
				{#if total === 0}
					No feed products recorded yet for this supplier.
				{:else}
					{total} product{total === 1 ? '' : 's'} across
					{grouped.length} feed type{grouped.length === 1 ? '' : 's'}.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-5 py-2">
			{#if total === 0}
				<div class="rounded-lg border border-dashed border-gray-200 bg-stone-50 p-8 text-center">
					<PackageIcon class="mx-auto h-8 w-8 text-gray-400" />
					<p class="mt-2 text-sm text-gray-600">Nothing to show yet.</p>
					{#if onadd}
						<Button class="mt-4 bg-red-700 text-white hover:bg-red-600" onclick={onadd}>
							<PlusIcon class="mr-2 h-4 w-4" />
							Add first product
						</Button>
					{/if}
				</div>
			{:else}
				{#each grouped as [feedType, list] (feedType)}
					<section class="space-y-2">
						<div class="flex items-center justify-between border-b border-gray-100 pb-2">
							<h3 class="text-sm font-semibold text-gray-900">{feedType}</h3>
							<span class="text-xs text-gray-400">
								{list.length} item{list.length === 1 ? '' : 's'}
							</span>
						</div>
						<ul class="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
							{#each list as p (p.id)}
								<li class="flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<span class="truncate font-medium text-gray-900">
												{p.name || p.stage}
											</span>
											{#if p.active === 0}
												<span
													class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500"
												>
													inactive
												</span>
											{/if}
										</div>
										<div class="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
											{#if p.stage && p.name}<span>{p.stage}</span>{/if}
											{#if p.sku}<span class="font-mono">{p.sku}</span>{/if}
										</div>
									</div>
									<div class="flex gap-1">
										{#if onedit}
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8 text-gray-500 hover:bg-amber-100 hover:text-amber-800"
												aria-label="Edit {p.stage || p.name}"
												onclick={() => onedit(p)}
											>
												<PencilIcon class="h-4 w-4" />
											</Button>
										{/if}
										{#if ondelete}
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8 text-gray-500 hover:bg-red-100 hover:text-red-700"
												aria-label="Delete {p.stage || p.name}"
												disabled={deletingId === p.id}
												onclick={() => handleDelete(p)}
											>
												{#if deletingId === p.id}
													<Loader2 class="h-4 w-4 animate-spin" />
												{:else}
													<Trash2Icon class="h-4 w-4" />
												{/if}
											</Button>
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			{/if}
		</div>

		<Dialog.Footer class="flex justify-between gap-2 border-t border-gray-100 pt-4">
			<div>
				{#if onadd && total > 0}
					<Button class="bg-red-700 text-white hover:bg-red-600" onclick={onadd}>
						<PlusIcon class="mr-2 h-4 w-4" />
						Add product
					</Button>
				{/if}
			</div>
			<Dialog.Close type="button" class={buttonVariants({ variant: 'outline' })}>
				Close
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
