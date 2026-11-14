import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StandardCostService } from '#lib/services/standardscost.services.ts';

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
	return json(await StandardCostService.getAll({ includeArchived }));
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		return json(await StandardCostService.create(body), { status: 201 });
	} catch (err) {
		return fail(err);
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		return json(await StandardCostService.update(body));
	} catch (err) {
		return fail(err);
	}
};

export const PATCH: RequestHandler = async ({ request }) => {
	try {
		const { id, action } = (await request.json()) as { id?: string; action?: string };
		if (!id) throw new Error('Item id is required.');
		if (action === 'archive') return json(await StandardCostService.archive(id));
		if (action === 'restore') return json(await StandardCostService.restore(id));
		throw new Error('Unknown action.');
	} catch (err) {
		return fail(err);
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { id } = await request.json();
		await StandardCostService.delete(id);
		return new Response(null, { status: 204 });
	} catch (err) {
		return fail(err);
	}
};
