import { db } from '#lib/server/db/index.ts';
import {
	feedProduct,
	feedSupplier,
	feed_stock,
	feed_stock_movement,
	farm,
	driver
} from '#lib/server/db/schema.ts';
import { and, eq, gte, sql, desc } from 'drizzle-orm';
import {
	stockStatus,
	type FeedInventoryRow,
	type FeedMovementRow,
	type MovementDirection,
	type MovementStatus,
	type MovementType
} from '#lib/types/feed-stock.ts';

type MovementInput = {
	movementType: MovementType;
	direction: MovementDirection;
	feedProductId: string;
	supplierId?: string | null;
	farmId?: string | null;
	driverId?: string | null;
	qty: number;
	chickInCode?: string;
	truckPlate?: string;
	status: MovementStatus;
	remarks?: string;
};

export class FeedStockService {
	// ---- Inventory -----------------------------------------------------
	static async getInventory(): Promise<FeedInventoryRow[]> {
		const base = await db
			.select({
				feedProductId: feedProduct.id,
				productName: feedProduct.name,
				sku: feedProduct.sku,
				feedType: feedProduct.feedType,
				stage: feedProduct.stage,
				supplierId: feedProduct.supplierId,
				supplierName: feedSupplier.name,
				onHand: feed_stock.onHand,
				minStock: feed_stock.minStock
			})
			.from(feedProduct)
			.leftJoin(feedSupplier, eq(feedProduct.supplierId, feedSupplier.id))
			.leftJoin(feed_stock, eq(feed_stock.feedProductId, feedProduct.id))
			.where(eq(feedProduct.active, 1));

		const lastMoves = await db
			.select({
				feedProductId: feed_stock_movement.feedProductId,
				lastAt: sql<string>`MAX(${feed_stock_movement.createdAt})`.as('lastAt')
			})
			.from(feed_stock_movement)
			.groupBy(feed_stock_movement.feedProductId);

		const lastMap = new Map(lastMoves.map((m) => [m.feedProductId, m.lastAt]));

		return base.map((r) => {
			const onHand = r.onHand ?? 0;
			const minStock = r.minStock ?? 0;
			return {
				feedProductId: r.feedProductId,
				productName: r.productName || r.sku || '—',
				sku: r.sku ?? '',
				feedType: r.feedType ?? '',
				stage: r.stage ?? '',
				supplierId: r.supplierId ?? '',
				supplierName: r.supplierName ?? '—',
				onHand,
				minStock,
				lastMovementAt: lastMap.get(r.feedProductId) ?? null,
				status: stockStatus(onHand, minStock)
			};
		});
	}

	// ---- Movement ledger ----------------------------------------------
	static async getMovements(): Promise<FeedMovementRow[]> {
		const rows = await db
			.select({
				id: feed_stock_movement.id,
				movementType: feed_stock_movement.movementType,
				direction: feed_stock_movement.direction,
				feedProductId: feed_stock_movement.feedProductId,
				productName: feedProduct.name,
				sku: feedProduct.sku,
				supplierId: feed_stock_movement.supplierId,
				supplierName: feedSupplier.name,
				farmId: feed_stock_movement.farmId,
				farmName: farm.name,
				farmCode: farm.code,
				driverId: feed_stock_movement.driverId,
				driverName: driver.name,
				qty: feed_stock_movement.qty,
				chickInCode: feed_stock_movement.chickInCode,
				truckPlate: feed_stock_movement.truckPlate,
				status: feed_stock_movement.status,
				remarks: feed_stock_movement.remarks,
				createdAt: feed_stock_movement.createdAt
			})
			.from(feed_stock_movement)
			.innerJoin(feedProduct, eq(feed_stock_movement.feedProductId, feedProduct.id))
			.leftJoin(feedSupplier, eq(feed_stock_movement.supplierId, feedSupplier.id))
			.leftJoin(farm, eq(feed_stock_movement.farmId, farm.id))
			.leftJoin(driver, eq(feed_stock_movement.driverId, driver.id))
			.orderBy(desc(feed_stock_movement.createdAt));

		return rows.map((r) => ({
			...r,
			movementType: r.movementType as MovementType,
			direction: r.direction as MovementDirection,
			status: r.status as MovementStatus,
			productName: r.productName || r.sku || '—'
		}));
	}

	// ---- Stock mutation helpers ---------------------------------------
	/**
	 * Applies a stock change.
	 *
	 * strict = true  → an 'out' movement is REJECTED if it would take stock below zero.
	 *                  The check is part of the UPDATE itself (WHERE onHand >= qty), so two
	 *                  simultaneous requests can't both pass it.
	 * strict = false → legacy behaviour: clamp at 0 (used when reversing a ledger entry).
	 */
	private static async applyStock(
		feedProductId: string,
		direction: MovementDirection,
		qty: number,
		strict = false
	): Promise<void> {
		if (strict && direction === 'out') {
			// MySQL has no RETURNING; the update result reports how many rows matched.
			// qty > 0, so a matching row is always changed — 0 rows means "not enough stock".
			const [result] = await db
				.update(feed_stock)
				.set({ onHand: sql`${feed_stock.onHand} - ${qty}` })
				.where(and(eq(feed_stock.feedProductId, feedProductId), gte(feed_stock.onHand, qty)));
			const affected = (result as any)?.affectedRows ?? (result as any)?.rowsAffected ?? 0;

			if (affected === 0) {
				const [row] = await db
					.select({ onHand: feed_stock.onHand })
					.from(feed_stock)
					.where(eq(feed_stock.feedProductId, feedProductId))
					.limit(1);
				const available = row?.onHand ?? 0;
				throw new Error(
					available <= 0
						? 'No stock available for this product.'
						: `Insufficient stock: only ${available} sack${available === 1 ? '' : 's'} on hand.`
				);
			}
			return;
		}

		const [existing] = await db
			.select()
			.from(feed_stock)
			.where(eq(feed_stock.feedProductId, feedProductId))
			.limit(1);

		if (existing) {
			const next = direction === 'in' ? existing.onHand + qty : existing.onHand - qty;
			await db
				.update(feed_stock)
				.set({ onHand: Math.max(0, next) })
				.where(eq(feed_stock.feedProductId, feedProductId));
		} else {
			const initial = direction === 'in' ? qty : 0;
			await db.insert(feed_stock).values({
				id: crypto.randomUUID(),
				feedProductId,
				onHand: Math.max(0, initial),
				minStock: 0
			});
		}
	}

