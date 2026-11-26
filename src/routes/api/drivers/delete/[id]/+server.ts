import { DriverService } from '#lib/services/drivers.services.ts';
import { json } from '@sveltejs/kit';

export const DELETE = async ({ params }) => {
	try {
		await DriverService.deleteDriver(params.id);
		return json({ ok: true });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to delete driver.' }, { status: 400 });
	}
};
