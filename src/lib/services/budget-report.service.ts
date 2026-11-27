import { db } from '#lib/server/db/index.ts';
import { farm, budget_report, chickBatch } from '#lib/server/db/schema.ts';
import type { BudgetReportSnapshot, BudgetSnapshotBody } from '#lib/budget/budget-snapshot.ts';
import { and, desc, eq, gte, inArray, like, lt, ne } from 'drizzle-orm';
import { createHash, randomInt, randomUUID } from 'node:crypto';

export type SaveBudgetReportInput = {
	farmId: string;
	chickBatchId: string;
	body: BudgetSnapshotBody;
};

export type ListBudgetReportsFilter = {
	farmId?: string;
	chickBatchId?: string;
	documentId?: string; // prefix match, so a scanned barcode or a partial id both work
	from?: string; // YYYY-MM-DD, inclusive (Manila)
	to?: string; // YYYY-MM-DD, inclusive (Manila)
	includeVoid?: boolean;
	limit?: number;
	offset?: number;
};

export class BudgetReportService {
	private static newDocumentId() {
		// "B" + YYMMDD (Manila) + 5 random digits = 12 chars. The B prefix keeps a
		// budget barcode from ever being mistaken for a medication report (12 digits).
		const ymd = new Date()
			.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
			.replaceAll('-', '')
			.slice(2);
		return 'B' + ymd + String(randomInt(0, 100_000)).padStart(5, '0');
	}

	private static assertInput(input: SaveBudgetReportInput) {
		if (!input?.farmId) throw new Error('Farm is required.');
		if (!input.chickBatchId) throw new Error('Chick batch is required.');

		const b = input.body;
		if (!b || typeof b !== 'object') throw new Error('Report body is missing.');
		if (!Number.isFinite(b.volume) || b.volume <= 0) {
			throw new Error('Volume must be a positive number.');
		}
		if (!Array.isArray(b.categories) || b.categories.length === 0) {
			throw new Error('Report has no categories.');
		}
		if (!Array.isArray(b.rows) || b.rows.length === 0) throw new Error('Report has no rows.');
		if (!Number.isFinite(b.grandTotal)) throw new Error('Invalid grand total.');
		if (!b.feeds || !Array.isArray(b.feeds.groups)) throw new Error('Invalid feeds summary.');
	}

	private static isDuplicateKey(e: unknown) {
		const err = e as { code?: string; cause?: { code?: string } };
		return (err?.cause?.code ?? err?.code) === 'ER_DUP_ENTRY';
	}

	/**
	 * Save an immutable snapshot. Same farm + same content returns the existing
	 * active report instead of creating a duplicate.
	 */
	static async save(input: SaveBudgetReportInput, userId: string | null) {
		this.assertInput(input);

		// Farm and batch identity come from the DB, not from the browser
		const [f] = await db.select().from(farm).where(eq(farm.id, input.farmId)).limit(1);
		if (!f) throw new Error('Farm not found.');

		const [b] = await db
			.select()
			.from(chickBatch)
			.where(eq(chickBatch.id, input.chickBatchId))
			.limit(1);
		if (!b) throw new Error('Chick batch not found.');
		if (b.farmId !== f.id) throw new Error('Chick batch does not belong to this farm.');
		if (b.volume !== input.body.volume) {
			throw new Error('Volume does not match the chick batch. Reload the page and try again.');
		}

		const snapshot: BudgetReportSnapshot = {
			schemaVersion: 1,
			farm: { id: f.id, name: f.name, code: f.code, type: f.type, address: f.address },
			batch: { id: b.id, number: b.batchNumber, dateSet: String(b.dateSet) },
			...input.body
		};

		const contentHash = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');

		const [existing] = await db
			.select()
			.from(budget_report)
			.where(
				and(
					eq(budget_report.farmId, f.id),
					eq(budget_report.contentHash, contentHash),
					eq(budget_report.status, 'active')
				)
			)
			.limit(1);
		if (existing) {
			return { documentId: existing.documentId, createdAt: existing.createdAt, reused: true };
		}

		// documentId has a unique index; retry on the (rare) collision
		for (let attempt = 0; attempt < 5; attempt++) {
			const documentId = this.newDocumentId();
			const createdAt = new Date();
			try {
				await db.insert(budget_report).values({
					id: randomUUID(),
					documentId,
					farmId: f.id,
					chickBatchId: b.id,
					batchNumber: b.batchNumber,
					farmCode: f.code,
					farmName: f.name,
					volume: input.body.volume,
					grandTotal: Math.round(input.body.grandTotal * 100) / 100,
					contentHash,
					snapshot,
					createdBy: userId,
					createdAt
				});
				return { documentId, createdAt, reused: false };
			} catch (e) {
				if (!this.isDuplicateKey(e)) throw e;
			}
		}
		throw new Error('Could not allocate a document id. Please try again.');
	}

