// src/routes/admin/chick-batches/+page.server.ts
import type { PageServerLoad } from './$types';
import { ChickBatchService } from '#lib/services/chick-batches.services.ts';
import { FarmService } from '#lib/services/farm.services.ts';

export const load: PageServerLoad = async () => {
	try {
		const [batches, farms, stats] = await Promise.all([
			ChickBatchService.getAllBatches(),
			FarmService.getAllFarms(),
			ChickBatchService.getDashboardStats()
		]);
		return { batches, farms, stats };
	} catch (err) {
		console.error('Failed to load chick batches:', err);
		return { batches: [], farms: [] };
	}
};
