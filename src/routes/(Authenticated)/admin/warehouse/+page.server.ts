import { ChickBatchService } from '#lib/services/chick-batches.services.ts';
import { DriverService } from '#lib/services/drivers.services.ts';
import { FarmService } from '#lib/services/farm.services.ts';
import { FeedStockService } from '#lib/services/feed-stock.services.ts';
import { TruckService } from '#lib/services/trucks.services.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const [inventory, movements, products, suppliers, farms, drivers, trucks, chickBatches] =
			await Promise.all([
				FeedStockService.getInventory(),
				FeedStockService.getMovements(),
				FeedStockService.getProductsLookup(),
				FeedStockService.getSuppliersLookup(),
				FarmService.getAllFarms(),
				DriverService.getAllDrivers(),
				TruckService.getAllTrucks(),
				ChickBatchService.getAllBatches()
			]);

		return { inventory, movements, products, suppliers, farms, drivers, trucks, chickBatches };
	} catch (err) {
		console.error('Failed to load warehouse data:', err);
		return {
			inventory: [],
			movements: [],
			products: [],
			suppliers: [],
			farms: [],
			drivers: [],
			trucks: [],
			chickBatches: []
		};
	}
};
