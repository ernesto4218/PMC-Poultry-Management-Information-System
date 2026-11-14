import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StandardAgeMedicineService } from '#lib/services/standardsagemedicine.services.ts';

function fail(err: unknown) {
	const message = err instanceof Error ? err.message : 'Could not save the entry.';
	const status = /must be|not a valid|required|not found|At most/i.test(message) ? 400 : 500;
	return json({ error: message }, { status });
}

export const GET: RequestHandler = async () => {
	try {
		return json(await StandardAgeMedicineService.getAll());
	} catch (err) {
		return fail(err);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		return json(await StandardAgeMedicineService.set(body));
	} catch (err) {
		return fail(err);
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { id } = (await request.json()) as { id?: string };
		if (!id) throw new Error('Entry id is required.');
		await StandardAgeMedicineService.delete(id);
		return new Response(null, { status: 204 });
	} catch (err) {
		return fail(err);
	}
};
