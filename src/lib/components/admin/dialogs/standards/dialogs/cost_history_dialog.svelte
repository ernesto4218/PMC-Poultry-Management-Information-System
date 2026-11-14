<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { buttonVariants } from '#lib/components/ui/button/index.ts';
	import { HistoryIcon, LoaderCircleIcon, AlertCircleIcon } from '@lucide/svelte';
	import type { HistoryEntry, Item } from '#lib/types/standards/cost/items.ts';

	let { open = $bindable(false), item = null }: { open?: boolean; item?: Item | null } = $props();

	let entries = $state<HistoryEntry[]>([]);
	let loading = $state(false);
	let errorMsg = $state('');

	$effect(() => {
		if (open && item) load(item.id);
	});

	async function load(id: string) {
		loading = true;
		errorMsg = '';
		entries = [];
		try {
			const res = await fetch(`/api/standard/cost/history?id=${encodeURIComponent(id)}`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error ?? `Failed to load history (HTTP ${res.status}).`);
			}
			entries = await res.json();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Could not load history.';
		} finally {
			loading = false;
		}
	}

	function formatDate(iso: string) {
		try {
			return new Date(iso).toLocaleString();
		} catch {
			return iso;
		}
	}

	function describe(entry: HistoryEntry): string {
		switch (entry.action) {
			case 'created':
				return 'Item created';
			case 'updated':
				return 'Item updated';
			case 'archived':
				return 'Item archived';
			case 'restored':
				return 'Item restored';
			case 'deleted':
				return 'Item deleted';
			default:
				return entry.action;
		}
	}

	function formatValue(v: unknown): string {
		if (v === null || v === undefined) return '—';
		return String(v);
	}

	const badgeCls = (action: HistoryEntry['action']) => {
		switch (action) {
			case 'created':
				return 'bg-emerald-50 text-emerald-700';
			case 'updated':
				return 'bg-blue-50 text-blue-700';
			case 'archived':
				return 'bg-amber-50 text-amber-700';
			case 'restored':
				return 'bg-emerald-50 text-emerald-700';
			case 'deleted':
				return 'bg-red-50 text-red-700';
			default:
				return 'bg-gray-50 text-gray-700';
		}
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="min-w-xl gap-0 overflow-y-auto border-t-4 border-t-red-700 p-0">
		<Dialog.Header class="border-b border-gray-100 px-6 pt-5 pb-4">
			<Dialog.Title class="flex items-center gap-3 text-lg font-semibold text-gray-900">
				<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700">
					<HistoryIcon class="h-5 w-5" />
				</span>
				<span class="flex flex-col leading-tight">
					<span>History</span>
					<span class="text-sm font-normal text-gray-500">
						{item ? `${item.itemName} · ${item.farmCode}` : 'Change log'}
					</span>
				</span>
			</Dialog.Title>
			<Dialog.Description class="sr-only"
				>Audit trail of changes for this cost entry.</Dialog.Description
			>
		</Dialog.Header>

		<div class="max-h-[65vh] overflow-y-auto px-6 py-5">
			{#if loading}
				<div class="flex items-center gap-2 text-sm text-gray-500">
					<LoaderCircleIcon class="h-4 w-4 animate-spin" /> Loading…
				</div>
			{:else if errorMsg}
				<div
					class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
				>
					<AlertCircleIcon class="mt-0.5 h-4 w-4 shrink-0" />
					<span>{errorMsg}</span>
				</div>
			{:else if entries.length === 0}
				<p class="text-sm text-gray-500">No history yet.</p>
			{:else}
				<ol class="relative space-y-4 border-l border-gray-200 pl-4">
					{#each entries as entry (entry.id)}
						<li class="relative">
							<span
								class="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-red-600 ring-4 ring-white"
							></span>
							<div class="flex flex-wrap items-baseline justify-between gap-2">
								<span
									class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold {badgeCls(
										entry.action
									)}"
								>
									{describe(entry)}
								</span>
								<span class="text-xs text-gray-500">{formatDate(entry.changedAt)}</span>
							</div>
							{#if entry.changes}
								<ul class="mt-1 space-y-0.5 text-xs text-gray-600">
									{#each Object.entries(entry.changes) as [field, change] (field)}
										<li>
											<span class="font-medium">{field}</span>:
											<span class="text-red-700 line-through">{formatValue(change.from)}</span>
											→
											<span class="text-emerald-700">{formatValue(change.to)}</span>
										</li>
									{/each}
								</ul>
							{/if}
						</li>
					{/each}
				</ol>
			{/if}
		</div>

		<Dialog.Footer class="mb-2 flex w-full justify-end border-t border-gray-100 bg-gray-50/60">
			<Dialog.Close class={buttonVariants({ variant: 'outline' })}>Close</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
