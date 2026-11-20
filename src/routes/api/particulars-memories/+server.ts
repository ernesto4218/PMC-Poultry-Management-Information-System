import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ParticularsMemoryService } from '#lib/services/particulars-memories.services.ts';

function fail(err: unknown) {
	const message = err instanceof Error ? err.message : 'Could not save memory.';
	const status = /required|too long|not found/i.test(message) ? 400 : 500;
	return json({ error: message }, { status });
}

export const GET: RequestHandler = async () => json(await ParticularsMemoryService.listMemories());

export const POST: RequestHandler = async ({ request }) => {
	try {
		return json(await ParticularsMemoryService.createMemory(await request.json()), {
			status: 201
		});
	} catch (err) {
		return fail(err);
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		if (!body?.id) throw new Error('Memory id is required.');
		return json(await ParticularsMemoryService.updateMemory(body));
	} catch (err) {
		return fail(err);
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { id } = (await request.json()) as { id?: string };
		if (!id) throw new Error('Memory id is required.');
		await ParticularsMemoryService.deleteMemory(id);
		return new Response(null, { status: 204 });
	} catch (err) {
		return fail(err);
	}
};
