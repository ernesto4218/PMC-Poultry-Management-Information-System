import type { PageServerLoad } from './$types';
import { getStandardsSummary } from '#lib/server/standards-summary.ts';

export const load: PageServerLoad = async () => {
	return {
		summaries: await getStandardsSummary()
	};
};