	static async createMovement(data: MovementInput): Promise<FeedMovementRow> {
		if (!data.feedProductId) throw new Error('Please select a feed product.');
		if (!Number.isInteger(data.qty) || data.qty <= 0)
			throw new Error('Quantity must be a positive number of sacks.');

		const [product] = await db
			.select()
			.from(feedProduct)
			.where(eq(feedProduct.id, data.feedProductId))
			.limit(1);
		if (!product) throw new Error('Selected feed product does not exist.');

		if (data.movementType === 'delivery' && !data.supplierId)
			throw new Error('Delivery requires a supplier.');
		if ((data.movementType === 'from-farm' || data.movementType === 'to-farm') && !data.farmId)
			throw new Error(
				`${data.movementType === 'from-farm' ? 'From-farm' : 'To-farm'} requires a farm.`
			);

		// Direction is decided by the movement type, not trusted from the client.
		// Only adjustments let the user choose.
		const direction: MovementDirection =
			data.movementType === 'adjustment'
				? data.direction
				: data.movementType === 'to-farm'
					? 'out'
					: 'in';
		if (direction !== 'in' && direction !== 'out') throw new Error('Invalid stock direction.');

		// Apply stock change (rejects if it would go below zero), then insert ledger row.
		await this.applyStock(data.feedProductId, direction, data.qty, true);

		const id = crypto.randomUUID();
		try {
			await db.insert(feed_stock_movement).values({
				id,
				movementType: data.movementType,
				direction,
				feedProductId: data.feedProductId,
				supplierId: data.supplierId ?? null,
				farmId: data.farmId ?? null,
				driverId: data.driverId ?? null,
				qty: data.qty,
				chickInCode: (data.chickInCode ?? '').trim(),
				truckPlate: (data.truckPlate ?? '').trim(),
				status: data.status,
				remarks: (data.remarks ?? '').trim()
			});
		} catch (err) {
			// Ledger write failed after stock was changed → put the stock back.
			await this.applyStock(data.feedProductId, direction === 'in' ? 'out' : 'in', data.qty);
			throw err;
		}

		const [inserted] = await db
			.select()
			.from(feed_stock_movement)
			.where(eq(feed_stock_movement.id, id))
			.limit(1);

		return {
			...inserted,
			movementType: inserted.movementType as MovementType,
			direction: inserted.direction as MovementDirection,
			status: inserted.status as MovementStatus,
			productName: product.name || product.sku || '—',
			sku: product.sku,
			supplierName: null,
			farmName: null,
			farmCode: null,
			driverName: null
		} as FeedMovementRow;
	}

	static async deleteMovement(id: string): Promise<void> {
		const [existing] = await db
			.select()
			.from(feed_stock_movement)
			.where(eq(feed_stock_movement.id, id))
			.limit(1);
		if (!existing) throw new Error('Movement not found.');

		// Reverse stock effect
		const reverse: MovementDirection = existing.direction === 'in' ? 'out' : 'in';
		await this.applyStock(existing.feedProductId, reverse, existing.qty);

		await db.delete(feed_stock_movement).where(eq(feed_stock_movement.id, id));
	}

	static async updateMinStock(feedProductId: string, minStock: number): Promise<void> {
		if (!Number.isInteger(minStock) || minStock < 0)
			throw new Error('Minimum stock must be a non-negative integer.');
		const [existing] = await db
			.select()
			.from(feed_stock)
			.where(eq(feed_stock.feedProductId, feedProductId))
			.limit(1);

		if (existing) {
			await db
				.update(feed_stock)
				.set({ minStock })
				.where(eq(feed_stock.feedProductId, feedProductId));
		} else {
			await db.insert(feed_stock).values({
				id: crypto.randomUUID(),
				feedProductId,
				onHand: 0,
				minStock
			});
		}
	}

	// ---- Lookups for form dropdowns -----------------------------------
	static async getProductsLookup() {
		return db
			.select({
				id: feedProduct.id,
				name: feedProduct.name,
				sku: feedProduct.sku,
				feedType: feedProduct.feedType,
				stage: feedProduct.stage,
				supplierId: feedProduct.supplierId
			})
			.from(feedProduct)
			.where(eq(feedProduct.active, 1));
	}

	static async getSuppliersLookup() {
		return db.select({ id: feedSupplier.id, name: feedSupplier.name }).from(feedSupplier);
	}
}
