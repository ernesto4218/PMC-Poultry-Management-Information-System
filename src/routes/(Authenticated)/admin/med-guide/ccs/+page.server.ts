// src/routes/admin/med-guide/ccs/+page.server.ts
import type { PageServerLoad } from './$types';
import { ChickBatchService } from '#lib/services/chick-batches.services.ts';
import { StandardMedicineService } from '#lib/services/standardsmedicine.services.ts';
import { MedicationMemoryService } from '#lib/services/medication-memory.services.ts';

export const load: PageServerLoad = async () => {
	try {
		const [batches, medicines, memory] = await Promise.all([
			ChickBatchService.getAllBatchesByFarmType('CCS'),
			StandardMedicineService.getAll({ areaName: 'CCS' }),
			MedicationMemoryService.getAll()
		]);
		return { batches, medicines, memory };
	} catch (err) {
		console.error('Failed to load CCS batches server-side:', err);
		return { batches: [], medicines: [], memory: {} };
	}
};
