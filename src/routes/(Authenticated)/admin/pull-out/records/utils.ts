import type { DateWindow, PullOutRow, Summary } from './types.ts';

export const REPORT_BASE = '/admin/budget-placement/reports';

export const INPUT_CLS =
	'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-0';

// ── Dates (all compared in Manila time) ──────────────────────────────────
export const dayKey = (d: Date | string) =>
	new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

export function daysBetween(aKey: string, bKey: string): number {
	const [ay, am, ad] = aKey.split('-').map(Number);
	const [by, bm, bd] = bKey.split('-').map(Number);
	return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function dayLabel(day: number | null): string {
	if (day == null) return '—';
	return day === 0 ? 'D0' : day > 0 ? `D+${day}` : `D${day}`;
}

export const peso = (n: number) =>
	'₱' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Styling helpers ──────────────────────────────────────────────────────
const TYPE_STYLES: Record<string, string> = {
	CCS: 'bg-blue-50 text-blue-700 ring-blue-200',
	CON: 'bg-red-50 text-red-700 ring-red-200'
};
export const typeStyle = (t: string | null | undefined) =>
	TYPE_STYLES[(t ?? '').toUpperCase()] ?? 'bg-gray-100 text-gray-600 ring-gray-200';

export function dateBadgeClass(dateKey: string, todayKey: string): string {
	if (!dateKey) return 'bg-gray-100 text-gray-500 ring-gray-200';
	if (dateKey < todayKey) return 'bg-rose-50 text-rose-700 ring-rose-200';
	if (dateKey === todayKey) return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
	if (daysBetween(todayKey, dateKey) <= 7) return 'bg-amber-50 text-amber-700 ring-amber-200';
	return 'bg-stone-100 text-gray-700 ring-stone-200';
}

// ── Filtering ────────────────────────────────────────────────────────────
export function matchesWindow(dateKey: string, w: DateWindow, todayKey: string): boolean {
	if (w === 'all') return true;
	if (w === 'no-date') return !dateKey;
	if (!dateKey) return false;
	const diff = daysBetween(todayKey, dateKey);
	switch (w) {
		case 'today':
			return diff === 0;
		case 'tomorrow':
			return diff === 1;
		case 'overdue':
			return diff < 0;
		case 'next-7':
			return diff >= 0 && diff <= 7;
		case 'next-30':
			return diff >= 0 && diff <= 30;
		case 'this-month':
			return dateKey.slice(0, 7) === todayKey.slice(0, 7);
		default:
			return true;
	}
}

export function summarize(rows: PullOutRow[], todayKey: string): Summary {
	const farms = new Set<string>();
	const batches = new Set<string>();
	let today = 0;
	let overdue = 0;
	let week = 0;
	let totalAmount = 0;

	for (const r of rows) {
		totalAmount += r.amountNum;
		farms.add(r.farmId);
		batches.add(r.chickBatchId);
		if (!r.dateKey) continue;
		const diff = daysBetween(todayKey, r.dateKey);
		if (diff === 0) today++;
		else if (diff < 0) overdue++;
		else if (diff <= 7) week++;
	}
	return {
		total: rows.length,
		today,
		overdue,
		week,
		totalAmount,
		farms: farms.size,
		batches: batches.size
	};
}

// ── Option lists (drive the selects) ─────────────────────────────────────
export const WINDOW_OPTIONS: { value: DateWindow; label: string }[] = [
	{ value: 'all', label: 'Any date' },
	{ value: 'today', label: 'Today' },
	{ value: 'tomorrow', label: 'Tomorrow' },
	{ value: 'next-7', label: 'Next 7 days' },
	{ value: 'next-30', label: 'Next 30 days' },
	{ value: 'overdue', label: 'Overdue' },
	{ value: 'this-month', label: 'This month' },
	{ value: 'no-date', label: 'No date' }
];

export const SORT_OPTIONS = [
	{ value: 'date-asc', label: 'Earliest first' },
	{ value: 'date-desc', label: 'Latest first' },
	{ value: 'farm-asc', label: 'Farm (A–Z)' },
	{ value: 'farm-desc', label: 'Farm (Z–A)' },
	{ value: 'feed-asc', label: 'Feed (A–Z)' },
	{ value: 'feed-desc', label: 'Feed (Z–A)' },
	{ value: 'amount-desc', label: 'Highest amount' },
	{ value: 'amount-asc', label: 'Lowest amount' },
	{ value: 'qty-desc', label: 'Highest qty' },
	{ value: 'qty-asc', label: 'Lowest qty' }
];

export const PAGE_SIZE_OPTIONS = ['10', '25', '50', '100'].map((v) => ({ value: v, label: v }));
