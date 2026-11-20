import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ParticularsMemoryService } from '#lib/services/particulars-memories.services.ts';

function fail(err: unknown) {
	const message = err instanceof Error ? err.message : 'Could not save memory item.';
	const status = /required|too long|not found/i.test(message) ? 400 : 500;
	return json({ error: message }, { status });
}

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		return json(await ParticularsMemoryService.addItem(params.id, body), { status: 201 });
	} catch (err) {
		return fail(err);
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		if (!body?.id) throw new Error('Item id is required.');
		return json(await ParticularsMemoryService.updateItem(params.id, body));
	} catch (err) {
		return fail(err);
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = (await request.json()) as { id?: string };
		if (!id) throw new Error('Item id is required.');
		await ParticularsMemoryService.deleteItem(params.id, id);
		return new Response(null, { status: 204 });
	} catch (err) {
		return fail(err);
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = (await request.json()) as { ids?: string[] };
		if (!Array.isArray(body.ids)) throw new Error('Reorder requires an ids array.');
		await ParticularsMemoryService.reorderItems(params.id, body.ids);
		return json({ ok: true });
	} catch (err) {
		return fail(err);
	}
};
