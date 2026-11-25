// Shared by the browser (print dialog builds the snapshot body) and the server
// (service stores it). Keep this file free of server-only imports.
import { PARTICULAR_CATEGORIES } from '#lib/types/particulars.ts';
import { computeAmount } from '#lib/utils/particular-amount.ts';
import {
	formatNumber,
	formatCurrency,
	formatDateShort,
	addDaysToDate
} from '#lib/utils/format.ts';

export type BudgetSnapshotRow = {
	date: string; // '' when the item has no date
	day: number | null;
	name: string;
	label: string;
	qty: string; // stored exactly as printed
	price: string;
	category: string; // '' when the item has no known category column
	amount: string;
	remarks: string;
	auto: boolean; // vitamins, trucking, labor
};

export type BudgetSnapshotFeedRow = {
	name: string;
	qty: number;
	amount: number;
	bags: number;
};

export type BudgetSnapshotFeedGroup = {
	key: string;
	label: string;
	qty: number;
	amount: number;
	bags: number;
	perChick: number;
	rows: BudgetSnapshotFeedRow[];
};

/** Everything computed on screen, frozen. This is what gets hashed and saved. */
export type BudgetSnapshotBody = {
	volume: number;
	birdcount: number;
	type: string;
	mortalityRate: number;
	adjustedVolume: number;
	categories: string[]; // column order at the time of saving
	rows: BudgetSnapshotRow[];
	categoryTotals: Record<string, number>;
	perChickByCategory: Record<string, number>;
	grandTotal: number;
	grandPerChick: number;
	feeds: {
		groups: BudgetSnapshotFeedGroup[];
		qty: number;
		amount: number;
		bags: number;
		perChick: number;
	};
};

export type BudgetReportSnapshot = BudgetSnapshotBody & {
	schemaVersion: 1;
	farm: { id: string; name: string; code: string; type: string; address: string };
	batch: { id: string; number: string; dateSet: string } | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export const mortalityRateOf = (type?: string | null) =>
	String(type ?? '').toLowerCase() === 'ccs' ? 0.035 : 0.05;

const isStarterOrGrower = (g: any) => {
	const k = String(g.key ?? '').toLowerCase();
	const l = String(g.label ?? '').toLowerCase();
	return (
		k.includes('starter') || k.includes('grower') || l.includes('starter') || l.includes('grower')
	);
};

export type BuildBudgetInput = {
	dateSet: string;
	volume: number;
	birdcount: number;
	type: string;
	memory: any;
	vitamins: any[];
	vitaminsCategory: string | null;
	feeds: any;
	categoryTotals: Record<string, number>;
	grandTotal: number;
};

export function buildBudgetBody(input: BuildBudgetInput): BudgetSnapshotBody {
	const { dateSet, volume, birdcount, type, memory, vitamins, vitaminsCategory, feeds } = input;

	const categories = PARTICULAR_CATEGORIES.map((c) => String(c));
	const known = new Set(categories);
	const mortalityRate = mortalityRateOf(type);
	const adjustedVolume = volume * (1 - mortalityRate);

	// ---- rows: vitamins, particulars items, then trucking / labor ----
	const rows: BudgetSnapshotRow[] = [];

	for (const v of vitamins ?? []) {
		rows.push({
			date: '',
			day: null,
			name: v.name,
			label: '',
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
		const ok = known.has(String(item.particularCategory));
		rows.push({
			date: adjusted ? formatDateShort(adjusted) : '',
			day: item.adjustmentDays ?? null,
			name: item.particularName ?? item.particular?.name ?? '—',
			label: item.label ?? '',
			qty: formatNumber(item.resolvedQty),
			price: formatCurrency(item.price),
			category: ok ? String(item.particularCategory) : '',
			amount: ok ? formatCurrency(computeAmount(item)) : '',
			remarks: item.resolveError ?? '',
			auto: false
		});
	}

	if (feeds?.qty > 0) {
		const othersCat =
			categories.find((c) => c.trim().toUpperCase() === 'OTHERS') ?? '';
		for (const r of feeds.extraRows ?? []) {
			rows.push({
				date: '',
				day: null,
				name: r.name,
				label: '',
				qty: formatNumber(r.qty),
				price: formatCurrency(r.avgPrice),
				category: othersCat,
				amount: formatCurrency(r.amount),
				remarks: '',
				auto: true
			});
		}
	}

	// ---- totals ----
	const categoryTotals: Record<string, number> = {};
	const perChickByCategory: Record<string, number> = {};
	for (const c of categories) {
		categoryTotals[c] = Number(input.categoryTotals?.[c]) || 0;
		perChickByCategory[c] = birdcount > 0 ? round1(categoryTotals[c] / birdcount) : 0;
	}
	const grandPerChick = categories.reduce((s, c) => s + perChickByCategory[c], 0);

	// ---- feeds summary ----
	const bags = (qty: number) => (volume > 0 ? round1(qty / (volume / 1000)) : 0);

	const groups: BudgetSnapshotFeedGroup[] = (feeds?.feedGroups ?? []).map((g: any) => {
		const divisor = isStarterOrGrower(g) ? adjustedVolume : volume;
		return {
			key: String(g.key),
			label: String(g.label),
			qty: Number(g.qty) || 0,
			amount: Number(g.amount) || 0,
			bags: bags(Number(g.qty) || 0),
			perChick: divisor > 0 ? round1((Number(g.amount) || 0) / divisor) : 0,
			rows: (g.rows ?? []).map((r: any) => ({
				name: String(r.name),
				qty: Number(r.qty) || 0,
				amount: Number(r.amount) || 0,
				bags: bags(Number(r.qty) || 0)
			}))
		};
	});

	const feedsQty = Number(feeds?.qty) || 0;
	const feedsAmount = Number(feeds?.amount) || 0;

	return {
		volume,
		birdcount,
		type: String(type ?? ''),
		mortalityRate,
		adjustedVolume,
		categories,
		rows,
		categoryTotals,
		perChickByCategory,
		grandTotal: Number(input.grandTotal) || 0,
		grandPerChick,
		feeds: {
			groups,
			qty: feedsQty,
			amount: feedsAmount,
			bags: bags(feedsQty),
			perChick: volume > 0 ? round1(feedsAmount / volume) : 0
		}
	};
}
