// src/routes/api/medicine-tracking/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { toggleEntry, resetBatch } from '#lib/server/medicine-memory.ts';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { batchId, entryId } = await request.json();
		if (!batchId || !entryId) {
			return json({ error: 'batchId and entryId are required.' }, { status: 400 });
		}
		const completed = toggleEntry(batchId, entryId);
		return json({ completed });
	} catch (err: any) {
		return json({ error: err.message ?? 'Failed to update tracking.' }, { status: 400 });
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { batchId } = await request.json();
		if (!batchId) {
			return json({ error: 'batchId is required.' }, { status: 400 });
		}
		resetBatch(batchId);
		return json({ completed: [] });
	} catch (err: any) {
		return json({ error: err.message ?? 'Failed to reset batch.' }, { status: 400 });
	}
};
