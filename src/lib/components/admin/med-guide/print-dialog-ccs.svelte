<script lang="ts">
	import Button from '#lib/components/ui/button/button.svelte';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Download, Printer } from '@lucide/svelte';
	import { tick } from 'svelte';
	import { downloadElementAsPdf } from './download-pdf';
	import ReportSheet from './report-sheet.svelte';
	import { buildVaccination, NET_FACTOR } from '#lib/medication/medication.ts';

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

	type Farm = { id: string; name: string; code: string; type?: string; address?: string };
	type VaccinationRow = ReturnType<typeof buildVaccination>[number];

	type OnChangePayload = {
		medications: Column[];
		volume: number;
		days: DayOutput[];
		vaccination?: VaccinationRow[]; // ← add
	};

	let {
		columns = [],
		volume = 0,
		farm,
		batchId = null,
		batchNumber = null,
		batchDateSet = null,
		schedule
	}: {
		columns?: Column[];
		volume?: number;
		farm: Farm;
		batchId?: string | null;
		batchNumber?: string | null;
		batchDateSet?: string | null;
		schedule?: OnChangePayload;
	} = $props();

	let downloading = $state(false);

	const days = $derived<DayOutput[]>(schedule?.days ?? []);
	const vaccination = $derived(
		schedule?.vaccination ??
			buildVaccination(
				days.map((d) => d.age),
				volume,
				farm.type ?? '' // ← the missing arg
			)
	);

	// Live data in the same shape as a saved snapshot, so the sheet can render either
	const snapshot = $derived({
		farm: {
			id: farm.id,
			name: farm.name,
			code: farm.code,
			type: farm.type ?? '',
			address: farm.address ?? ''
		},
		batch: batchId ? { id: batchId, number: batchNumber ?? '', dateSet: batchDateSet ?? '' } : null,
		volume,
		netVolume: volume * NET_FACTOR,
		medications: columns,
		days,
		vaccination
	});

	// ---- saving a snapshot -------------------------------------------------
	const payload = $derived({
		farmId: farm.id,
		volume,
		medications: columns,
		days,
		vaccination,
		chickBatchId: batchId ?? undefined
	});
	const payloadKey = $derived(JSON.stringify(payload));

	let saved = $state<{ documentId: string; createdAt: string; key: string } | null>(null);
	let saving = $state(false);
	let saveError = $state('');

	// If the schedule is edited after saving, the old save no longer matches
	const isSaved = $derived(saved !== null && saved.key === payloadKey);
	const docId = $derived(isSaved ? saved!.documentId : '');

	async function ensureSaved(): Promise<boolean> {
		if (isSaved) return true;
		saving = true;
		saveError = '';
		try {
			const key = payloadKey;
			const res = await fetch('/api/medication-reports', {
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
	<Dialog.Content
		id="print-area"
		class="flex min-h-[8in] min-w-[13in] flex-col overflow-auto p-4
	       print:top-0 print:left-0 print:max-w-none print:translate-x-0 print:translate-y-0 print:overflow-hidden"
	>
		<ReportSheet {snapshot} documentId={docId} createdAt={isSaved ? saved!.createdAt : null}>
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
		</ReportSheet>
	</Dialog.Content>
</Dialog.Root>
