import { desc, eq, inArray, ne } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	dispatch,
	dispatchItem,
	driver,
	feedProduct,
	feedSupplier,
	truck
} from '#lib/server/db/schema.ts';

export type TrackedLoadItem = {
	id: string;
	dispatchId: string;
	documentId: string;
	rowIndex: number;
	farmId: string | null;
	farmCode: string;
	farmName: string;
	batchNumber: string;
	feedName: string;
	feedProductId: string | null;
	productName: string | null;
	supplierName: string | null;
	scheduledQty: number;
	loadedQty: number;
};

export type TrackedDispatch = {
	id: string;
	tripCode: string;
	dispatchDate: string;
	status: string;
	totalBags: number;
	truckCapacity: number;
	notes: string;
	truckId: string;
	plateNumber: string;
	truckCapacityActual: number;
	driverId: string;
	driverName: string;
	driverPhone: string | null;
	items: TrackedLoadItem[];
};

export const load = async () => {
	const dispatches = await db
		.select({
			id: dispatch.id,
			tripCode: dispatch.tripCode,
			dispatchDate: dispatch.dispatchDate,
			status: dispatch.status,
			totalBags: dispatch.totalBags,
			truckCapacity: dispatch.truckCapacity,
			notes: dispatch.notes,
			truckId: dispatch.truckId,
			plateNumber: truck.plateNumber,
			truckCapacityActual: truck.capacity,
			driverId: dispatch.driverId,
			driverName: driver.name,
			driverPhone: driver.phone
		})
		.from(dispatch)
		.leftJoin(truck, eq(dispatch.truckId, truck.id))
		.leftJoin(driver, eq(dispatch.driverId, driver.id))
		.where(ne(dispatch.status, 'cancelled'))
		.orderBy(desc(dispatch.dispatchDate), desc(dispatch.tripCode));

	const dispatchIds = dispatches.map((d) => d.id);

	const rawItems =
		dispatchIds.length > 0
			? await db
					.select({
						id: dispatchItem.id,
						dispatchId: dispatchItem.dispatchId,
						documentId: dispatchItem.documentId,
						rowIndex: dispatchItem.rowIndex,
						farmId: dispatchItem.farmId,
						farmCode: dispatchItem.farmCode,
						farmName: dispatchItem.farmName,
						batchNumber: dispatchItem.batchNumber,
						feedName: dispatchItem.feedName,
						feedProductId: dispatchItem.feedProductId,
						productName: feedProduct.name,
						feedType: feedProduct.feedType,
						stage: feedProduct.stage,
						supplierName: feedSupplier.name,
						scheduledQty: dispatchItem.scheduledQty,
						loadedQty: dispatchItem.loadedQty
					})
					.from(dispatchItem)
					.leftJoin(feedProduct, eq(dispatchItem.feedProductId, feedProduct.id))
					.leftJoin(feedSupplier, eq(feedProduct.supplierId, feedSupplier.id))
					.where(inArray(dispatchItem.dispatchId, dispatchIds))
			: [];

	const itemsByDispatch = new Map<string, TrackedLoadItem[]>();
	for (const row of rawItems) {
		const fallbackProduct =
			row.productName || [row.feedType, row.stage].filter(Boolean).join(' ') || null;
		const list = itemsByDispatch.get(row.dispatchId) ?? [];
		list.push({
			id: row.id,
			dispatchId: row.dispatchId,
			documentId: row.documentId,
			rowIndex: row.rowIndex,
			farmId: row.farmId,
			farmCode: row.farmCode,
			farmName: row.farmName,
			batchNumber: row.batchNumber,
			feedName: row.feedName,
			feedProductId: row.feedProductId,
			productName: fallbackProduct,
			supplierName: row.supplierName,
			scheduledQty: row.scheduledQty,
			loadedQty: row.loadedQty
		});
		itemsByDispatch.set(row.dispatchId, list);
	}

	const trips: TrackedDispatch[] = dispatches.map((d) => ({
		id: d.id,
		tripCode: d.tripCode,
		dispatchDate: d.dispatchDate,
		status: d.status,
		totalBags: d.totalBags,
		truckCapacity: d.truckCapacity || d.truckCapacityActual || 560,
		notes: d.notes ?? '',
		truckId: d.truckId,
		plateNumber: d.plateNumber ?? 'Unassigned Truck',
		truckCapacityActual: d.truckCapacityActual ?? 560,
		driverId: d.driverId,
		driverName: d.driverName ?? 'Unassigned Driver',
		driverPhone: d.driverPhone ?? null,
		items: itemsByDispatch.get(d.id) ?? []
	}));

	return { trips };
};
