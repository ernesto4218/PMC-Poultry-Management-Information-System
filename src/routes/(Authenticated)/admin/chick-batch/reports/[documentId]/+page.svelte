<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import {
		ArrowLeftIcon,
		BanIcon,
		DownloadIcon,
		PrinterIcon,
		TriangleAlertIcon
	} from '@lucide/svelte';
	// Same util the med guide uses — adjust the path if yours lives elsewhere
	import { downloadElementAsPdf } from '#lib/components/admin/med-guide/download-pdf.js';
	import ChickBatchReportSheet from '#lib/components/chick-batch/ChickBatchReportSheet.svelte';

	let { data } = $props();

	const report = $derived(data.report);
	const snap = $derived(report.snapshot);
	const isVoid = $derived(report.status === 'void');

	let downloading = $state(false);
	let voidOpen = $state(false);
	let voiding = $state(false);

	const savedAt = $derived(
		new Date(report.createdAt).toLocaleString('en-PH', {
			timeZone: 'Asia/Manila',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		})
	);

	// Prints the saved snapshot as-is. Nothing is sent to the server.
	function printReport() {
		requestAnimationFrame(() => window.print());
	}

	async function downloadPdf() {
		downloading = true;
		try {
			await downloadElementAsPdf('print-area', `${report.documentId}.pdf`);
		} finally {
			downloading = false;
		}
	}
</script>

<svelte:head>
	<title>{report.documentId} | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER (screen only: it sits outside #print-area) -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<a
					href="/admin/chick-batch/reports"
					class="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline"
				>
					<ArrowLeftIcon class="h-3 w-3" />
					All reports
				</a>
				<p class="mt-2 text-xs font-semibold tracking-wider text-red-700 uppercase">Saved report</p>
				<h1 class="mt-1 font-mono text-3xl font-bold tracking-tight text-gray-900">
					{report.documentId}
				</h1>
				<p class="mt-1 text-sm text-gray-500">
					Saved {savedAt}. Printing uses this saved snapshot, so nothing new is recorded.
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<Button
					onclick={printReport}
					class="h-10 rounded-lg bg-red-700 px-4 font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-600"
				>
					<PrinterIcon class="mr-2 h-4 w-4" />
					Print
				</Button>
				<Button
					onclick={downloadPdf}
					disabled={downloading}
					variant="outline"
					class="h-10 rounded-lg px-4 font-semibold"
				>
					<DownloadIcon class="mr-2 h-4 w-4" />
					{downloading ? 'Generating...' : 'Download PDF'}
				</Button>

				{#if !isVoid}
					<Button
						type="button"
						variant="ghost"
						onclick={() => (voidOpen = true)}
						class="h-10 text-gray-600 hover:bg-red-50 hover:text-red-700"
					>
						<BanIcon class="mr-2 h-4 w-4" />
						Void
					</Button>
				{/if}
			</div>
		</div>

		{#if isVoid}
			<div
				class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
			>
				This report has been voided. It is kept for the audit trail and prints with a VOID mark.
			</div>
		{/if}

		<!-- THE SHEET: same component as the print dialog -->
		<div class="overflow-x-auto pb-2">
			<div id="print-area" class="min-w-[13in] border bg-white p-4">
				<ChickBatchReportSheet
					snapshot={snap}
					documentId={report.documentId}
					createdAt={report.createdAt}
					reprint
					voided={isVoid}
				/>
			</div>
		</div>
	</div>
</div>

<!-- VOID CONFIRMATION -->
<Dialog.Root bind:open={voidOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<div
				class="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-700"
			>
				<TriangleAlertIcon class="h-5 w-5" />
			</div>
			<Dialog.Title>Void this report?</Dialog.Title>
			<Dialog.Description>
				<span class="font-mono font-semibold text-gray-900">{report.documentId}</span>
				for {snap.farmLabel} will be marked as void. It stays on record for the audit trail and prints
				with a VOID mark. This can't be undone.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/void"
			use:enhance={() => {
				voiding = true;
				return async ({ result, update }) => {
					await update(); // refreshes the page data, so the status flips to void
					voiding = false;
					if (result.type === 'success' || result.type === 'redirect') {
						voidOpen = false;
						toast.success(`${report.documentId} voided`);
					} else {
						toast.error('Could not void the report. Please try again.');
					}
				};
			}}
		>
			<Dialog.Footer class="gap-2 sm:gap-2">
				<Button
					type="button"
					variant="outline"
					disabled={voiding}
					onclick={() => (voidOpen = false)}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={voiding}
					class="bg-red-700 font-semibold text-white hover:bg-red-600"
				>
					{voiding ? 'Voiding...' : 'Void report'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
