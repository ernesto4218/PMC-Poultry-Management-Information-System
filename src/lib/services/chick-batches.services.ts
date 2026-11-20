// src/lib/server/services/chick-batches.services.ts
import { db } from '#lib/server/db/index.ts';
import { chickBatch, farm } from '#lib/server/db/schema.ts';
import {
	buildBatchNumber,
	type ChickBatch,
	type ChickBatchWithFarm
} from '#lib/types/chick-batches.ts';
import { and, desc, eq, sql } from 'drizzle-orm';

function toDateOnly(v: unknown): string {
	if (v instanceof Date) {
		// Use local getters — MySQL `date` columns have no timezone anyway
		const y = v.getFullYear();
		const m = String(v.getMonth() + 1).padStart(2, '0');
		const d = String(v.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}
	return String(v ?? '').slice(0, 10); // '2026-01-03T…' → '2026-01-03'
}

export class ChickBatchService {
	/** All batches, joined with farm details, newest first. */
	static async getAllBatches(): Promise<ChickBatchWithFarm[]> {
		const rows = await db
			.select({
				id: chickBatch.id,
				farmId: chickBatch.farmId,
				batchNumber: chickBatch.batchNumber,
				dateSet: chickBatch.dateSet,
				volume: chickBatch.volume,
				sequence: chickBatch.sequence,
				farmName: farm.name,
				farmCode: farm.code,
				farmAddress: farm.address,
				farmType: farm.type
			})
			.from(chickBatch)
			.innerJoin(farm, eq(chickBatch.farmId, farm.id))
			.orderBy(desc(chickBatch.dateSet), desc(chickBatch.createdAt));

		return rows.map((r) => ({
			id: r.id,
			farmId: r.farmId,
			batchNumber: r.batchNumber,
			dateSet: toDateOnly(r.dateSet),
			volume: r.volume,
			sequence: r.sequence,
			farm: {
				id: r.farmId,
				name: r.farmName,
				code: r.farmCode,
				address: r.farmAddress,
				type: r.farmType
			}
		}));
	}

	static async getAllBatchesByFarmType(type: string): Promise<ChickBatchWithFarm[]> {
		const rows = await db
			.select({
				id: chickBatch.id,
				farmId: chickBatch.farmId,
				batchNumber: chickBatch.batchNumber,
				dateSet: chickBatch.dateSet,
				volume: chickBatch.volume,
				sequence: chickBatch.sequence,
				farmName: farm.name,
				farmCode: farm.code,
				farmAddress: farm.address,
				farmType: farm.type,
				farmParticular: farm.particularsMemoryId
			})
			.from(chickBatch)
			.innerJoin(farm, eq(chickBatch.farmId, farm.id))
			.where(eq(farm.type, type))
			.orderBy(desc(chickBatch.dateSet), desc(chickBatch.createdAt));

		return rows.map((r) => ({
			id: r.id,
			farmId: r.farmId,
			batchNumber: r.batchNumber,
			dateSet: toDateOnly(r.dateSet),
			volume: r.volume,
			sequence: r.sequence,
			farm: {
				id: r.farmId,
				name: r.farmName,
				code: r.farmCode,
				address: r.farmAddress,
				type: r.farmType,
				particular_id: r.farmParticular
			}
		}));
	}

	static async getAllBatchesByFarm(): Promise<ChickBatchWithFarm[]> {
		const rows = await db
			.select({
				id: chickBatch.id,
				farmId: chickBatch.farmId,
				batchNumber: chickBatch.batchNumber,
				dateSet: chickBatch.dateSet,
				volume: chickBatch.volume,
				sequence: chickBatch.sequence,
				farmName: farm.name,
				farmCode: farm.code,
				farmAddress: farm.address,
				farmType: farm.type,
				farmParticular: farm.particularsMemoryId
			})
			.from(chickBatch)
			.innerJoin(farm, eq(chickBatch.farmId, farm.id))
			.orderBy(desc(chickBatch.dateSet), desc(chickBatch.createdAt));

		return rows.map((r) => ({
			id: r.id,
			farmId: r.farmId,
			batchNumber: r.batchNumber,
			dateSet: toDateOnly(r.dateSet),
			volume: r.volume,
			sequence: r.sequence,
			farm: {
				id: r.farmId,
				name: r.farmName,
				code: r.farmCode,
				address: r.farmAddress,
				type: r.farmType,
				particular_id: r.farmParticular // <-- add this
			}
		}));
	}

	static async getBatchById(id: string): Promise<ChickBatch | null> {
		const [row] = await db.select().from(chickBatch).where(eq(chickBatch.id, id)).limit(1);
		return row ?? null;
	}

	/** Next sequence number for a given farm + date. */
	static async getNextSequence(farmId: string, dateSet: string): Promise<number> {
		const [row] = await db
			.select({ maxSeq: sql<number>`coalesce(max(${chickBatch.sequence}), 0)` })
			.from(chickBatch)
			.where(and(eq(chickBatch.farmId, farmId), eq(chickBatch.dateSet, dateSet)));
		return Number(row?.maxSeq ?? 0) + 1;
	}

	static async createBatch(farmId: string, dateSet: string, volume: number): Promise<ChickBatch> {
		if (!Number.isInteger(volume) || volume <= 0) {
			throw new Error('Volume must be a positive whole number.');
		}

		const [f] = await db.select().from(farm).where(eq(farm.id, farmId)).limit(1);
		if (!f) throw new Error('Selected farm does not exist.');

		const sequence = await this.getNextSequence(farmId, dateSet);
		const batchNumber = buildBatchNumber(f.code, dateSet, sequence);
		const id = crypto.randomUUID();

		await db.insert(chickBatch).values({
			id,
			farmId,
			batchNumber,
			dateSet,
			volume,
			sequence
		});

		const created = await this.getBatchById(id);
		if (!created) throw new Error('Failed to create batch.');
		return created;
	}

	static async updateBatch(
		id: string,
		farmId: string,
		dateSet: string,
		volume: number
	): Promise<ChickBatch> {
		if (!Number.isInteger(volume) || volume <= 0) {
			throw new Error('Volume must be a positive whole number.');
		}

		const existing = await this.getBatchById(id);
		if (!existing) throw new Error('Batch not found.');

		let batchNumber = existing.batchNumber;
		let sequence = existing.sequence;

		// If farm or date changed, regenerate the batch number with a fresh sequence.
		if (existing.farmId !== farmId || existing.dateSet !== dateSet) {
			const [f] = await db.select().from(farm).where(eq(farm.id, farmId)).limit(1);
			if (!f) throw new Error('Selected farm does not exist.');

			sequence = await this.getNextSequence(farmId, dateSet);
			batchNumber = buildBatchNumber(f.code, dateSet, sequence);
		}

		await db
			.update(chickBatch)
			.set({ farmId, dateSet, volume, batchNumber, sequence })
			.where(eq(chickBatch.id, id));

		const updated = await this.getBatchById(id);
		if (!updated) throw new Error('Failed to update batch.');
		return updated;
	}

	static async deleteBatch(id: string): Promise<void> {
		const existing = await this.getBatchById(id);
		if (!existing) throw new Error('Batch not found.');
		await db.delete(chickBatch).where(eq(chickBatch.id, id));
	}

	/** Number of batches on a farm — handy for guarding farm deletion. */
	static async countByFarm(farmId: string): Promise<number> {
		const [row] = await db
			.select({ n: sql<number>`count(*)` })
			.from(chickBatch)
			.where(eq(chickBatch.farmId, farmId));
		return Number(row?.n ?? 0);
	}

	static async getDashboardStats() {
		const [row] = await db
			.select({
				totalBatches: sql<number>`count(*)`,
				totalChicks: sql<number>`coalesce(sum(${chickBatch.volume}), 0)`,
				avgPerBatch: sql<number>`coalesce(round(avg(${chickBatch.volume})), 0)`
			})
			.from(chickBatch);

		const thisMonth = new Date().toISOString().slice(0, 7); // '2026-11'
		const [monthRow] = await db
			.select({
				batches: sql<number>`count(*)`,
				chicks: sql<number>`coalesce(sum(${chickBatch.volume}), 0)`
			})
			.from(chickBatch)
			.where(sql`date_format(${chickBatch.dateSet}, '%Y-%m') = ${thisMonth}`);

		const byFarm = await db
			.select({
				farmId: chickBatch.farmId,
				name: farm.name,
				code: farm.code,
				chicks: sql<number>`coalesce(sum(${chickBatch.volume}), 0)`,
				batches: sql<number>`count(*)`
			})
			.from(chickBatch)
			.innerJoin(farm, eq(chickBatch.farmId, farm.id))
			.groupBy(chickBatch.farmId, farm.name, farm.code)
			.orderBy(sql`sum(${chickBatch.volume}) desc`)
			.limit(4);

		return {
			totals: {
				batches: Number(row.totalBatches),
				chicks: Number(row.totalChicks),
				avgPerBatch: Number(row.avgPerBatch)
			},
			thisMonth: { batches: Number(monthRow.batches), chicks: Number(monthRow.chicks) },
			byFarm
		};
	}
}
