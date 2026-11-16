import { ChickBatchReportService } from '#lib/services/chick-batch-reports.services.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Load every snapshot; filtering/sorting/pagination is client-side
	// (same pattern as the medication reports page).
	const { rows } = await ChickBatchReportService.list({ limit: 1000 });

	const reports = rows.map((r) => {
		// Per-farm aggregation extracted from the snapshot's batches
		const farmMap = new Map<string, { id: string; name: string; code: string; count: number }>();
		for (const b of r.snapshot.batches) {
			const cur = farmMap.get(b.farmId) ?? {
				id: b.farmId,
				name: b.farmName,
				code: b.farmCode,
				count: 0
			};
			cur.count++;
			farmMap.set(b.farmId, cur);
		}

		return {
			id: r.id,
			documentId: r.documentId,
			status: r.voidedAt ? ('void' as const) : ('active' as const),
			createdBy: r.createdBy ?? null,
			createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
			reprintCount: r.reprintCount,
			farmLabel: r.snapshot.farmLabel,
			totals: r.snapshot.totals,
			dateRange: r.snapshot.dateRange,
			farms: [...farmMap.values()],
			// Lowercased haystack for fast client-side search (doc ID, farm names, Chick In No.s)
			searchText: [
				r.documentId,
				r.snapshot.farmLabel,
				...r.snapshot.batches.map((b) => b.batchNumber),
				...r.snapshot.batches.map((b) => b.farmCode),
				...r.snapshot.batches.map((b) => b.farmName)
			]
				.join(' ')
				.toLowerCase()
		};
	});

	return { reports };
};
