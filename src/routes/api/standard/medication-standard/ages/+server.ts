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
	try {
		const standardId = url.searchParams.get('standardId');
		if (!standardId) throw new Error('standardId is required.');
		return json(await StandardMedicationService.getAges(standardId));
	} catch (err) {
		return fail(err);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		return json(await StandardMedicationService.setAge(body));
	} catch (err) {
		return fail(err);
	}
};
