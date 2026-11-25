import { json } from '@sveltejs/kit';
import { BudgetReportService } from '#lib/services/budget-report.service.ts';

// Mirror whatever auth check your /api/medication-reports endpoint does.
export const POST = async ({ request, locals }) => {
	const input = await request.json().catch(() => null);
	if (!input) return json({ message: 'Invalid request body.' }, { status: 400 });

	try {
		const result = await BudgetReportService.save(input, (locals as any).user?.id ?? null);
		return json(result);
	} catch (e) {
		return json({ message: e instanceof Error ? e.message : 'Save failed.' }, { status: 400 });
	}
};
