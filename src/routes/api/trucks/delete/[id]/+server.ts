import { TruckService } from '#lib/services/trucks.services.ts';
import { json } from '@sveltejs/kit';

export const DELETE = async ({ params }) => {
	try {
		await TruckService.deleteTruck(params.id);
		return json({ ok: true });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to delete truck.' }, { status: 400 });
	}
};
