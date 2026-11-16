import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ChickBatchReportService } from '#lib/services/chick-batch-reports.services.ts';

export const GET: RequestHandler = async ({ params }) => {
	const row = await ChickBatchReportService.getByDocumentId(params.documentId);
	if (!row) throw error(404, 'Report not found');
	return json(row);
};
