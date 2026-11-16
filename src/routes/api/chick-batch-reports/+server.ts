import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ChickBatchReportService } from '#lib/services/chick-batch-reports.services.ts';

export const POST: RequestHandler = async ({ request, locals }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const payload = body as {
		filters?: unknown;
		snapshot?: { batches?: unknown };
	};

	if (!payload?.filters || !payload?.snapshot?.batches) {
		throw error(400, 'Missing filters or snapshot');
	}

	const result = await ChickBatchReportService.createSnapshot({
		filters: payload.filters as never,
		snapshot: payload.snapshot as never,
		createdBy: (locals as { user?: { id?: string } })?.user?.id
	});

	return json(result);
};
