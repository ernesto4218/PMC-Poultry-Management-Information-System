// src/routes/admin/medicine-tracking/+page.server.ts
import type { PageServerLoad } from './$types';
import { MEDICINE_SCHEDULE } from '#lib/server/medicine-schedule.ts';
import { getCompleted } from '#lib/server/medicine-memory.ts';
import { getMockBatches } from '#lib/server/mock-batches.ts';

export const load: PageServerLoad = async ({ url }) => {
	const batches = getMockBatches();
	const initialBatchId = url.searchParams.get('batch') ?? undefined;

	const progress: Record<string, string[]> = {};
	for (const b of batches) progress[b.id] = getCompleted(b.id);

	return { batches, schedule: MEDICINE_SCHEDULE, progress, initialBatchId };
};
