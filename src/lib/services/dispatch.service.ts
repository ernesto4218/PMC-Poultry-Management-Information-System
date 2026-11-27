import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import {
	dispatch,
	dispatchItem,
	driver,
	feed_stock,
	feed_stock_movement,
	feedProduct,
	truck
} from '#lib/server/db/schema.ts';
import { normalizeFeedName, matchFeedKey } from '#lib/feed-match.ts';
import { db } from '../server/db';

// ── types ──────────────────────────────────────────────────────────────────

export type DispatchedMap = Map<string, number>; // key = `${documentId}::${rowIndex}`
export type CreateDispatchItem = {
	documentId: string;
	rowIndex: number;
	farmId: string | null;
	farmCode: string;
	farmName: string;
	batchNumber: string;
	feedName: string;
	scheduledQty: number;
	loadedQty: number;
	supplierId?: string | null;
	supplierProductId?: string | null;
};

export type CreateDispatchInput = {
	truckId: string;
	driverId: string;
	dispatchDate: string; // YYYY-MM-DD
	notes?: string;
	status?: 'draft' | 'dispatched';
	items: CreateDispatchItem[];
};

// ── helpers ────────────────────────────────────────────────────────────────

const keyOf = (documentId: string, rowIndex: number) => `${documentId}::${rowIndex}`;

async function generateTripCode(): Promise<string> {
	const now = new Date();
	const yy = String(now.getFullYear()).slice(2);
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	const prefix = `T${yy}${mm}${dd}`;

	for (let attempt = 0; attempt < 8; attempt++) {
		const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
		const code = `${prefix}-${suffix}`;
		const [hit] = await db
			.select({ id: dispatch.id })
			.from(dispatch)
			.where(eq(dispatch.tripCode, code))
			.limit(1);
		if (!hit) return code;
	}
	throw new Error('Could not allocate a unique trip code');
}

// ── public API ─────────────────────────────────────────────────────────────

/** Sum of loaded bags per (documentId::rowIndex), excluding cancelled trips. */
export async function getDispatchedQuantities(): Promise<DispatchedMap> {
	const rows = await db
		.select({
			documentId: dispatchItem.documentId,
			rowIndex: dispatchItem.rowIndex,
			loadedQty: dispatchItem.loadedQty
		})
		.from(dispatchItem)
		.innerJoin(dispatch, eq(dispatch.id, dispatchItem.dispatchId))
		.where(ne(dispatch.status, 'cancelled'));

	const map: DispatchedMap = new Map();
	for (const r of rows) {
		const k = keyOf(r.documentId, r.rowIndex);
		map.set(k, (map.get(k) ?? 0) + r.loadedQty);
	}
	return map;
}

/**
 * Warehouse stock keyed by NORMALIZED product name ("starter", "booster", "grower").
 * Products that normalize to the same name pool together.
 */
export async function getWarehouseStockByName(): Promise<Map<string, number>> {
	const rows = await db
		.select({ name: feedProduct.name, onHand: feed_stock.onHand })
		.from(feed_stock)
		.innerJoin(feedProduct, eq(feedProduct.id, feed_stock.feedProductId))
		.where(eq(feedProduct.active, 1)); // same set the Warehouse page shows

	const map = new Map<string, number>();
	for (const r of rows) {
		const k = normalizeFeedName(r.name);
		if (k) map.set(k, (map.get(k) ?? 0) + r.onHand);
	}
	return map;
}

export async function listActiveTrucks() {
	return db
		.select({
			id: truck.id,
			plateNumber: truck.plateNumber,
			capacity: truck.capacity,
			driverId: truck.driverId
		})
		.from(truck)
		.where(eq(truck.status, 'Active'))
		.orderBy(asc(truck.plateNumber));
}

export async function listActiveDrivers() {
	return db
		.select({ id: driver.id, name: driver.name, phone: driver.phone })
		.from(driver)
		.where(eq(driver.status, 'Active'))
		.orderBy(asc(driver.name));
}

type PoolEntry = { productId: string; name: string; onHand: number };

/**
 * Transactionally create a dispatch (and items), link each item to the warehouse
 * ("Starter 1" → Starter), deduct stock (rejecting if it would go below zero), and
 * log `to-farm` movements. Everything commits or nothing does.
 */
