// src/routes/api/chick-batches/delete/[id]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ChickBatchService } from '#lib/services/chick-batches.services.ts';

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		await ChickBatchService.deleteBatch(params.id);
		return json({ success: true });
	} catch (err: any) {
		return json({ error: err.message ?? 'Failed to delete batch.' }, { status: 400 });
	}
};
