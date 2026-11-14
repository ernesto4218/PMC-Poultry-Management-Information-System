import { standard_medvac, standard_medvac_history } from '#lib/server/db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { HistoryEntry, Item } from '#lib/types/standards/medvac/items.ts';
import { db } from '../server/db';

type Row = typeof standard_medvac.$inferSelect;
type ChangeMap = Record<string, { from: unknown; to: unknown }>;

function rowToItem(row: Row): Item {
	return {
		id: row.id,
		itemName: row.name,
		farmType: row.farmtype,
		category: row.category,
		perThousand: row.value == null ? 0 : Number(row.value),
		isArchived: row.isArchived === 1,
		archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	};
}

function normalise(input: {
	itemName?: string;
	farmType?: string;
	category?: string;
	perThousand?: number | string;
}) {
	const name = String(input.itemName ?? '').trim();
	const farmtype = String(input.farmType ?? '').trim();
	const category = String(input.category ?? '').trim();
	const value = Number(input.perThousand);

	if (!name) throw new Error('Item name is required.');
	if (!farmtype) throw new Error('Farm type is required.');
	if (!category) throw new Error('Category is required.');
	if (!Number.isFinite(value) || value < 0) {
		throw new Error('Per 1,000 must be a non-negative number.');
	}

	return { name, farmtype, category, value };
}

async function recordHistory(
	standardId: string,
	action: HistoryEntry['action'],
	changes: ChangeMap | null,
	changedBy?: string | null
) {
	await db.insert(standard_medvac_history).values({
		id: randomUUID(),
		standardId,
		action,
		changes,
		changedBy: changedBy ?? null
	});
}

export class StandardMedVacService {
	static async getAll(opts: { includeArchived?: boolean } = {}): Promise<Item[]> {
		const rows = await db.select().from(standard_medvac).orderBy(desc(standard_medvac.createdAt));
		const items = rows.map(rowToItem);
		return opts.includeArchived ? items : items.filter((i) => !i.isArchived);
	}

	static async getById(id: string): Promise<Item | null> {
		const [row] = await db
			.select()
			.from(standard_medvac)
			.where(eq(standard_medvac.id, id))
			.limit(1);
		return row ? rowToItem(row) : null;
	}

	private static async assertUniqueActive(name: string, farmtype: string, excludeId?: string) {
		const [existing] = await db
			.select()
			.from(standard_medvac)
			.where(
				and(
					eq(standard_medvac.name, name),
					eq(standard_medvac.farmtype, farmtype),
					eq(standard_medvac.isArchived, 0)
				)
			)
			.limit(1);
		if (existing && existing.id !== excludeId) {
			throw new Error('An item with this name already exists for the selected farm type.');
		}
	}

	static async create(
		input: {
			id?: string;
			itemName: string;
			farmType: string;
			category: string;
			perThousand: number;
		},
		changedBy?: string | null
	): Promise<Item> {
		const { name, farmtype, category, value } = normalise(input);
		await this.assertUniqueActive(name, farmtype);

		const id = input.id ?? randomUUID();
		await db.insert(standard_medvac).values({
			id,
			name,
			farmtype,
			category,
			value: value.toString(),
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
			farmType: string;
			category: string;
			perThousand: number;
		},
		changedBy?: string | null
	): Promise<Item> {
		const before = await this.getById(input.id);
		if (!before) throw new Error('Item not found.');
		if (before.isArchived) {
			throw new Error('Cannot edit an archived item. Restore it first.');
		}

		const { name, farmtype, category, value } = normalise(input);
		await this.assertUniqueActive(name, farmtype, input.id);

		await db
			.update(standard_medvac)
			.set({ name, farmtype, category, value: value.toString() })
			.where(eq(standard_medvac.id, input.id));

		const changes: ChangeMap = {};
		if (before.itemName !== name) {
			changes.itemName = { from: before.itemName, to: name };
		}
		if (before.farmType !== farmtype) {
			changes.farmType = { from: before.farmType, to: farmtype };
		}
		if (before.category !== category) {
			changes.category = { from: before.category, to: category };
		}
		if (before.perThousand !== value) {
			changes.perThousand = { from: before.perThousand, to: value };
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
			.update(standard_medvac)
			.set({ isArchived: 1, archivedAt: new Date() })
			.where(eq(standard_medvac.id, id));

		await recordHistory(id, 'archived', null, changedBy);
		const updated = await this.getById(id);
		if (!updated) throw new Error('Failed to archive item.');
		return updated;
	}

	static async restore(id: string, changedBy?: string | null): Promise<Item> {
		const before = await this.getById(id);
		if (!before) throw new Error('Item not found.');
		if (!before.isArchived) return before;

		// Guard against re-activating a name/farmType that is already active again.
		await this.assertUniqueActive(before.itemName, before.farmType, id);

		await db
			.update(standard_medvac)
			.set({ isArchived: 0, archivedAt: null })
			.where(eq(standard_medvac.id, id));

		await recordHistory(id, 'restored', null, changedBy);
		const updated = await this.getById(id);
		if (!updated) throw new Error('Failed to restore item.');
		return updated;
	}

	static async getHistory(id: string): Promise<HistoryEntry[]> {
		const rows = await db
			.select()
			.from(standard_medvac_history)
			.where(eq(standard_medvac_history.standardId, id))
			.orderBy(desc(standard_medvac_history.changedAt));

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
		await db.delete(standard_medvac).where(eq(standard_medvac.id, id));
		await recordHistory(id, 'deleted', null, changedBy);
	}
}
