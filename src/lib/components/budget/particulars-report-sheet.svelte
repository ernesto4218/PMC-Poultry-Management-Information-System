<script lang="ts">
	import Badge from '#lib/components/ui/badge/badge.svelte';
	import { ClipboardList, Wheat } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import QRCode from 'qrcode';
	import JsBarcode from 'jsbarcode';
	import type { BudgetReportSnapshot } from '#lib/budget/budget-snapshot.ts';
	import { formatNumber, formatCurrency, formatPerChick } from '#lib/utils/format.ts';

	// Renders ONLY from the snapshot, never from live farm / memory data, so a saved
	// report reprints exactly as it was first printed.
	let {
		snapshot,
		documentId = '',
		createdAt = null,
		reprint = false,
		voided = false,
		actions
	}: {
		snapshot: BudgetReportSnapshot;
		documentId?: string; // empty = draft (no barcode yet)
		createdAt?: Date | string | null; // null = draft, shows the current time
		reprint?: boolean; // true on the saved-report page
		voided?: boolean;
		actions?: Snippet; // buttons rendered at the end of the footer (screen only)
	} = $props();

	let qrDataUrl = $state('');
	let barcodeUrl = $state('');

	// ---- fit-to-page -------------------------------------------------------
	// Page content height: 8.5in minus 0.25in padding top and bottom = 8in (96px per inch).
	// The header and the bottom bar (signatures, info, barcode) are fixed. Whatever
	// height is left belongs to the tables. If the tables are taller than that, they are
	// scaled down (print only) so the bottom bar is never clipped.
	const PAGE_HEIGHT_PX = 8 * 96;
	const GAPS_PX = 8 * 3; // gap-2 between header, body, bottom bar
	const MIN_FIT = 0.5; // never shrink below 50%; past that, rows would be unreadable

	let headerEl = $state<HTMLElement>();
	let bodyEl = $state<HTMLElement>();
	let bottomEl = $state<HTMLElement>();
	let fit = $state(1);

	function recalcFit() {
		if (!headerEl || !bodyEl || !bottomEl) return;
		// zoom only applies in print; measuring while printing would be circular
		if (window.matchMedia('print').matches) return;
		const available = PAGE_HEIGHT_PX - headerEl.offsetHeight - bottomEl.offsetHeight - GAPS_PX;
		const needed = bodyEl.offsetHeight;
		fit = needed > 0 ? Math.max(MIN_FIT, Math.min(1, available / needed)) : 1;
	}

	$effect(() => {
		if (!headerEl || !bodyEl || !bottomEl) return;
		const ro = new ResizeObserver(recalcFit);
		ro.observe(headerEl);
		ro.observe(bodyEl);
		ro.observe(bottomEl);
		recalcFit();
		return () => ro.disconnect();
	});

	const categories = $derived(snapshot.categories);
	const bagsText = (n: number) =>
		n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

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

	$effect(() => {
		const id = snapshot.farm.id;
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
		if (!documentId) {
			barcodeUrl = '';
			return;
		}
		try {
			const canvas = document.createElement('canvas');
			JsBarcode(canvas, documentId, {
				format: 'CODE128',
				width: 2,
				height: 40,
				margin: 0,
				displayValue: false,
				background: '#ffffff',
				lineColor: '#000000'
			});
			barcodeUrl = canvas.toDataURL('image/png');
		} catch {
			// invalid value for the format: leave the barcode empty
			barcodeUrl = '';
		}
	});

	const cellText =
		'border-r border-b tracking-wide border-black px-1 py-0 align-middle h-3.5 text-[10px] leading-3 whitespace-nowrap tabular-nums';
	const headBase =
		'border-r border-b tracking-wide border-black px-1 py-0 text-center align-middle h-6 text-[11px] leading-none font-semibold whitespace-nowrap text-gray-900 bg-amber-300';
	const subRow =
		'border-r border-b tracking-wide border-black bg-stone-100 px-1 py-1 h-3.5 text-[10px] leading-none font-semibold';
</script>

