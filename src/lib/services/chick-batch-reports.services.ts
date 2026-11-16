import { db } from '#lib/server/db/index.ts';
import { chickBatchReportSnapshot } from '#lib/server/db/schema.ts';
import type {
	ChickBatchReportFilters,
	ChickBatchReportSnapshotData
} from '#lib/types/chick-batch-reports.ts';
import { and, desc, eq, isNotNull, isNull, like, sql } from 'drizzle-orm';

export class ChickBatchReportService {
	private static buildDocumentId(): string {
		const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
		const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
		return `CB-${ymd}-${rand}`;
	}

	static async createSnapshot(input: {
		filters: ChickBatchReportFilters;
		snapshot: ChickBatchReportSnapshotData;
		createdBy?: string;
	}): Promise<{ id: string; documentId: string; createdAt: string }> {
		const id = crypto.randomUUID();
		const documentId = this.buildDocumentId();
		const now = new Date();

		await db.insert(chickBatchReportSnapshot).values({
			id,
			documentId,
			filters: input.filters,
			snapshot: input.snapshot,
			createdBy: input.createdBy,
			createdAt: now
		});

		return { id, documentId, createdAt: now.toISOString() };
	}

	static async getByDocumentId(documentId: string) {
		const [row] = await db
			.select()
			.from(chickBatchReportSnapshot)
			.where(eq(chickBatchReportSnapshot.documentId, documentId))
			.limit(1);
		return row ?? null;
	}

	static async listRecent(limit = 20) {
		return db
			.select({
				documentId: chickBatchReportSnapshot.documentId,
				farmLabel: sql<string>`json_extract(${chickBatchReportSnapshot.snapshot}, '$.farmLabel')`,
				createdAt: chickBatchReportSnapshot.createdAt,
				voidedAt: chickBatchReportSnapshot.voidedAt,
				reprintCount: chickBatchReportSnapshot.reprintCount
			})
			.from(chickBatchReportSnapshot)
			.orderBy(desc(chickBatchReportSnapshot.createdAt))
			.limit(limit);
	}

	static async voidSnapshot(documentId: string) {
		const row = await this.getByDocumentId(documentId);
		if (!row) throw new Error('Report not found.');
		if (row.voidedAt) return;
		await db
			.update(chickBatchReportSnapshot)
			.set({ voidedAt: new Date() })
			.where(eq(chickBatchReportSnapshot.documentId, documentId));
	}

	static async incrementReprint(documentId: string) {
		await db
			.update(chickBatchReportSnapshot)
			.set({ reprintCount: sql`${chickBatchReportSnapshot.reprintCount} + 1` })
			.where(eq(chickBatchReportSnapshot.documentId, documentId));
	}

	static async list(
		opts: {
			search?: string;
			status?: 'all' | 'active' | 'voided';
			limit?: number;
			offset?: number;
		} = {}
	) {
		const limit = Math.min(opts.limit ?? 25, 100);
		const offset = Math.max(opts.offset ?? 0, 0);

		const conditions = [];
		const q = opts.search?.trim();
		if (q) {
			conditions.push(like(chickBatchReportSnapshot.documentId, `%${q}%`));
		}
		if (opts.status === 'active') {
			conditions.push(isNull(chickBatchReportSnapshot.voidedAt));
		} else if (opts.status === 'voided') {
			conditions.push(isNotNull(chickBatchReportSnapshot.voidedAt));
		}
		const where = conditions.length ? and(...conditions) : undefined;

		const rows = await db
			.select()
			.from(chickBatchReportSnapshot)
			.where(where)
			.orderBy(desc(chickBatchReportSnapshot.createdAt))
			.limit(limit)
			.offset(offset);

		const [{ n }] = await db
			.select({ n: sql<number>`count(*)` })
			.from(chickBatchReportSnapshot)
			.where(where);

		const [{ voided }] = await db
			.select({ voided: sql<number>`count(*)` })
			.from(chickBatchReportSnapshot)
			.where(isNotNull(chickBatchReportSnapshot.voidedAt));

		return {
			rows,
			total: Number(n),
			voidedTotal: Number(voided)
		};
	}
}
