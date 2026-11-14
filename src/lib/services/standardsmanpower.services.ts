import { standard_manpower, standard_manpower_history } from '#lib/server/db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { HistoryEntry, Item } from '#lib/types/standards/manpower/items.ts';
import { db } from '../server/db';

type Row = typeof standard_manpower.$inferSelect;
type ChangeMap = Record<string, { from: unknown; to: unknown }>;

function rowToItem(row: Row): Item {
	return {
		id: row.id,
		itemName: row.name,
		farmCode: row.farmcode,
		category: row.category,
		manpower: row.manpower ?? '',
		qty: row.qty ?? 0,
		cost: row.cost == null ? 0 : Number(row.cost),
		hours: row.hours == null ? 0 : Number(row.hours),
		multiplier: row.multiplier == null ? 1 : Number(row.multiplier),
		amount: row.amount == null ? 0 : Number(row.amount),
		amountPhp: row.amountPhp == null ? 0 : Number(row.amountPhp),
		isArchived: row.isArchived === 1,
		archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	};
}

/** Amount = QTY × COST × Hours (base).  Amount (PHP) = Amount × MULTIPLIER. */
function computeAmounts(qty: number, cost: number, hours: number, multiplier: number) {
	const amount = qty * cost * hours;
	const amountPhp = amount * multiplier;
	return { amount, amountPhp };
}

function normalise(input: {
	itemName?: string;
	farmCode?: string;
	category?: string;
	manpower?: string;
	qty?: number | string;
	cost?: number | string;
	hours?: number | string;
	multiplier?: number | string;
}) {
	const name = String(input.itemName ?? '').trim();
	const farmcode = String(input.farmCode ?? '').trim();
	const category = String(input.category ?? '').trim();
	const manpower = String(input.manpower ?? '').trim();
	const qty = Number(input.qty);
	const cost = Number(input.cost);
	const hours = Number(input.hours);
	const multiplier = Number(input.multiplier);

	if (!name) throw new Error('Item name is required.');
	if (!farmcode) throw new Error('Farm code is required.');
	if (!category) throw new Error('Category is required.');
	if (!Number.isFinite(qty) || qty < 0) throw new Error('QTY must be a non-negative number.');
	if (!Number.isFinite(cost) || cost < 0) throw new Error('COST must be a non-negative number.');
	if (!Number.isFinite(hours) || hours < 0)
		throw new Error('No. of hours must be a non-negative number.');
	if (!Number.isFinite(multiplier) || multiplier < 0) {
		throw new Error('MULTIPLIER must be a non-negative number.');
	}

	return { name, farmcode, category, manpower, qty, cost, hours, multiplier };
}

async function recordHistory(
	standardId: string,
	action: HistoryEntry['action'],
	changes: ChangeMap | null,
	changedBy?: string | null
) {
	await db.insert(standard_manpower_history).values({
		id: randomUUID(),
		standardId,
		action,
		changes,
		changedBy: changedBy ?? null
	});
}

export class StandardManpowerService {
	static async getAll(opts: { includeArchived?: boolean } = {}): Promise<Item[]> {
		const rows = await db
			.select()
			.from(standard_manpower)
			.orderBy(desc(standard_manpower.createdAt));
		const items = rows.map(rowToItem);
		return opts.includeArchived ? items : items.filter((i) => !i.isArchived);
	}

	static async getById(id: string): Promise<Item | null> {
		const [row] = await db
			.select()
			.from(standard_manpower)
			.where(eq(standard_manpower.id, id))
			.limit(1);
		return row ? rowToItem(row) : null;
	}

	private static async assertUniqueActive(name: string, farmcode: string, excludeId?: string) {
		const [existing] = await db
			.select()
			.from(standard_manpower)
			.where(
				and(
					eq(standard_manpower.name, name),
					eq(standard_manpower.farmcode, farmcode),
					eq(standard_manpower.isArchived, 0)
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
			manpower: string;
			qty: number;
			cost: number;
			hours: number;
			multiplier: number;
		},
		changedBy?: string | null
	): Promise<Item> {
		const { name, farmcode, category, manpower, qty, cost, hours, multiplier } = normalise(input);
		await this.assertUniqueActive(name, farmcode);

		const { amount, amountPhp } = computeAmounts(qty, cost, hours, multiplier);

		const id = input.id ?? randomUUID();
		await db.insert(standard_manpower).values({
			id,
			name,
			farmcode,
			category,
			manpower,
			qty,
			cost: cost.toString(),
			hours: hours.toString(),
			multiplier: multiplier.toString(),
			amount: amount.toFixed(2),
			amountPhp: amountPhp.toFixed(2),
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
			manpower: string;
			qty: number;
			cost: number;
			hours: number;
			multiplier: number;
		},
		changedBy?: string | null
	): Promise<Item> {
		const before = await this.getById(input.id);
		if (!before) throw new Error('Item not found.');
		if (before.isArchived) {
			throw new Error('Cannot edit an archived item. Restore it first.');
		}

		const { name, farmcode, category, manpower, qty, cost, hours, multiplier } = normalise(input);
		await this.assertUniqueActive(name, farmcode, input.id);

		const { amount, amountPhp } = computeAmounts(qty, cost, hours, multiplier);

		await db
			.update(standard_manpower)
			.set({
				name,
				farmcode,
				category,
				manpower,
				qty,
				cost: cost.toString(),
				hours: hours.toString(),
				multiplier: multiplier.toString(),
				amount: amount.toFixed(2),
				amountPhp: amountPhp.toFixed(2)
			})
			.where(eq(standard_manpower.id, input.id));

		const changes: ChangeMap = {};
		if (before.itemName !== name) changes.itemName = { from: before.itemName, to: name };
		if (before.farmCode !== farmcode) {
			changes.farmCode = { from: before.farmCode, to: farmcode };
		}
		if (before.category !== category) changes.category = { from: before.category, to: category };
		if (before.manpower !== manpower) changes.manpower = { from: before.manpower, to: manpower };
		if (before.qty !== qty) changes.qty = { from: before.qty, to: qty };
		if (before.cost !== cost) changes.cost = { from: before.cost, to: cost };
		if (before.hours !== hours) changes.hours = { from: before.hours, to: hours };
		if (before.multiplier !== multiplier) {
			changes.multiplier = { from: before.multiplier, to: multiplier };
		}
		if (before.amount !== amount) changes.amount = { from: before.amount, to: amount };
		if (before.amountPhp !== amountPhp) {
			changes.amountPhp = { from: before.amountPhp, to: amountPhp };
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
			.update(standard_manpower)
			.set({ isArchived: 1, archivedAt: new Date() })
			.where(eq(standard_manpower.id, id));

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
			.update(standard_manpower)
			.set({ isArchived: 0, archivedAt: null })
			.where(eq(standard_manpower.id, id));

		await recordHistory(id, 'restored', null, changedBy);
		const updated = await this.getById(id);
		if (!updated) throw new Error('Failed to restore item.');
		return updated;
	}

	static async getHistory(id: string): Promise<HistoryEntry[]> {
		const rows = await db
			.select()
			.from(standard_manpower_history)
			.where(eq(standard_manpower_history.standardId, id))
			.orderBy(desc(standard_manpower_history.changedAt));

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
		await db.delete(standard_manpower).where(eq(standard_manpower.id, id));
		await recordHistory(id, 'deleted', null, changedBy);
	}
}
