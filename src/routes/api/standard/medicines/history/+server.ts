import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StandardMedicineService } from '#lib/services/standardsmedicine.services.ts';

export const GET: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id');
	if (!id) return json({ error: 'Item id is required.' }, { status: 400 });
	try {
		return json(await StandardMedicineService.getHistory(id));
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Could not load history.';
		return json({ error: message }, { status: 500 });
	}
};
