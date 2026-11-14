import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StandardAreaService } from '#lib/services/standardsarea.services.ts';

function fail(err: unknown) {
	const message = err instanceof Error ? err.message : 'Could not save the area.';
	const status = /already exists/i.test(message)
		? 409
		: /required|must be|not found/i.test(message)
			? 400
			: 500;
	return json({ error: message }, { status });
}

export const GET: RequestHandler = async () => {
	return json(await StandardAreaService.getAll());
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		return json(await StandardAreaService.create(body), { status: 201 });
	} catch (err) {
		return fail(err);
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		return json(await StandardAreaService.update(body));
	} catch (err) {
		return fail(err);
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { id } = (await request.json()) as { id?: string };
		if (!id) throw new Error('Area id is required.');
		await StandardAreaService.delete(id);
		return new Response(null, { status: 204 });
	} catch (err) {
		return fail(err);
	}
};
