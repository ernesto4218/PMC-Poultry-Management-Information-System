import type { PullOutRow } from './types.ts';

type Report = {
	documentId: string;
	status: string;
	farmId: string | null;
	farmCode: string;
	farmName: string;
	farmType: string | null;
	chickBatchId: string;
	batchNumber: string;
	volume: number;
};

type Doc = { documentId: string; snapshot: unknown };

type Snapshot = {
	batch?: { dateSet?: string };
	rows?: Array<Record<string, unknown>>;
} | null;

const DAY_MS = 86_400_000;

const toDateKey = (d: Date | null) =>
	d ? d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) : '';

const toDateLabel = (d: Date | null) =>
	d
		? d.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
				timeZone: 'Asia/Manila'
			})
		: '';

function parseNum(s: unknown): number {
	if (s == null) return 0;
	if (typeof s === 'number') return s;
	const n = Number(String(s).replace(/,/g, ''));
	return Number.isFinite(n) ? n : 0;
}

function dayToDate(dateSet: string | null | undefined, day: number | null): Date | null {
	if (day == null || !Number.isFinite(day) || !dateSet) return null;
	const base = new Date(dateSet).getTime();
	return Number.isFinite(base) ? new Date(base + day * DAY_MS) : null;
}

/** Flattens every FEEDS row of every saved budget snapshot into a PullOutRow. */
export function buildPullouts(
	reports: Report[],
	documents: Doc[],
	dispatched: Map<string, number>,
	stockByName: Map<string, number>
): PullOutRow[] {
	const reportById = new Map(reports.map((r) => [r.documentId, r]));
	const out: PullOutRow[] = [];

	for (const doc of documents) {
		const report = reportById.get(doc.documentId);
		if (!report) continue;

		const snap = doc.snapshot as Snapshot;
		const dateSet = snap?.batch?.dateSet ?? null;
		const rows = Array.isArray(snap?.rows) ? snap.rows : [];

		rows.forEach((r, i) => {
			if (r.category !== 'FEEDS') return;

			const day = (r.day ?? null) as number | null;
			const dateObj = dayToDate(dateSet, day);
			const qtyNum = parseNum(r.qty);
			const feedName = String(r.name ?? '');
			const id = `${doc.documentId}::${i}`;
			const dispatchedQty = dispatched.get(id) ?? 0;
			const remainingQty = Math.max(0, qtyNum - dispatchedQty);

			out.push({
				id,
				documentId: doc.documentId,
				rowIndex: i,
				status: report.status,
				farmId: report.farmId ?? '',
				farmCode: report.farmCode,
				farmName: report.farmName,
				farmType: report.farmType,
				chickBatchId: report.chickBatchId,
				batchNumber: report.batchNumber,
				volume: report.volume,
				feedName,
				label: String(r.label ?? ''),
				day,
				dateKey: toDateKey(dateObj),
				dateLabel: toDateLabel(dateObj),
				qty: String(r.qty ?? ''),
				price: String(r.price ?? ''),
				amount: String(r.amount ?? ''),
				qtyNum,
				priceNum: parseNum(r.price),
				amountNum: parseNum(r.amount),
				remarks: String(r.remarks ?? ''),
				dispatchedQty,
				remainingQty,
				fulfilled: remainingQty === 0,
				warehouseStock: stockByName.get(feedName.trim().toLowerCase()) ?? null
			});
		});
	}

	// Earliest first (undated last), then farm, then feed.
	return out.sort(
		(a, b) =>
			(a.dateKey || '9999').localeCompare(b.dateKey || '9999') ||
			a.farmCode.localeCompare(b.farmCode) ||
			a.feedName.localeCompare(b.feedName)
	);
}
