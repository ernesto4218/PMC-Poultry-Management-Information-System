import { standard_supplies, standard_supplies_history } from '#lib/server/db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { HistoryEntry, Item } from '#lib/types/standards/supplies/items.ts';
import { db } from '../server/db';

type Row = typeof standard_supplies.$inferSelect;
type ChangeMap = Record<string, { from: unknown; to: unknown }>;

function rowToItem(row: Row): Item {
	return {
		id: row.id,
		itemName: row.name,
		farmCode: row.farmcode,
		category: row.category,
		perThousand: row.perThousand == null ? 0 : Number(row.perThousand),
		standardPerFarm: row.standardPerFarm == null ? 0 : Number(row.standardPerFarm),
		unit: row.unit,
		isArchived: row.isArchived === 1,
		archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	};
}

function normalise(input: {
	itemName?: string;
	farmCode?: string;
	category?: string;
	perThousand?: number | string;
	standardPerFarm?: number | string;
	unit?: string;
}) {
	const name = String(input.itemName ?? '').trim();
	const farmcode = String(input.farmCode ?? '').trim();
	const category = String(input.category ?? '').trim();
	const unit = String(input.unit ?? '').trim();
	const perThousand = Number(input.perThousand);
	const standardPerFarm = Number(input.standardPerFarm);

	if (!name) throw new Error('Item name is required.');
	if (!farmcode) throw new Error('Farm code is required.');
	if (!category) throw new Error('Category is required.');
	if (!unit) throw new Error('Unit is required.');
	if (!Number.isFinite(perThousand) || perThousand < 0) {
		throw new Error('Per 1,000 must be a non-negative number.');
	}
	if (!Number.isFinite(standardPerFarm) || standardPerFarm < 0) {
		throw new Error('Standard per farm must be a non-negative number.');
	}

	return { name, farmcode, category, unit, perThousand, standardPerFarm };
}

async function recordHistory(
	standardId: string,
	action: HistoryEntry['action'],
	changes: ChangeMap | null,
	changedBy?: string | null
) {
	await db.insert(standard_supplies_history).values({
		id: randomUUID(),
		standardId,
		action,
		changes,
		changedBy: changedBy ?? null
	});
}

export class StandardSuppliesService {
	static async getAll(opts: { includeArchived?: boolean } = {}): Promise<Item[]> {
		const rows = await db
			.select()
			.from(standard_supplies)
			.orderBy(desc(standard_supplies.createdAt));
		const items = rows.map(rowToItem);
		return opts.includeArchived ? items : items.filter((i) => !i.isArchived);
	}

	static async getById(id: string): Promise<Item | null> {
		const [row] = await db
			.select()
			.from(standard_supplies)
			.where(eq(standard_supplies.id, id))
			.limit(1);
		return row ? rowToItem(row) : null;
	}

	private static async assertUniqueActive(name: string, farmcode: string, excludeId?: string) {
		const [existing] = await db
			.select()
			.from(standard_supplies)
			.where(
				and(
					eq(standard_supplies.name, name),
					eq(standard_supplies.farmcode, farmcode),
					eq(standard_supplies.isArchived, 0)
				)
			)
			.limit(1);
		if (existing && existing.id !== excludeId) {
			throw new Error('An item with this name already exists for the selected farm code.');
		}
	}

	static async create(
		input: {
			id?: string;
			itemName: string;
			farmCode: string;
			category: string;
			perThousand: number;
			standardPerFarm: number;
			unit: string;
		},
		changedBy?: string | null
	): Promise<Item> {
		const { name, farmcode, category, unit, perThousand, standardPerFarm } = normalise(input);
		await this.assertUniqueActive(name, farmcode);

		const id = input.id ?? randomUUID();
		await db.insert(standard_supplies).values({
			id,
			name,
			farmcode,
			category,
			unit,
			perThousand: perThousand.toString(),
			standardPerFarm: standardPerFarm.toString(),
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
			farmCode: string;
			category: string;
			perThousand: number;
			standardPerFarm: number;
			unit: string;
		},
		changedBy?: string | null
	): Promise<Item> {
		const before = await this.getById(input.id);
		if (!before) throw new Error('Item not found.');
		if (before.isArchived) {
			throw new Error('Cannot edit an archived item. Restore it first.');
		}

		const { name, farmcode, category, unit, perThousand, standardPerFarm } = normalise(input);
		await this.assertUniqueActive(name, farmcode, input.id);

		await db
			.update(standard_supplies)
			.set({
				name,
				farmcode,
				category,
				unit,
				perThousand: perThousand.toString(),
				standardPerFarm: standardPerFarm.toString()
			})
			.where(eq(standard_supplies.id, input.id));

		const changes: ChangeMap = {};
		if (before.itemName !== name) changes.itemName = { from: before.itemName, to: name };
		if (before.farmCode !== farmcode) {
			changes.farmCode = { from: before.farmCode, to: farmcode };
		}
		if (before.category !== category) changes.category = { from: before.category, to: category };
		if (before.unit !== unit) changes.unit = { from: before.unit, to: unit };
		if (before.perThousand !== perThousand) {
			changes.perThousand = { from: before.perThousand, to: perThousand };
		}
		if (before.standardPerFarm !== standardPerFarm) {
			changes.standardPerFarm = { from: before.standardPerFarm, to: standardPerFarm };
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
			.update(standard_supplies)
			.set({ isArchived: 1, archivedAt: new Date() })
			.where(eq(standard_supplies.id, id));

		await recordHistory(id, 'archived', null, changedBy);
		const updated = await this.getById(id);
		if (!updated) throw new Error('Failed to archive item.');
		return updated;
	}

	static async restore(id: string, changedBy?: string | null): Promise<Item> {
		const before = await this.getById(id);
		if (!before) throw new Error('Item not found.');
		if (!before.isArchived) return before;

		await this.assertUniqueActive(before.itemName, before.farmCode, id);

		await db
			.update(standard_supplies)
			.set({ isArchived: 0, archivedAt: null })
			.where(eq(standard_supplies.id, id));

		await recordHistory(id, 'restored', null, changedBy);
		const updated = await this.getById(id);
		if (!updated) throw new Error('Failed to restore item.');
		return updated;
	}

	static async getHistory(id: string): Promise<HistoryEntry[]> {
		const rows = await db
			.select()
			.from(standard_supplies_history)
			.where(eq(standard_supplies_history.standardId, id))
			.orderBy(desc(standard_supplies_history.changedAt));

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
		await db.delete(standard_supplies).where(eq(standard_supplies.id, id));
		await recordHistory(id, 'deleted', null, changedBy);
	}
}
