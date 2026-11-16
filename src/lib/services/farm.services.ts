// Place at: src/lib/server/services/farms.services.ts
import { db } from '#lib/server/db/index.ts';
import { farm } from '#lib/server/db/schema.ts';
import { eq, or, sql, like } from 'drizzle-orm';
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
			address: data.address.trim()
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
				address: data.address.trim(),
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
}
