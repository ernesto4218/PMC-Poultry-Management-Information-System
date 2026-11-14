import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StandardMedicationService } from '#lib/services/standardsmedication.services.ts';

function fail(err: unknown) {
	const message = err instanceof Error ? err.message : 'Could not save.';
	const status = /required|must be|not found|cannot edit|At most|not a valid/i.test(message)
		? 400
		: 500;
	return json({ error: message }, { status });
}

export const GET: RequestHandler = async ({ url }) => {
	const includeArchived = url.searchParams.get('archived') === '1';
	return json(await StandardMedicationService.list({ includeArchived }));
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		return json(await StandardMedicationService.create(body), { status: 201 });
	} catch (err) {
		return fail(err);
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		return json(await StandardMedicationService.update(body));
	} catch (err) {
		return fail(err);
	}
};

export const PATCH: RequestHandler = async ({ request }) => {
	try {
		const { id, action } = (await request.json()) as { id?: string; action?: string };
		if (!id) throw new Error('Standard id is required.');
		if (action === 'archive') return json(await StandardMedicationService.archive(id));
		if (action === 'restore') return json(await StandardMedicationService.restore(id));
		throw new Error('Unknown action.');
	} catch (err) {
		return fail(err);
	}
};
