<script lang="ts">
	import Button from '#lib/components/ui/button/button.svelte';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Download, Printer } from '@lucide/svelte';
	import { tick } from 'svelte';
	import { downloadElementAsPdf } from '#lib/components/admin/med-guide/download-pdf.js';
	import ChickBatchReportSheet from './ChickBatchReportSheet.svelte';
	import type { ChickBatchWithFarm } from '#lib/types/chick-batches.ts';
	import type {
		ChickBatchReportFilters,
		ChickBatchReportSnapshotData
	} from '#lib/types/chick-batch-reports.ts';

	let {
		open = $bindable(false),
		batches = [],
		filters
	}: {
		open: boolean;
		batches: ChickBatchWithFarm[];
		filters: ChickBatchReportFilters;
	} = $props();

	let downloading = $state(false);
	let saving = $state(false);
	let saveError = $state('');
	let saved = $state<{ documentId: string; createdAt: string; key: string } | null>(null);

	// Build the same shape that's stored in the DB, so reprint renders identically.
	const snapshot = $derived<ChickBatchReportSnapshotData>({
		batches: batches.map((b) => ({
			id: b.id,
			batchNumber: b.batchNumber,
			farmId: b.farmId,
			farmName: b.farm.name,
			farmCode: b.farm.code,
			farmAddress: b.farm.address,
			dateSet: b.dateSet,
			volume: b.volume
		})),
		totals: {
			batches: batches.length,
			chicks: batches.reduce((s, b) => s + b.volume, 0),
			avg: batches.length
				? Math.round(batches.reduce((s, b) => s + b.volume, 0) / batches.length)
				: 0,
			farms: new Set(batches.map((b) => b.farmId)).size
		},
		farmLabel: filters.farmLabel,
		dateRange: (() => {
			if (!batches.length) return null;
			const sorted = batches.map((b) => b.dateSet.slice(0, 10)).sort();
			return { from: sorted[0], to: sorted[sorted.length - 1] };
		})()
	});

	const payload = $derived({ filters, snapshot });
	const payloadKey = $derived(JSON.stringify(payload));

	const isSaved = $derived(saved !== null && saved.key === payloadKey);
	const docId = $derived(isSaved ? saved!.documentId : '');

	$effect(() => {
		if (!open) {
			saved = null;
			saveError = '';
		}
	});

	async function ensureSaved(): Promise<boolean> {
		if (isSaved) return true;
		saving = true;
		saveError = '';
		try {
			const key = payloadKey;
			const res = await fetch('/api/chick-batch-reports', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: key
			});
			if (!res.ok) {
				const err = await res.json().catch(() => null);
				throw new Error(err?.message ?? `Save failed (${res.status})`);
			}
			const r = await res.json();
			saved = { documentId: r.documentId, createdAt: r.createdAt, key };
			await tick();
			return true;
		} catch (e) {
			saveError = e instanceof Error ? e.message : 'Save failed';
			return false;
		} finally {
			saving = false;
		}
	}

	async function printReport() {
		if (!(await ensureSaved())) return;
		await tick();
		requestAnimationFrame(() => window.print());
	}

	async function downloadPdf() {
		if (!(await ensureSaved())) return;
		downloading = true;
		try {
			await tick();
			await downloadElementAsPdf('print-area', `${docId}.pdf`);
		} finally {
			downloading = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content id="print-area" class="flex min-h-[7in] min-w-[13in] flex-col overflow-auto p-4">
		<ChickBatchReportSheet
			{snapshot}
			documentId={docId}
			createdAt={isSaved ? saved!.createdAt : null}
		>
			{#snippet actions()}
				{#if saveError}
					<span class="text-[9px] text-red-700 print:hidden">{saveError}</span>
				{/if}
				<div class="flex items-center gap-2 print:hidden">
					<Button
						size="sm"
						class="gap-2 bg-red-700 text-white hover:bg-red-800"
						onclick={printReport}
						disabled={saving || downloading}
					>
						<Printer class="size-4" />
						{saving ? 'Saving...' : 'Print'}
					</Button>
					<Button
						size="sm"
						class="gap-2 bg-red-700 text-white hover:bg-red-800"
						onclick={downloadPdf}
						disabled={saving || downloading}
					>
						<Download class="size-4" />
						{saving ? 'Saving...' : downloading ? 'Generating...' : 'Download PDF'}
					</Button>
				</div>
			{/snippet}
		</ChickBatchReportSheet>
	</Dialog.Content>
</Dialog.Root>
