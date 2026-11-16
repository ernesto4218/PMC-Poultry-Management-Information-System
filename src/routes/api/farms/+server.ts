// Place at: src/routes/api/farms/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FarmService } from '#lib/services/farm.services.ts';
import type { Farm } from '#lib/types/farms.ts';

// GET: Fetch all farms for the table
export const GET: RequestHandler = async () => {
	try {
		const farms = await FarmService.getAllFarms();
		return json(farms);
	} catch (err) {
		return json({ error: 'Failed to retrieve farms.' }, { status: 500 });
	}
};

// POST: Create a new farm
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data: Farm = await request.json();

		if (!data.name?.trim() || !data.code?.trim() || !data.type?.trim() || !data.volume) {
			return json(
				{ error: 'Missing required fields (name, code, type, volume).' },
				{ status: 400 }
			);
		}

		const savedFarm = await FarmService.createFarm(data);
		return json({ success: true, farm: savedFarm }, { status: 201 });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to create farm.' }, { status: 400 });
	}
};

// PUT: Update an existing farm
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const data: Farm = await request.json();

		if (!data.id || !data.name?.trim() || !data.code?.trim() || !data.type?.trim()) {
			return json({ error: 'Missing required farm identification or fields.' }, { status: 400 });
		}

		const updatedFarm = await FarmService.updateFarm(data);
		return json({ success: true, farm: updatedFarm });
	} catch (err: any) {
		return json({ error: err.message || 'Failed to update farm.' }, { status: 400 });
	}
};
