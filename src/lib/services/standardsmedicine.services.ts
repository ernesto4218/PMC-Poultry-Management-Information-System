import { standard_medicine, standard_medicine_history } from '#lib/server/db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { HistoryEntry, Item, MedicineUnit } from '#lib/types/standards/medicines/items.ts';
import { MEDICINE_UNITS } from '#lib/types/standards/medicines/items.ts';
import { db } from '../server/db';

type Row = typeof standard_medicine.$inferSelect;
type ChangeMap = Record<string, { from: unknown; to: unknown }>;

function rowToItem(row: Row): Item {
	return {
		id: row.id,
		itemName: row.name,
		areaName: row.areaName,
		value: row.value == null ? 0 : Number(row.value),
		unit: row.unit as MedicineUnit,
		amDuration: row.amDuration,
		amPmDuration: row.amPmDuration,
		pmDuration: row.pmDuration,
		isArchived: row.isArchived === 1,
		archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	};
}

const DEFAULT_AM = '2-3hrs';
const DEFAULT_AM_PM = '3 hrs';
const DEFAULT_PM = '2-3 hrs';

function normalise(input: {
	itemName?: string;
	areaName?: string;
	value?: number | string;
	unit?: string;
	amDuration?: string;
	amPmDuration?: string;
	pmDuration?: string;
}) {
	const name = String(input.itemName ?? '').trim();
	const areaName = String(input.areaName ?? '').trim();
	const unit = String(input.unit ?? '').trim() as MedicineUnit;
	const value = Number(input.value);
	const amDuration = String(input.amDuration ?? DEFAULT_AM).trim() || DEFAULT_AM;
	const amPmDuration = String(input.amPmDuration ?? DEFAULT_AM_PM).trim() || DEFAULT_AM_PM;
	const pmDuration = String(input.pmDuration ?? DEFAULT_PM).trim() || DEFAULT_PM;

	if (!name) throw new Error('Item name is required.');
	if (!areaName) throw new Error('Area is required.');
	if (!MEDICINE_UNITS.includes(unit)) {
		throw new Error(`Unit must be one of: ${MEDICINE_UNITS.join(', ')}.`);
	}
	if (!Number.isFinite(value) || value < 0) {
		throw new Error('Value must be a non-negative number.');
	}
	if (amDuration.length > 50) throw new Error('AM duration is too long (max 50 chars).');
	if (amPmDuration.length > 50) throw new Error('AM-PM duration is too long (max 50 chars).');
	if (pmDuration.length > 50) throw new Error('PM duration is too long (max 50 chars).');

	return { name, areaName, value, unit, amDuration, amPmDuration, pmDuration };
}

async function recordHistory(
	standardId: string,
	action: HistoryEntry['action'],
	changes: ChangeMap | null,
	changedBy?: string | null
) {
	await db.insert(standard_medicine_history).values({
		id: randomUUID(),
		standardId,
		action,
		changes,
		changedBy: changedBy ?? null
	});
}

export class StandardMedicineService {
	static async getAll(
		opts: { includeArchived?: boolean; areaName?: string } = {}
	): Promise<Item[]> {
		const rows = await db
			.select()
			.from(standard_medicine)
			.orderBy(desc(standard_medicine.createdAt));
		const items = rows.map(rowToItem);
		return opts.includeArchived ? items : items.filter((i) => !i.isArchived);
	}

	static async getById(id: string): Promise<Item | null> {
		const [row] = await db
			.select()
			.from(standard_medicine)
			.where(eq(standard_medicine.id, id))
			.limit(1);
		return row ? rowToItem(row) : null;
	}

	// Uniqueness is (name, areaName).
	private static async assertUniqueActive(name: string, areaName: string, excludeId?: string) {
		const [existing] = await db
			.select()
			.from(standard_medicine)
			.where(
				and(
					eq(standard_medicine.name, name),
					eq(standard_medicine.areaName, areaName),
					eq(standard_medicine.isArchived, 0)
				)
			)
			.limit(1);
		if (existing && existing.id !== excludeId) {
			throw new Error('This medicine already exists for the selected area.');
		}
	}

