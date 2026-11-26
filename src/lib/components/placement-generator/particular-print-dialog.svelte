<script lang="ts">
	import Button from '#lib/components/ui/button/button.svelte';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Download, Printer } from '@lucide/svelte';
	import { tick } from 'svelte';
	import { downloadElementAsPdf } from './download-pdf';
	import { buildBudgetBody, type BudgetReportSnapshot } from '#lib/budget/budget-snapshot.ts';
	import ParticularsReportSheet from '../budget/particulars-report-sheet.svelte';
	import { printAreaClass } from '#lib/types/print-dialog.ts';

	type Farm = { id: string; name: string; code: string; type?: string; address?: string };

	let {
		farm,
		batchId,
		batchNumber = '',
		batchDateSet = '',
		dateSet = '',
		volume = 0,
		birdcount = 0,
		type = '',
		memory,
		vitamins = [],
		vitaminsCategory = null,
		feeds,
		categoryTotals,
		grandTotal
	}: {
		farm: Farm;
		batchId: string; // required: a budget is always for one batch
		batchNumber?: string | null;
		batchDateSet?: string | null;
		dateSet?: string;
		volume?: number;
		birdcount?: number;
		type?: string;
		memory: any;
		vitamins?: any[];
		vitaminsCategory?: string | null;
		feeds: any;
		categoryTotals: Record<string, number>;
		grandTotal: number;
	} = $props();

	let downloading = $state(false);

	// Everything the sheet shows, frozen into plain data
	const body = $derived(
		buildBudgetBody({
			dateSet,
			volume,
			birdcount,
			type,
			memory,
			vitamins,
			vitaminsCategory,
			feeds,
			categoryTotals,
			grandTotal
		})
	);

	// Live data in the same shape as a saved snapshot, so the sheet renders either
	const snapshot = $derived<BudgetReportSnapshot>({
		schemaVersion: 1,
		farm: {
			id: farm.id,
			name: farm.name,
			code: farm.code,
			type: farm.type ?? '',
			address: farm.address ?? ''
		},
		batch: { id: batchId, number: batchNumber ?? '', dateSet: batchDateSet ?? '' },
		...body
	});

	// ---- saving a snapshot -------------------------------------------------
	const payload = $derived({ farmId: farm.id, chickBatchId: batchId, body });
	const payloadKey = $derived(JSON.stringify(payload));

	let saved = $state<{ documentId: string; createdAt: string; key: string } | null>(null);
	let saving = $state(false);
	let saveError = $state('');

	// If the budget changes after saving, the old save no longer matches
	const isSaved = $derived(saved !== null && saved.key === payloadKey);
	const docId = $derived(isSaved ? saved!.documentId : '');

	async function ensureSaved(): Promise<boolean> {
		if (isSaved) return true;
		saving = true;
		saveError = '';
		try {
			const key = payloadKey;
			const res = await fetch('/api/budget-reports', {
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
			await tick(); // let the barcode render before printing / capturing
			return true;
		} catch (e) {
			saveError = e instanceof Error ? e.message : 'Save failed';
			return false;
		} finally {
			saving = false;
		}
	}

	async function downloadPdf() {
		if (!(await ensureSaved())) return;
		downloading = true;
		try {
			await downloadElementAsPdf('print-area', `${farm.code}-${docId}.pdf`);
		} finally {
			downloading = false;
		}
	}

	async function printReport() {
		if (!(await ensureSaved())) return;
		// Let pending reactive updates flush before the browser snapshots the page
		requestAnimationFrame(() => {
			window.print();
		});
	}
</script>

<Dialog.Root>
	<Dialog.Trigger>
		<Button class="gap-2 bg-red-700 text-white hover:bg-red-800">
			<Printer class="size-4" />
			Print
		</Button>
	</Dialog.Trigger>
	<Dialog.Content id="print-area" class={printAreaClass}>
		<ParticularsReportSheet
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
		</ParticularsReportSheet>
	</Dialog.Content>
</Dialog.Root>
