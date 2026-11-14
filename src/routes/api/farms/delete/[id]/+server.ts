// Place at: src/routes/api/farms/[id]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FarmService } from '#lib/services/farm.services.ts';

// DELETE: Remove a farm by ID
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		if (!id) {
			return json({ error: 'Farm ID is required.' }, { status: 400 });
		}

		await FarmService.deleteFarm(id);

		return json({ success: true });
	} catch (err: any) {
		const status = err.message === 'Farm not found.' ? 404 : 500;
		return json({ error: err.message || 'Failed to delete farm.' }, { status });
	}
};
