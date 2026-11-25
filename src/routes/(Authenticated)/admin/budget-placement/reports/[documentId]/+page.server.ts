import { BudgetReportService } from '#lib/services/budget-report.service.ts';
import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
	const report = await BudgetReportService.getByDocumentId(params.documentId);
	if (!report) error(404, 'Report not found');
	return { report }; // render from report.snapshot, not from live farm data
};

export const actions = {
	void: async ({ params }) => {
		await BudgetReportService.voidReport(params.documentId);
	}
};