	/** Full row including the snapshot, looked up by the number printed in the barcode */
	static async getByDocumentId(documentId: string) {
		const [row] = await db
			.select()
			.from(budget_report)
			.where(eq(budget_report.documentId, documentId))
			.limit(1);
		return row ?? null;
	}

	/** List page rows: searchable columns only, no snapshot JSON */
	static async list(filter: ListBudgetReportsFilter = {}) {
		const conds = [];
		if (filter.farmId) conds.push(eq(budget_report.farmId, filter.farmId));
		if (filter.chickBatchId) conds.push(eq(budget_report.chickBatchId, filter.chickBatchId));
		if (filter.documentId) {
			conds.push(like(budget_report.documentId, `${filter.documentId.trim()}%`));
		}
		if (!filter.includeVoid) conds.push(eq(budget_report.status, 'active'));
		if (filter.from) {
			conds.push(gte(budget_report.createdAt, new Date(`${filter.from}T00:00:00+08:00`)));
		}
		if (filter.to) {
			// exclusive upper bound = start of the next day, so `to` itself is included
			const end = new Date(`${filter.to}T00:00:00+08:00`);
			end.setDate(end.getDate() + 1);
			conds.push(lt(budget_report.createdAt, end));
		}

		return db
			.select({
				id: budget_report.id,
				documentId: budget_report.documentId,
				farmId: budget_report.farmId,
				farmCode: budget_report.farmCode,
				farmName: budget_report.farmName,
				farmType: farm.type,
				chickBatchId: budget_report.chickBatchId,
				batchNumber: budget_report.batchNumber,
				volume: budget_report.volume,
				grandTotal: budget_report.grandTotal,
				status: budget_report.status,
				createdBy: budget_report.createdBy,
				createdAt: budget_report.createdAt
			})
			.from(budget_report)
			.leftJoin(farm, eq(farm.id, budget_report.farmId))
			.where(conds.length ? and(...conds) : undefined)
			.orderBy(desc(budget_report.createdAt))
			.limit(Math.min(filter.limit ?? 50, 5000))
			.offset(filter.offset ?? 0);
	}

	/** Reports are never edited or deleted, only voided */
	static async voidReport(documentId: string) {
		const row = await this.getByDocumentId(documentId);
		if (!row) throw new Error('Report not found.');
		if (row.status === 'void') return;
		await db.update(budget_report).set({ status: 'void' }).where(eq(budget_report.id, row.id));
	}

	static async getManyByDocumentIds(documentIds: string[]) {
		const ids = Array.from(new Set(documentIds.filter(Boolean)));
		if (ids.length === 0) return [];

		return db.select().from(budget_report).where(inArray(budget_report.documentId, ids));
	}

	/**
	 * Void many reports at once, keyed by documentId.
	 * Already-void rows are skipped, so the call is idempotent.
	 * Returns how many rows actually flipped to void.
	 */
	static async voidReports(documentIds: string[]): Promise<number> {
		const ids = Array.from(new Set(documentIds.filter((d) => d && d.trim().length > 0)));
		if (ids.length === 0) return 0;

		const toVoid = await db
			.select({ id: budget_report.id })
			.from(budget_report)
			.where(and(inArray(budget_report.documentId, ids), ne(budget_report.status, 'void')));

		if (toVoid.length === 0) return 0;

		await db
			.update(budget_report)
			.set({ status: 'void' })
			.where(
				inArray(
					budget_report.id,
					toVoid.map((r) => r.id)
				)
			);

		return toVoid.length;
	}
}
