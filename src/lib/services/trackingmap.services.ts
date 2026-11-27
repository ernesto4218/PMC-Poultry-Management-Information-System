import { desc, eq, inArray, notInArray } from 'drizzle-orm';
import { dispatch, dispatchItem, driver, truck } from '#lib/server/db/schema.ts';
import { db } from '../server/db';

// ── types ──────────────────────────────────────────────────────────────────

export type TrackedLoadLine = {
	id: string;
	farmName: string;
	farmCode: string;
	feedName: string;
	loadedQty: number;
};

export type ActiveTrip = {
	id: string;
	tripCode: string;
	status: string;
	plateNumber: string;
	driverName: string;
	driverPhone: string | null;
	totalBags: number;
	truckCapacity: number;
	items: TrackedLoadLine[];
};

// Trips that are not on the road (not started, finished, or cancelled).
const INACTIVE_STATUSES = ['cancelled', 'draft', 'completed', 'delivered'];

// ── public API ─────────────────────────────────────────────────────────────

/**
 * Trips whose trucks are currently on the road, with their driver and load lines.
 * Used to decide which trucks appear on the live tracking map.
 */
export async function listActiveTrips(): Promise<ActiveTrip[]> {
	const rows = await db
		.select({
			id: dispatch.id,
			tripCode: dispatch.tripCode,
			status: dispatch.status,
			totalBags: dispatch.totalBags,
			truckCapacity: dispatch.truckCapacity,
			plateNumber: truck.plateNumber,
			truckCapacityActual: truck.capacity,
			driverName: driver.name,
			driverPhone: driver.phone
		})
		.from(dispatch)
		.leftJoin(truck, eq(dispatch.truckId, truck.id))
		.leftJoin(driver, eq(dispatch.driverId, driver.id))
		//@ts-ignore
		.where(notInArray(dispatch.status, INACTIVE_STATUSES))
		.orderBy(desc(dispatch.dispatchDate), desc(dispatch.tripCode));

	if (rows.length === 0) return [];

	const rawItems = await db
		.select({
			id: dispatchItem.id,
			dispatchId: dispatchItem.dispatchId,
			farmName: dispatchItem.farmName,
			farmCode: dispatchItem.farmCode,
			feedName: dispatchItem.feedName,
			loadedQty: dispatchItem.loadedQty
		})
		.from(dispatchItem)
		.where(
			inArray(
				dispatchItem.dispatchId,
				rows.map((r) => r.id)
			)
		);

	const itemsByTrip = new Map<string, TrackedLoadLine[]>();
	for (const r of rawItems) {
		const list = itemsByTrip.get(r.dispatchId) ?? [];
		list.push({
			id: r.id,
			farmName: r.farmName,
			farmCode: r.farmCode,
			feedName: r.feedName,
			loadedQty: r.loadedQty
		});
		itemsByTrip.set(r.dispatchId, list);
	}

	return rows.map((r) => ({
		id: r.id,
		tripCode: r.tripCode,
		status: r.status,
		plateNumber: r.plateNumber ?? 'Unassigned Truck',
		driverName: r.driverName ?? 'Unassigned Driver',
		driverPhone: r.driverPhone ?? null,
		totalBags: r.totalBags,
		truckCapacity: r.truckCapacity || r.truckCapacityActual || 560,
		items: itemsByTrip.get(r.id) ?? []
	}));
}