	static async create(
		input: {
			id?: string;
			itemName: string;
			areaName: string;
			value: number;
			unit: string;
			amDuration?: string;
			amPmDuration?: string;
			pmDuration?: string;
		},
		changedBy?: string | null
	): Promise<Item> {
		const { name, areaName, value, unit, amDuration, amPmDuration, pmDuration } = normalise(input);
		await this.assertUniqueActive(name, areaName);

		const id = input.id ?? randomUUID();
		await db.insert(standard_medicine).values({
			id,
			name,
			areaName,
			value: value.toFixed(2),
			unit,
			amDuration,
			amPmDuration,
			pmDuration,
			isArchived: 0
		});

		await recordHistory(id, 'created', null, changedBy);
		const created = await this.getById(id);
		if (!created) throw new Error('Failed to load created item.');
		return created;
	}

	static async update(
		input: {
			id: string;
			itemName: string;
			areaName: string;
			value: number;
			unit: string;
			amDuration?: string;
			amPmDuration?: string;
			pmDuration?: string;
		},
		changedBy?: string | null
	): Promise<Item> {
		const before = await this.getById(input.id);
		if (!before) throw new Error('Item not found.');
		if (before.isArchived) {
			throw new Error('Cannot edit an archived item. Restore it first.');
		}

		const { name, areaName, value, unit, amDuration, amPmDuration, pmDuration } = normalise(input);
		await this.assertUniqueActive(name, areaName, input.id);

		await db
			.update(standard_medicine)
			.set({
				name,
				areaName,
				value: value.toFixed(2),
				unit,
				amDuration,
				amPmDuration,
				pmDuration
			})
			.where(eq(standard_medicine.id, input.id));

		const changes: ChangeMap = {};
		if (before.itemName !== name) changes.itemName = { from: before.itemName, to: name };
		if (before.areaName !== areaName) {
			changes.areaName = { from: before.areaName, to: areaName };
		}
		if (before.value !== value) changes.value = { from: before.value, to: value };
		if (before.unit !== unit) changes.unit = { from: before.unit, to: unit };
		if (before.amDuration !== amDuration) {
			changes.amDuration = { from: before.amDuration, to: amDuration };
		}
		if (before.amPmDuration !== amPmDuration) {
			changes.amPmDuration = { from: before.amPmDuration, to: amPmDuration };
		}
		if (before.pmDuration !== pmDuration) {
			changes.pmDuration = { from: before.pmDuration, to: pmDuration };
		}

		await recordHistory(
			input.id,
			'updated',
			Object.keys(changes).length ? changes : null,
			changedBy
		);

		const updated = await this.getById(input.id);
		if (!updated) throw new Error('Failed to load updated item.');
		return updated;
	}

	static async archive(id: string, changedBy?: string | null): Promise<Item> {
		const before = await this.getById(id);
		if (!before) throw new Error('Item not found.');
		if (before.isArchived) return before;

		await db
			.update(standard_medicine)
			.set({ isArchived: 1, archivedAt: new Date() })
			.where(eq(standard_medicine.id, id));

		await recordHistory(id, 'archived', null, changedBy);
		const updated = await this.getById(id);
		if (!updated) throw new Error('Failed to archive item.');
		return updated;
	}

	static async restore(id: string, changedBy?: string | null): Promise<Item> {
		const before = await this.getById(id);
		if (!before) throw new Error('Item not found.');
		if (!before.isArchived) return before;

		await this.assertUniqueActive(before.itemName, before.areaName, id);

		await db
			.update(standard_medicine)
			.set({ isArchived: 0, archivedAt: null })
			.where(eq(standard_medicine.id, id));

		await recordHistory(id, 'restored', null, changedBy);
		const updated = await this.getById(id);
		if (!updated) throw new Error('Failed to restore item.');
		return updated;
	}

	static async getHistory(id: string): Promise<HistoryEntry[]> {
		const rows = await db
			.select()
			.from(standard_medicine_history)
			.where(eq(standard_medicine_history.standardId, id))
			.orderBy(desc(standard_medicine_history.changedAt));

		return rows.map((row) => ({
			id: row.id,
			standardId: row.standardId,
			action: row.action as HistoryEntry['action'],
			changes: (row.changes as ChangeMap | null) ?? null,
			changedAt: row.changedAt.toISOString(),
			changedBy: row.changedBy ?? null
		}));
	}

	static async delete(id: string, changedBy?: string | null): Promise<void> {
		const before = await this.getById(id);
		if (!before) return;
		await db.delete(standard_medicine).where(eq(standard_medicine.id, id));
		await recordHistory(id, 'deleted', null, changedBy);
	}
}
