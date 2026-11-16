import { particulars } from '#lib/server/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Particular, ParticularInput } from '#lib/types/particulars.ts';
import { db } from '../server/db';

type Row = typeof particulars.$inferSelect;

const MAX_ADJUST_DAYS = 36500; // ±100 years; guards against absurd input

function rowToItem(row: Row): Particular {
	return {
		id: row.id,
		name: row.name,
		qty: row.qty,
		price: Number(row.price),
		adjustmentDays: row.adjustmentDays ?? null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	};
}

function normalise(input: {
	name?: string;
	qty?: number | string;
	price?: number | string;
	adjustmentDays?: number | string | null;
}) {
	const name = String(input.name ?? '').trim();
	const qty = Number(input.qty);
	const price = Number(input.price);

	const rawAdj = input.adjustmentDays;
	const adjustmentDays =
		rawAdj === null || rawAdj === undefined || String(rawAdj).trim() === '' ? null : Number(rawAdj);

	if (!name) throw new Error('Name is required.');
	if (!Number.isInteger(qty) || qty < 0)
		throw new Error('QTY must be a non-negative whole number.');
	if (!Number.isFinite(price) || price < 0) throw new Error('Price must be a non-negative number.');
	if (
		adjustmentDays !== null &&
		(!Number.isInteger(adjustmentDays) || Math.abs(adjustmentDays) > MAX_ADJUST_DAYS)
	) {
		throw new Error(`Adjustment days must be a whole number within ±${MAX_ADJUST_DAYS}.`);
	}

	return { name, qty, price, adjustmentDays };
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

	static async create(input: ParticularInput): Promise<Particular> {
		const { name, qty, price, adjustmentDays } = normalise(input);
		const id = input.id ?? randomUUID();

		await db.insert(particulars).values({
			id,
			name,
			qty,
			price: price.toFixed(2),
			adjustmentDays
		});

		const created = await this.getById(id);
		if (!created) throw new Error('Failed to load created particular.');
		return created;
	}

	static async update(input: ParticularInput & { id: string }): Promise<Particular> {
		const before = await this.getById(input.id);
		if (!before) throw new Error('Particular not found.');

		const { name, qty, price, adjustmentDays } = normalise(input);

		await db
			.update(particulars)
			.set({ name, qty, price: price.toFixed(2), adjustmentDays })
			.where(eq(particulars.id, input.id));

		const updated = await this.getById(input.id);
		if (!updated) throw new Error('Failed to load updated particular.');
		return updated;
	}

	static async delete(id: string): Promise<void> {
		const before = await this.getById(id);
		if (!before) return;
		await db.delete(particulars).where(eq(particulars.id, id));
	}
}
