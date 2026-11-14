import { standard_medication, standard_medication_age, farm } from '#lib/server/db/schema.ts';
import { eq, and, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
	AGE_RANGES,
	type AgeEntry,
	type MedicationSnapshot,
	type StandardMedication
} from '#lib/types/standards/medications/items.ts';
import { db } from '../server/db';

type StandardRow = typeof standard_medication.$inferSelect;
type AgeRow = typeof standard_medication_age.$inferSelect;

function rowToStandard(row: StandardRow, farmCount?: number): StandardMedication {
	return {
		id: row.id,
		name: row.name,
		notes: row.notes,
		isArchived: row.isArchived === 1,
		archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		farmCount
	};
}

function readMedications(raw: unknown): MedicationSnapshot[] {
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

function rowToAge(row: AgeRow): AgeEntry {
	return {
		id: row.id,
		standardId: row.standardId,
		age: row.age,
		note: row.note ?? '',
		medications: readMedications(row.medications),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	};
}

function normaliseStandard(input: { name?: string; notes?: string }) {
	const name = String(input.name ?? '').trim();
	const notes = String(input.notes ?? '').trim();
	if (!name) throw new Error('Standard name is required.');
	if (name.length > 150) throw new Error('Name must be 150 characters or fewer.');
	if (notes.length > 500) throw new Error('Notes must be 500 characters or fewer.');
	return { name, notes };
}

function normaliseAge(input: {
	standardId?: string;
	age?: string;
	note?: string;
	medications?: Array<Partial<MedicationSnapshot>>;
}) {
	const standardId = String(input.standardId ?? '').trim();
	const age = String(input.age ?? '').trim();
	const note = String(input.note ?? '').trim();

	if (!standardId) throw new Error('Standard id is required.');
	if (!AGE_RANGES.includes(age)) throw new Error(`Age "${age}" is not a valid range.`);
	if (note.length > 200) throw new Error('Note must be 200 characters or fewer.');

	const raw = Array.isArray(input.medications) ? input.medications : [];
	const seen = new Set<string>();
	const medications: MedicationSnapshot[] = [];
	for (const m of raw) {
		const id = String(m?.id ?? '').trim();
		const name = String(m?.name ?? '').trim();
		if (!id || !name || seen.has(id)) continue;
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
	if (medications.length > 20) throw new Error('At most 20 medications per age.');

	return { standardId, age, note, medications };
}

export class StandardMedicationService {
	// ---- Standards ----------------------------------------------------

	static async list(opts: { includeArchived?: boolean } = {}): Promise<StandardMedication[]> {
		const rows = await db
			.select({
				standard: standard_medication,
				farmCount: sql<number>`count(${farm.id})`
			})
			.from(standard_medication)
			.leftJoin(farm, eq(farm.standardMedicationId, standard_medication.id))
			.groupBy(standard_medication.id)
			.orderBy(desc(standard_medication.createdAt));

		const items = rows.map((r) => rowToStandard(r.standard, Number(r.farmCount)));
		return opts.includeArchived ? items : items.filter((i) => !i.isArchived);
	}

	static async getById(id: string): Promise<StandardMedication | null> {
		const [row] = await db
			.select()
			.from(standard_medication)
			.where(eq(standard_medication.id, id))
			.limit(1);
		if (!row) return null;
		const [{ count }] = await db
			.select({ count: sql<number>`count(*)` })
			.from(farm)
			.where(eq(farm.standardMedicationId, id));
		return rowToStandard(row, Number(count));
	}

	static async create(input: { name: string; notes?: string }): Promise<StandardMedication> {
		const { name, notes } = normaliseStandard(input);
		const id = randomUUID();
		await db.insert(standard_medication).values({ id, name, notes, isArchived: 0 });
		const created = await this.getById(id);
		if (!created) throw new Error('Failed to load created standard.');
		return created;
	}

	static async update(input: {
		id: string;
		name: string;
		notes?: string;
	}): Promise<StandardMedication> {
		const before = await this.getById(input.id);
		if (!before) throw new Error('Standard not found.');
		if (before.isArchived) throw new Error('Cannot edit an archived standard. Restore it first.');

		const { name, notes } = normaliseStandard(input);
		await db
			.update(standard_medication)
			.set({ name, notes })
			.where(eq(standard_medication.id, input.id));

		const updated = await this.getById(input.id);
		if (!updated) throw new Error('Failed to load updated standard.');
		return updated;
	}

	static async archive(id: string): Promise<StandardMedication> {
		const before = await this.getById(id);
		if (!before) throw new Error('Standard not found.');
		if (before.isArchived) return before;

		await db
			.update(standard_medication)
			.set({ isArchived: 1, archivedAt: new Date() })
			.where(eq(standard_medication.id, id));

		// Unlink any farms that were using it.
		await db
			.update(farm)
			.set({ standardMedicationId: null })
			.where(eq(farm.standardMedicationId, id));

		const updated = await this.getById(id);
		if (!updated) throw new Error('Failed to archive standard.');
		return updated;
	}

	static async restore(id: string): Promise<StandardMedication> {
		const before = await this.getById(id);
		if (!before) throw new Error('Standard not found.');
		if (!before.isArchived) return before;

		await db
			.update(standard_medication)
			.set({ isArchived: 0, archivedAt: null })
			.where(eq(standard_medication.id, id));

		const updated = await this.getById(id);
		if (!updated) throw new Error('Failed to restore standard.');
		return updated;
	}

	// ---- Ages ---------------------------------------------------------

	static async getAges(standardId: string): Promise<AgeEntry[]> {
		const rows = await db
			.select()
			.from(standard_medication_age)
			.where(eq(standard_medication_age.standardId, standardId));
		return rows.map(rowToAge);
	}

	static async setAge(input: {
		standardId: string;
		age: string;
		note?: string;
		medications?: Array<Partial<MedicationSnapshot>>;
	}): Promise<AgeEntry | null> {
		const { standardId, age, note, medications } = normaliseAge(input);

		// Standard must exist and not be archived.
		const standard = await this.getById(standardId);
		if (!standard) throw new Error('Standard not found.');
		if (standard.isArchived) {
			throw new Error('Cannot edit an archived standard. Restore it first.');
		}

		const [existing] = await db
			.select()
			.from(standard_medication_age)
			.where(
				and(
					eq(standard_medication_age.standardId, standardId),
					eq(standard_medication_age.age, age)
				)
			)
			.limit(1);

		// Empty (no meds, no note) → delete the row.
		if (medications.length === 0 && note === '') {
			if (existing) {
				await db.delete(standard_medication_age).where(eq(standard_medication_age.id, existing.id));
			}
			return null;
		}

		if (existing) {
			await db
				.update(standard_medication_age)
				.set({ note, medications })
				.where(eq(standard_medication_age.id, existing.id));
			const [updated] = await db
				.select()
				.from(standard_medication_age)
				.where(eq(standard_medication_age.id, existing.id))
				.limit(1);
			return updated ? rowToAge(updated) : null;
		}

		const id = randomUUID();
		await db.insert(standard_medication_age).values({ id, standardId, age, note, medications });
		const [created] = await db
			.select()
			.from(standard_medication_age)
			.where(eq(standard_medication_age.id, id))
			.limit(1);
		return created ? rowToAge(created) : null;
	}

	// ---- Farm link ----------------------------------------------------

	static async setFarmStandard(
		farmId: string,
		standardId: string | null
	): Promise<{ farmId: string; standardMedicationId: string | null }> {
		if (standardId) {
			const standard = await this.getById(standardId);
			if (!standard) throw new Error('Standard not found.');
			if (standard.isArchived) throw new Error('Cannot link to an archived standard.');
		}
		await db.update(farm).set({ standardMedicationId: standardId }).where(eq(farm.id, farmId));
		return { farmId, standardMedicationId: standardId };
	}
}
