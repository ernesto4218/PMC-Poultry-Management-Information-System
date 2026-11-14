import { standard_area } from '#lib/server/db/schema.ts';
import { eq, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '../server/db';
import type { Area } from '#lib/types/standards/area/+items.ts';

type Row = typeof standard_area.$inferSelect;

function rowToArea(row: Row): Area {
	return {
		id: row.id,
		name: row.name,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	};
}

function normaliseName(input: { name?: string }) {
	const name = String(input.name ?? '').trim();
	if (!name) throw new Error('Area name is required.');
	if (name.length > 150) throw new Error('Area name must be 150 characters or fewer.');
	return name;
}

export class StandardAreaService {
	static async getAll(): Promise<Area[]> {
		const rows = await db.select().from(standard_area).orderBy(desc(standard_area.createdAt));
		return rows.map(rowToArea);
	}

	static async getById(id: string): Promise<Area | null> {
		const [row] = await db.select().from(standard_area).where(eq(standard_area.id, id)).limit(1);
		return row ? rowToArea(row) : null;
	}

	private static async assertUniqueName(name: string, excludeId?: string) {
		const [existing] = await db
			.select()
			.from(standard_area)
			.where(sql`lower(${standard_area.name}) = lower(${name})`)
			.limit(1);
		if (existing && existing.id !== excludeId) {
			throw new Error('An area with this name already exists.');
		}
	}

	static async create(input: { id?: string; name: string }): Promise<Area> {
		const name = normaliseName(input);
		await this.assertUniqueName(name);

		const id = input.id ?? randomUUID();
		await db.insert(standard_area).values({ id, name });

		const created = await this.getById(id);
		if (!created) throw new Error('Failed to load created area.');
		return created;
	}

	static async update(input: { id: string; name: string }): Promise<Area> {
		const before = await this.getById(input.id);
		if (!before) throw new Error('Area not found.');

		const name = normaliseName(input);
		await this.assertUniqueName(name, input.id);

		await db.update(standard_area).set({ name }).where(eq(standard_area.id, input.id));

		const updated = await this.getById(input.id);
		if (!updated) throw new Error('Failed to load updated area.');
		return updated;
	}

	static async delete(id: string): Promise<void> {
		const before = await this.getById(id);
		if (!before) throw new Error('Area not found.');
		await db.delete(standard_area).where(eq(standard_area.id, id));
	}
}
