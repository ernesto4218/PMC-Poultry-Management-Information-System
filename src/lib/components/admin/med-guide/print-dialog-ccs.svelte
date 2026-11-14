<script lang="ts">
	import Badge from '#lib/components/ui/badge/badge.svelte';
	import Button from '#lib/components/ui/button/button.svelte';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Download, Pill, Printer, Syringe } from '@lucide/svelte';
	import { downloadElementAsPdf } from './download-pdf';
	import QRCode from 'qrcode';

	type Column = {
		id: string;
		name: string;
		value: string | number;
		unit: string;
		ages?: string[];
	};

	type DayOutput = {
		age: string;
		waterOnly: boolean;
		perBird: string;
		gallons: number | null;
		liters: number | null;
		doses: Record<string, number>;
	};

	type OnChangePayload = {
		medications: Column[];
		volume: number;
		days: DayOutput[];
	};

	type Farm = { id: string; name: string; code: string; type?: string; address?: string };

	let {
		columns = [],
		volume = 0,
		farm,
		schedule
	}: {
		columns?: Column[];
		volume?: number;
		farm: Farm;
		schedule?: OnChangePayload;
	} = $props();

	let qrDataUrl = $state('');

	const VAC_RATE_PER_LITER = 8.5;

	const NET_LITERS = $derived(volume / 1000);
	const VAC_WATER_AMOUNT = $derived(NET_LITERS * VAC_RATE_PER_LITER);
	const VAC_WATER_AMOUNT_L = $derived(VAC_WATER_AMOUNT * 3.8);
	const NBL_10 = $derived(volume / 1000);
	const VAC_SAFE = $derived(Math.round(VAC_WATER_AMOUNT_L / 100));
	const GUMBORO = $derived(volume / 1000);

	const days = $derived<DayOutput[]>(schedule?.days ?? []);

	const printedAt = new Date().toLocaleString('en-PH', {
		timeZone: 'Asia/Manila',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});

	const fmt = (n: number | null | undefined): string =>
		n == null ? '' : n.toLocaleString('en-US', { maximumFractionDigits: 2 });

	let downloading = $state(false);

	async function downloadPdf() {
		downloading = true;
		try {
			const date = new Date().toISOString().slice(0, 10);
			await downloadElementAsPdf('print-area', `${farm.code}-medication-${date}.pdf`);
		} finally {
			downloading = false;
		}
	}

	function printReport() {
		// Let any pending reactive updates flush to the DOM before the
		// browser snapshots the page for the print preview.
		requestAnimationFrame(() => {
			window.print();
		});
	}

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

	const net = $derived(volume * 0.95);

	const cellText =
		'border-r border-b border-black px-1 py-0 text-center align-middle h-4 w-6 text-[10px] leading-none whitespace-nowrap tabular-nums';
	const headBase =
		'border-r border-b border-black px-1 py-0 text-center align-middle h-6 w-14 text-[8px] leading-none font-bold whitespace-nowrap text-gray-900';
</script>