<div class="relative flex flex-col gap-2 print:h-[8in] print:overflow-hidden">
	{#if voided}
		<div
			class="pointer-events-none absolute inset-0 z-40 flex items-center justify-center text-[10rem] font-black tracking-widest text-red-600/15 uppercase"
			style="transform: rotate(-15deg)"
		>
			Void
		</div>
	{/if}

	<!-- Header (fixed height) -->
	<header
		bind:this={headerEl}
		class="flex w-full shrink-0 items-center justify-between gap-4 border-b-2 border-red-600 pb-1"
	>
		<!-- Company -->
		<div class="flex items-center gap-2">
			<div class="flex size-10 shrink-0 items-center justify-center rounded-md bg-red-600 p-1">
				<img
					src="/company_logo.png"
					alt="Puting Manok Corporation logo"
					class="size-full object-contain"
				/>
			</div>
			<div class="leading-none">
				<p class="text-sm font-bold tracking-wide text-black">PUTING MANOK CORPORATION</p>
				<p class="text-[10px] font-semibold tracking-widest text-red-600 uppercase">
					Poultry Department
				</p>
				<p class="mt-0.5 text-[8px] text-black">
					National Road, Brgy. Culo, Purok Society One, Molave, Zamboanga del Sur
				</p>
			</div>
		</div>

		<!-- Farm info + QR -->
		<div class="flex items-center gap-2">
			<div class="flex flex-col items-end gap-0.5 text-[10px] leading-none">
				<div class="flex flex-col items-end justify-end gap-1.5">
					<div class="flex flex-row gap-2">
						<span class="font-semibold text-black">{snapshot.farm.name}</span>
						<span
							class="rounded-sm bg-black px-1 py-1 text-[7px] font-bold tracking-wide text-white uppercase"
						>
							{snapshot.farm.code}
						</span>
						<span
							class="rounded-sm bg-black px-1 py-1 text-[7px] font-bold tracking-wide text-white uppercase"
						>
							{snapshot.farm.type}
						</span>
					</div>

					<div class="flex flex-row gap-2">
						{#if snapshot.batch}
							<span
								class="rounded-sm bg-red-100 px-1 py-1 text-[7px] font-bold tracking-wide text-red-700 uppercase"
							>
								Batch
							</span>
							<span class="font-mono text-[9px] font-bold text-black">{snapshot.batch.number}</span>
							{#if snapshot.batch.dateSet}
								<span class="text-[8px] text-gray-600">· set {snapshot.batch.dateSet}</span>
							{/if}
						{/if}
					</div>
				</div>

				<!-- Location, vol, birds -->
				<div class="mt-1 flex items-center justify-end gap-1.5 text-[8px] text-gray-600">
					<span>Location: {snapshot.farm.address}</span>
					<span class="text-gray-300">|</span>
					<span
						>Vol <b class="font-semibold text-black tabular-nums">{formatNumber(snapshot.volume)}</b
						></span
					>
					<span class="text-gray-300">|</span>
					<span
						>Birds <b class="font-semibold text-black tabular-nums"
							>{formatNumber(snapshot.birdcount)}</b
						></span
					>
				</div>
			</div>

			{#if qrDataUrl}
				<figure class="flex shrink-0 flex-col items-center gap-px border-l-2 border-red-600 pl-1.5">
					<img
						src={qrDataUrl}
						alt="QR code for farm {snapshot.farm.id}"
						class="size-10 rounded-sm border border-gray-300 bg-white p-px"
					/>
					<figcaption
						class="max-w-10 text-center font-mono text-[4px] leading-none break-all text-black"
					>
						{snapshot.farm.id}
					</figcaption>
				</figure>
			{/if}
		</div>
	</header>

	<!-- Body: takes all remaining height. In print, anything that does not fit is scaled down. -->
	<div class="min-h-0 flex-1 print:overflow-hidden">
		<div bind:this={bodyEl} class="fit flex flex-row items-start gap-2" style="--fit: {fit}">
			<!-- Particulars -->
			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-2 border-b border-red-100 bg-red-200 px-3 py-1">
					<ClipboardList class="size-3 text-red-700" />
					<h2 class="text-[10px] font-bold tracking-wide text-gray-900 uppercase">Particulars</h2>
				</div>

				<table class="w-full border-separate border-spacing-0 border-1 border-black text-[9px]">
					<thead>
						<tr>
							<th class="{headBase} w-20">Date</th>
							<th class="{headBase} w-30 text-left">Particulars</th>
							<th class={headBase}>Qty</th>
							<th class={headBase}>Price</th>
							<th class={headBase}>P.O</th>
							{#each categories as c (c)}
								<th class={headBase}>{c}</th>
							{/each}
							<th class="{headBase} text-left">Remarks</th>
						</tr>
					</thead>

					<tbody>
						{#each snapshot.rows as r, i (i)}
							<tr>
								<td class="{cellText} text-center">
									{#if r.date}
										<b>{r.date}</b>
										{#if r.day != null}<span class="text-[7px] text-gray-600">
												(D{r.day})</span
											>{/if}
									{/if}
								</td>
								<td class="{cellText} w-fit font-normal">
									{r.name}{#if r.label}<span class="text-[8px] text-gray-500">
											({r.label})</span
										>{/if}
								</td>
								<td class="{cellText} text-right">{r.qty}</td>
								<td class="{cellText} text-right">{r.price}</td>
								<td class={cellText}></td>
								{#each categories as c (c)}
									{#if r.category === c}
										<td class="{cellText} text-right">{r.amount}</td>
									{:else}
										<td class="{cellText} bg-gray-200"></td>
									{/if}
								{/each}
								<td class="{cellText} w-40 text-[8px] text-red-700">{r.remarks}</td>
							</tr>
						{/each}
						{#if snapshot.rows.length === 0}
							<tr>
								<td
									class="{cellText} py-2 text-center text-gray-500"
									colspan={6 + categories.length}
								>
									No particulars.
								</td>
							</tr>
						{/if}
					</tbody>

					<tfoot>
						<tr>
							<td colspan="5" class="{subRow} bg-amber-100 text-right tracking-wider uppercase"
								>Total</td
							>
							{#each categories as c (c)}
								<td class="{subRow} bg-amber-100 text-right tabular-nums">
									{formatCurrency(snapshot.categoryTotals[c] ?? 0)}
								</td>
							{/each}
							<td class="{subRow} bg-amber-100 tabular-nums">
								₱{formatCurrency(snapshot.grandTotal)}
							</td>
						</tr>
						<tr>
							<td colspan="5" class="{subRow} text-right tracking-wider uppercase">Per bird</td>
							{#each categories as c (c)}
								<td class="{subRow} text-right tabular-nums">
									{formatPerChick(snapshot.perChickByCategory[c] ?? 0)}
								</td>
							{/each}
							<td class="{subRow} tabular-nums">{formatPerChick(snapshot.grandPerChick)}</td>
						</tr>
					</tfoot>
				</table>
			</div>

			<!-- Feeds summary -->
			<div class="w-fit shrink-0">
				<div class="flex flex-wrap items-center gap-2 border-b border-red-100 bg-red-200 px-3 py-1">
					<Wheat class="size-3 text-red-700" />
					<h2 class="text-[10px] font-bold tracking-wide text-gray-900 uppercase">Feeds Summary</h2>
					<span class="text-[8px] text-gray-700">÷ {formatNumber(snapshot.volume)} chicks</span>
				</div>

				<table class="w-fit border-separate border-spacing-0 border-1 border-black text-[9px]">
					<thead>
						<tr>
							<th class="{headBase} text-left">Feed</th>
							<th class={headBase}>Total Qty</th>
							<th class={headBase}>Amount</th>
							<th class={headBase}>Bags Alloc.</th>
							<th class={headBase}>Cost / Chick</th>
						</tr>
					</thead>

					<tbody>
						{#each snapshot.feeds.groups as g (g.key)}
							<tr>
								<td
									colspan="5"
									class="h-4 border-r border-b border-black bg-amber-100 px-1 py-0 text-[8px] leading-none font-bold tracking-wider text-amber-900 uppercase"
								>
									{g.label}
								</td>
							</tr>

							{#each g.rows as r (r.name)}
								<tr>
									<td class="{cellText} pl-3">{r.name}</td>
									<td class="{cellText} text-right">{formatNumber(r.qty)}</td>
									<td class="{cellText} text-right">{formatCurrency(r.amount)}</td>
									<td class="{cellText} text-right">{bagsText(r.bags)}</td>
									<td class={cellText}></td>
								</tr>
							{/each}

							{#if g.rows.length > 1}
								<tr>
									<td class="{subRow} pl-3">Total {g.label}</td>
									<td class="{subRow} text-right tabular-nums">{formatNumber(g.qty)}</td>
									<td class="{subRow} text-right tabular-nums">{formatCurrency(g.amount)}</td>
									<td class="{subRow} text-right tabular-nums">{bagsText(g.bags)}</td>
									<td class="{subRow} text-right tabular-nums">{formatPerChick(g.perChick)}</td>
								</tr>
							{/if}
						{/each}
					</tbody>

					<tfoot>
						<tr>
							<td class="{subRow} bg-amber-100 uppercase">Total feeds cost</td>
							<td class="{subRow} bg-amber-100 text-right tabular-nums">
								{formatNumber(snapshot.feeds.qty)}
							</td>
							<td class="{subRow} bg-amber-100 text-right tabular-nums">
								{formatCurrency(snapshot.feeds.amount)}
							</td>
							<td class="{subRow} bg-amber-100 text-right tabular-nums">
								{bagsText(snapshot.feeds.bags)}
							</td>
							<td class="{subRow} bg-amber-100 text-right tabular-nums">
								{formatPerChick(snapshot.feeds.perChick)}
							</td>
						</tr>
					</tfoot>
				</table>

				<p class="mt-1 text-[8px] leading-tight text-gray-700">
					Basis: {snapshot.type?.toUpperCase()} · mortality {(snapshot.mortalityRate * 100).toFixed(
						1
					)}% of {formatNumber(snapshot.adjustedVolume)} chicks
				</p>
			</div>
		</div>
	</div>

	<!-- Bottom bar (fixed): print info | signatures | barcode. Always visible. -->
	<div
		bind:this={bottomEl}
		class="grid shrink-0 grid-cols-[1fr_auto_1fr] items-end gap-4 border-t border-gray-400 pt-1"
	>
		<!-- Left: print info -->
		<div class="flex flex-col items-start gap-0.5">
			<span class="w-fit rounded-full bg-black px-2 py-0.5 text-[8px] leading-none text-white">
				System Generated Report
			</span>
			{#if reprint}
				<Badge variant="secondary" class="text-[8px]">Reprint</Badge>
			{/if}
			<p class="text-[9px] leading-none text-black">
				{reprint ? 'Originally printed' : 'Date printed'}: {printedAt}
			</p>
			{#if snapshot.batch?.id}
				<p class="font-mono text-[7px] leading-none text-gray-700">
					Batch ID: {snapshot.batch.id}
				</p>
			{/if}
		</div>

		<!-- Center: signatures -->
		<div class="flex flex-row justify-center gap-24">
			<div class="flex flex-col items-center leading-none">
				<p class="text-[9px]">PREPARED BY:</p>
				<p class="mt-4 text-[9px] font-bold">KRISMAY ROSE ALMADIN</p>
			</div>

			<div class="flex flex-col items-center leading-none">
				<p class="text-[9px]">APPROVED BY:</p>
				<p class="mt-4 text-[9px] font-bold underline">RIO ANGELOU L. GO</p>
				<p class="mt-1 text-[9px]">VP-POULTRY</p>
			</div>

			<div class="flex flex-col items-center leading-none">
				<p class="text-[9px]">APPROVED BY:</p>
				<p class="mt-4 text-[9px] font-bold underline">RIO ONYX M. GO</p>
				<p class="mt-1 text-[9px]">CEO</p>
			</div>
		</div>

		<!-- Right: barcode -->
		<div class="flex justify-end">
			{#if documentId}
				<figure class="flex shrink-0 flex-col items-center gap-0.5">
					{#if barcodeUrl}
						<img src={barcodeUrl} alt="Barcode {documentId}" class="h-7 w-auto bg-white" />
					{/if}
					<figcaption class="font-mono text-[7px] leading-none tracking-widest text-black">
						{documentId}
					</figcaption>
				</figure>
			{:else}
				<span class="text-[8px] text-gray-500 print:hidden">Draft: saved on print/download</span>
			{/if}
		</div>
	</div>

	<div class="flex w-full shrink-0 flex-col items-end print:hidden">
		{@render actions?.()}
	</div>
</div>

<style>
	/* zoom is set on screen by the fit-to-page calculation, but only takes effect in print */
	@media print {
		.fit {
			zoom: var(--fit, 1);
		}

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

		:global(#print-area > *) {
			height: 8in !important;
		}
	}
</style>
