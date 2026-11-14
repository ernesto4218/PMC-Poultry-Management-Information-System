<script>
	import Droplets from '@lucide/svelte/icons/droplets';
	import Pill from '@lucide/svelte/icons/pill';
	import Printer from '@lucide/svelte/icons/printer';

	let { columns = [], volume = 0, onchange } = $props();

	const LITERS_PER_GALLON = 3.8;

	const WATER_PER_BIRD = {
		'0-1': 3,
		2: 4,
		3: 4,
		4: 4,
		5: 4,
		7: 6,
		8: 6,
		9: 6,
		10: 10,
		11: 10,
		12: 10,
		13: 10,
		14: 10,
		15: 10,
		16: 10,
		17: 10,
		18: 10,
		19: 10,
		20: 10,
		21: 15,
		22: 15,
		23: 20,
		24: 20,
		25: 20,
		26: 20,
		27: 20,
		28: 20,
		29: 20,
		30: 20,
		31: 20,
		32: 20,
		33: 20,
		34: 20
	};

	const AGES = ['0-1', ...Array.from({ length: 33 }, (_, i) => String(i + 2))];

	let days = $state(
		AGES.map((age) => ({
			age,
			waterOnly: age === '6',
			perBird: WATER_PER_BIRD[age] != null ? String(WATER_PER_BIRD[age]) : ''
		}))
	);

	function gallonsNum(day) {
		const p = parseFloat(day.perBird);
		const v = Number(volume);
		if (Number.isNaN(p) || !v) return null;
		return Math.round((p * v) / 1000);
	}

	function litersNum(day) {
		const g = gallonsNum(day);
		return g == null ? null : Math.round(g * LITERS_PER_GALLON);
	}

	function doseNum(day, col) {
		const g = gallonsNum(day);
		const per = parseFloat(col.value);
		if (g == null || Number.isNaN(per)) return null;
		return Math.round(g * per * 100) / 100;
	}

	const fmt = (n) => (n == null ? '' : n.toLocaleString('en-US', { maximumFractionDigits: 2 }));
	const gallons = (day) => fmt(gallonsNum(day));
	const liters = (day) => fmt(litersNum(day));
	const dose = (day, col) => fmt(doseNum(day, col));

	$effect(() => {
		onchange?.(
			$state.snapshot({
				medications: columns,
				volume,
				days: days.map((d) => ({
					...d,
					gallons: gallonsNum(d),
					liters: litersNum(d),
					doses: d.waterOnly
						? {}
						: Object.fromEntries(
								columns
									.filter((c) => c.ages?.includes(d.age))
									.map((c) => [c.id, doseNum(d, c)])
									.filter(([, v]) => v != null)
							)
				}))
			})
		);
	});

	const cellText =
		'border-r border-b border-gray-300 px-1 py-0 text-center align-middle h-4 w-14 text-[8px] leading-none whitespace-nowrap tabular-nums';
	const headBase =
		'border-r border-b border-gray-300 px-1 py-0 text-center align-middle h-6 w-14 text-[8px] leading-none font-bold whitespace-nowrap text-gray-900';
</script>

<div
	class="print-area h-[8.5in] w-[13in] overflow-x-auto rounded-lg border border-red-100 bg-white shadow-sm"
>
	<!-- Toolbar -->
	<div
		class="flex flex-wrap items-center gap-1.5 border-b border-red-100 bg-gradient-to-r from-red-50 to-amber-50 px-2 py-1 print:hidden"
	>
		<Pill class="size-3.5 text-red-700" />
		<h2 class="text-xs leading-none font-bold tracking-wide text-gray-900 uppercase">Medication</h2>

		<button
			type="button"
			onclick={() => window.print()}
			aria-label="Print table"
			class="ml-auto inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-0.5 text-[11px] leading-none font-medium text-red-800 shadow-sm hover:bg-red-50 active:bg-red-100"
		>
			<Printer class="size-3" />
			Print
		</button>
	</div>

	<table class="border-separate border-spacing-0 text-[7px]">
		<thead>
			<tr>
				<th class="{headBase} sticky top-0 left-0 z-30 w-6 bg-amber-100">Age</th>
				<th class="{headBase} sticky top-0 z-20 w-5 bg-amber-50">Gal</th>
				<th class="{headBase} sticky top-0 z-20 w-5 bg-amber-50">L</th>

				{#each columns as col (col.id)}
					<th
						class="sticky top-0 z-20 w-10 border-r border-b border-gray-300 bg-amber-50 px-0.5 py-0 text-center align-middle"
					>
						<div class="flex flex-col items-center leading-none">
							<span
								class="max-w-full truncate text-[7px] leading-none font-bold text-gray-900"
								title={col.name}
							>
								{col.name}
							</span>
							<span class="text-[6px] leading-none font-medium text-amber-700 uppercase"
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
					<td class={cellText}>{gallons(day)}</td>
					<td class={cellText}>{liters(day)}</td>

					{#if day.waterOnly}
						{#if columns.length}
							<td
								colspan={columns.length}
								class="border-r border-b border-sky-300 bg-sky-200 px-1 py-0 text-center align-middle text-[6px] leading-none font-bold tracking-wide whitespace-nowrap text-sky-800 uppercase"
							>
								<span class="inline-flex items-center gap-0.5 leading-none">
									<Droplets class="size-2" />
									Water only
								</span>
							</td>
						{/if}
					{:else}
						{#each columns as col (col.id)}
							{#if col.ages?.includes(day.age)}
								<td class={cellText}>
									<span title="{col.value} {col.unit} × {gallons(day)} gal">
										{dose(day, col)}
									</span>
								</td>
							{:else}
								<td
									class="border-r border-b border-gray-300 bg-gray-100/70 px-1 py-0"
									aria-disabled="true"
								></td>
							{/if}
						{/each}
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	@page {
		size: landscape;
		margin: 0.15in;
	}

	@media print {
		/* hide everything, then reveal only the print area */
		:global(body *) {
			visibility: hidden;
		}
		:global(.print-area),
		:global(.print-area *) {
			visibility: visible;
		}

		/* stretch to the printed page instead of the 13in design width */
		:global(.print-area) {
			position: absolute;
			left: 0;
			top: 0;
			width: 100% !important;
			height: auto !important;
			overflow: visible !important;
			border: 0 !important;
			border-radius: 0 !important;
			box-shadow: none !important;
			background: white;
			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}

		/* fit-to-width: table fills the page, columns auto-size */
		:global(.print-area table) {
			width: 100% !important;
			table-layout: auto !important;
		}

		/* strip the fixed w-*/
		:global(.print-area th),
		:global(.print-area td) {
			width: auto !important;
			height: auto !important;
			padding-left: 1px !important;
			padding-right: 1px !important;
			position: static !important;
		}

		/* tighten row height for print only */
		:global(.print-area td) {
			padding-top: 0 !important;
			padding-bottom: 0 !important;
			line-height: 1 !important;
		}

		/* never split a row across pages */
		:global(.print-area tr) {
			break-inside: avoid;
			page-break-inside: avoid;
		}
	}
</style>
