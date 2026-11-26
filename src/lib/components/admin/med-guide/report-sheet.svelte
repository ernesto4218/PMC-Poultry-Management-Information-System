<script lang="ts">
	import Badge from '#lib/components/ui/badge/badge.svelte';
	import { Pill, Syringe } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import QRCode from 'qrcode';
	import JsBarcode from 'jsbarcode';
	import type { MedicationReportSnapshot } from '#lib/server/db/schema.ts';

	type SheetSnapshot = Pick<
		MedicationReportSnapshot,
		'farm' | 'batch' | 'volume' | 'netVolume' | 'medications' | 'days' | 'vaccination'
	>;
	let {
		snapshot,
		documentId = '',
		createdAt = null,
		reprint = false,
		voided = false,
		actions
	}: {
		snapshot: SheetSnapshot;
		documentId?: string; // empty = draft (no barcode yet)
		createdAt?: Date | string | null; // null = draft, shows the current time
		reprint?: boolean; // true on the saved-report page
		voided?: boolean;
		actions?: Snippet; // buttons rendered at the end of the footer (screen only)
	} = $props();

	let qrDataUrl = $state('');
	let barcodeEl = $state<SVGSVGElement>();

	const fmt = (n: number | null | undefined): string =>
		n == null ? '' : n.toLocaleString('en-US', { maximumFractionDigits: 2 });

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
			// invalid value for the format: leave the barcode empty
		}
	});

	const cellText =
		'border-r border-b border-black px-1 py-0 text-center align-middle h-4 w-6 text-[10px] leading-none whitespace-nowrap tabular-nums';
	const headBase =
		'border-r border-b border-black px-1 py-0 text-center align-middle h-6 w-14 text-[8px] leading-none font-bold whitespace-nowrap text-gray-900';
</script>

<div class="relative flex h-full w-full flex-col gap-4">
	{#if voided}
		<div
			class="pointer-events-none absolute inset-0 z-40 flex items-center justify-center text-[10rem] font-black tracking-widest text-red-600/15 uppercase"
			style="transform: rotate(-15deg)"
		>
			Void
		</div>
	{/if}

	<div class="flex w-full flex-row gap-2">
		<header class="flex w-full items-stretch justify-between gap-6 border-b-2 border-red-600 pb-3">
			<!-- Left: company identity -->
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

			<!-- Right: farm details + QR -->
			<div class="flex items-center gap-2 self-end">
				<div class="flex flex-col gap-0.5 text-[11px] leading-tight">
					<div class="flex flex-col items-end justify-start gap-1">
						<div class="flex flex-row items-center justify-end gap-2">
							<span class="font-semibold text-black">{snapshot.farm.name}</span>
							<Badge variant="default" class="px-1.5 py-0 text-[10px]">{snapshot.farm.code}</Badge>
							<Badge variant="default" class="px-1.5 py-0 text-[10px]">{snapshot.farm.type}</Badge>
						</div>

						{#if snapshot.batch}
							<div class="flex items-center justify-end gap-1.5">
								<span
									class="rounded-sm bg-red-100 px-1 text-[8px] font-bold tracking-wide text-red-700 uppercase"
								>
									Batch
								</span>
								<span class="font-mono text-[10px] font-bold text-black"
									>{snapshot.batch.number}</span
								>
								{#if snapshot.batch.dateSet}
									<span class="text-[9px] text-gray-600">· set {snapshot.batch.dateSet}</span>
								{/if}
							</div>
						{/if}

						<span class="text-[10px] text-gray-600">Location : {snapshot.farm.address}</span>
					</div>

					<div class="mt-2 flex items-center justify-end gap-2 text-gray-500">
						<span
							>Vol <b class="font-semibold text-black tabular-nums">{fmt(snapshot.volume)}</b></span
						>
						<span class="text-gray-300">|</span>
						<span
							>Net (95%) <b class="font-semibold text-black tabular-nums"
								>{fmt(snapshot.netVolume)}</b
							></span
						>
					</div>
				</div>

				{#if qrDataUrl}
					<figure class="flex shrink-0 flex-col items-center gap-px border-l-2 border-red-600 pl-2">
						<img
							src={qrDataUrl}
							alt="QR code for farm {snapshot.farm.id}"
							class="size-14 rounded-sm border border-gray-300 bg-white p-px"
						/>
						<figcaption
							class="max-w-14 text-center font-mono text-[5px] leading-none break-all text-black"
						>
							{snapshot.farm.id}
						</figcaption>
					</figure>
				{/if}
			</div>
		</header>
	</div>

	<div class="flex flex-row gap-2">
		<!-- Medication table -->
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

						{#each snapshot.medications as col (col.id)}
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
					{#each snapshot.days as day (day.age)}
						<tr>
							<td class={cellText}>{day.age}</td>
							<td class={cellText}>{fmt(day.gallons)}</td>
							<td class={cellText}>{fmt(day.liters)}</td>

							{#if day.waterOnly}
								{#if snapshot.medications.length}
									<td
										colspan={snapshot.medications.length}
										class="border-r border-b border-sky-300 bg-sky-200 px-1 py-0 text-center align-middle text-[6px] leading-none font-bold tracking-wide whitespace-nowrap text-sky-800 uppercase"
									>
										<span class="inline-flex items-center gap-0.5 text-sm leading-none">
											Water only
										</span>
									</td>
								{/if}
							{:else}
								{#each snapshot.medications as col (col.id)}
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

		<!-- Vaccination table -->
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
						<th class="{headBase} sticky top-0 left-0 z-30 w-6 bg-amber-300">Gumboro</th>
						<th class="{headBase} sticky top-0 left-0 z-30 w-6 bg-amber-300">Vac Safe</th>
					</tr>
				</thead>
				<tbody>
					{#each snapshot.vaccination as row (row.age)}
						<tr>
							<td class={cellText}>{row.age}</td>
							<td class={cellText}>{fmt(row.gallons)}</td>
							<td class={cellText}>{fmt(row.liters)}</td>
							<td class={cellText}>{fmt(row.nbl)}</td>
							<td class={cellText}>{fmt(row.gumboro)}</td>
							<td class={cellText}>{fmt(row.vacSafe)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Footer -->
	<div class="flex flex-row items-center gap-2">
		<Badge variant="secondary" class="text-[8px]">System Generated Report</Badge>
		{#if reprint}
			<Badge variant="secondary" class="text-[8px]">Reprint</Badge>
		{/if}
		<p class="text-[9px] text-black">
			{reprint ? 'Originally printed' : 'Date printed'}: {printedAt}
		</p>

		{#if snapshot.batch?.id}
			<p class="font-mono text-[7px] leading-none text-gray-500">Batch ID: {snapshot.batch.id}</p>
		{/if}
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
		.fit {
			zoom: var(--fit, 1);
		}
	}
</style>
