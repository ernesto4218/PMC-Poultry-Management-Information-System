export const LITERS_PER_GALLON = 3.8;
export const VAC_RATE_PER_LITER = 8.5;
export const NET_FACTOR = 0.95;

// ─────────────────────────── Vaccination ───────────────────────────
type VaccineType = 'CCS' | 'CON';

type AgeSchedule = {
	water: boolean;
	nbl: boolean;
	gumboro: boolean;
};

const SCHEDULES: Record<VaccineType, Record<string, AgeSchedule>> = {
	CCS: {
		'10': { water: true, nbl: true, gumboro: false },
		'14': { water: true, nbl: false, gumboro: true }
	},
	CON: {
		'10': { water: true, nbl: true, gumboro: false },
		'14': { water: true, nbl: false, gumboro: true },
		'17': { water: true, nbl: true, gumboro: false }
	}
};

const NO_ITEMS: AgeSchedule = { water: false, nbl: false, gumboro: false };

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function buildVaccination(ages: string[], volume: number, type: string) {
	const thousands = volume / 1000;
	const gallons = r2(thousands * VAC_RATE_PER_LITER);
	const liters = r2(gallons * LITERS_PER_GALLON);
	let vacSafe: number;

	if (type === 'CCS') {
		vacSafe = Math.round(liters / 100);
	} else {
		vacSafe = Math.round((volume / 1000) * 0.25);
	}

	const schedule = SCHEDULES[type as VaccineType] ?? {};

	return ages.map((age) => {
		const s = schedule[age] ?? NO_ITEMS;
		return {
			age,
			gallons: s.water ? gallons : null,
			liters: s.water ? liters : null,
			nbl: s.nbl ? thousands : null,
			gumboro: s.gumboro ? thousands : null,
			vacSafe: s.water ? vacSafe : null
		};
	});
}

