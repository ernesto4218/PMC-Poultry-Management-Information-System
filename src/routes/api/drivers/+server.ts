import { DriverService } from '#lib/services/drivers.services.ts';
import { json } from '@sveltejs/kit';

export const POST = async ({ request }) => {
	try {
		const data = await request.json();
		const saved = await DriverService.createDriver(data);
		return json({ driver: saved });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create driver.' }, { status: 400 });
	}
};

export const PUT = async ({ request }) => {
	try {
		const data = await request.json();
		const saved = await DriverService.updateDriver(data);
		return json({ driver: saved });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to update driver.' }, { status: 400 });
	}
};
