import { DriverService } from '#lib/services/drivers.services.ts';
import { TruckService } from '#lib/services/trucks.services.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const [trucks, drivers] = await Promise.all([
			TruckService.getAllTrucks(),
			DriverService.getAllDrivers()
		]);
		return { trucks, drivers };
	} catch (err) {
		console.error('Failed to load trucks:', err);
		return { trucks: [], drivers: [] };
	}
};
