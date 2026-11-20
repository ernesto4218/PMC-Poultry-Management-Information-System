import { FarmService } from '#lib/services/farm.services.ts';
import { registerQtyFormula } from '#lib/services/particulars-memories.services.ts';
// import { StaffService } from '#lib/services/staff.services.ts'; // future

let initialised = false;

export function registerParticularsFormulas() {
	if (initialised) return;

	// All volume-based formulas below return whole numbers, ALWAYS ROUNDED UP.
	// Math.ceil → always round up (e.g. you can't buy 12.3 bags, so you need 13).
	// If you ever need nearest / floor behaviour instead, use Math.round / Math.floor.

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

	registerQtyFormula('farm-staff-value', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farmRecord = await FarmService.getFarmStaffInfoByCode(code);
		if (!farmRecord) {
			throw new Error(`No farm found for code "${code}".`);
		}

		// Extract the staff count property
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

		// Compute
		const units = Math.ceil(staff * multiplier);
		const amount = units * quantity * price;

		return amount;
	});

	registerQtyFormula('rice-hull-(volume/1000)x25', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const value = Math.ceil((farm.volume / 1000) * 25);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('CRH-(volume/1000)x10', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const value = Math.ceil((farm.volume / 1000) * 10);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('sacking-iti-(ricehull+crh)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const valuericehull = (farm.volume / 1000) * 25;
		const valuecrh = (farm.volume / 1000) * 10;
		// Add first, round once at the end, so the sum isn't off by rounding each part
		const value = Math.ceil(valuericehull + valuecrh);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('chick-paper-(volume/1000 * 5)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const value = Math.ceil((farm.volume / 1000) * 5);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('booster1-(volume*4/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const value = Math.ceil((farm.volume * 4) / 1000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('get-farm-volume)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const value = Math.ceil(farm.volume);

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
			throw new Error(`No farm found with code "${code}".`);
		}

		const lessmty5 = farm.volume * 0.05;
		const netvalue = farm.volume - lessmty5;
		const value = Math.ceil((netvalue * 2) / 1000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('starter-(net-volume x 6)/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const lessmty5 = farm.volume * 0.05;
		const netvalue = farm.volume - lessmty5;
		const value = Math.ceil((netvalue * 6) / 1000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('grower-(net-volume x 2)/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const lessmty5 = farm.volume * 0.05;
		const netvalue = farm.volume - lessmty5;
		const value = Math.ceil((netvalue * 2) / 1000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('grower-(net-volume x 8)/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const lessmty5 = farm.volume * 0.05;
		const netvalue = farm.volume - lessmty5;
		const value = Math.ceil((netvalue * 8) / 1000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('grower-(net-volume x 8.7)/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const lessmty5 = farm.volume * 0.05;
		const netvalue = farm.volume - lessmty5;
		const value = Math.ceil((netvalue * 8.7) / 1000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('grower-(net-volume x 7.1)/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const lessmty5 = farm.volume * 0.05;
		const netvalue = farm.volume - lessmty5;
		const value = Math.ceil((netvalue * 7.1) / 1000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('multicide-(volume/10000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const lessmty5 = farm.volume * 0.05;
		const netvalue = farm.volume - lessmty5;
		const value = Math.ceil(farm.volume / 10000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('LPG-(volume/3000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const lessmty5 = farm.volume * 0.05;
		const netvalue = farm.volume - lessmty5;
		const value = Math.ceil(farm.volume / 3000);

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	registerQtyFormula('VAC-(volume/1000)', async (params, ctx) => {
		const code = String(ctx?.code ?? ctx?.farmId ?? '').trim();
		if (!code) {
			throw new Error('Missing "code" parameter (farm code).');
		}

		const farm = await FarmService.getFarmByCode(code);
		if (!farm) {
			throw new Error(`No farm found with code "${code}".`);
		}

		const lessmty5 = farm.volume * 0.05;
		const netvalue = farm.volume - lessmty5;
		const value = Math.ceil(farm.volume / 1000);

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
			value = Math.ceil(((((8.5 * farm.volume) / 1000) * 3.8) / 100) * 3 + 1);
		} else {
			value = Math.ceil(((((5.3 * farm.volume) / 1000) * 3.8) / 100) * 3);
		}

		if (!Number.isFinite(value) || value < 0) {
			throw new Error(`Invalid volume for farm code "${code}".`);
		}
		return value;
	});

	initialised = true;
}