// ─────────────────────────── Medication ───────────────────────────
// Water needed per bird, by age. Day 6 is water only: no value.
export const WATER_PER_BIRD: Record<string, number> = {
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

// '0-1', '2', '3' ... '34'
export const AGES = ['0-1', ...Array.from({ length: 33 }, (_, i) => String(i + 2))];

// Seed with the default gallons when one exists; empty means "derive from perBird × volume".
export const DEFAULT_GALLONS: Record<string, string> = {
	'10': '150',
	'11': '240',
	'12': '240',
	'14': '9'
};

// Overrides applied to both CON and CCS farms.
// Age 10: fixed 150 gallons.
// Age 11 and 12: derived as volume * 6 / 1000 (perBird = 6, no manual gallons).
export const CONVENTIONAL_OVERRIDES: Record<string, { perBird: string; manualGallons: string }> = {
	'10': { perBird: '10', manualGallons: '150' },
	'11': { perBird: '6', manualGallons: '' },
	'12': { perBird: '6', manualGallons: '' }
};

// Farm types that use the overrides above (matched case-insensitively, ignoring spaces).
const OVERRIDE_TYPES = ['CON', 'CCS'];

const hasOverrides = (type?: string) => OVERRIDE_TYPES.includes(type?.trim().toUpperCase() ?? '');

export type MedicationColumn = {
	id: string;
	name: string;
	value: string | number;
	unit?: string;
	ages?: string[];
};

export type DayState = {
	age: string;
	waterOnly: boolean;
	perBird: string;
	manualGallons: string;
};

export type DaySchedule = {
	age: string;
	waterOnly: boolean;
	perBird: string;
	gallons: number | null;
	liters: number | null;
	doses: Record<string, number>;
};

// Pass the farm type ('CON' or 'CCS'). Call again when the type changes.
export function createDays(type?: string): DayState[] {
	return AGES.map((age) => {
		const o = hasOverrides(type) ? CONVENTIONAL_OVERRIDES[age] : undefined;
		return {
			age,
			waterOnly: age === '6',
			perBird: o?.perBird ?? (WATER_PER_BIRD[age] != null ? String(WATER_PER_BIRD[age]) : ''),
			// Seed with the default gallons when one exists; empty means "derive from perBird × volume".
			manualGallons: o ? o.manualGallons : (DEFAULT_GALLONS[age] ?? '')
		};
	});
}

// Keep digits and the first decimal point only. Strips letters,
// minus signs, spaces, and any extra dots the user types.
export function sanitizeDecimal(value: string): string {
	return value
		.replace(/[^0-9.]/g, '')
		.split('.')
		.slice(0, 2)
		.join('.');
}

// `_type` is kept so every caller passes the farm type; the CON/CCS-specific values
// (days 11/12 at 6 per bird) are seeded by createDays(type), so no special case is needed here.
export function gallonsNum(day: DayState, volume: number, _type: string): number | null {
	const v = Number(volume);
	if (!v) return null;

	// Manual gallons override wins for the row.
	if (day.manualGallons !== '') {
		const g = parseFloat(day.manualGallons);
		return Number.isNaN(g) ? null : g;
	}

	// Otherwise derive from per-bird × volume.
	const p = parseFloat(day.perBird);
	if (Number.isNaN(p)) return null;

	return Math.round((p * v) / 1000);
}

export function litersNum(day: DayState, volume: number, type: string): number | null {
	const g = gallonsNum(day, volume, type);
	return g == null ? null : Math.round(g * LITERS_PER_GALLON);
}

export function doseNum(
	days: DayState[],
	day: DayState,
	col: MedicationColumn,
	volume: number,
	type: string
): number | null {
	const base =
		day.age === '14'
			? gallonsNum(days.find((d) => d.age === '13') ?? day, volume, type)
			: gallonsNum(day, volume, type);

	const per = parseFloat(String(col.value));

	if (base == null || Number.isNaN(per)) return null;

	return r2(base * per);
}

// Single source of truth for the whole day-table.
export function buildSchedule(
	days: DayState[],
	columns: MedicationColumn[],
	volume: number,
	type: string
): DaySchedule[] {
	return days.map((d) => ({
		age: d.age,
		waterOnly: d.waterOnly,
		perBird: d.perBird,
		gallons: gallonsNum(d, volume, type),
		liters: litersNum(d, volume, type),
		doses: d.waterOnly
			? {}
			: Object.fromEntries(
					columns
						.filter((c) => c.ages?.includes(d.age))
						.map((c) => [c.id, doseNum(days, d, c, volume, type)])
						.filter(([, v]) => v != null)
				)
	}));
}

export const fmt = (n: number | null): string =>
	n == null ? '' : n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export function onPerBirdInput(day: DayState, e: Event) {
	const target = e.currentTarget as HTMLInputElement;
	const cleaned = sanitizeDecimal(target.value);
	if (target.value !== cleaned) target.value = cleaned;
	day.perBird = cleaned;
	// Per-bird changed → drop the manual gallons override so this row re-derives.
	day.manualGallons = '';
}

export function onGallonsInput(day: DayState, e: Event) {
	const target = e.currentTarget as HTMLInputElement;
	const cleaned = sanitizeDecimal(target.value);
	if (target.value !== cleaned) target.value = cleaned;
	// Empty string → revert this row to perBird-derived gallons.
	day.manualGallons = cleaned;
}

// ─────────────────────────── Vitamins summary ───────────────────────────
export type SummaryRow = {
	id: string;
	name: string;
	grams: number;
	perBirdGrams: number;
	kls: number;
	qty: number;
	price: number;
	amount: number;
	costPerBird: number;
};

export type VitaminsSummary = {
	rows: SummaryRow[];
	totalAmount: number;
	totalPerBirdGrams: number;
};

const toNum = (v: unknown): number => {
	const n = parseFloat(String(v ?? '').replace(/,/g, ''));
	return Number.isNaN(n) ? 0 : n;
};

// Round to N decimal places, keeping the whole part untouched.
const roundTo = (n: number, places: number): number => {
	const f = 10 ** places;
	// +Number.EPSILON guards against 1.005 -> 1.00 style issues
	return Math.round((n + Number.EPSILON) * f) / f;
};

// Round UP to N decimal places (for "must buy at least" quantities).
const ceilTo = (n: number, places: number): number => {
	const f = 10 ** places;
	// Subtract a tiny epsilon so 15.1 * 10 = 151.00000000000003 doesn't become 152
	return Math.ceil(n * f - 1e-9) / f;
};

export function buildSummary(
	schedule: { days?: DaySchedule[]; medications?: MedicationColumn[] },
	birdCount: number | string,
	qty: Record<string, string>,
	price: Record<string, string>
): VitaminsSummary {
	const days = schedule?.days ?? [];
	const meds = schedule?.medications ?? [];
	const birds = Number(birdCount) || 0;

	const rows: SummaryRow[] = meds.map((med) => {
		const grams = days.reduce((sum, d) => sum + toNum(d.doses?.[med.id]), 0);
		const kls = grams / 1000;

		const entered = qty[med.id];
		const effectiveQty =
			entered !== undefined && entered !== ''
				? roundTo(toNum(entered), 1) // 15.678 -> 15.7 (not 20)
				: ceilTo(kls, 1); // 0.05 -> 0.1, 15.1 -> 15.1

		const unitPrice = roundTo(toNum(price[med.id]), 2);
		const amount = roundTo(effectiveQty * unitPrice, 2);

		return {
			id: med.id,
			name: med.name,
			grams,
			perBirdGrams: birds ? grams / birds : 0,
			kls,
			qty: effectiveQty,
			price: unitPrice,
			amount,
			costPerBird: birds ? amount / birds : 0
		};
	});

	const totalAmount = roundTo(
		rows.reduce((s, r) => s + r.amount, 0),
		2
	);
	const totalPerBirdGrams = birds ? rows.reduce((s, r) => s + r.grams, 0) / birds : 0;

	return { rows, totalAmount, totalPerBirdGrams };
}
