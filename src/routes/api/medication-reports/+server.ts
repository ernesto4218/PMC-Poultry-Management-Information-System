import { MedicationReportService } from '#lib/services/medication-report.service.ts';
import { json } from '@sveltejs/kit';

export const POST = async ({ request, locals }) => {
	const userId = locals.user?.id ?? null; // adjust to your auth
	if (!userId) return json({ message: 'Not signed in.' }, { status: 401 });

	try {
		const body = await request.json();
		return json(await MedicationReportService.save(body, userId));
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Could not save report.';
		return json({ message }, { status: message === 'Farm not found.' ? 404 : 400 });
	}
};
