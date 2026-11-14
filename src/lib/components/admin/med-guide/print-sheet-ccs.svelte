<script>
	import Printer from '@lucide/svelte/icons/printer';
	import Droplets from '@lucide/svelte/icons/droplets';
	import { Button } from '#lib/components/ui/button/index.ts';

	let { farm, schedule, qty = {}, price = {}, birdCount = 0 } = $props();

	function portal(node) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}

	const toNum = (v) => {
		const n = parseFloat(String(v ?? '').replace(/,/g, ''));
		return Number.isNaN(n) ? 0 : n;
	};

	const fmt = (n, min = 2, max = 2) =>
		Number(n).toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });

	const fmtInt = (n) => (n == null || n === '' ? '' : Number(n).toLocaleString('en-US'));

	const toTitle = (s = '') => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

	const printedOn = $derived(
		new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeZone: 'Asia/Manila' }).format(
			new Date()
		)
	);

	// Synchronized with your frontend data structure
	const meds = $derived(schedule?.medications ?? []);
	const days = $derived(schedule?.days ?? []);

	// Summary calculation matching front-end columns
	const rows = $derived(
		meds.map((med) => {
			const grams = days.reduce((sum, d) => sum + toNum(d.doses?.[med.id]), 0);
			const amount = toNum(qty[med.id]) * toNum(price[med.id]);
			return {
				id: med.id,
				name: med.name,
				unit: med.unit,
				value: med.value,
				grams,
				kls: grams / 1000,
				qty: toNum(qty[med.id]),
				price: toNum(price[med.id]),
				amount,
				costPerBird: Number(birdCount) ? amount / Number(birdCount) : 0
			};
		})
	);

	const totalAmount = $derived(rows.reduce((s, r) => s + r.amount, 0));
</script>

<Button
	type="button"
	onclick={() => window.print()}
	disabled={!schedule}
	class="h-8 gap-1.5 bg-red-700 px-3 text-xs text-white hover:bg-red-800"
>
	<Printer class="size-3.5" />
	Print Medication & Summary
</Button>

