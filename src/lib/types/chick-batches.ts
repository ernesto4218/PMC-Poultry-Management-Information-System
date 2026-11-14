// src/lib/types/chick-batches.ts

export interface ChickBatch {
	id: string;
	farmId: string;
	batchNumber: string; // e.g. "JAYS-1H1 010326-01"
	dateSet: string; // 'YYYY-MM-DD'
	volume: number;
	sequence: number; // per (farm, dateSet) → 01, 02, …
}

/** Batch joined with its farm — what the page + tables actually use. */
export interface ChickBatchWithFarm extends ChickBatch {
	farm: {
		id: string;
		name: string;
		code: string;
		address: string;
	};
}

/** Shape used by the form dialog (no id/batchNumber/sequence — server owns those). */
export type ChickBatchForm = {
	farmId: string;
	dateSet: string;
	volume: number;
};

export const emptyChickBatchForm = (): ChickBatchForm => ({
	farmId: '',
	dateSet: new Date().toISOString().slice(0, 10),
	volume: 0
});

/** '2026-03-01' -> '030126'  (MMDDYY) */
export function formatBatchDate(dateStr: string): string {
	const parts = dateStr.split('-');
	if (parts.length !== 3) return '';
	const [y, m, d] = parts;
	return `${m}${d}${y.slice(-2)}`;
}

/** 'JAYS-1H1' + '2026-03-01' + 1 -> 'JAYS-1H1 030126-01' */
export function buildBatchNumber(farmCode: string, dateSet: string, sequence: number): string {
	return `${farmCode} ${formatBatchDate(dateSet)}-${String(sequence).padStart(2, '0')}`;
}
