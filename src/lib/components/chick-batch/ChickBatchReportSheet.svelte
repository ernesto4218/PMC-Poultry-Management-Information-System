<script lang="ts">
	import Badge from '#lib/components/ui/badge/badge.svelte';
	import { Bird, CalendarDaysIcon } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import QRCode from 'qrcode';
	import JsBarcode from 'jsbarcode';
	import type { ChickBatchReportSnapshotData } from '#lib/types/chick-batch-reports.ts';

	let {
		snapshot,
		documentId = '',
		createdAt = null,
		reprint = false,
		voided = false,
		actions
	}: {
		snapshot: ChickBatchReportSnapshotData;
		documentId?: string;
		createdAt?: Date | string | null;
		reprint?: boolean;
		voided?: boolean;
		actions?: Snippet;
	} = $props();

	let qrDataUrl = $state('');
	let barcodeEl = $state<SVGSVGElement>();

	const fmt = (n: number) => n.toLocaleString('en-US');

	const printedAt = $derived(
		new Date(createdAt ?? Date.now()).toLocaleString('en-PH', {
			timeZone: 'Asia/Manila',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		})
	);

	const displayed = $derived(snapshot.batches.slice(0, 27));
	const truncated = $derived(snapshot.batches.length > 27);

	const dateRangeLabel = $derived(
		snapshot.dateRange
			? `${formatDate(snapshot.dateRange.from)} → ${formatDate(snapshot.dateRange.to)}`
			: '—'
	);

	$effect(() => {
		const id = documentId || 'chick-batches';
		let cancelled = false;
		QRCode.toDataURL(id, { margin: 0, width: 192, errorCorrectionLevel: 'M' })
			.then((url) => {
				if (!cancelled) qrDataUrl = url;
			})
			.catch(() => {
				if (!cancelled) qrDataUrl = '';
			});
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!barcodeEl || !documentId) return;
		try {
			JsBarcode(barcodeEl, documentId, {
				format: 'CODE128',
				width: 1.4,
				height: 28,
				margin: 0,
				displayValue: false,
				background: '#ffffff',
				lineColor: '#000000'
			});
		} catch {
			/* invalid format: leave barcode empty */
		}
	});

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—';
		const parts = dateStr.slice(0, 10).split('-');
		if (parts.length !== 3) return dateStr;
		const [y, m, d] = parts.map(Number);
		if (!y || !m || !d) return dateStr;
		return new Date(y, m - 1, d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	const cell =
		'border-r border-b border-black px-1 py-0 text-center align-middle h-4 text-[9px] leading-none whitespace-nowrap tabular-nums';
	const head =
		'border-r border-b border-black px-1 py-0 text-center align-middle h-6 text-[8px] leading-none font-bold whitespace-nowrap text-gray-900 bg-amber-300';
</script>

<div class="relative flex flex-col gap-4">
	{#if voided}
		<div
			class="pointer-events-none absolute inset-0 z-40 flex items-center justify-center text-[10rem] font-black tracking-widest text-red-600/15 uppercase"
			style="transform: rotate(-15deg)"
		>
			Void
		</div>
	{/if}

	<header class="flex w-full items-stretch justify-between gap-6 border-b-2 border-red-600 pb-3">
		<div class="flex items-center gap-3">
			<div class="flex size-16 shrink-0 items-center justify-center rounded-md bg-red-600 p-1.5">
				<img
					src="/company_logo.png"
					alt="Puting Manok Corporation logo"
					class="size-full object-contain"
				/>
			</div>
			<div class="leading-tight">
				<p class="text-base font-bold tracking-wide text-black">PUTING MANOK CORPORATION</p>
				<p class="text-xs font-semibold tracking-widest text-red-600 uppercase">
					Poultry Department
				</p>
				<p class="mt-1 max-w-xs text-[10px] text-black">
					National Road, Brgy. Culo, Purok Society One, Molave, Zamboanga del Sur
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2 self-end">
			<div class="flex flex-col gap-0.5 text-[11px] leading-tight">
				<div class="flex flex-col items-end justify-start gap-1">
					<div class="flex flex-row items-center justify-end gap-2">
						<span class="text-[10px] font-bold tracking-widest text-red-700 uppercase">
							Chick Batch Report
						</span>
						<Badge variant="default" class="px-1.5 py-0 text-[10px]">{snapshot.farmLabel}</Badge>
					</div>
					<div class="flex items-center justify-end gap-1 text-[10px] text-gray-600">
						<CalendarDaysIcon class="h-3 w-3" />
						{dateRangeLabel}
					</div>
					<div class="mt-1 flex items-center justify-end gap-2 text-gray-500">
						<span>
							Batches <b class="font-semibold text-black tabular-nums"
								>{fmt(snapshot.totals.batches)}</b
							>
						</span>
						<span class="text-gray-300">|</span>
						<span>
							Chicks <b class="font-semibold text-black tabular-nums"
								>{fmt(snapshot.totals.chicks)}</b
							>
						</span>
						<span class="text-gray-300">|</span>
						<span>
							Avg <b class="font-semibold text-black tabular-nums">{fmt(snapshot.totals.avg)}</b>
						</span>
						<span class="text-gray-300">|</span>
						<span>
							Farms <b class="font-semibold text-black tabular-nums">{fmt(snapshot.totals.farms)}</b
							>
						</span>
					</div>
				</div>
			</div>

			{#if qrDataUrl}
				<figure class="flex shrink-0 flex-col items-center gap-px border-l-2 border-red-600 pl-2">
					<img
						src={qrDataUrl}
						alt="QR code for the report"
						class="size-14 rounded-sm border border-gray-300 bg-white p-px"
					/>
					<figcaption
						class="max-w-14 text-center font-mono text-[5px] leading-none break-all text-black"
					>
						{documentId || 'draft'}
					</figcaption>
				</figure>
			{/if}
		</div>
	</header>

	<div>
		<div class="flex flex-wrap items-center gap-2 border-b border-red-100 bg-red-200 px-3 py-1">
			<Bird class="size-3 text-red-700" />
			<h2 class="text-[10px] font-bold tracking-wide text-gray-900 uppercase">Chick In</h2>
		</div>
		<table class="w-full border-separate border-spacing-0 border-1 border-black text-[9px]">
			<thead>
				<tr>
					<th class="{head} w-6">#</th>
					<th class={head}>Batch No.</th>
					<th class={head}>Farm</th>
					<th class="{head} w-12">Code</th>
					<th class={head}>Address</th>
					<th class="{head} w-20">Date Set</th>
					<th class="{head} w-16">Volume</th>
				</tr>
			</thead>
			<tbody>
				{#each displayed as row, i (row.id)}
					<tr class={i % 2 === 0 ? '' : 'bg-stone-50'}>
						<td class={cell}>{i + 1}</td>
						<td class="{cell} text-left font-mono font-semibold">{row.batchNumber}</td>
						<td class="{cell} text-left">{row.farmName}</td>
						<td class="{cell} font-mono">{row.farmCode}</td>
						<td class="{cell} truncate text-left" title={row.farmAddress}
							>{row.farmAddress || '—'}</td
						>
						<td class={cell}>{formatDate(row.dateSet)}</td>
						<td class="{cell} font-semibold">{fmt(row.volume)}</td>
					</tr>
				{/each}
				{#if displayed.length > 0}
					<tr class="bg-amber-50">
						<td class="{cell} text-right font-bold" colspan="6">Grand Total</td>
						<td class="{cell} font-bold">{fmt(snapshot.totals.chicks)}</td>
					</tr>
				{/if}
			</tbody>
		</table>
		{#if truncated}
			<p class="mt-1 text-right text-[8px] text-gray-600 italic">
				Showing latest {displayed.length} of {snapshot.batches.length} batches — apply filters on the
				page to narrow results.
			</p>
		{/if}
	</div>

	<div class="flex flex-row items-center gap-2">
		<Badge variant="secondary" class="text-[8px]">System Generated Report</Badge>
		{#if reprint}
			<Badge variant="secondary" class="text-[8px]">Reprint</Badge>
		{/if}
		{#if voided}
			<Badge variant="destructive" class="text-[8px]">Voided</Badge>
		{/if}
		<p class="text-[9px] text-black">
			{reprint ? 'Originally printed' : 'Date printed'}: {printedAt}
		</p>
		{#if documentId}
			<figure class="ml-auto flex shrink-0 flex-col items-center gap-0.5">
				<svg bind:this={barcodeEl} class="h-7 w-auto bg-white"></svg>
				<figcaption class="font-mono text-[7px] leading-none tracking-widest text-black">
					{documentId}
				</figcaption>
			</figure>
		{:else}
			<span class="ml-auto text-[8px] text-gray-500 print:hidden">
				Draft: saved on print/download
			</span>
		{/if}

		{@render actions?.()}
	</div>
</div>

<style>
	@media print {
		@page {
			size: 13in 8.5in;
			margin: 0;
		}
		:global(html),
		:global(body) {
			margin: 0 !important;
			padding: 0 !important;
			width: 13in !important;
			height: 8.5in !important;
			overflow: hidden !important;
			background: #fff !important;
		}
		:global(body *) {
			visibility: hidden !important;
		}
		:global(#print-area),
		:global(#print-area *) {
			visibility: visible !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		:global(#print-area) {
			position: fixed !important;
			top: 0 !important;
			left: 0 !important;
			right: auto !important;
			bottom: auto !important;
			width: 13in !important;
			height: 8.5in !important;
			min-width: 0 !important;
			min-height: 0 !important;
			max-width: none !important;
			max-height: none !important;
			box-sizing: border-box !important;
			padding: 0.25in !important;
			margin: 0 !important;
			transform: none !important;
			translate: none !important;
			scale: none !important;
			rotate: none !important;
			animation: none !important;
			transition: none !important;
			opacity: 1 !important;
			overflow: hidden !important;
			background: #fff !important;
			border: none !important;
			border-radius: 0 !important;
			box-shadow: none !important;
		}
		:global(#print-area [data-dialog-close]),
		:global(#print-area > button[type='button']:last-child),
		:global(#print-area .print\:hidden) {
			display: none !important;
		}
	}
</style>
