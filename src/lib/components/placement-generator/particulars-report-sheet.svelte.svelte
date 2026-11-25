<script lang="ts">
	import Badge from '#lib/components/ui/badge/badge.svelte';
	import { ClipboardList, Wheat } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import QRCode from 'qrcode';
	import { PARTICULAR_CATEGORIES } from '#lib/types/particulars.ts';
	import { computeAmount } from '#lib/utils/particular-amount.ts';
	import {
		formatNumber,
		formatCurrency,
		formatDateShort,
		addDaysToDate,
		formatPerChick
	} from '#lib/utils/format.ts';

	type Farm = { id: string; name: string; code: string; type?: string; address?: string };

	let {
		farm,
		batch = null,
		dateSet = '',
		volume = 0,
		birdcount = 0,
		type = '',
		memory,
		vitamins = [],
		vitaminsCategory = null,
		feeds,
		categoryTotals,
		grandTotal,
		actions
	}: {
		farm: Farm;
		batch?: { id: string; number: string; dateSet: string } | null;
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
		actions?: Snippet; // buttons at the end of the footer (screen only)
	} = $props();

	let qrDataUrl = $state('');

	const round1 = (n: number) => Math.round(n * 10) / 10;

	// Same mortality basis as the on-screen feeds summary
	const mortalityRate = $derived(type?.toLowerCase() === 'ccs' ? 0.035 : 0.05);
	const adjustedVolume = $derived(volume * (1 - mortalityRate));

	const isStarterOrGrower = (g: any) => {
		const k = String(g.key ?? '').toLowerCase();
		const l = String(g.label ?? '').toLowerCase();
		return (
			k.includes('starter') || k.includes('grower') || l.includes('starter') || l.includes('grower')
		);
	};

	const bagsAllocation = (qty: number) =>
		(volume > 0 ? round1(qty / (volume / 1000)) : 0).toLocaleString('en-US', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1
		});

	const groupPerChick = (g: any) => {
		const divisor = isStarterOrGrower(g) ? adjustedVolume : volume;
		return formatPerChick(divisor > 0 ? round1(g.amount / divisor) : 0);
	};

	const perChickByCategory = $derived.by(() => {
		const out: Record<string, number> = {};
		for (const c of PARTICULAR_CATEGORIES) {
			out[c] = birdcount > 0 ? round1((categoryTotals[c] ?? 0) / birdcount) : 0;
		}
		return out;
	});
	const grandPerChick = $derived(
		PARTICULAR_CATEGORIES.reduce((s, c) => s + perChickByCategory[c], 0)
	);

	// One flat list of rows: vitamins, particulars items, then trucking/labor extras
	type Row = {
		date: string;
		day: number | null;
		name: string;
		label?: string;
		qty: string;
		price: string;
		category: string;
		amount: string;
		remarks: string;
		auto: boolean;
	};

	const rows = $derived.by<Row[]>(() => {
		const out: Row[] = [];

		for (const v of vitamins) {
			out.push({
				date: '',
				day: null,
				name: v.name,
				qty: formatNumber(v.kls, { roundUp: true, decimals: 1 }),
				price: formatCurrency(v.price),
				category: vitaminsCategory ?? '',
				amount: formatCurrency(v.amount),
				remarks: '',
				auto: true
			});
		}

		for (const item of memory?.items ?? []) {
			const adjusted =
				item.adjustmentDays != null ? addDaysToDate(dateSet, item.adjustmentDays) : null;
			// computeAmount only has calculators for known categories
			const known = (PARTICULAR_CATEGORIES as readonly string[]).includes(item.particularCategory);
			out.push({
				date: adjusted ? formatDateShort(adjusted) : '',
				day: item.adjustmentDays ?? null,
				name: item.particularName ?? item.particular?.name ?? '—',
				label: item.label,
				qty: formatNumber(item.resolvedQty),
				price: formatCurrency(item.price),
				category: known ? item.particularCategory : '',
				amount: known ? formatCurrency(computeAmount(item)) : '',
				remarks: item.resolveError ?? '',
				auto: false
			});
		}

		if (feeds?.qty > 0) {
			const othersCat =
				PARTICULAR_CATEGORIES.find((c) => String(c).trim().toUpperCase() === 'OTHERS') ?? '';
			for (const r of feeds.extraRows ?? []) {
				out.push({
					date: '',
					day: null,
					name: r.name,
					qty: formatNumber(r.qty),
					price: formatCurrency(r.avgPrice),
					category: othersCat,
					amount: formatCurrency(r.amount),
					remarks: '',
					auto: true
				});
			}
		}
		return out;
	});

	const printedAt = $derived(
		new Date().toLocaleString('en-PH', {
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
		const id = farm.id;
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

	const cellText =
		'border-r border-b border-black px-1 py-0 align-middle h-3 text-[7px] leading-none whitespace-nowrap tabular-nums';
	const headBase =
		'border-r border-b border-black px-1 py-0 text-center align-middle h-6 text-[9px] leading-none font-bold whitespace-nowrap text-gray-900 bg-amber-300';
	const subRow =
		'border-r border-b border-black bg-stone-100 px-1 py-0 h-3 text-[7px] leading-none font-bold';
</script>

<div class="relative flex flex-col gap-4">
	<!-- Header (same as medication report) -->
	<div class="flex w-full flex-row gap-2">
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
							<span class="font-semibold text-black">{farm.name}</span>
							<Badge variant="default" class="px-1.5 py-0 text-[10px]">{farm.code}</Badge>
							<Badge variant="default" class="px-1.5 py-0 text-[10px]">{farm.type}</Badge>
						</div>

						{#if batch}
							<div class="flex items-center justify-end gap-1.5">
								<span
									class="rounded-sm bg-red-100 px-1 text-[8px] font-bold tracking-wide text-red-700 uppercase"
								>
									Batch
								</span>
								<span class="font-mono text-[10px] font-bold text-black">{batch.number}</span>
								{#if batch.dateSet}
									<span class="text-[9px] text-gray-600">· set {batch.dateSet}</span>
								{/if}
							</div>
						{/if}

						<span class="text-[10px] text-gray-600">Location : {farm.address}</span>
					</div>

					<div class="mt-2 flex items-center justify-end gap-2 text-gray-500">
						<span
							>Vol <b class="font-semibold text-black tabular-nums">{formatNumber(volume)}</b></span
						>
						<span class="text-gray-300">|</span>
						<span
							>Birds <b class="font-semibold text-black tabular-nums">{formatNumber(birdcount)}</b
							></span
						>
					</div>
				</div>

				{#if qrDataUrl}
					<figure class="flex shrink-0 flex-col items-center gap-px border-l-2 border-red-600 pl-2">
						<img
							src={qrDataUrl}
							alt="QR code for farm {farm.id}"
							class="size-14 rounded-sm border border-gray-300 bg-white p-px"
						/>
						<figcaption
							class="max-w-14 text-center font-mono text-[5px] leading-none break-all text-black"
						>
							{farm.id}
						</figcaption>
					</figure>
				{/if}
			</div>
		</header>
	</div>

	<div class="flex flex-row items-start gap-2">
		<!-- Particulars -->
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2 border-b border-red-100 bg-red-200 px-3 py-1">
				<ClipboardList class="size-3 text-red-700" />
				<h2 class="text-[10px] font-bold tracking-wide text-gray-900 uppercase">
					Budget Placement
				</h2>
			</div>

			<table class="w-full border-separate border-spacing-0 border-1 border-black text-[9px]">
				<thead>
					<tr>
						<th class="{headBase} w-20">Date</th>
						<th class="{headBase} w-30 text-left">Particulars</th>
						<th class={headBase}>Qty</th>
						<th class={headBase}>Price</th>
						<th class={headBase}>P.O</th>
						{#each PARTICULAR_CATEGORIES as c (c)}
							<th class={headBase}>{c}</th>
						{/each}
						<th class="{headBase} text-left">Remarks</th>
					</tr>
				</thead>

				<tbody>
					{#each rows as r, i (i)}
						<tr>
							<td class="{cellText} text-center">
								{#if r.date}
									<b>{r.date}</b>
									{#if r.day != null}<span class="text-[7px] text-gray-600"> (D{r.day})</span>{/if}
								{/if}
							</td>
							<td class="{cellText} w-fit font-medium">
								{r.name}{#if r.label}<span class="text-[8px] text-gray-500"> ({r.label})</span>{/if}
							</td>
							<td class="{cellText} text-right">{r.qty}</td>
							<td class="{cellText} text-right">{r.price}</td>
							<td class={cellText}></td>
							{#each PARTICULAR_CATEGORIES as c (c)}
								{#if r.category === c}
									<td class="{cellText} text-right">{r.amount}</td>
								{:else}
									<td class="{cellText} bg-gray-50"></td>
								{/if}
							{/each}
							<td class="{cellText} w-40 text-[8px] text-red-700">{r.remarks}</td>
						</tr>
					{/each}
					{#if rows.length === 0}
						<tr>
							<td
								class="{cellText} py-2 text-center text-gray-500"
								colspan={6 + PARTICULAR_CATEGORIES.length}
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
						{#each PARTICULAR_CATEGORIES as c (c)}
							<td class="{subRow} bg-amber-100 text-right tabular-nums">
								{formatCurrency(categoryTotals[c])}
							</td>
						{/each}
						<td class="{subRow} bg-amber-100 tabular-nums">₱{formatCurrency(grandTotal)}</td>
					</tr>
					<tr>
						<td colspan="5" class="{subRow} text-right tracking-wider uppercase">Per bird</td>
						{#each PARTICULAR_CATEGORIES as c (c)}
							<td class="{subRow} text-right tabular-nums">
								{formatPerChick(perChickByCategory[c])}
							</td>
						{/each}
						<td class="{subRow} tabular-nums">{formatPerChick(grandPerChick)}</td>
					</tr>
				</tfoot>
			</table>
		</div>

		<!-- Feeds summary -->
		<div class="w-fit shrink-0">
			<div class="flex flex-wrap items-center gap-2 border-b border-red-100 bg-red-200 px-3 py-1">
				<Wheat class="size-3 text-red-700" />
				<h2 class="text-[10px] font-bold tracking-wide text-gray-900 uppercase">Feeds Summary</h2>
				<span class="text-[8px] text-gray-700">÷ {formatNumber(volume)} chicks</span>
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
					{#each feeds.feedGroups as g (g.key)}
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
								<td class="{cellText} text-right">{bagsAllocation(r.qty)}</td>
								<td class={cellText}></td>
							</tr>
						{/each}

						{#if g.rows.length > 1}
							<tr>
								<td class="{subRow} pl-3">Total {g.label}</td>
								<td class="{subRow} text-right tabular-nums">{formatNumber(g.qty)}</td>
								<td class="{subRow} text-right tabular-nums">{formatCurrency(g.amount)}</td>
								<td class="{subRow} text-right tabular-nums">{bagsAllocation(g.qty)}</td>
								<td class="{subRow} text-right tabular-nums">{groupPerChick(g)}</td>
							</tr>
						{/if}
					{/each}
				</tbody>

				<tfoot>
					<tr>
						<td class="{subRow} bg-amber-100 uppercase">Total feeds cost</td>
						<td class="{subRow} bg-amber-100 text-right tabular-nums">{formatNumber(feeds.qty)}</td>
						<td class="{subRow} bg-amber-100 text-right tabular-nums">
							{formatCurrency(feeds.amount)}
						</td>
						<td class="{subRow} bg-amber-100 text-right tabular-nums"
							>{bagsAllocation(feeds.qty)}</td
						>
						<td class="{subRow} bg-amber-100 text-right tabular-nums">
							{formatPerChick(volume > 0 ? round1(feeds.amount / volume) : 0)}
						</td>
					</tr>
				</tfoot>
			</table>

			<p class="mt-1 text-[8px] leading-tight text-gray-700">
				Basis: {type?.toUpperCase()} · mortality {(mortalityRate * 100).toFixed(1)}% of {formatNumber(
					adjustedVolume
				)} chicks
			</p>
		</div>
	</div>

	<!-- Footer -->
	<div class="flex flex-row items-center gap-2">
		<Badge variant="secondary" class="text-[8px]">System Generated Report</Badge>
		<p class="text-[9px] text-black">Date printed: {printedAt}</p>
		{#if batch?.id}
			<p class="font-mono text-[7px] leading-none text-gray-500">Batch ID: {batch.id}</p>
		{/if}
		<span class="ml-auto"></span>
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
