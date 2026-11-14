// src/routes/admin/farms/+page.server.ts
import type { PageServerLoad } from './$types';
import { FarmService } from '#lib/services/farm.services.ts';
import { ChickBatchService } from '#lib/services/chick-batches.services.ts';

type FarmStat = { batches: number; chicks: number; lastSet: string | null };

export const load: PageServerLoad = async () => {
	try {
		const [farms, batches] = await Promise.all([
			FarmService.getAllFarms(),
			ChickBatchService.getAllBatches()
		]);

		// Aggregate batches per farm
		const perFarm = new Map<string, FarmStat>();
		for (const b of batches) {
			const cur = perFarm.get(b.farmId) ?? { batches: 0, chicks: 0, lastSet: null };
			cur.batches += 1;
			cur.chicks += b.volume;
			// dateSet is already 'YYYY-MM-DD' — string comparison works
			if (!cur.lastSet || b.dateSet > cur.lastSet) cur.lastSet = b.dateSet;
			perFarm.set(b.farmId, cur);
		}

		return {
			farms,
			farmStats: Object.fromEntries(perFarm) as Record<string, FarmStat>,
			totals: {
				farms: farms.length,
				batches: batches.length,
				chicks: batches.reduce((s, b) => s + b.volume, 0)
			}
		};
	} catch (err) {
		console.error('Failed to load farms server-side:', err);
		return {
			farms: [],
			farmStats: {} as Record<string, FarmStat>,
			totals: { farms: 0, batches: 0, chicks: 0 }
		};
	}
};
