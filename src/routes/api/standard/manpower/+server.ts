import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StandardManpowerService } from '#lib/services/standardsmanpower.services.ts';

function fail(err: unknown) {
	const message = err instanceof Error ? err.message : 'Could not save the item.';
	const status = /already (exists|uses)/i.test(message)
		? 409
		: /required|must be|not found|cannot edit|unknown action/i.test(message)
			? 400
			: 500;
	return json({ error: message }, { status });
}

export const GET: RequestHandler = async ({ url }) => {
	const includeArchived = url.searchParams.get('archived') === '1';
	return json(await StandardManpowerService.getAll({ includeArchived }));
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		return json(await StandardManpowerService.create(body), { status: 201 });
	} catch (err) {
		return fail(err);
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		return json(await StandardManpowerService.update(body));
	} catch (err) {
		return fail(err);
	}
};

export const PATCH: RequestHandler = async ({ request }) => {
	try {
		const { id, action } = (await request.json()) as { id?: string; action?: string };
		if (!id) throw new Error('Item id is required.');
		if (action === 'archive') return json(await StandardManpowerService.archive(id));
		if (action === 'restore') return json(await StandardManpowerService.restore(id));
		throw new Error('Unknown action.');
	} catch (err) {
		return fail(err);
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { id } = await request.json();
		await StandardManpowerService.delete(id);
		return new Response(null, { status: 204 });
	} catch (err) {
		return fail(err);
	}
};
