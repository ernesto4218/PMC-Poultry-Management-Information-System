export const LITERS_PER_GALLON = 3.8;
export const VAC_RATE_PER_LITER = 8.5;
export const NET_FACTOR = 0.95;

type VaccineType = 'CCS' | 'CON';

type AgeSchedule = {
	water: boolean;
	nbl: boolean;
	gumboro: boolean;
};

// Per-type schedule: which items apply at which age
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

const r2 = (n: number) => Math.round(n * 100) / 100;

export function buildVaccination(ages: string[], volume: number, type: string) {
	const thousands = volume / 1000;
	const gallons = r2(thousands * VAC_RATE_PER_LITER);
	const liters = r2(gallons * LITERS_PER_GALLON);
	const vacSafe = Math.round(liters / 100);

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
