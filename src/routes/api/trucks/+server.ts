import { TruckService } from '#lib/services/trucks.services.ts';
import { json } from '@sveltejs/kit';

export const POST = async ({ request }) => {
	try {
		const data = await request.json();
		const saved = await TruckService.createTruck(data);
		return json({ truck: saved });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create truck.' }, { status: 400 });
	}
};

export const PUT = async ({ request }) => {
	try {
		const data = await request.json();
		const saved = await TruckService.updateTruck(data);
		return json({ truck: saved });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to update truck.' }, { status: 400 });
	}
};
