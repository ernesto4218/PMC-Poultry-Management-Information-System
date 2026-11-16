import { MedicationReportService } from '#lib/services/medication-report.service.ts';
import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
	const report = await MedicationReportService.getByDocumentId(params.documentId);
	if (!report) error(404, 'Report not found');
	return { report }; // render from report.snapshot, not from live farm data
};

export const actions = {
	void: async ({ params }) => {
		await MedicationReportService.voidReport(params.documentId);
	}
};
