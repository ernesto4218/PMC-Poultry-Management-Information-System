import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ParticularsMemoryService } from '#lib/services/particulars-memories.services.ts';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = (await request.json().catch(() => ({}))) as {
			name?: string;
			notes?: string;
		};
		const memory = await ParticularsMemoryService.duplicateMemory(params.id, {
			name: body.name,
			notes: body.notes
		});
		return json(memory, { status: 201 });
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : 'Failed to duplicate memory.');
	}
};
