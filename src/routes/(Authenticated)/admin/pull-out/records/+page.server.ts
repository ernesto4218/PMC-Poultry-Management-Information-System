import { BudgetReportService } from '#lib/services/budget-report.service.ts';
import {
	createDispatch,
	getDispatchedQuantities,
	getWarehouseStockByName,
	listActiveDrivers,
	listActiveTrucks
} from '#lib/services/dispatch.service.ts';
import { FeedStockService } from '#lib/services/feed-stock.services.ts';
import { fail } from '@sveltejs/kit';
import { buildPullouts } from './build-pullouts.ts';
import { FeedSupplierService } from '#lib/services/feedSuppliers.services.ts';

export type { PullOutRow } from './types.ts';

export const load = async () => {
	const [reports, dispatched, stockByName, trucks, drivers, suppliers, supplierStocks] =
		await Promise.all([
			BudgetReportService.list({ limit: 5000, includeVoid: false }),
			getDispatchedQuantities(),
			getWarehouseStockByName(),
			listActiveTrucks(),
			listActiveDrivers(),
			FeedStockService.getSuppliersLookup(),
			FeedSupplierService.getSuppliersWithProductStocks()
		]);

	const documents = await BudgetReportService.getManyByDocumentIds(
		reports.map((r) => r.documentId)
	);

	return {
		pullouts: buildPullouts(reports, documents, dispatched, stockByName),
		trucks,
		drivers,
		suppliers,
		supplierStocks
	};
};

export const actions = {
	dispatch: async ({ request, locals }) => {
		const raw = (await request.formData()).get('payload');
		if (typeof raw !== 'string') return fail(400, { error: 'Missing payload' });

		let body: any;
		try {
			body = JSON.parse(raw);
		} catch {
			return fail(400, { error: 'Malformed payload' });
		}

		const items = Array.isArray(body.items) ? body.items : [];
		if (items.length === 0) return fail(400, { error: 'No items to dispatch' });

		const missingStock = items.filter((i: any) => Number(i.loadedQty) > 0 && !i.supplierProductId);
		if (missingStock.length > 0) {
			return fail(400, {
				error: `Select stock to deduct for: ${missingStock.map((i: any) => i.feedName).join(', ')}`
			});
		}

		try {
			const result = await createDispatch({
				truckId: String(body.truckId ?? ''),
				driverId: String(body.driverId ?? ''),
				dispatchDate: String(body.dispatchDate ?? ''),
				notes: String(body.notes ?? ''),
				items
			});
			// @ts-ignore – optional session user
			return { success: true, ...result, createdBy: locals?.user?.id ?? null };
		} catch (err) {
			return fail(400, { error: (err as Error).message });
		}
	}
};
