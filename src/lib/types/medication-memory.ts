export const FARM_GROUPS = ['CCS', 'CON'] as const;
export type FarmGroup = (typeof FARM_GROUPS)[number];
export const AGES = ['0-1', ...Array.from({ length: 33 }, (_, i) => String(i + 2))];

export type MemoryColumn = {
	id: string; // standard_medicine id
	name: string;
	areaName: string;
	unit: string;
	value: number;
	ages: string[];
};

/** CCS -> CCS, CON-MAH / CON-PAG -> CON, anything else -> null */
export function farmGroupOf(type: string | null | undefined): FarmGroup | null {
	const t = (type ?? '').trim().toUpperCase();
	if (t === 'CCS') return 'CCS';
	if (t.startsWith('CON')) return 'CON';
	return null;
}

// Used by "Load defaults": your original order
export const DEFAULT_MEMORY_NAMES = [
	'Probiotic',
	'Amilyte',
	'Tilmicosin',
	'Metiositol',
	'Enrofloxacin',
	'B-Complex',
	'Poustin-C',
	'TMPS',
	'CidoAir',
	'AminoVit'
];

export function parseAgeRanges(text: string): string[] {
	const out = new Set<string>();
	for (const token of text.split(',')) {
		const m = token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
		if (!m) continue;
		const a = Number(m[1]);
		const b = Number(m[2] ?? m[1]);
		for (let n = Math.min(a, b); n <= Math.max(a, b) && n <= 34; n++) {
			out.add(n <= 1 ? '0-1' : String(n));
		}
	}
	return AGES.filter((x) => out.has(x));
}

export function summarizeAges(ages: string[]): string {
	const idx = AGES.map((a, i) => (ages.includes(a) ? i : -1)).filter((i) => i >= 0);
	const runs: string[] = [];
	for (let k = 0; k < idx.length;) {
		let e = k;
		while (e + 1 < idx.length && idx[e + 1] === idx[e] + 1) e++;
		const s = idx[k];
		const t = idx[e];
		runs.push(s === t ? AGES[s] : s === 0 ? `0–${AGES[t]}` : `${AGES[s]}–${AGES[t]}`);
		k = e + 1;
	}
	return runs.join(', ');
}
