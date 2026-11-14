// src/routes/admin/farms/+page.server.ts
import type { PageServerLoad } from './$types';
import { FarmService } from '#lib/services/farm.services.ts';
import { ChickBatchService } from '#lib/services/chick-batches.services.ts';
import { StandardMedicineService } from '#lib/services/standardsmedicine.services.ts';
import { MedicationMemoryService } from '#lib/services/medication-memory.services.ts';

type FarmStat = { batches: number; chicks: number; lastSet: string | null };

export const load: PageServerLoad = async () => {
	try {
		const [farms, medicines, memory] = await Promise.all([
			FarmService.getAllFarmsCCS({ type: 'CCS' }),
			StandardMedicineService.getAll({ areaName: 'CCS' }),
			MedicationMemoryService.getAll()
		]);
		console.log(memory);
		return { farms, medicines, memory };
	} catch (err) {
		console.error('Failed to load farms server-side:', err);
		return {
			farms: []
		};
	}
};
