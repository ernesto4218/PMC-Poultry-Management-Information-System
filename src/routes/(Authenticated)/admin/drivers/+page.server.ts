import { DriverService } from '#lib/services/drivers.services.ts';
import { TruckService } from '#lib/services/trucks.services.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const [drivers, trucks] = await Promise.all([
			DriverService.getAllDrivers(),
			TruckService.getAllTrucks()
		]);
		return { drivers, trucks };
	} catch (err) {
		console.error('Failed to load drivers:', err);
		return { drivers: [], trucks: [] };
	}
};
