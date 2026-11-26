import { BudgetReportService } from '#lib/services/budget-report.service.ts';

// ── types ──────────────────────────────────────────────────────────────────

export type PullOutRow = {
	id: string; // documentId::index — unique per feed row
	documentId: string;
	status: string;
	farmId: string;
	farmCode: string;
	farmName: string;
	farmType: string | null;
	chickBatchId: string;
	batchNumber: string;
	volume: number;
	feedName: string;
	label: string;
	day: number | null; // signed day offset from batch.dateSet
	dateKey: string; // YYYY-MM-DD (Manila) — for sort/filter
	dateLabel: string; // "Jan 1, 2027" — for display
	qty: string;
	price: string;
	amount: string;
	qtyNum: number;
	priceNum: number;
	amountNum: number;
	remarks: string;
};

// ── helpers ────────────────────────────────────────────────────────────────

/** day is a signed offset from batch.dateSet. + = after, - = before, 0 = same day */
function dayToDate(dateSet: string | Date | null | undefined, day: number | null): Date | null {
	if (day == null || !Number.isFinite(day)) return null;
	if (!dateSet) return null;
	const base = new Date(dateSet).getTime();
	if (!Number.isFinite(base)) return null;
	return new Date(base + day * 86_400_000); // ms per day, DST-safe
}

function toDateKey(d: Date | null): string {
	return d ? d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) : '';
}

function toDateLabel(d: Date | null): string {
	return d
		? d.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
				timeZone: 'Asia/Manila'
			})
		: '';
}

function parseNum(s: string | number | null | undefined): number {
	if (s == null) return 0;
	if (typeof s === 'number') return s;
	const n = Number(s.replace(/,/g, ''));
	return Number.isFinite(n) ? n : 0;
}

// ── load ───────────────────────────────────────────────────────────────────

export const load = async () => {
	// Active reports only — voided snapshots should not produce pull-outs.
	const reports = await BudgetReportService.list({ limit: 5000, includeVoid: false });

	const documents = await BudgetReportService.getManyByDocumentIds(
		reports.map((r) => r.documentId)
	);

	const reportById = new Map(reports.map((r) => [r.documentId, r]));
	const pullouts: PullOutRow[] = [];

	for (const doc of documents) {
		const report = reportById.get(doc.documentId);
		if (!report) continue;

		const snap = doc.snapshot as {
			batch?: { dateSet?: string };
			rows?: Array<Record<string, unknown>>;
		} | null;
		const dateSet = snap?.batch?.dateSet ?? null;
		const rows = Array.isArray(snap?.rows) ? snap.rows : [];

		for (let i = 0; i < rows.length; i++) {
			const r = rows[i] as Record<string, unknown>;
			if (r.category !== 'FEEDS') continue;

			const day = (r.day ?? null) as number | null;
			const dateObj = dayToDate(dateSet, day);

			pullouts.push({
				id: `${doc.documentId}::${i}`,
				documentId: doc.documentId,
				status: report.status,
				//@ts-ignore
				farmId: report.farmId,
				farmCode: report.farmCode,
				farmName: report.farmName,
				farmType: report.farmType,
				chickBatchId: report.chickBatchId,
				batchNumber: report.batchNumber,
				volume: report.volume,
				feedName: String(r.name ?? ''),
				label: String(r.label ?? ''),
				day,
				dateKey: toDateKey(dateObj),
				dateLabel: toDateLabel(dateObj),
				qty: String(r.qty ?? ''),
				price: String(r.price ?? ''),
				amount: String(r.amount ?? ''),
				qtyNum: parseNum(r.qty as string),
				priceNum: parseNum(r.price as string),
				amountNum: parseNum(r.amount as string),
				remarks: String(r.remarks ?? '')
			});
		}
	}

	// Sort: earliest date first, unassigned last, then farm, then feed name.
	pullouts.sort((a, b) => {
		if (a.dateKey !== b.dateKey) {
			if (!a.dateKey) return 1;
			if (!b.dateKey) return -1;
			return a.dateKey < b.dateKey ? -1 : 1;
		}
		const f = a.farmCode.localeCompare(b.farmCode);
		if (f !== 0) return f;
		return a.feedName.localeCompare(b.feedName);
	});

	return { pullouts };
};
