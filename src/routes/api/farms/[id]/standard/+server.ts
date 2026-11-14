import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StandardMedicationService } from '#lib/services/standardsmedication.services.ts';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { standardMedicationId } = (await request.json()) as {
			standardMedicationId?: string | null;
		};
		const result = await StandardMedicationService.setFarmStandard(
			params.id,
			standardMedicationId ?? null
		);
		return json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Could not link standard.';
		const status = /not found|cannot link/i.test(message) ? 400 : 500;
		return json({ error: message }, { status });
	}
};