<div class="print-root" use:portal>
	<div class="sheet">
		<!-- Header -->
		<header class="head">
			<div class="brand">
				<p class="eyebrow">Puting Manok Corporation</p>
				<h1>Medication Guide & Costing</h1>
			</div>
			<dl class="meta">
				<div>
					<dt>Farm</dt>
					<dd>{farm?.name || '—'} {farm?.code ? `(${farm.code})` : ''}</dd>
				</div>
				<div>
					<dt>Type</dt>
					<dd>{farm?.type || '—'}</dd>
				</div>
				<div>
					<dt>Volume</dt>
					<dd>{fmtInt(birdCount)} birds</dd>
				</div>
				<div>
					<dt>Address</dt>
					<dd>{toTitle(farm?.address) || '—'}</dd>
				</div>
				<div>
					<dt>Printed</dt>
					<dd>{printedOn}</dd>
				</div>
			</dl>
		</header>

		<!-- Side-by-side Layout to fit 1 Landscape Page -->
		<div class="content-layout">
			<!-- LEFT: Schedule Table (Matches Frontend Layout) -->
			<div class="main-col">
				<table class="med-table grid">
					<thead>
						<tr>
							<th class="age-col">Age</th>
							<th>Water / Bird</th>
							<th>Gallons</th>
							<th>Liters</th>
							{#each meds as m (m.id)}
								<th>
									<span class="med-title">{m.name}</span>
									<span class="med-sub">{m.value} {m.unit}</span>
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each days as d (d.age)}
							<tr>
								<td class="age-cell">{d.age}</td>
								<td>{d.perBird}</td>
								<td>{fmtInt(d.gallons)}</td>
								<td>{fmtInt(d.liters)}</td>

								{#if d.waterOnly}
									<td colspan={meds.length || 1} class="water-only-cell">
										<span class="inline-water">
											<Droplets class="size-2.5" /> WATER ONLY
										</span>
									</td>
								{:else}
									{#each meds as m (m.id)}
										{#if m.ages?.includes(d.age)}
											<td>{fmtInt(d.doses?.[m.id])}</td>
										{:else}
											<td class="disabled-cell"></td>
										{/if}
									{/each}
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- RIGHT: Summary & Costing Table -->
			<div class="side-col">
				<div class="side-header">Vitamins & Cost Summary</div>
				<table class="sum-table grid">
					<thead>
						<tr>
							<th class="left">Medication</th>
							<th>g / ml</th>
							<th>Qty</th>
							<th>Price</th>
							<th>Amount</th>
							<th>/ Bird</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as r (r.id)}
							<tr class:none={r.grams === 0}>
								<td class="left bold">{r.name}</td>
								<td>{r.grams ? fmt(r.grams, 0, 2) : '—'}</td>
								<td>{r.qty ? fmt(r.qty, 0, 2) : '—'}</td>
								<td>{r.price ? fmt(r.price, 0, 2) : '—'}</td>
								<td>{fmt(r.amount)}</td>
								<td class="bold">{fmt(r.costPerBird, 2, 4)}</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr>
							<td colspan="4" class="left bold">TOTAL</td>
							<td class="bold total-amount">{fmt(totalAmount)}</td>
							<td class="bold">
								{Number(birdCount) ? fmt(totalAmount / Number(birdCount), 2, 4) : '0.00'}
							</td>
						</tr>
					</tfoot>
				</table>

				<div class="sign-off">
					<div class="sig-box">
						<div class="line"></div>
						<span>Prepared By</span>
					</div>
					<div class="sig-box">
						<div class="line"></div>
						<span>Approved By</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.print-root {
		display: none;
	}

	/* LONG BOND (13in x 8.5in) — Landscape */
	@page {
		size: 13in 8.5in;
		margin: 0.25in;
	}

	@media print {
		:global(html),
		:global(body) {
			margin: 0 !important;
			padding: 0 !important;
			width: 100% !important;
			height: auto !important;
			background: #fff !important;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}

		:global(body > *:not(.print-root)) {
			display: none !important;
		}

		.print-root {
			display: block !important;
			width: 100% !important;
		}
	}

	.sheet {
		width: 100% !important;
		font-family: Arial, Helvetica, sans-serif;
		color: #000;
		font-size: 6.8pt;
		line-height: 1.15;
	}

	.sheet *,
	.sheet *::before,
	.sheet *::after {
		box-sizing: border-box;
	}

	/* Header Styling */
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		border-bottom: 1.5pt solid #b91c1c;
		padding-bottom: 4pt;
		margin-bottom: 6pt;
	}
	.eyebrow {
		margin: 0;
		font-size: 6pt;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #b91c1c;
	}
	h1 {
		margin: 0.5pt 0 0;
		font-size: 13pt;
		line-height: 1.05;
		font-weight: 800;
	}
	.meta {
		margin: 0;
		font-size: 6.5pt;
		text-align: right;
		line-height: 1.25;
		display: grid;
		grid-template-columns: repeat(2, auto);
		column-gap: 12pt;
	}
	.meta div {
		display: flex;
		justify-content: flex-end;
		gap: 4pt;
	}
	.meta dt {
		font-weight: 700;
		color: #b45309;
		text-transform: uppercase;
		font-size: 6pt;
	}
	.meta dd {
		margin: 0;
	}

	/* Side-by-Side Layout Grid */
	.content-layout {
		display: grid;
		grid-template-columns: 1fr 3.6in;
		gap: 8pt;
		align-items: start;
		width: 100%;
	}

	/* Unified Table Styles */
	.grid {
		width: 100% !important;
		border-collapse: collapse !important;
		table-layout: fixed;
	}

	.grid th,
	.grid td {
		border: 0.5pt solid #000;
		padding: 1pt 2pt;
		height: 0.16in;
		font-size: 6.5pt;
		text-align: right;
		overflow: hidden;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.grid th {
		background: #fef3c7 !important;
		text-align: center;
		font-weight: 700;
		line-height: 1.05;
		white-space: normal;
		vertical-align: middle;
		padding: 2pt;
	}

	/* Medication Schedule Table Specifics */
	.med-table th.age-col {
		width: 0.32in;
	}

	.med-title {
		display: block;
		font-size: 6.2pt;
		font-weight: 700;
	}

	.med-sub {
		display: block;
		font-size: 4.8pt;
		font-weight: 600;
		color: #b45309;
		text-transform: uppercase;
	}

	.med-table td.age-cell {
		text-align: center;
		font-weight: 700;
		background: #fef3c7 !important;
	}

	.med-table td.water-only-cell {
		text-align: center;
		font-weight: 700;
		letter-spacing: 0.1em;
		background: #e0f2fe !important;
		color: #0369a1;
		font-size: 6pt;
	}

	.inline-water {
		display: inline-flex;
		align-items: center;
		gap: 2px;
	}

	.med-table td.disabled-cell {
		background: #f3f4f6 !important;
	}

	/* Summary Table Specifics */
	.side-header {
		background: #b91c1c !important;
		color: #fff !important;
		font-weight: 700;
		font-size: 7pt;
		text-transform: uppercase;
		text-align: center;
		padding: 3pt;
		border: 0.5pt solid #b91c1c;
	}

	.sum-table th:first-child {
		width: 1.2in;
	}

	.sum-table .left {
		text-align: left;
	}

	.sum-table .bold {
		font-weight: 700;
	}

	.sum-table tr.none td {
		background: #f9fafb !important;
		color: #9ca3af;
	}

	.sum-table tfoot td {
		background: #fef3c7 !important;
		border-top: 1pt solid #000;
		font-weight: 700;
	}

	.sum-table .total-amount {
		color: #b91c1c;
	}

	/* Sign-off section */
	.sign-off {
		display: flex;
		justify-content: space-between;
		gap: 12pt;
		margin-top: 22pt;
	}

	.sig-box {
		flex: 1;
		text-align: center;
		font-size: 6pt;
		color: #4b5563;
	}

	.sig-box .line {
		border-bottom: 0.5pt solid #374151;
		margin-bottom: 2pt;
	}
</style>
