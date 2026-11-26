import { BudgetReportService } from '#lib/services/budget-report.service.ts';

export const load = async () => {
	const reports = await BudgetReportService.list({ limit: 5000, includeVoid: true });
	// console.log('Reports ', reports);

	return {
		reports
	};
};
