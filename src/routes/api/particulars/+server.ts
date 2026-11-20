import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ParticularsService } from '#lib/services/particulars.services.ts';

function fail(err: unknown) {
	const message = err instanceof Error ? err.message : 'Could not save particular.';
	const status = /already exists|required|too long|not found/i.test(message)
		? 400
		: /foreign key|constraint|used in a memory/i.test(message)
			? 409
			: 500;
	return json({ error: message }, { status });
}

export const GET: RequestHandler = async () => json(await ParticularsService.getAll());

export const POST: RequestHandler = async ({ request }) => {
	try {
		return json(await ParticularsService.create(await request.json()), { status: 201 });
	} catch (err) {
		return fail(err);
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		if (!body?.id) throw new Error('Particular id is required.');
		return json(await ParticularsService.update(body));
	} catch (err) {
		return fail(err);
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { id } = (await request.json()) as { id?: string };
		if (!id) throw new Error('Particular id is required.');
		await ParticularsService.delete(id);
		return new Response(null, { status: 204 });
	} catch (err) {
		return fail(err);
	}
};
