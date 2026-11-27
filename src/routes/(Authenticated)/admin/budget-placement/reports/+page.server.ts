import { BudgetReportService } from '#lib/services/budget-report.service.ts';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	const reports = await BudgetReportService.list({ limit: 5000, includeVoid: true });
	// console.log('Reports ', reports);

	return {
		reports
	};
};

export const actions = {
	void: async ({ request }) => {
		const form = await request.formData();
		const documentIds = form
			.getAll('documentIds')
			.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

		if (documentIds.length === 0) {
			return fail(400, { message: 'No reports selected.' });
		}

		try {
			const voided = await BudgetReportService.voidReports(documentIds);
			return { success: true, voided, requested: documentIds.length };
		} catch (err) {
			console.error('Bulk void failed', err);
			return fail(500, { message: 'Could not void the reports. Please try again.' });
		}
	}
};
