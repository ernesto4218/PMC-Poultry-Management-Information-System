import type { PageServerLoad } from './$types';
import { ChickBatchService } from '#lib/services/chick-batches.services.ts';
import { MedicationMemoryService } from '#lib/services/medication-memory.services.ts';

export const load: PageServerLoad = async () => {
	try {
		const [batches, memory] = await Promise.all([
			ChickBatchService.getAllBatchesByFarm(),
			MedicationMemoryService.getAll()
		]);

		console.log('Memory ', memory);
		return { batches, memory };
	} catch (err) {
		console.error('Failed to load budget placement data:', err);
		return { batches: [], memory: {} };
	}
};
