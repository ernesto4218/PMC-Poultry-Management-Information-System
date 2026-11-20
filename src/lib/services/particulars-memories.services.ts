import {
	farm,
	particulars,
	particulars_memory,
	particulars_memory_item
} from '#lib/server/db/schema.ts';
import { eq, and, asc, desc, sql, inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type {
	ParticularCategory, // CHANGED
	ParticularMemory,
	ParticularMemoryFarm,
	ParticularMemoryInput,
	ParticularMemoryItem,
	ParticularMemoryItemInput,
	QtyResolver,
	QtyResolverContext,
	ResolvedMemory,
	ResolvedMemoryItem
} from '#lib/types/particulars.ts';
import { db } from '../server/db';
import { StandardMedicineService } from './standardsmedicine.services';
import { registerParticularsFormulas } from '#lib/server/particulars-formulas.server.ts';

type MemRow = typeof particulars_memory.$inferSelect;
type ItemRow = typeof particulars_memory_item.$inferSelect;

const MAX_LABEL_LEN = 100;
const MAX_KEY_LEN = 100;
const MAX_ADJUST_DAYS = 36500;

// ===========================================================================
// Resolver registry (register once at startup)
// ===========================================================================
const qtyResolvers = new Map<string, QtyResolver>();

export function registerQtyFormula(key: string, resolver: QtyResolver): void {
	const k = String(key ?? '').trim();
	if (!k) throw new Error('Resolver key must be a non-empty string.');
	if (k.length > MAX_KEY_LEN) throw new Error(`Resolver key too long (max ${MAX_KEY_LEN}).`);
	if (qtyResolvers.has(k)) throw new Error(`Resolver "${k}" is already registered.`);
	qtyResolvers.set(k, resolver);
}

export function unregisterQtyFormula(key: string): void {
	qtyResolvers.delete(key);
}

export function listQtyFormulas(): string[] {
	return [...qtyResolvers.keys()].sort();
}

// ===========================================================================
// Helpers
// ===========================================================================
function memRowToItem(
	row: MemRow,
	itemCount = 0,
	usedByFarms: ParticularMemoryFarm[] = []
): ParticularMemory {
	return {
		id: row.id,
		name: row.name,
		notes: row.notes,
		itemCount,
		usedByFarms, // ← new
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	};
}

// CHANGED: takes particularCategory and returns it
function itemRowToItem(
	row: ItemRow,
	particularName: string,
	particularCategory: ParticularCategory
): ParticularMemoryItem {
	return {
		id: row.id,
		memoryId: row.memoryId,
		particularId: row.particularId,
		particularName,
		particularCategory,
		label: row.label,
		mode: (row.mode as 'static' | 'formula') ?? 'static',
		qty: Number(row.qty),
		formulaKey: row.formulaKey ?? null,
		formulaParams: (row.formulaParams as Record<string, unknown> | null) ?? null,
		price: Number(row.price),
		adjustmentDays: row.adjustmentDays ?? null,
		position: row.position,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString()
	};
}

function normaliseMem(input: ParticularMemoryInput) {
	const name = String(input.name ?? '').trim();
	const notes = String(input.notes ?? '').trim();
	if (!name) throw new Error('Memory name is required.');
	if (name.length > 150) throw new Error('Memory name is too long (max 150 chars).');
	if (notes.length > 500) throw new Error('Notes are too long (max 500 chars).');
	return { name, notes };
}

function normaliseItem(input: ParticularMemoryItemInput, opts: { requireMemoryId: boolean }) {
	const particularId = String(input.particularId ?? '').trim();
	if (!particularId) throw new Error('Particular is required.');

	const memoryId = String(input.memoryId ?? '').trim();
	if (opts.requireMemoryId && !memoryId) throw new Error('Memory is required.');

	const mode = input.mode === 'formula' ? 'formula' : 'static';

	const label = String(input.label ?? '').trim();
	if (label.length > MAX_LABEL_LEN)
		throw new Error(`Label is too long (max ${MAX_LABEL_LEN} chars).`);

	const qty = Number(input.qty ?? 0);
	if (!Number.isFinite(qty) || qty < 0) throw new Error('QTY must be a non-negative number.');

	let formulaKey: string | null = null;
	let formulaParams: Record<string, unknown> | null = null;

	if (mode === 'formula') {
		const raw = String(input.formulaKey ?? '').trim();
		if (!raw) throw new Error('Formula key is required in formula mode.');
		if (raw.length > MAX_KEY_LEN)
			throw new Error(`Formula key is too long (max ${MAX_KEY_LEN} chars).`);
		formulaKey = raw;

		const rawParams = input.formulaParams;
		if (rawParams != null) {
			if (typeof rawParams !== 'object') throw new Error('Formula params must be an object.');
			formulaParams = rawParams as Record<string, unknown>;
		}
	}

	const price = Number(input.price ?? 0);
	if (!Number.isFinite(price) || price < 0) throw new Error('Price must be a non-negative number.');

	const rawAdj = input.adjustmentDays;
	const adjustmentDays =
		rawAdj === null || rawAdj === undefined || String(rawAdj).trim() === '' ? null : Number(rawAdj);
	if (
		adjustmentDays !== null &&
		(!Number.isInteger(adjustmentDays) || Math.abs(adjustmentDays) > MAX_ADJUST_DAYS)
	) {
		throw new Error(`Adjustment days must be a whole number within ±${MAX_ADJUST_DAYS}.`);
	}

	const position = input.position === undefined ? undefined : Number(input.position);
	if (position !== undefined && (!Number.isInteger(position) || position < 0))
		throw new Error('Position must be a non-negative whole number.');

	return {
		memoryId,
		particularId,
		label,
		mode: mode as 'static' | 'formula',
		qty,
		formulaKey,
		formulaParams,
		price,
		adjustmentDays,
		position
	};
}

// ===========================================================================
// Service
// ===========================================================================
export class ParticularsMemoryService {
	// ----- Memories -------------------------------------------------------
	private static async getFarmsForMemoryIds(
		memoryIds: string[]
	): Promise<Map<string, ParticularMemoryFarm[]>> {
		const map = new Map<string, ParticularMemoryFarm[]>();
		if (memoryIds.length === 0) return map;

		const rows = await db
			.select({
				memoryId: farm.particularsMemoryId,
				id: farm.id,
				name: farm.name,
				code: farm.code
			})
			.from(farm)
			.where(inArray(farm.particularsMemoryId, memoryIds))
			.orderBy(asc(farm.name));

		for (const row of rows) {
			if (!row.memoryId) continue;
			const list = map.get(row.memoryId) ?? [];
			list.push({ id: row.id, name: row.name, code: row.code });
			map.set(row.memoryId, list);
		}
		return map;
	}

	static async listMemories(): Promise<ParticularMemory[]> {
		const rows = await db
			.select()
			.from(particulars_memory)
			.orderBy(desc(particulars_memory.createdAt));

		const counts = rows.length
			? await db
					.select({
						memoryId: particulars_memory_item.memoryId,
						count: sql<number>`count(*)`
					})
					.from(particulars_memory_item)
					.where(
						inArray(
							particulars_memory_item.memoryId,
							rows.map((r) => r.id)
						)
					)
					.groupBy(particulars_memory_item.memoryId)
			: [];
		const countMap = new Map(counts.map((c) => [c.memoryId, Number(c.count)]));

		const farmMap = await this.getFarmsForMemoryIds(rows.map((r) => r.id));

		return rows.map((r) => memRowToItem(r, countMap.get(r.id) ?? 0, farmMap.get(r.id) ?? []));
	}

	static async getMemoryById(id: string): Promise<ParticularMemory | null> {
		const [row] = await db
			.select()
			.from(particulars_memory)
			.where(eq(particulars_memory.id, id))
			.limit(1);
		if (!row) return null;
		const [count] = await db
			.select({ count: sql<number>`count(*)` })
			.from(particulars_memory_item)
			.where(eq(particulars_memory_item.memoryId, id));
		const farmMap = await this.getFarmsForMemoryIds([id]);
		return memRowToItem(row, Number(count?.count ?? 0), farmMap.get(id) ?? []);
	}

	static async createMemory(input: ParticularMemoryInput): Promise<ParticularMemory> {
		const { name, notes } = normaliseMem(input);
		const id = input.id ?? randomUUID();
		await db.insert(particulars_memory).values({ id, name, notes });
		const created = await this.getMemoryById(id);
		if (!created) throw new Error('Failed to load created memory.');
		return created;
	}

	static async updateMemory(
		input: ParticularMemoryInput & { id: string }
	): Promise<ParticularMemory> {
		const before = await this.getMemoryById(input.id);
		if (!before) throw new Error('Memory not found.');
		const { name, notes } = normaliseMem(input);
		await db
			.update(particulars_memory)
			.set({ name, notes })
			.where(eq(particulars_memory.id, input.id));
		const updated = await this.getMemoryById(input.id);
		if (!updated) throw new Error('Failed to load updated memory.');
		return updated;
	}

	static async deleteMemory(id: string): Promise<void> {
		// Cascade on memory_items is set on the FK; still remove explicitly to be safe.
		await db.delete(particulars_memory_item).where(eq(particulars_memory_item.memoryId, id));
		await db.delete(particulars_memory).where(eq(particulars_memory.id, id));
	}

	// ----- Items ----------------------------------------------------------
	static async listItems(memoryId: string): Promise<ParticularMemoryItem[]> {
		const rows = await db
			.select({
				item: particulars_memory_item,
				particularName: particulars.name,
				particularCategory: particulars.category // CHANGED
			})
			.from(particulars_memory_item)
			.innerJoin(particulars, eq(particulars.id, particulars_memory_item.particularId))
			.where(eq(particulars_memory_item.memoryId, memoryId))
			.orderBy(asc(particulars_memory_item.position), asc(particulars_memory_item.createdAt));
		return rows.map((r) => itemRowToItem(r.item, r.particularName, r.particularCategory)); // CHANGED
	}

	private static async nextPosition(memoryId: string): Promise<number> {
		const [row] = await db
			.select({ max: sql<number | null>`max(${particulars_memory_item.position})` })
			.from(particulars_memory_item)
			.where(eq(particulars_memory_item.memoryId, memoryId));
		return (row?.max ?? -1) + 1;
	}

	static async addItem(
		memoryId: string,
		input: ParticularMemoryItemInput
	): Promise<ParticularMemoryItem> {
		const mem = await this.getMemoryById(memoryId);
		if (!mem) throw new Error('Memory not found.');

		const particularId = await this.resolveParticularId(input);
		const norm = normaliseItem({ ...input, memoryId, particularId }, { requireMemoryId: false });
		const particular = await db
			.select()
			.from(particulars)
			.where(eq(particulars.id, norm.particularId))
			.limit(1);
		if (!particular.length) throw new Error('Particular not found.');

		const id = input.id ?? randomUUID();
		const position = norm.position ?? (await this.nextPosition(memoryId));

		await db.insert(particulars_memory_item).values({
			id,
			memoryId,
			particularId: norm.particularId,
			label: norm.label,
			mode: norm.mode,
			qty: norm.qty.toFixed(2),
			formulaKey: norm.formulaKey,
			formulaParams: norm.formulaParams,
			price: norm.price.toFixed(2),
			adjustmentDays: norm.adjustmentDays,
			position
		});

		const items = await this.listItems(memoryId);
		const created = items.find((i) => i.id === id);
		if (!created) throw new Error('Failed to load created memory item.');
		return created;
	}

	static async updateItem(
		memoryId: string,
		input: ParticularMemoryItemInput & { id: string }
	): Promise<ParticularMemoryItem> {
		const [existing] = await db
			.select()
			.from(particulars_memory_item)
			.where(
				and(
					eq(particulars_memory_item.id, input.id),
					eq(particulars_memory_item.memoryId, memoryId)
				)
			)
			.limit(1);
		if (!existing) throw new Error('Memory item not found.');

		const particularId = await this.resolveParticularId(input);
		const norm = normaliseItem({ ...input, memoryId, particularId }, { requireMemoryId: false });

		await db
			.update(particulars_memory_item)
			.set({
				particularId: norm.particularId,
				label: norm.label,
				mode: norm.mode,
				qty: norm.qty.toFixed(2),
				formulaKey: norm.formulaKey,
				formulaParams: norm.formulaParams,
				price: norm.price.toFixed(2),
				adjustmentDays: norm.adjustmentDays,
				...(norm.position !== undefined ? { position: norm.position } : {})
			})
			.where(eq(particulars_memory_item.id, input.id));

		const items = await this.listItems(memoryId);
		const updated = items.find((i) => i.id === input.id);
		if (!updated) throw new Error('Failed to load updated memory item.');
		return updated;
	}

	static async deleteItem(memoryId: string, itemId: string): Promise<void> {
		await db
			.delete(particulars_memory_item)
			.where(
				and(eq(particulars_memory_item.id, itemId), eq(particulars_memory_item.memoryId, memoryId))
			);
	}

	static async reorderItems(memoryId: string, orderedIds: string[]): Promise<void> {
		const items = await this.listItems(memoryId);
		const set = new Set(items.map((i) => i.id));
		if (orderedIds.length !== set.size || orderedIds.some((id) => !set.has(id))) {
			throw new Error('Reorder list must contain exactly the current item ids.');
		}
		await Promise.all(
			orderedIds.map((id, idx) =>
				db
					.update(particulars_memory_item)
					.set({ position: idx })
					.where(eq(particulars_memory_item.id, id))
			)
		);
	}

	// ----- Resolution -----------------------------------------------------
	static async resolveMemory(
		id: string,
		ctx: QtyResolverContext = {}
	): Promise<ResolvedMemory | null> {
		registerParticularsFormulas();
		const memory = await this.getMemoryById(id);
		if (!memory) return null;

		const items = await this.listItems(id);

		const resolved: ResolvedMemoryItem[] = await Promise.all(
			items.map(async (item) => {
				if (item.mode === 'static') {
					return { ...item, resolvedQty: item.qty, resolveError: null };
				}

				const resolver = item.formulaKey ? qtyResolvers.get(item.formulaKey) : undefined;
				if (!resolver) {
					return {
						...item,
						resolvedQty: 0,
						resolveError: `No resolver registered for "${item.formulaKey}".`
					};
				}
				try {
					const v = await resolver(item.formulaParams, ctx);
					if (!Number.isFinite(v) || v < 0)
						throw new Error('Resolver returned an invalid quantity.');
					return { ...item, resolvedQty: v, resolveError: null };
				} catch (err) {
					return {
						...item,
						resolvedQty: 0,
						resolveError: err instanceof Error ? err.message : 'Resolution failed.'
					};
				}
			})
		);

		const total = resolved.reduce((s, i) => s + i.resolvedQty * i.price, 0);

		return { memory, items: resolved, context: ctx, total };
	}

	private static async resolveParticularId(input: ParticularMemoryItemInput): Promise<string> {
		const medicineId = String(input.medicineId ?? '').trim();
		if (!medicineId) return String(input.particularId ?? '').trim();

		const medicine = await StandardMedicineService.getById(medicineId);
		if (!medicine) throw new Error('Medicine not found.');

		const [existing] = await db
			.select()
			.from(particulars)
			.where(eq(particulars.name, medicine.itemName))
			.limit(1);
		if (existing) return existing.id;

		const id = randomUUID();
		// CHANGED: medicines are created under MED&VAC instead of falling back to the default
		await db.insert(particulars).values({ id, name: medicine.itemName, category: 'MED&VAC' });
		return id;
	}

	// ----- Duplication ----------------------------------------------------
	static async duplicateMemory(
		sourceId: string,
		overrides?: { name?: string; notes?: string }
	): Promise<ParticularMemory> {
		const source = await this.getMemoryById(sourceId);
		if (!source) throw new Error('Source memory not found.');

		// Validate the new name / notes (reuses existing rules)
		const { name, notes } = normaliseMem({
			name: overrides?.name ?? `${source.name} (copy)`,
			notes: overrides?.notes ?? source.notes
		});

		const newId = randomUUID();

		await db.insert(particulars_memory).values({ id: newId, name, notes });

		const sourceItems = await this.listItems(sourceId);
		if (sourceItems.length > 0) {
			await db.insert(particulars_memory_item).values(
				sourceItems.map((item, idx) => ({
					id: randomUUID(),
					memoryId: newId,
					particularId: item.particularId,
					label: item.label,
					mode: item.mode,
					qty: item.qty.toFixed(2),
					formulaKey: item.formulaKey,
					// Deep-copy the params so later edits on the copy don't affect the source
					formulaParams: item.formulaParams
						? (JSON.parse(JSON.stringify(item.formulaParams)) as Record<string, unknown>)
						: null,
					price: item.price.toFixed(2),
					adjustmentDays: item.adjustmentDays,
					position: item.position ?? idx
				}))
			);
		}

		const created = await this.getMemoryById(newId);
		if (!created) throw new Error('Failed to load duplicated memory.');
		return created;
	}
}
