import { db } from '#lib/server/db/index.ts';
import {
	farm,
	medication_report,
	chickBatch,
	type MedicationReportSnapshot
} from '#lib/server/db/schema.ts';
import { and, desc, eq, gte, like, lt } from 'drizzle-orm';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import {
	buildVaccination,
	LITERS_PER_GALLON,
	NET_FACTOR,
	VAC_RATE_PER_LITER
} from '#lib/medication/medication.ts';

export type SaveReportInput = {
	farmId: string;
	volume: number;
	chickBatchId?: string;
	medications: MedicationReportSnapshot['medications'];
	days: MedicationReportSnapshot['days'];
	vaccination?: MedicationReportSnapshot['vaccination'];
};

export type ListReportsFilter = {
	farmId?: string;
	documentId?: string; // prefix match, so a scanned barcode or a partial id both work
	from?: string; // YYYY-MM-DD, inclusive (Manila)
	to?: string; // YYYY-MM-DD, inclusive (Manila)
	includeVoid?: boolean;
	limit?: number;
	offset?: number;
};

export class MedicationReportService {
	private static newDocumentId() {
		// YYMMDD (Manila) + 6 random digits = 12 digits, roughly sortable by date
		const ymd = new Date()
			.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
			.replaceAll('-', '')
			.slice(2);
		return ymd + String(randomInt(0, 1_000_000)).padStart(6, '0');
	}

	private static assertInput(input: SaveReportInput) {
		if (!input?.farmId) throw new Error('Farm is required.');
		if (!Number.isFinite(input.volume) || input.volume <= 0) {
			throw new Error('Volume must be a positive number.');
		}
		if (!Array.isArray(input.days) || input.days.length === 0) {
			throw new Error('Report has no days.');
		}
		if (!Array.isArray(input.medications)) throw new Error('Invalid medications.');

		if (input.vaccination != null && !Array.isArray(input.vaccination)) {
			throw new Error('Invalid vaccination.');
		}
	}

	private static isDuplicateKey(e: unknown) {
		const err = e as { code?: string; cause?: { code?: string } };
		return (err?.cause?.code ?? err?.code) === 'ER_DUP_ENTRY';
	}

	/**
	 * Save an immutable snapshot. Same farm + same content returns the existing
	 * active report instead of creating a duplicate.
	 */
	static async save(input: SaveReportInput, userId: string | null) {
		this.assertInput(input);

		// Farm identity comes from the DB, not from the browser
		const [f] = await db.select().from(farm).where(eq(farm.id, input.farmId)).limit(1);
		if (!f) throw new Error('Farm not found.');

		let batch: MedicationReportSnapshot['batch'] = null;
		if (input.chickBatchId) {
			const [b] = await db
				.select()
				.from(chickBatch)
				.where(eq(chickBatch.id, input.chickBatchId))
				.limit(1);
			if (!b) throw new Error('Chick batch not found.');
			if (b.farmId !== f.id) throw new Error('Chick batch does not belong to this farm.');
			batch = { id: b.id, number: b.batchNumber, dateSet: b.dateSet };
		}

		const vaccination =
			input.vaccination ??
			buildVaccination(
				input.days.map((d) => d.age),
				input.volume,
				f.type // ← the missing arg; `f` comes from the DB, so it's authoritative
			);

		const snapshot: MedicationReportSnapshot = {
			schemaVersion: 2,
			farm: { id: f.id, name: f.name, code: f.code, type: f.type, address: f.address },
			batch,
			volume: input.volume,
			netVolume: input.volume * NET_FACTOR,
			constants: {
				litersPerGallon: LITERS_PER_GALLON,
				vacRatePerLiter: VAC_RATE_PER_LITER,
				netFactor: NET_FACTOR
			},
			medications: input.medications,
			days: input.days,
			vaccination
		};

		const contentHash = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');

		const [existing] = await db
			.select()
			.from(medication_report)
			.where(
				and(
					eq(medication_report.farmId, f.id),
					eq(medication_report.contentHash, contentHash),
					eq(medication_report.status, 'active')
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
				await db.insert(medication_report).values({
					id: randomUUID(),
					documentId,
					farmId: f.id,
					chickBatchId: input.chickBatchId ?? null,
					farmCode: f.code,
					farmName: f.name,
					volume: input.volume,
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
			.from(medication_report)
			.where(eq(medication_report.documentId, documentId))
			.limit(1);
		return row ?? null;
	}

	/** List page rows: searchable columns only, no snapshot JSON */
	static async list(filter: ListReportsFilter = {}) {
		const conds = [];
		if (filter.farmId) conds.push(eq(medication_report.farmId, filter.farmId));
		if (filter.documentId) {
			conds.push(like(medication_report.documentId, `${filter.documentId.trim()}%`));
		}
		if (!filter.includeVoid) conds.push(eq(medication_report.status, 'active'));
		if (filter.from) {
			conds.push(gte(medication_report.createdAt, new Date(`${filter.from}T00:00:00+08:00`)));
		}
		if (filter.to) {
			// exclusive upper bound = start of the next day, so `to` itself is included
			const end = new Date(`${filter.to}T00:00:00+08:00`);
			end.setDate(end.getDate() + 1);
			conds.push(lt(medication_report.createdAt, end));
		}

		return db
			.select({
				id: medication_report.id,
				documentId: medication_report.documentId,
				farmId: medication_report.farmId,
				farmCode: medication_report.farmCode,
				farmName: medication_report.farmName,
				farmType: farm.type,
				volume: medication_report.volume,
				status: medication_report.status,
				createdBy: medication_report.createdBy,
				createdAt: medication_report.createdAt
			})
			.from(medication_report)
			.leftJoin(farm, eq(farm.id, medication_report.farmId))
			.where(conds.length ? and(...conds) : undefined)
			.orderBy(desc(medication_report.createdAt))
			.limit(Math.min(filter.limit ?? 50, 5000))
			.offset(filter.offset ?? 0);
	}

	/** Reports are never edited or deleted, only voided */
	static async voidReport(documentId: string) {
		const row = await this.getByDocumentId(documentId);
		if (!row) throw new Error('Report not found.');
		if (row.status === 'void') return;
		await db
			.update(medication_report)
			.set({ status: 'void' })
			.where(eq(medication_report.id, row.id));
	}
}
