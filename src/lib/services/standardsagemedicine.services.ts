import { standard_age_medicine } from '#lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { db } from '../server/db';
import {
	AGE_RANGES,
	type AgeMedicineItem,
	type Entry
} from '#lib/types/standards/age-medicine/items.ts';

type Row = typeof standard_age_medicine.$inferSelect;

function readMedications(raw: unknown): AgeMedicineItem[] {
	let arr: unknown = raw;
	if (typeof raw === 'string') {
		try {
			arr = JSON.parse(raw);
		} catch {
			arr = [];
		}
	}
	if (!Array.isArray(arr)) return [];
	return arr
		.filter(
			(m): m is Record<string, unknown> =>
				!!m &&
				typeof m === 'object' &&
				typeof (m as Record<string, unknown>).id === 'string' &&
				typeof (m as Record<string, unknown>).name === 'string'
		)
		.map((m) => ({
			id: String(m.id),
			name: String(m.name),
			areaName: String(m.areaName ?? ''),
			value: Number(m.value ?? 0) || 0,
			unit: String(m.unit ?? ''),
			amDuration: String(m.amDuration ?? ''),
			amPmDuration: String(m.amPmDuration ?? ''),
			pmDuration: String(m.pmDuration ?? '')
		}));
}

function rowToEntry(row: Row): Entry {
	return {
		id: row.id,
		age: row.age,
		medications: readMedications(row.medications),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	};
}

function normalise(input: { age?: string; medications?: Array<Partial<AgeMedicineItem>> }) {
	const age = String(input.age ?? '').trim();
	if (!AGE_RANGES.includes(age)) {
		throw new Error(`Age "${age}" is not a valid range.`);
	}

	const raw = Array.isArray(input.medications) ? input.medications : [];
	const seen = new Set<string>();
	const medications: AgeMedicineItem[] = [];

	for (const m of raw) {
		const id = String(m?.id ?? '').trim();
		const name = String(m?.name ?? '').trim();
		if (!id || !name) continue;
		if (seen.has(id)) continue;
		seen.add(id);
		medications.push({
			id,
			name,
			areaName: String(m.areaName ?? '').trim(),
			value: Number(m.value ?? 0) || 0,
			unit: String(m.unit ?? '').trim(),
			amDuration: String(m.amDuration ?? '').trim(),
			amPmDuration: String(m.amPmDuration ?? '').trim(),
			pmDuration: String(m.pmDuration ?? '').trim()
		});
	}

	if (medications.length > 20) {
		throw new Error('At most 20 medications per age.');
	}

	return { age, medications };
}

export class StandardAgeMedicineService {
	static async getAll(): Promise<Entry[]> {
		const rows = await db.select().from(standard_age_medicine);
		return rows.map(rowToEntry);
	}

	static async getById(id: string): Promise<Entry | null> {
		const [row] = await db
			.select()
			.from(standard_age_medicine)
			.where(eq(standard_age_medicine.id, id))
			.limit(1);
		return row ? rowToEntry(row) : null;
	}

	static async getByAge(age: string): Promise<Entry | null> {
		const [row] = await db
			.select()
			.from(standard_age_medicine)
			.where(eq(standard_age_medicine.age, age))
			.limit(1);
		return row ? rowToEntry(row) : null;
	}

	/**
	 * Upsert by age.
	 * - Non-empty medications → create or replace the row.
	 * - Empty medications     → delete the row (clears the schedule).
	 */
	static async set(input: {
		age: string;
		medications: Array<Partial<AgeMedicineItem>>;
	}): Promise<Entry | null> {
		const { age, medications } = normalise(input);

		const [existing] = await db
			.select()
			.from(standard_age_medicine)
			.where(eq(standard_age_medicine.age, age))
			.limit(1);

		if (medications.length === 0) {
			if (existing) {
				await db.delete(standard_age_medicine).where(eq(standard_age_medicine.id, existing.id));
			}
			return null;
		}

		if (existing) {
			await db
				.update(standard_age_medicine)
				.set({ medications })
				.where(eq(standard_age_medicine.id, existing.id));
			return this.getById(existing.id);
		}

		const id = randomUUID();
		await db.insert(standard_age_medicine).values({ id, age, medications });
		return this.getById(id);
	}

	static async delete(id: string): Promise<void> {
		const before = await this.getById(id);
		if (!before) throw new Error('Entry not found.');
		await db.delete(standard_age_medicine).where(eq(standard_age_medicine.id, id));
	}
}
