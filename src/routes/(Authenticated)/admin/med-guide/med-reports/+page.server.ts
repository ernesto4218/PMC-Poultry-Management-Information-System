import { MedicationReportService } from '#lib/services/medication-report.service.ts';

export const load = async ({ url }) => {
	const p = url.searchParams;
	return {
		reports: await MedicationReportService.list({ limit: 5000, includeVoid: true })
	};
};
