import { BudgetReportService } from '#lib/services/budget-report.service.ts';

export const load = async () => {
	return {
		reports: await BudgetReportService.list({ limit: 5000, includeVoid: true })
	};
};
