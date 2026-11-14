// src/routes/api/chick-batches/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ChickBatchService } from '#lib/services/chick-batches.services.ts';

export const GET: RequestHandler = async () => {
	try {
		return json({ batches: await ChickBatchService.getAllBatches() });
	} catch (err: any) {
		return json({ error: err.message ?? 'Failed to load batches.' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { farmId, dateSet, volume } = await request.json();
		if (!farmId || !dateSet || volume == null) {
			return json({ error: 'Farm, date set, and volume are required.' }, { status: 400 });
		}
		const batch = await ChickBatchService.createBatch(farmId, dateSet, Number(volume));
		return json({ batch });
	} catch (err: any) {
		return json({ error: err.message ?? 'Failed to create batch.' }, { status: 400 });
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const { id, farmId, dateSet, volume } = await request.json();
		if (!id) return json({ error: 'Batch ID is required.' }, { status: 400 });
		if (!farmId || !dateSet || volume == null) {
			return json({ error: 'Farm, date set, and volume are required.' }, { status: 400 });
		}
		const batch = await ChickBatchService.updateBatch(id, farmId, dateSet, Number(volume));
		return json({ batch });
	} catch (err: any) {
		return json({ error: err.message ?? 'Failed to update batch.' }, { status: 400 });
	}
};