export async function createDispatch(input: CreateDispatchInput) {
	if (!input.items?.length) throw new Error('No items selected for dispatch');
	if (!input.truckId) throw new Error('Truck is required');
	if (!input.driverId) throw new Error('Driver is required');
	if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dispatchDate)) throw new Error('Invalid dispatch date');
	if (input.items.some((i) => !Number.isInteger(i.loadedQty) || i.loadedQty <= 0)) {
		throw new Error('Every loaded quantity must be a whole number greater than zero');
	}

	const [truckRow] = await db.select().from(truck).where(eq(truck.id, input.truckId)).limit(1);
	if (!truckRow) throw new Error('Truck not found');

	const capacity = truckRow.capacity > 0 ? truckRow.capacity : 560;
	const tripCode = await generateTripCode();
	const dispatchId = randomUUID();
	const totalBags = input.items.reduce((s, i) => s + i.loadedQty, 0);
	const isDraft = input.status === 'draft';

	// ── Resolve each item to a warehouse product (explicit selection first) ──
	const products = await db
		.select({
			id: feedProduct.id,
			name: feedProduct.name,
			feedType: feedProduct.feedType,
			stage: feedProduct.stage
		})
		.from(feedProduct)
		.where(eq(feedProduct.active, 1));

	const productById = new Map(products.map((p) => [p.id, p]));
	const groups = new Map<string, string[]>(); // normalized name → product ids
	for (const p of products) {
		const k =
			normalizeFeedName(p.name) || normalizeFeedName(`${p.feedType ?? ''} ${p.stage ?? ''}`);
		if (k) groups.set(k, [...(groups.get(k) ?? []), p.id]);
	}
	const groupKeys = [...groups.keys()];

	type ResolvedItem = {
		item: CreateDispatchItem;
		explicitProductId: string | null;
		fallbackKey: string | null;
	};

	const resolved: ResolvedItem[] = input.items.map((item) => {
		if (item.supplierProductId && productById.has(item.supplierProductId)) {
			return { item, explicitProductId: item.supplierProductId, fallbackKey: null };
		}
		return {
			item,
			explicitProductId: null,
			fallbackKey: matchFeedKey(item.feedName, groupKeys)
		};
	});

	const unmatched = [
		...new Set(
			resolved.filter((r) => !r.explicitProductId && !r.fallbackKey).map((r) => r.item.feedName)
		)
	];
	if (unmatched.length) {
		throw new Error(
			`No stock product selected or matching warehouse product for: ${unmatched.join(', ')}.`
		);
	}

	const candidateIds = [
		...new Set(
			resolved.flatMap((r) =>
				r.explicitProductId ? [r.explicitProductId] : (groups.get(r.fallbackKey!) ?? [])
			)
		)
	];

	return await db.transaction(async (tx) => {
		// ── 1. Re-check dispatched totals inside the transaction ───────────
		const existing = await tx
			.select({
				documentId: dispatchItem.documentId,
				rowIndex: dispatchItem.rowIndex,
				loadedQty: dispatchItem.loadedQty
			})
			.from(dispatchItem)
			.innerJoin(dispatch, eq(dispatch.id, dispatchItem.dispatchId))
			.where(ne(dispatch.status, 'cancelled'));

		const dispatched: DispatchedMap = new Map();
		for (const r of existing) {
			const k = keyOf(r.documentId, r.rowIndex);
			dispatched.set(k, (dispatched.get(k) ?? 0) + r.loadedQty);
		}

		// ── 2. Validate loaded <= scheduled minus already-dispatched ────────
		const inThisTrip = new Map<string, number>();
		for (const item of input.items) {
			const k = keyOf(item.documentId, item.rowIndex);
			const already = dispatched.get(k) ?? 0;
			const total = (inThisTrip.get(k) ?? 0) + item.loadedQty;
			inThisTrip.set(k, total);
			if (already + total > item.scheduledQty) {
				throw new Error(
					`Over-dispatch on ${item.documentId} row ${item.rowIndex}: ` +
						`loading ${total} with ${already} already dispatched ` +
						`of ${item.scheduledQty} scheduled.`
				);
			}
		}

		// ── 3. Allocate stock from the warehouse (rows locked for this trip) ─
		const stockRows = await tx
			.select({
				productId: feed_stock.feedProductId,
				name: feedProduct.name,
				onHand: feed_stock.onHand
			})
			.from(feed_stock)
			.innerJoin(feedProduct, eq(feedProduct.id, feed_stock.feedProductId))
			.where(inArray(feed_stock.feedProductId, candidateIds))
			.for('update');

		const stockByProductId = new Map(stockRows.map((r) => [r.productId, r]));
		const pools = new Map<string, PoolEntry[]>();
		for (const r of stockRows) {
			const k = normalizeFeedName(r.name);
			pools.set(k, [
				...(pools.get(k) ?? []),
				{ productId: r.productId, name: r.name, onHand: r.onHand }
			]);
		}
		for (const list of pools.values()) list.sort((a, b) => b.onHand - a.onHand); // biggest stock first

		type Alloc = { productId: string; qty: number };
		const allocs: Alloc[][] = [];
		const deducted = new Map<string, { qty: number; name: string }>();

		for (const { item, explicitProductId, fallbackKey } of resolved) {
			if (explicitProductId) {
				const chosen = stockByProductId.get(explicitProductId);
				const prod = productById.get(explicitProductId);
				const available = chosen?.onHand ?? 0;
				const label =
					prod?.name || `${prod?.feedType ?? ''} ${prod?.stage ?? ''}`.trim() || item.feedName;

				if (!isDraft && available < item.loadedQty) {
					throw new Error(
						available <= 0
							? `No stock available for ${label} (${item.feedName}).`
							: `Not enough stock for ${label} (${item.feedName}): ${available} on hand, ${item.loadedQty} requested.`
					);
				}

				const list: Alloc[] = [];
				if (!isDraft && item.loadedQty > 0) {
					if (chosen) chosen.onHand -= item.loadedQty;
					list.push({ productId: explicitProductId, qty: item.loadedQty });
					const cur = deducted.get(explicitProductId) ?? { qty: 0, name: label };
					cur.qty += item.loadedQty;
					deducted.set(explicitProductId, cur);
				}
				allocs.push(list);
				continue;
			}

			const pool = pools.get(fallbackKey!) ?? [];
			const available = pool.reduce((s, p) => s + p.onHand, 0);

			if (!isDraft && available < item.loadedQty) {
				throw new Error(
					available <= 0
						? `No warehouse stock for ${item.feedName}.`
						: `Not enough ${item.feedName} in the warehouse: ${available} left, ${item.loadedQty} requested.`
				);
			}

			const list: Alloc[] = [];
			if (!isDraft) {
				let left = item.loadedQty;
				for (const p of pool) {
					if (left <= 0) break;
					const take = Math.min(left, p.onHand);
					if (take <= 0) continue;
					p.onHand -= take;
					left -= take;
					list.push({ productId: p.productId, qty: take });
					const cur = deducted.get(p.productId) ?? { qty: 0, name: p.name };
					cur.qty += take;
					deducted.set(p.productId, cur);
				}
			}
			allocs.push(list);
		}

		// ── 4. Insert dispatch header ──────────────────────────────────────
		//@ts-ignore
		await tx.insert(dispatch).values({
			id: dispatchId,
			tripCode,
			truckId: input.truckId,
			driverId: input.driverId,
			dispatchDate: input.dispatchDate,
			truckCapacity: capacity,
			totalBags,
			notes: (input.notes ?? '').slice(0, 500),
			status: input.status ?? 'dispatched'
		});

		// ── 5. Insert items (feedName stays as budgeted, e.g. "Starter 1") ──
		const itemValues = resolved.map(({ item: i, explicitProductId, fallbackKey }, idx) => ({
			id: randomUUID(),
			dispatchId,
			documentId: i.documentId,
			rowIndex: i.rowIndex,
			farmId: i.farmId || null, // '' would violate the farm FK
			farmCode: i.farmCode ?? '',
			farmName: i.farmName ?? '',
			batchNumber: i.batchNumber ?? '',
			feedName: i.feedName ?? '',
			feedProductId: allocs[idx][0]?.productId ?? explicitProductId ?? groups.get(fallbackKey!)![0],
			scheduledQty: i.scheduledQty,
			loadedQty: i.loadedQty
		}));
		await tx.insert(dispatchItem).values(itemValues);

		if (isDraft) return { dispatchId, tripCode, totalBags, capacity };

		// ── 6. Deduct stock — guarded UPDATE, race-safe ────────────────────
		for (const [productId, { qty, name }] of deducted) {
			const [res] = await tx
				.update(feed_stock)
				.set({ onHand: sql`${feed_stock.onHand} - ${qty}` })
				.where(and(eq(feed_stock.feedProductId, productId), sql`${feed_stock.onHand} >= ${qty}`));
			const affected = (res as any)?.affectedRows ?? (res as any)?.rowsAffected ?? 0;
			if (affected === 0) throw new Error(`Not enough ${name} in the warehouse.`);
		}

		// ── 7. Ledger: one to-farm movement per allocation ──────────────────
		const movements = itemValues.flatMap((i, idx) =>
			allocs[idx].map((a) => ({
				id: randomUUID(),
				movementType: 'to-farm',
				direction: 'out',
				feedProductId: a.productId,
				farmId: i.farmId,
				driverId: input.driverId,
				qty: a.qty,
				chickInCode: i.batchNumber,
				truckPlate: truckRow.plateNumber,
				status: 'Completed',
				remarks: `Dispatch ${tripCode} · ${i.feedName}`.slice(0, 500)
			}))
		);
		await tx.insert(feed_stock_movement).values(movements);

		return { dispatchId, tripCode, totalBags, capacity };
	});
}
