// Place at: src/lib/server/services/farms.services.ts
import { db } from '#lib/server/db/index.ts';
import {
	farm,
	particulars,
	particulars_memory,
	particulars_memory_item
} from '#lib/server/db/schema.ts';
import { eq, or, sql, like, inArray } from 'drizzle-orm';
import type { Farm } from '#lib/types/farms.ts';
import { ChickBatchService } from './chick-batches.services';

export class FarmService {
	/** Retrieve all farms */
	static async getAllFarms(): Promise<Farm[]> {
		const results = await db.select().from(farm);
		return results;
	}

	static async getAllFarmsCCS(opts: { type?: string } = {}): Promise<Farm[]> {
		const results = await db
			.select()
			.from(farm)
			.where(opts.type ? eq(farm.type, opts.type) : undefined);
		return results;
	}

	static async getAllFarmsCON(opts: { type?: string } = {}): Promise<Farm[]> {
		const results = await db.select().from(farm).where(like(farm.type, '%CON%'));
		return results;
	}

	/** Retrieve a single farm by ID */
	static async getFarmById(id: string): Promise<Farm | null> {
		const [result] = await db.select().from(farm).where(eq(farm.id, id)).limit(1);
		return result ?? null;
	}

	/** Check if name or code already exists (optionally excluding a specific farm ID) */
	static async checkDuplicates(name: string, code: string, excludeId?: string) {
		const conditions = [
			sql`lower(name) = lower(${name.trim()})`,
			sql`lower(code) = lower(${code.trim()})`
		];

		const existing = await db
			.select()
			.from(farm)
			.where(or(...conditions));
		const filtered = excludeId ? existing.filter((f) => f.id !== excludeId) : existing;

		const duplicateName = filtered.some((f) => f.name.toLowerCase() === name.trim().toLowerCase());
		const duplicateCode = filtered.some((f) => f.code.toLowerCase() === code.trim().toLowerCase());

		return { duplicateName, duplicateCode };
	}

	/** Create a new farm */
	static async createFarm(data: Farm): Promise<Farm> {
		const { duplicateName, duplicateCode } = await this.checkDuplicates(data.name, data.code);

		if (duplicateName) throw new Error('A farm with this name already exists.');
		if (duplicateCode) throw new Error('This farm code is already assigned.');

		await db.insert(farm).values({
			id: data.id,
			name: data.name.trim(),
			type: data.type.trim(),
			code: data.code.trim(),
			volume: data.volume,
			address: data.address.trim(),
			particularsMemoryId: data.particularsMemoryId ?? null
		});

		return data;
	}

	/** Update an existing farm */
	static async updateFarm(data: Farm): Promise<Farm> {
		const { duplicateName, duplicateCode } = await this.checkDuplicates(
			data.name,
			data.code,
			data.id
		);

		if (duplicateName) throw new Error('Another farm with this name already exists.');
		if (duplicateCode) throw new Error('Another farm already uses this farm code.');

		await db
			.update(farm)
			.set({
				name: data.name.trim(),
				type: data.type.trim(),
				code: data.code.trim(),
				volume: data.volume,
				staff: data.staff, // <-- added
				address: data.address.trim(),
				particularsMemoryId: data.particularsMemoryId ?? null, // <-- added
				updatedAt: new Date()
			})
			.where(eq(farm.id, data.id));

		return data;
	}

	/** Delete a farm by ID */
	static async deleteFarm(id: string): Promise<void> {
		const [existing] = await db.select().from(farm).where(eq(farm.id, id)).limit(1);
		if (!existing) throw new Error('Farm not found.');

		const batchCount = await ChickBatchService.countByFarm(id);
		if (batchCount > 0) {
			throw new Error(
				`Cannot delete "${existing.name}" — it has ${batchCount} chick batch${batchCount === 1 ? '' : 'es'}. Delete those first.`
			);
		}

		await db.delete(farm).where(eq(farm.id, id));
	}

	static async getFarmStaffInfoByCode(
		code: string
	): Promise<{ id: string; code: string; name: string; staff: number } | null> {
		const trimmed = code.trim();
		if (!trimmed) return null;

		const [result] = await db
			.select({ id: farm.id, code: farm.code, name: farm.name, staff: farm.staff })
			.from(farm)
			.where(sql`lower(${farm.code}) = lower(${trimmed})`)
			.limit(1);

		return result ?? null;
	}

	/** Get the particulars memory linked to a farm, by farm code. */
	static async getMemoryByFarmCode(code: string) {
		const trimmed = code.trim();
		if (!trimmed) return null;

		const [result] = await db
			.select({ memory: particulars_memory })
			.from(farm)
			.innerJoin(particulars_memory, eq(farm.particularsMemoryId, particulars_memory.id))
			.where(sql`lower(${farm.code}) = lower(${trimmed})`)
			.limit(1);

		return result?.memory ?? null;
	}

	/** Get the memory's items too (for building reports). */
	static async getMemoryItemsByFarmCode(code: string) {
		const trimmed = code.trim();
		if (!trimmed) return [];

		return db
			.select({ item: particulars_memory_item, particular: particulars })
			.from(farm)
			.innerJoin(
				particulars_memory_item,
				eq(particulars_memory_item.memoryId, farm.particularsMemoryId)
			)
			.innerJoin(particulars, eq(particulars.id, particulars_memory_item.particularId))
			.where(sql`lower(${farm.code}) = lower(${trimmed})`)
			.orderBy(particulars_memory_item.position);
	}

	/** Retrieve a single farm by its code (case-insensitive) */
	static async getFarmByCode(code: string): Promise<Farm | null> {
		const trimmed = code.trim();
		if (!trimmed) return null;

		const [result] = await db
			.select()
			.from(farm)
			.where(sql`lower(${farm.code}) = lower(${trimmed})`)
			.limit(1);

		return result ?? null;
	}

	static async getMemoryWithItemsById(memoryId: string) {
		const trimmed = memoryId?.trim();
		if (!trimmed) return null;

		const [memory] = await db
			.select()
			.from(particulars_memory)
			.where(eq(particulars_memory.id, trimmed))
			.limit(1);

		if (!memory) return null;

		const items = await db
			.select({ item: particulars_memory_item, particular: particulars })
			.from(particulars_memory_item)
			.innerJoin(particulars, eq(particulars.id, particulars_memory_item.particularId))
			.where(eq(particulars_memory_item.memoryId, trimmed))
			.orderBy(particulars_memory_item.position);

		return {
			...memory,
			items: items.map((i) => ({ ...i.item, particular: i.particular }))
		};
	}
}