<Dialog.Root>
	<Dialog.Trigger>
		<Button class="gap-2 bg-red-700 text-white hover:bg-red-800">
			<Printer class="size-4" />
			Print
		</Button>
	</Dialog.Trigger>
	<Dialog.Content id="print-area" class="flex min-h-[7in] min-w-[13in] flex-col overflow-auto p-4">
		<div class="flex w-full flex-row gap-2">
			<header
				class="flex w-full items-stretch justify-between gap-6 border-b-2 border-red-600 pb-3"
			>
				<!-- Left: company identity -->
				<div class="flex items-center gap-3">
					<div
						class="flex size-16 shrink-0 items-center justify-center rounded-md bg-red-600 p-1.5"
					>
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

				<!-- Right: farm details + QR -->
				<div class="flex items-center gap-3 self-end">
					<dl class="grid grid-cols-[auto_auto] items-center gap-x-3 gap-y-0.5 text-xs">
						<dt class="text-right text-gray-500">Farm</dt>
						<dd class="flex items-center gap-1.5 font-semibold text-black">
							{farm.name}
							<Badge variant="destructive">{farm.code}</Badge>
							<Badge variant="destructive">{farm.type}</Badge>
						</dd>

						<dt class="text-right text-gray-500">Volume</dt>
						<dd class="font-semibold text-black tabular-nums">{fmt(volume)}</dd>

						<dt class="text-right text-gray-500">Net (95%)</dt>
						<dd class="font-semibold text-black tabular-nums">{fmt(net)}</dd>
					</dl>

					{#if qrDataUrl}
						<figure
							class="flex shrink-0 flex-col items-center gap-0.5 border-l-2 border-red-600 pl-3"
						>
							<img
								src={qrDataUrl}
								alt="QR code for farm {farm.id}"
								class="size-16 rounded-sm border border-gray-300 bg-white p-0.5"
							/>
							<figcaption class="text-center leading-none">
								<span
									class="block text-[6px] font-semibold tracking-widest text-gray-500 uppercase"
								>
									Farm ID
								</span>
								<span class="block max-w-16 font-mono text-[6px] break-all text-black">
									{farm.id}
								</span>
							</figcaption>
						</figure>
					{/if}
				</div>
			</header>
		</div>
		<div class="flex flex-row gap-2">
			<div class="w-full">
				<div class="flex flex-wrap items-center gap-2 border-b border-red-100 bg-red-200 px-3 py-1">
					<Pill class="size-3 text-red-700" />
					<h2 class="text-[10px] font-bold tracking-wide text-gray-900 uppercase">Medication</h2>
				</div>
				<table class="w-full border-separate border-spacing-0 border-1 border-black text-[7px]">
					<thead>
						<tr>
							<th class="{headBase} sticky top-0 left-0 z-30 w-6 bg-amber-300">Age</th>
							<th class="{headBase} sticky top-0 z-20 w-5 bg-amber-300">Gal</th>
							<th class="{headBase} sticky top-0 z-20 w-5 bg-amber-300">L</th>

							{#each columns as col (col.id)}
								<th class="{headBase} bg-amber-300">
									<div class="flex flex-col items-center leading-none">
										<span
											class="max-w-full truncate text-[7px] leading-none font-bold text-gray-900"
											title={col.name}
										>
											{col.name}
										</span>
										<span class="text-[6px] leading-none font-medium text-black uppercase"
											>{col.value} {col.unit}</span
										>
									</div>
								</th>
							{/each}
						</tr>
					</thead>

					<tbody>
						{#each days as day (day.age)}
							<tr>
								<td class={cellText}>{day.age}</td>
								<td class={cellText}>{fmt(day.gallons)}</td>
								<td class={cellText}>{fmt(day.liters)}</td>

								{#if day.waterOnly}
									{#if columns.length}
										<td
											colspan={columns.length}
											class="border-r border-b border-sky-300 bg-sky-200 px-1 py-0 text-center align-middle text-[6px] leading-none font-bold tracking-wide whitespace-nowrap text-sky-800 uppercase"
										>
											<span class="inline-flex items-center gap-0.5 text-sm leading-none">
												Water only
											</span>
										</td>
									{/if}
								{:else}
									{#each columns as col (col.id)}
										{#if col.ages?.includes(day.age)}
											<td class={cellText}>
												<span title="{col.value} {col.unit} × {fmt(day.gallons)} gal">
													{fmt(day.doses[col.id])}
												</span>
											</td>
										{:else}
											<td class={cellText}></td>
										{/if}
									{/each}
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="w-fit">
				<div class="flex flex-wrap items-center gap-2 border-b border-red-100 bg-red-200 px-3 py-1">
					<Syringe class="size-3 text-red-700" />
					<h2 class="text-[10px] font-bold tracking-wide text-gray-900 uppercase">Vaccination</h2>
				</div>

				<table class="w-fit border-separate border-spacing-0 border-1 border-black text-[7px]">
					<thead>
						<tr>
							<th class="{headBase} sticky top-0 left-0 z-30 w-6 bg-amber-300">Age</th>
							<th class="{headBase} sticky top-0 left-0 z-30 w-6 bg-amber-300">Gal</th>
							<th class="{headBase} sticky top-0 left-0 z-30 w-6 bg-amber-300">L</th>
							<th class="{headBase} sticky top-0 left-0 z-30 w-6 bg-amber-300">NBL</th>
							<th class="{headBase} sticky top-0 left-0 z-30 w-6 bg-amber-300">NBL</th>
							<th class="{headBase} sticky top-0 left-0 z-30 w-6 bg-amber-300">Gumboro</th>
							<th class="{headBase} sticky top-0 left-0 z-30 w-6 bg-amber-300">Vac Safe</th>
						</tr>
					</thead>
					<tbody>
						{#each days as day, index (day.age)}
							<tr>
								<td class={cellText}>{day.age}</td>
								<td class={cellText}>
									{#if index === 9 || index === 13}
										{VAC_WATER_AMOUNT}
									{/if}
								</td>
								<td class={cellText}>
									{#if index === 9 || index === 13}
										{VAC_WATER_AMOUNT_L}
									{/if}
								</td>
								<td class={cellText}></td>

								<td class={cellText}>
									{#if index === 9}
										{NBL_10}
									{/if}
								</td>
								<td class={cellText}>
									{#if index === 13}
										{GUMBORO}
									{/if}
								</td>
								<td class={cellText}>
									{#if index === 9 || index === 13}
										{VAC_SAFE}
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
		<div class="flex flex-row items-center gap-2">
			<Badge variant="default" class="text-[8px]">System Generated Report</Badge>
			<p class="text-[9px] text-black">Date printed: {printedAt}</p>

			<!-- Both action buttons share a right-aligned flex group -->
			<div class="ml-auto flex items-center gap-2 print:hidden">
				<Button
					size="sm"
					class="gap-2 bg-red-700 text-white hover:bg-red-800"
					onclick={printReport}
				>
					<Printer class="size-4" />
					Print
				</Button>
				<Button
					size="sm"
					class="gap-2 bg-red-700 text-white hover:bg-red-800"
					onclick={downloadPdf}
					disabled={downloading}
				>
					<Download class="size-4" />
					{downloading ? 'Generating...' : 'Download PDF'}
				</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
	@media print {
		/* Exact paper size, zero page margin: the padding below acts as the margin */
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
			print-color-adjust: exact; /* keeps the amber/red backgrounds */
		}

		:global(#print-area) {
			position: fixed !important;
			top: 0 !important;
			left: 0 !important;
			right: auto !important;
			bottom: auto !important;

			/* fill the whole sheet */
			width: 13in !important;
			height: 8.5in !important;
			min-width: 0 !important;
			min-height: 0 !important;
			max-width: none !important;
			max-height: none !important;
			box-sizing: border-box !important;
			padding: 0.25in !important;
			margin: 0 !important;

			/* reset ALL the dialog centering/animation props (Tailwind v4 uses these, not just transform) */
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
