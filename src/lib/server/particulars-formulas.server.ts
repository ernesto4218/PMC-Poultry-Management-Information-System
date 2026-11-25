import { FarmService } from '#lib/services/farm.services.ts';
import { registerQtyFormula } from '#lib/services/particulars-memories.services.ts';
// import { StaffService } from '#lib/services/staff.services.ts'; // future

// Round UP to 1 decimal place: 1.75 → 1.8, 1.7 → 1.7, 1.71 → 1.8.
// The -1e-9 absorbs float drift (e.g. 1.7 * 10 = 17.000000000000002)
// so we don't accidentally bump a value that's already "on" the decimal.
const roundUpTo1 = (n: number): number => Math.ceil(n * 10 - 1e-9) / 10;

let initialised = false;

export function registerParticularsFormulas() {
	if (initialised) return;

	// Fractional formulas below use roundUpTo1 → always round UP to 1 dp.
	// Whole-number formulas (staff counts, etc.) still use Math.ceil.

	// ── Example 1: FARM SALARIES ↔ FARM STAFF count ─────────────────────────
	// registerQtyFormula('farm-staff-count', async (_params, ctx) => {
	// 	return await StaffService.countActive({ farmId: ctx.farmId });
	// });

	// ── Example 2: Overtime = staff × multiplier (param driven) ────────────
	// registerQtyFormula('farm-staff-overtime', async (params, ctx) => {
	//   const count = await StaffService.countActive({ farmId: ctx.farmId });
	//   const mult = Number(params?.multiplier ?? 1.5);
	//   return Math.floor(count * mult);
	// });

	registerQtyFormula('harvest-allowance-advances', async (_params, ctx) => {
		return 40500;
	});

	registerQtyFormula('harvest-allowance-default-49500', async (_params, ctx) => {
		return 49500;
	});

	registerQtyFormula('farm-staff-value', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farmRecord = await FarmService.getFarmStaffInfoByCode(code);
		if (!farmRecord) {
			throw new Error(`No farm found for code "${code}".`);
		}

		// Staff is a count of people → keep whole number.
		const value = Math.ceil(Number(farmRecord.staff));
		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid staff value for farm code "${code}".`);
		}

		return value;
	});

	registerQtyFormula('farm-salary-value', async (params, ctx) => {
		// Param 1: Farm code
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		// Param 2: Multiplier (per staff)
		const rawMult = params?.multiplier ?? 1;
		const multiplier = Number(rawMult);

		if (!Number.isFinite(multiplier) || multiplier <= 0) {
			throw new Error(`Invalid "multiplier" parameter: ${rawMult}`);
		}

		// Param 3: Quantity
		const rawQuantity = params?.quantity ?? 1;
		const quantity = Number(rawQuantity);

		if (!Number.isFinite(quantity) || quantity < 0) {
			throw new Error(`Invalid "quantity" parameter: ${rawQuantity}`);
		}

		// Param 4: Price
		const rawPrice = params?.price ?? 0;
		const price = Number(rawPrice);

		if (!Number.isFinite(price) || price < 0) {
			throw new Error(`Invalid "price" parameter: ${rawPrice}`);
		}

		// Fetch farm record
		const farmRecord = await FarmService.getFarmStaffInfoByCode(code);

		if (!farmRecord) {
			throw new Error(`No farm found for code "${code}".`);
		}

		const staff = Number(farmRecord.staff);

		if (!Number.isFinite(staff) || staff < 0) {
			throw new Error(`Invalid staff value for farm code "${code}".`);
		}

		// Compute – staff count is whole people, so Math.ceil here.
		const units = Math.ceil(staff * multiplier);
		const amount = units * quantity * price;

		return amount;
	});

	registerQtyFormula('rice-hull-(volume/1000)x25', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		// const farm = await FarmService.getFarmByCode(code);
		// if (!farm) {
		// 	throw new Error(`No farm found with code "${code}".`);
		// }

		const value = roundUpTo1((farm.volume / 1000) * 25);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('CRH-(volume/1000)x10', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const value = roundUpTo1((farm.volume / 1000) * 10);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('sacking-iti-(ricehull+crh)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const valuericehull = (farm.volume / 1000) * 25;
		const valuecrh = (farm.volume / 1000) * 10;

		// Add first, round once at the end, so the sum isn't off by rounding each part.
		const value = roundUpTo1(valuericehull + valuecrh);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('chick-paper-(volume/1000 * 5)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const value = roundUpTo1((farm.volume / 1000) * 5);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('chick-paper-(5 x volume / 1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const value = roundUpTo1((5 * farm.volume) / 1000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('booster1-(volume*4/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const value = roundUpTo1((farm.volume * 4) / 1000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('get-farm-volume)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const value = roundUpTo1(farm.volume);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('starter-(net-volume x 2)/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (farm.type === 'CCS') {
			const less = farm.volume * 0.0175;
			const netvalue = farm.volume - less;
			const value = roundUpTo1((netvalue * 2) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}
			return value;
		} else if (farm.type === 'CON') {
			const less = farm.volume * 0.025;
			const netvalue = farm.volume - less;

			const value = roundUpTo1((netvalue * 2) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}

			console.log('less ', less);
			console.log('netvalue ', netvalue);
			console.log('value ', value);
			return value;
		} else {
			throw new Error('Invalid Farm Type.');
		}
	});

	registerQtyFormula('starter-(net-volume x 6)/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();

		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (farm.type === 'CCS') {
			const less = farm.volume * 0.0175;
			const netvalue = farm.volume - less;
			const value = roundUpTo1((netvalue * 6) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}
			return value;
		} else if (farm.type === 'CON') {
			const less = farm.volume * 0.025;
			const netvalue = farm.volume - less;
			const value = roundUpTo1((netvalue * 6) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}
			return value;
		} else {
			throw new Error('Invalid Farm Type.');
		}
	});

	registerQtyFormula('grower-(net-volume x 2)/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();

		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (farm.type === 'CCS') {
			const less = farm.volume * 0.035;
			const netvalue = farm.volume - less;
			const value = roundUpTo1((netvalue * 2) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}
			return value;
		} else if (farm.type === 'CON') {
			const less = farm.volume * 0.05;
			const netvalue = farm.volume - less;
			const value = roundUpTo1((netvalue * 2) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}
			return value;
		} else {
			throw new Error('Invalid Farm Type.');
		}
	});

	registerQtyFormula('grower-(net-volume x 8)/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (farm.type === 'CCS') {
			const less = farm.volume * 0.035;
			const netvalue = farm.volume - less;
			const value = roundUpTo1((netvalue * 8) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}
			return value;
		} else if (farm.type === 'CON') {
			const less = farm.volume * 0.05;
			const netvalue = farm.volume - less;
			const value = roundUpTo1((netvalue * 8) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}
			return value;
		} else {
			throw new Error('Invalid Farm Type.');
		}
	});

	registerQtyFormula('grower-(net-volume x 8.7)/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (farm.type === 'CCS') {
			const less = farm.volume * 0.035;
			const netvalue = farm.volume - less;
			const value = roundUpTo1((netvalue * 8.7) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}
			return value;
		} else if (farm.type === 'CON') {
			const less = farm.volume * 0.05;
			const netvalue = farm.volume - less;
			const value = roundUpTo1((netvalue * 8.7) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}
			return value;
		} else {
			throw new Error('Invalid Farm Type.');
		}
	});

	registerQtyFormula('grower-(net-volume x 7.1)/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const lessmty5 = farm.volume * 0.05;
		const netvalue = farm.volume - lessmty5;
		const value = roundUpTo1((netvalue * 7.1) / 1000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('grower-(net-volume x 3.9)/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (farm.type === 'CCS') {
			const less = farm.volume * 0.035;
			const netvalue = farm.volume - less;
			const value = roundUpTo1((netvalue * 3.9) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}
			return value;
		} else if (farm.type === 'CON') {
			const less = farm.volume * 0.05;
			const netvalue = farm.volume - less;
			const value = roundUpTo1((netvalue * 3.9) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}
			return value;
		} else {
			throw new Error('Invalid Farm Type.');
		}
	});

	registerQtyFormula('grower-(net-volume x 3.8)/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (farm.type === 'CCS') {
			const less = farm.volume * 0.035;
			const netvalue = farm.volume - less;
			const value = roundUpTo1((netvalue * 3.8) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}
			return value;
		} else if (farm.type === 'CON') {
			const less = farm.volume * 0.05;
			const netvalue = farm.volume - less;
			const value = roundUpTo1((netvalue * 3.8) / 1000);

			if (!Number.isFinite(value) || value < 0) {
				throw new Error(`Invalid volume for farm code "${code}".`);
			}
			return value;
		} else {
			throw new Error('Invalid Farm Type.');
		}
	});

	registerQtyFormula('multicide-(volume/10000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const value = farm.volume / 10000;

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}

		return value;
	});

	registerQtyFormula('LPG-(volume/3000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const value = roundUpTo1(farm.volume / 3000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('VAC-(volume/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const lessmty5 = farm.volume * 0.05;
		const netvalue = farm.volume - lessmty5;
		const value = roundUpTo1(farm.volume / 1000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('VACSAFE-CON-CCS', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		let value;

		if (farm.type === 'CON') {
			value = roundUpTo1(((8.5 * (farm.volume / 1000) * 3.8) / 100) * 3);
		} else {
			value = roundUpTo1(((5.3 * (farm.volume / 1000) * 3.8) / 100) * 2);
		}

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('harvest-allowance(volume x 0.96)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const value = roundUpTo1(farm.volume * 0.96);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid staff value for farm code "${code}".`);
		}

		return value;
	});

	registerQtyFormula('ricehull/crh(18 x volume / 1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		const farm = await FarmService.getFarmByCode(code);

		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const value = roundUpTo1((18 * farm.volume) / 1000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid staff value for farm code "${code}".`);
		}

		return value;
	});

	initialised = true;
}
