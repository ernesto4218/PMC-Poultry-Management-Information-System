import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { ChickBatchReportService } from '#lib/services/chick-batch-reports.services.ts';

export const load: PageServerLoad = async ({ params }) => {
	const row = await ChickBatchReportService.getByDocumentId(params.documentId);
	if (!row) throw error(404, 'Report not found');

	// Bump the reprint counter whenever the page is opened (fire & forget)
	void ChickBatchReportService.incrementReprint(params.documentId).catch(() => {});

	return {
		report: {
			documentId: row.documentId,
			createdAt:
				row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
			snapshot: row.snapshot,
			status: row.voidedAt ? ('void' as const) : ('active' as const),
			voidedAt: row.voidedAt
				? row.voidedAt instanceof Date
					? row.voidedAt.toISOString()
					: String(row.voidedAt)
				: null
		}
	};
};

export const actions: Actions = {
	void: async ({ params }) => {
		const row = await ChickBatchReportService.getByDocumentId(params.documentId);
		if (!row) throw error(404, 'Report not found');
		if (!row.voidedAt) {
			await ChickBatchReportService.voidSnapshot(params.documentId);
		}
		return { success: true };
	}
};
