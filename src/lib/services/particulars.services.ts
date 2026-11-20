import { particulars } from '#lib/server/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
	PARTICULAR_CATEGORIES,
	type Particular,
	type ParticularInput,
	type ParticularCategory
} from '#lib/types/particulars.ts';
import { db } from '../server/db';
import { StandardMedicineService } from './standardsmedicine.services';

type Row = typeof particulars.$inferSelect;

function rowToItem(row: Row): Particular {
	return {
		id: row.id,
		name: row.name,
		category: row.category,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	};
}

function normaliseName(name: unknown): string {
	const n = String(name ?? '').trim();
	if (!n) throw new Error('Name is required.');
	if (n.length > 150) throw new Error('Name is too long (max 150 chars).');
	return n;
}

function normaliseCategory(category: unknown): ParticularCategory {
	const c = String(category ?? '').trim();
	if (!(PARTICULAR_CATEGORIES as readonly string[]).includes(c)) {
		throw new Error('Invalid category.');
	}
	return c as ParticularCategory;
}

export class ParticularsService {
	static async getAll(): Promise<Particular[]> {
		const rows = await db.select().from(particulars).orderBy(desc(particulars.createdAt));
		return rows.map(rowToItem);
	}

	static async getById(id: string): Promise<Particular | null> {
		const [row] = await db.select().from(particulars).where(eq(particulars.id, id)).limit(1);
		return row ? rowToItem(row) : null;
	}

	private static async assertUnique(name: string, excludeId?: string) {
		const [existing] = await db
			.select()
			.from(particulars)
			.where(eq(particulars.name, name))
			.limit(1);
		if (existing && existing.id !== excludeId) {
			throw new Error('A particular with this name already exists.');
		}
	}

	static async create(input: ParticularInput): Promise<Particular> {
		const name = normaliseName(input.name);
		const category = normaliseCategory(input.category);
		await this.assertUnique(name);
		const id = input.id ?? randomUUID();
		await db.insert(particulars).values({ id, name, category });

		const created = await this.getById(id);
		if (!created) throw new Error('Failed to load created particular.');
		return created;
	}

	static async update(input: ParticularInput & { id: string }): Promise<Particular> {
		const before = await this.getById(input.id);
		if (!before) throw new Error('Particular not found.');
		const name = normaliseName(input.name);
		const category = normaliseCategory(input.category);
		await this.assertUnique(name, input.id);
		await db.update(particulars).set({ name, category }).where(eq(particulars.id, input.id));
		const updated = await this.getById(input.id);
		if (!updated) throw new Error('Failed to load updated particular.');
		return updated;
	}

	static async delete(id: string): Promise<void> {
		const before = await this.getById(id);
		if (!before) return;
		await db.delete(particulars).where(eq(particulars.id, id));
	}

	static async syncMedicinesToParticulars(): Promise<void> {
		const medicines = await StandardMedicineService.getAll(); // archived excluded
		const existing = await db.select({ name: particulars.name }).from(particulars);
		const have = new Set(existing.map((p) => p.name.trim().toLowerCase()));

		const toInsert: { id: string; name: string; category: ParticularCategory }[] = [];
		for (const m of medicines) {
			const name = m.itemName.trim();
			const key = name.toLowerCase();
			if (!name || have.has(key)) continue;
			have.add(key); // also dedupes same-name medicines from different areas
			toInsert.push({ id: randomUUID(), name, category: 'MED&VAC' });
		}

		if (toInsert.length) await db.insert(particulars).values(toInsert);
	}
}
